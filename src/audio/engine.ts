// Web Audio realisation of an AudioScene. Entirely procedural: no sample files, so no licensing and a tiny download.
// Everything audible comes through one reverb whose length follows the hall, then one low-pass for cloud and water.
// Randomness here (bird timing, drips) is cosmetic and deliberately not part of the deterministic world.

import { babblePlan, type BabbleEvent } from './babble';
import type { AudioScene, Portal, Surface } from './director';

type Species = 'sparrow' | 'gull' | 'rook' | 'albatross' | 'flock' | 'rustle';

function speciesFor(mode: AudioScene['birds']['mode']): Species[] {
  switch (mode) {
    case 'nesting': return ['gull'];
    case 'noisy': return ['rook'];
    case 'chick': return ['albatross', 'albatross', 'rustle'];
    case 'murmuration': return ['flock'];
    case 'roosting': return ['rustle'];
    case 'sheltering': return ['sparrow', 'sparrow', 'rook'];
    case 'foraging': return ['sparrow', 'sparrow', 'sparrow', 'rustle'];
    case 'soaring': return ['gull', 'sparrow', 'rook'];
    case 'shore': return ['gull', 'rustle', 'gull'];
    default: return [];
  }
}

const rand = (a: number, b: number): number => a + Math.random() * (b - a);

/** One doorway's worth of sound from the next hall: its own pan, its own muffling, its own timing. */
interface PortalVoice {
  key: string;
  p: Portal;
  bus: GainNode;
  pan: StereoPannerNode;
  lp: BiquadFilterNode;
  nextBoom: number;
  nextBird: number;
  nextDrip: number;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private lowpass!: BiquadFilterNode;
  private bus!: GainNode;
  private dry!: GainNode;
  private wet!: GainNode;
  private convolver: ConvolverNode | null = null;
  private analyser!: AnalyserNode;
  private noise!: AudioBuffer;
  private brown!: AudioBuffer;
  private scene: AudioScene | null = null;
  private voices: PortalVoice[] = [];
  private portalEvents = 0;
  private outsideEvents = 0;
  private outsideId = '';
  private nextVoice = 0;
  private irKey = '';
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextBird = 0;
  private nextDrip = 0;
  private nextBoom = 0;
  private volume = 0.8;
  private muted = false;

  private seaGain!: GainNode;
  private seaFilter!: BiquadFilterNode;
  private seaLfo!: GainNode;
  private rumbleGain!: GainNode;
  private fallsGain!: GainNode;
  private rainGain!: GainNode;
  private windGain!: GainNode;
  private windFilter!: BiquadFilterNode;
  private whistleGain!: GainNode;
  private whistleOsc: OscillatorNode[] = [];
  private outBus!: GainNode;
  private outLp!: BiquadFilterNode;
  private outPan!: StereoPannerNode;
  private draughtGain!: GainNode;
  private hissGain!: GainNode;
  private ringGain!: GainNode;
  private trafficGain!: GainNode;
  private trafficFilter!: BiquadFilterNode;

  get started(): boolean { return this.ctx !== null; }

  /**
   * Phones may suspend or "interrupt" the audio while the speech voice talks or the app is switched away; sounds scheduled
   * then are lost. Ask for it back; the next sound will be heard. Safe to call often.
   */
  /**
   * Can sounds be scheduled now? While running, yes. While a phone has paused the sound (speech talking, a brief
   * interruption) we ask for it back and still schedule, because what is scheduled plays the moment it resumes, so the
   * sounds the narrator mentions are not lost. Capped so a long pause cannot build up a pile of sounds.
   */
  private usable(): boolean {
    const c = this.ctx;
    if (!c || c.state === 'closed') return false;
    if (c.state === 'running') { this.downCount = 0; return true; }
    this.resume();
    return ++this.downCount <= 10;
  }
  private downCount = 0;

  resume(): void {
    const c = this.ctx;
    if (c && c.state !== 'running' && c.state !== 'closed') void c.resume().catch(() => undefined);
  }

  /** Must be called from a user gesture (browsers refuse to make sound otherwise). */
  async start(): Promise<void> {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      return;
    }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : this.volume;
    this.lowpass = ctx.createBiquadFilter();
    this.lowpass.type = 'lowpass';
    this.lowpass.frequency.value = 20000;
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.bus = ctx.createGain();
    this.dry = ctx.createGain();
    this.wet = ctx.createGain();
    this.dry.gain.value = 0.7;
    this.wet.gain.value = 0.34;
    this.bus.connect(this.dry).connect(this.lowpass);
    this.wet.connect(this.lowpass);
    this.lowpass.connect(this.master);
    this.master.connect(this.analyser);
    this.analyser.connect(ctx.destination);
    this.noise = this.makeNoise(4, 'white');
    this.brown = this.makeNoise(8, 'brown');
    this.buildBeds();
    this.timer = setInterval(() => this.tickEvents(), 200);
    if (this.scene) this.apply(this.scene);
    if (ctx.state === 'suspended') await ctx.resume();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    void this.ctx?.close();
    this.ctx = null;
  }

  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    this.pushMaster();
  }
  setMuted(m: boolean): void {
    this.muted = m;
    this.pushMaster();
  }
  private pushMaster(): void {
    if (this.ctx) this.master.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime, 0.1);
  }

  /** How many doorway voices exist and how many sounds they have emitted. Used by the end-to-end tests. */
  stats(): { voices: number; portalEvents: number; outsideEvents: number } {
    return { voices: this.voices.length, portalEvents: this.portalEvents, outsideEvents: this.outsideEvents };
  }

  /** RMS of what is currently coming out (0..1). Used by the end-to-end tests. */
  level(): number {
    if (!this.ctx) return 0;
    const buf = new Float32Array(this.analyser.fftSize);
    this.analyser.getFloatTimeDomainData(buf);
    let s = 0;
    for (const v of buf) s += v * v;
    return Math.sqrt(s / buf.length);
  }

  setScene(scene: AudioScene): void {
    this.scene = scene;
    if (this.ctx) this.apply(scene);
  }

  // -------------------------------------------------------------------------------------------------------------
  // Building blocks
  // -------------------------------------------------------------------------------------------------------------

  private makeNoise(seconds: number, kind: 'white' | 'brown'): AudioBuffer {
    const ctx = this.ctx as AudioContext;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < d.length; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === 'white') d[i] = w;
      else {
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.5;
      }
    }
    return buf;
  }

  private loop(buffer: AudioBuffer): AudioBufferSourceNode {
    const ctx = this.ctx as AudioContext;
    const s = ctx.createBufferSource();
    s.buffer = buffer;
    s.loop = true;
    s.loopStart = Math.random() * 1;
    s.start();
    return s;
  }

  private buildBeds(): void {
    const ctx = this.ctx as AudioContext;
    // the sea: brown noise, low-passed, with a slow swell
    this.seaFilter = ctx.createBiquadFilter();
    this.seaFilter.type = 'lowpass';
    this.seaFilter.frequency.value = 700;
    this.seaGain = ctx.createGain();
    this.seaGain.gain.value = 0;
    // The swell must SCALE the sea, not add to its level: a separate stage swings between 0.5 and 1.0 of whatever the
    // scene's sea gain is, so a silent sea stays silent.
    const swell = ctx.createGain();
    swell.gain.value = 0.75;
    this.loop(this.brown).connect(this.seaFilter).connect(swell).connect(this.seaGain).connect(this.bus);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 1 / 11;
    this.seaLfo = ctx.createGain();
    this.seaLfo.gain.value = 0.25;
    lfo.connect(this.seaLfo).connect(swell.gain);
    lfo.start();

    // a deep rumble for tides (felt more than heard)
    const rumbleFilter = ctx.createBiquadFilter();
    rumbleFilter.type = 'lowpass';
    rumbleFilter.frequency.value = 140;
    this.rumbleGain = ctx.createGain();
    this.rumbleGain.gain.value = 0;
    this.loop(this.brown).connect(rumbleFilter).connect(this.rumbleGain).connect(this.bus);

    // falling and running fresh water
    const fallsFilter = ctx.createBiquadFilter();
    fallsFilter.type = 'bandpass';
    fallsFilter.frequency.value = 2800;
    fallsFilter.Q.value = 0.6;
    this.fallsGain = ctx.createGain();
    this.fallsGain.gain.value = 0;
    this.loop(this.noise).connect(fallsFilter).connect(this.fallsGain).connect(this.bus);

    // rain
    const rainFilter = ctx.createBiquadFilter();
    rainFilter.type = 'highpass';
    rainFilter.frequency.value = 1800;
    this.rainGain = ctx.createGain();
    this.rainGain.gain.value = 0;
    this.loop(this.noise).connect(rainFilter).connect(this.rainGain).connect(this.bus);

    // wind and the whistling statues
    this.windFilter = ctx.createBiquadFilter();
    this.windFilter.type = 'bandpass';
    this.windFilter.frequency.value = 500;
    this.windFilter.Q.value = 1.2;
    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0;
    this.loop(this.noise).connect(this.windFilter).connect(this.windGain).connect(this.bus);
    const wlfo = ctx.createOscillator();
    wlfo.frequency.value = 0.13;
    const wdepth = ctx.createGain();
    wdepth.gain.value = 260;
    wlfo.connect(wdepth).connect(this.windFilter.frequency);
    wlfo.start();
    this.whistleGain = ctx.createGain();
    this.whistleGain.gain.value = 0;
    for (const f of [640, 953]) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      const m = ctx.createOscillator();
      m.frequency.value = rand(0.05, 0.12);
      const md = ctx.createGain();
      md.gain.value = f * 0.05;
      m.connect(md).connect(o.frequency);
      m.start();
      o.connect(this.whistleGain);
      o.start();
      this.whistleOsc.push(o);
    }
    this.whistleGain.connect(this.bus);

    // hints of a world outside: always heard muffled and indistinct, as if through a wall
    this.outLp = ctx.createBiquadFilter();
    this.outLp.type = 'lowpass';
    this.outLp.frequency.value = 1300;
    this.outPan = ctx.createStereoPanner();
    this.outBus = ctx.createGain();
    this.outBus.connect(this.outLp).connect(this.outPan).connect(this.bus);
    const draughtFilter = ctx.createBiquadFilter();
    draughtFilter.type = 'lowpass';
    draughtFilter.frequency.value = 420;
    this.draughtGain = ctx.createGain();
    this.draughtGain.gain.value = 0;
    this.loop(this.brown).connect(draughtFilter).connect(this.draughtGain).connect(this.outBus);
    const hissFilter = ctx.createBiquadFilter();
    hissFilter.type = 'highpass';
    hissFilter.frequency.value = 4500;
    this.hissGain = ctx.createGain();
    this.hissGain.gain.value = 0;
    this.loop(this.noise).connect(hissFilter).connect(this.hissGain).connect(this.outBus);
    this.ringGain = ctx.createGain();
    this.ringGain.gain.value = 0;
    for (const f of [1180, 1203]) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      o.connect(this.ringGain);
      o.start();
    }
    this.ringGain.connect(this.outBus);
    this.trafficFilter = ctx.createBiquadFilter();
    this.trafficFilter.type = 'lowpass';
    this.trafficFilter.frequency.value = 300;
    this.trafficGain = ctx.createGain();
    this.trafficGain.gain.value = 0;
    this.loop(this.brown).connect(this.trafficFilter).connect(this.trafficGain).connect(this.outBus);
  }

  private rebuildReverb(decaySec: number, dampHz: number): void {
    const ctx = this.ctx as AudioContext;
    const key = `${decaySec.toFixed(1)}:${Math.round(dampHz / 100)}`;
    if (key === this.irKey) return;
    this.irKey = key;
    const len = Math.floor(ctx.sampleRate * decaySec);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const t = i / len;
        // darker as it decays; exp(-6.9 * t) is a 60 dB fall over the decay time
        const a = Math.min(0.97, 0.3 + (1 - dampHz / 12000) * 0.5 + t * 0.4);
        lp = a * lp + (1 - a) * (Math.random() * 2 - 1);
        d[i] = lp * Math.exp(-6.9 * t) * (i < 400 ? i / 400 : 1);
      }
    }
    const next = ctx.createConvolver();
    next.buffer = ir;
    next.connect(this.wet);
    this.bus.connect(next);
    const old = this.convolver;
    this.convolver = next;
    if (old) setTimeout(() => { old.disconnect(); }, 2500);
  }

  private applyOutside(a: AudioScene): void {
    const ctx = this.ctx as AudioContext;
    const now = ctx.currentTime;
    const o = a.outside;
    const ease = (p: AudioParam, v: number, tc = 0.5) => p.setTargetAtTime(v, now, tc);
    ease(this.draughtGain.gain, o?.kind === 'draught' ? o.gain * 0.45 : 0);
    ease(this.hissGain.gain, o?.kind === 'draught' ? o.gain * 0.05 : 0);
    ease(this.ringGain.gain, o?.kind === 'draught' ? o.gain * 0.01 : 0);
    ease(this.trafficGain.gain, o?.kind === 'traffic' ? o.gain * 0.5 : 0);
    ease(this.trafficFilter.frequency, 250 + (o?.kind === 'traffic' ? o.gain * 650 : 0), 1.2);
    ease(this.outPan.pan, !o ? 0 : o.bearing === 'left' ? -0.8 : o.bearing === 'right' ? 0.8 : 0);
    ease(this.outLp.frequency, o?.bearing === 'behind' ? 700 : 1300);
    const id = o?.id ?? '';
    if (id !== this.outsideId) {
      this.outsideId = id;
      if (o) {
        this.outsideEvents++;
        if (o.kind === 'wrapper') this.skitter(now + 0.05);
      }
    }
  }

  /** A scrap of wrapper skittering over stone: a few irregular little ticks. */
  private skitter(t: number): void {
    const n = 9 + Math.floor(Math.random() * 6);
    let at = t;
    for (let i = 0; i < n; i++) {
      at += rand(0.05, 0.28);
      this.burst(at, 0.04, 'bandpass', rand(2500, 4500), 4, 0.07, 0, 0.002, this.outBus);
    }
  }

  /** One syllable of something that is almost a voice: a glide of buzz through a vowel-like band, muffled. */
  private syllable(t: number): void {
    const ctx = this.ctx as AudioContext;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    const f0 = rand(95, 150);
    o.frequency.setValueAtTime(f0, t);
    o.frequency.linearRampToValueAtTime(f0 * rand(0.8, 1.25), t + 0.25);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = rand(500, 1500);
    f.Q.value = 3;
    const g = ctx.createGain();
    this.env(g, t, 0.04, 0.08, rand(0.12, 0.25), 0.12);
    o.connect(f).connect(g).connect(this.outBus);
    o.start(t);
    o.stop(t + 0.5);
  }

  private syncPortals(list: Portal[]): void {
    const ctx = this.ctx as AudioContext;
    const keep: PortalVoice[] = [];
    for (const p of list) {
      const key = `${p.side}:${p.toName}`;
      let v = this.voices.find((x) => x.key === key);
      if (!v) {
        const bus = ctx.createGain();
        const pan = ctx.createStereoPanner();
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        bus.connect(lp).connect(pan).connect(this.bus);
        v = { key, p, bus, pan, lp, nextBoom: 0, nextBird: 0, nextDrip: 0 };
      }
      v.p = p;
      v.pan.pan.setTargetAtTime(p.pan, ctx.currentTime, 0.3);
      v.lp.frequency.setTargetAtTime(p.lowpassHz, ctx.currentTime, 0.3);
      keep.push(v);
    }
    for (const v of this.voices) if (!keep.includes(v)) setTimeout(() => { v.bus.disconnect(); v.lp.disconnect(); v.pan.disconnect(); }, 800);
    this.voices = keep;
  }

  private apply(a: AudioScene): void {
    const ctx = this.ctx as AudioContext;
    const now = ctx.currentTime;
    const ease = (p: AudioParam, v: number, tc = 1.2) => p.setTargetAtTime(v, now, tc);
    this.rebuildReverb(a.reverb.decaySec, a.reverb.dampHz);
    ease(this.wet.gain, a.reverb.wet);
    ease(this.dry.gain, 0.85 - a.reverb.wet * 0.5);
    ease(this.lowpass.frequency, 20000 - a.muffle * 19400, 0.6);
    ease(this.seaGain.gain, a.sea.gain * 0.55);
    ease(this.seaFilter.frequency, a.sea.lowpassHz, 1.5);
    // a tide booming next door is felt through the floor before it reaches you
    const farTide = a.portals.reduce((m, p) => Math.max(m, p.tide.kind === 'booming' ? p.tide.gain : 0), 0);
    ease(this.rumbleGain.gain, Math.max(a.tide.kind === 'none' ? 0 : a.tide.gain * 0.5, farTide * 0.35));
    this.syncPortals(a.portals);
    this.applyOutside(a);
    ease(this.fallsGain.gain, a.falls.gain * 0.22);
    ease(this.rainGain.gain, a.rain.gain * 0.3);
    ease(this.windGain.gain, a.wind.gain * 0.3);
    ease(this.whistleGain.gain, a.wind.whistle * 0.05);
  }

  // -------------------------------------------------------------------------------------------------------------
  // Events: drips, booms, birds, footsteps
  // -------------------------------------------------------------------------------------------------------------

  private tickEvents(): void {
    const ctx = this.ctx;
    const a = this.scene;
    if (!ctx || !a || !this.usable()) return;
    const t = ctx.currentTime;
    // drips: from falls and rain, and (rarely) in the hushed halls
    const dripRate = a.hush ? 0.12 : a.falls.gain * 3 + a.rain.gain * 4;
    if (dripRate > 0 && t >= this.nextDrip) {
      this.drip(t + 0.02, a.hush ? 0.14 : 0.1);
      this.nextDrip = t + rand(0.4, 1.4) / Math.max(0.05, dripRate);
    }
    // tide strikes
    if (a.tide.kind !== 'none' && a.tide.kind !== 'submerged' && t >= this.nextBoom) {
      this.boom(t + 0.02, a.tide.kind === 'approach' ? 0.18 * a.tide.gain * 2 : 0.5 * a.tide.gain);
      this.nextBoom = t + a.tide.strikeEverySec * rand(0.75, 1.3);
    }
    // almost-voices: short bursts of near-speech while the event lasts
    if (a.outside?.kind === 'voices' && a.outside.gain > 0.1 && t >= this.nextVoice) {
      this.syllable(t + 0.02);
      this.outsideEvents++;
      this.nextVoice = t + rand(0.3, 0.8);
    }
    // what drifts in through the doorways
    for (const v of this.voices) {
      const p = v.p;
      if (p.tide.kind === 'booming' && t >= v.nextBoom) {
        this.boom(t + 0.02, 0.45 * p.tide.gain * 2, v.bus);
        this.portalEvents++;
        v.nextBoom = t + rand(6, 11);
      }
      if (p.birds.perMinute > 0 && t >= v.nextBird) {
        const ks = speciesFor(p.birds.mode);
        if (ks.length) { this.bird(ks[Math.floor(Math.random() * ks.length)] as Species, t + 0.02, p.birds.loudness * 1.6, v.bus); this.portalEvents++; }
        v.nextBird = t + (60 / p.birds.perMinute) * rand(0.5, 1.6);
      }
      if ((p.falls > 0.06 || p.rain > 0.06) && t >= v.nextDrip) {
        this.drip(t + 0.02, 0.08, v.bus);
        this.portalEvents++;
        v.nextDrip = t + rand(0.5, 1.5) / Math.max(0.1, (p.falls + p.rain) * 3);
      }
    }
    // birds
    const kinds = speciesFor(a.birds.mode);
    if (a.birds.perMinute > 0 && kinds.length > 0 && t >= this.nextBird) {
      this.bird(kinds[Math.floor(Math.random() * kinds.length)] as Species, t + 0.02, a.birds.loudness);
      this.nextBird = t + (60 / a.birds.perMinute) * rand(0.5, 1.6);
    }
  }

  private env(g: GainNode, t: number, attack: number, hold: number, release: number, peak: number): void {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.setValueAtTime(peak, t + attack + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);
  }

  private burst(t: number, dur: number, type: BiquadFilterType, freq: number, q: number, peak: number, pan = 0, attack = 0.004, out?: AudioNode): void {
    const ctx = this.ctx as AudioContext;
    const s = ctx.createBufferSource();
    s.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    const p = ctx.createStereoPanner();
    p.pan.value = pan;
    this.env(g, t, attack, 0, dur, peak);
    s.connect(f).connect(g).connect(p).connect(out ?? this.bus);
    s.start(t, Math.random() * 2);
    s.stop(t + dur + attack + 0.05);
  }

  private tone(t: number, f0: number, f1: number, dur: number, type: OscillatorType, peak: number, pan = 0, attack = 0.005, out?: AudioNode): void {
    const ctx = this.ctx as AudioContext;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = ctx.createGain();
    const p = ctx.createStereoPanner();
    p.pan.value = pan;
    this.env(g, t, attack, 0, dur, peak);
    o.connect(g).connect(p).connect(out ?? this.bus);
    o.start(t);
    o.stop(t + dur + attack + 0.05);
  }

  private drip(t: number, peak: number, out?: AudioNode): void {
    this.tone(t, rand(900, 2200), rand(500, 1100), 0.12, 'sine', peak, out ? 0 : rand(-0.8, 0.8), 0.005, out);
  }

  private boom(t: number, peak: number, out?: AudioNode): void {
    this.tone(t, 90, 38, 0.9, 'sine', peak, 0, 0.005, out);
    this.burst(t, 0.6, 'lowpass', 300, 0.5, peak * 0.6, 0, 0.004, out);
  }

  /** A bird call. Through a doorway it keeps the doorway's own placement (pan 0 here; the portal bus pans it). */
  private bird(sp: Species, t: number, loud: number, out?: AudioNode): void {
    const pan = out ? 0 : rand(-0.9, 0.9);
    const v = 0.05 + loud * 0.08;
    switch (sp) {
      case 'sparrow': {
        const n = 2 + Math.floor(Math.random() * 4);
        for (let i = 0; i < n; i++) this.tone(t + i * rand(0.07, 0.13), rand(3200, 5200), rand(2600, 6000), rand(0.04, 0.08), 'sine', v, pan, 0.005, out);
        break;
      }
      case 'gull': {
        const n = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < n; i++) {
          const s = t + i * 0.38;
          this.tone(s, 1500, 700, 0.3, 'sawtooth', v * 0.6, pan, 0.03, out);
          this.burst(s, 0.28, 'bandpass', 1400, 2, v * 0.8, pan, 0.03, out);
        }
        break;
      }
      case 'rook': {
        const n = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < n; i++) {
          const s = t + i * 0.33;
          this.tone(s, 420, 260, 0.22, 'sawtooth', v * 0.7, pan, 0.02, out);
          this.burst(s, 0.2, 'bandpass', 900, 1.5, v * 0.7, pan, 0.02, out);
        }
        break;
      }
      case 'albatross': {
        const n = 7 + Math.floor(Math.random() * 6);
        for (let i = 0; i < n; i++) this.burst(t + i * 0.045, 0.025, 'bandpass', rand(1800, 2600), 6, v * 1.4, pan, 0.001, out);
        this.tone(t + 0.1, 110, 85, 0.7, 'sawtooth', v * 0.35, pan, 0.1, out);
        break;
      }
      case 'flock':
        for (let i = 0; i < 6; i++) this.burst(t + i * 0.12, 0.5, 'bandpass', rand(2500, 5000), 0.8, v * 0.9, out ? 0 : rand(-1, 1), 0.15, out);
        break;
      case 'rustle':
        this.burst(t, rand(0.1, 0.25), 'highpass', 3500, 0.7, v * 0.7, pan, 0.02, out);
        break;
    }
  }

  /**
   * The visitor's own muttering: a quiet murmur placed in the room, so it gets this hall's reverb, the doorway
   * muffling and the water hush like everything else. Returns how many seconds it lasts, or 0 if nothing was played.
   */
  mutter(text: string): number {
    const ctx = this.ctx;
    if (!ctx || !this.usable()) return 0;
    const plan = babblePlan(text, 108 + Math.random() * 24);
    const t0 = ctx.currentTime + 0.05;
    let end = 0;
    for (const e of plan) { this.murmurEvent(t0, e); end = Math.max(end, e.t + e.dur); }
    return end;
  }

  private murmurEvent(t0: number, e: BabbleEvent): void {
    const ctx = this.ctx as AudioContext;
    const t = t0 + e.t;
    const loud = 0.11 * e.level; // quiet: this is a person under their breath
    if (e.kind === 'vowel') {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(e.f0, t);
      o.frequency.linearRampToValueAtTime(e.f0 * 0.97, t + e.dur);
      const a = ctx.createBiquadFilter(); a.type = 'bandpass'; a.frequency.value = e.f1; a.Q.value = 6;
      const b = ctx.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = e.f2; b.Q.value = 8;
      const g = ctx.createGain();
      this.env(g, t, 0.025, e.dur * 0.55, e.dur * 0.35, loud);
      o.connect(a).connect(g);
      o.connect(b).connect(g);
      g.connect(this.bus);
      o.start(t);
      o.stop(t + e.dur + 0.1);
    } else {
      this.burst(t, e.dur, 'bandpass', e.f1, 1.2, loud * (e.kind === 'stop' ? 0.9 : 0.6), 0, 0.006, this.bus);
    }
  }

  /** One footstep on a surface. Called when the visitor moves. */
  footstep(surface: Surface): void {
    const ctx = this.ctx;
    if (!ctx) return;
    if (!this.usable()) return;
    const t = ctx.currentTime + 0.01;
    switch (surface) {
      case 'marble': this.burst(t, 0.07, 'bandpass', 1500, 1.2, 0.35); this.tone(t, 160, 90, 0.08, 'sine', 0.2); break;
      case 'wet': this.burst(t, 0.12, 'bandpass', 900, 0.9, 0.35); this.burst(t + 0.02, 0.18, 'highpass', 3000, 0.5, 0.15); break;
      case 'shallow': this.burst(t, 0.35, 'bandpass', 600, 0.6, 0.5); this.burst(t + 0.05, 0.3, 'highpass', 2500, 0.5, 0.25); break;
      case 'rubble': for (let i = 0; i < 5; i++) this.burst(t + i * 0.025, 0.05, 'bandpass', rand(900, 3000), 1.5, 0.28); break;
    }
  }
}
