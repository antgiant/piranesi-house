// Web Audio realisation of an AudioScene. Entirely procedural: no sample files, so no licensing and a tiny download.
// Everything audible comes through one reverb whose length follows the hall, then one low-pass for cloud and water.
// Randomness here (bird timing, drips) is cosmetic and deliberately not part of the deterministic world.

import type { AudioScene, Surface } from './director';

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
    default: return [];
  }
}

const rand = (a: number, b: number): number => a + Math.random() * (b - a);

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

  get started(): boolean { return this.ctx !== null; }

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
    ease(this.rumbleGain.gain, a.tide.kind === 'none' ? 0 : a.tide.gain * 0.5);
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
    if (!ctx || !a || ctx.state !== 'running') return;
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

  private burst(t: number, dur: number, type: BiquadFilterType, freq: number, q: number, peak: number, pan = 0, attack = 0.004): void {
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
    s.connect(f).connect(g).connect(p).connect(this.bus);
    s.start(t, Math.random() * 2);
    s.stop(t + dur + attack + 0.05);
  }

  private tone(t: number, f0: number, f1: number, dur: number, type: OscillatorType, peak: number, pan = 0, attack = 0.005): void {
    const ctx = this.ctx as AudioContext;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = ctx.createGain();
    const p = ctx.createStereoPanner();
    p.pan.value = pan;
    this.env(g, t, attack, 0, dur, peak);
    o.connect(g).connect(p).connect(this.bus);
    o.start(t);
    o.stop(t + dur + attack + 0.05);
  }

  private drip(t: number, peak: number): void {
    this.tone(t, rand(900, 2200), rand(500, 1100), 0.12, 'sine', peak, rand(-0.8, 0.8));
  }

  private boom(t: number, peak: number): void {
    this.tone(t, 90, 38, 0.9, 'sine', peak);
    this.burst(t, 0.6, 'lowpass', 300, 0.5, peak * 0.6);
  }

  private bird(sp: Species, t: number, loud: number): void {
    const pan = rand(-0.9, 0.9);
    const v = 0.05 + loud * 0.08;
    switch (sp) {
      case 'sparrow': {
        const n = 2 + Math.floor(Math.random() * 4);
        for (let i = 0; i < n; i++) this.tone(t + i * rand(0.07, 0.13), rand(3200, 5200), rand(2600, 6000), rand(0.04, 0.08), 'sine', v, pan);
        break;
      }
      case 'gull': {
        const n = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < n; i++) {
          const s = t + i * 0.38;
          this.tone(s, 1500, 700, 0.3, 'sawtooth', v * 0.6, pan, 0.03);
          this.burst(s, 0.28, 'bandpass', 1400, 2, v * 0.8, pan, 0.03);
        }
        break;
      }
      case 'rook': {
        const n = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < n; i++) {
          const s = t + i * 0.33;
          this.tone(s, 420, 260, 0.22, 'sawtooth', v * 0.7, pan, 0.02);
          this.burst(s, 0.2, 'bandpass', 900, 1.5, v * 0.7, pan, 0.02);
        }
        break;
      }
      case 'albatross': {
        const n = 7 + Math.floor(Math.random() * 6);
        for (let i = 0; i < n; i++) this.burst(t + i * 0.045, 0.025, 'bandpass', rand(1800, 2600), 6, v * 1.4, pan, 0.001);
        this.tone(t + 0.1, 110, 85, 0.7, 'sawtooth', v * 0.35, pan, 0.1);
        break;
      }
      case 'flock':
        for (let i = 0; i < 6; i++) this.burst(t + i * 0.12, 0.5, 'bandpass', rand(2500, 5000), 0.8, v * 0.9, rand(-1, 1), 0.15);
        break;
      case 'rustle':
        this.burst(t, rand(0.1, 0.25), 'highpass', 3500, 0.7, v * 0.7, pan, 0.02);
        break;
    }
  }

  /** One footstep on a surface. Called when the visitor moves. */
  footstep(surface: Surface): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime + 0.01;
    switch (surface) {
      case 'marble': this.burst(t, 0.07, 'bandpass', 1500, 1.2, 0.35); this.tone(t, 160, 90, 0.08, 'sine', 0.2); break;
      case 'wet': this.burst(t, 0.12, 'bandpass', 900, 0.9, 0.35); this.burst(t + 0.02, 0.18, 'highpass', 3000, 0.5, 0.15); break;
      case 'shallow': this.burst(t, 0.35, 'bandpass', 600, 0.6, 0.5); this.burst(t + 0.05, 0.3, 'highpass', 2500, 0.5, 0.25); break;
      case 'rubble': for (let i = 0; i < 5; i++) this.burst(t + i * 0.025, 0.05, 'bandpass', rand(900, 3000), 1.5, 0.28); break;
    }
  }
}
