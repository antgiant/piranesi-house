// Web Audio realisation of an AudioScene. Entirely procedural: no sample files, so no licensing and a tiny download.
// Everything audible comes through one reverb whose length follows the hall, then one low-pass for cloud and water.
// Sounds are placed in 3D with PannerNodes (HRTF, so headphones give front/back and up/down as well as left/right). The
// listener stays at the origin facing -Z; see spatial.ts for the geometry. Birds are individual voices that can fly past, with
// Doppler and air absorption done by hand (the PannerNode has neither). Tiny, frequent sounds share a fixed ring of panners.
// Randomness here (bird timing, drips) is cosmetic and deliberately not part of the deterministic world.

import { babblePlan, type BabbleEvent } from './babble';
import { DEEP_BASS } from './bass';
import { Falls } from './falls';
import { Stream } from './stream';
import { Wind } from './wind';
import { CHIRP, bubbleDamping, dripPitch } from './bubbles';
import { Patter } from './patter';
import { waterBuffer } from './buffers';
import { StairsWater } from './stairs';
import { Through } from './through';
import { Sea } from './sea';
import type { AudioScene, Bearing, Bed, Leak, Portal, Surface } from './director';
import type { BirdSeason } from '../sim/seasons';
import { REF_DISTANCE, airCutoffHz, bearingPosition, distanceOf, dopplerRatio, flybyPath, perchPosition, polar, positionAt, stageCell, toPolar, velocityOf, type Flyby, type Vec3 } from './spatial';

export type Species = 'goose' | 'chick' | 'sparrow' | 'gull' | 'rook' | 'albatross' | 'flock' | 'rustle' | 'blackbird' | 'swift' | 'wader' | 'dove' | 'owl' | 'starling';

export function speciesFor(mode: AudioScene['birds']['mode'], season?: Pick<BirdSeason, 'swifts' | 'waders' | 'songbirds' | 'owls' | 'chicks' | 'fledglings'> & { geese?: boolean }): Species[] {
  let list: Species[];
  switch (mode) {
    case 'nesting': list = ['gull']; break;
    case 'noisy': list = ['rook']; break;
    case 'chick': list = ['albatross', 'albatross', 'rustle']; break;
    case 'murmuration': list = ['flock', 'starling', 'starling']; break;
    case 'roosting': list = ['rustle', 'rustle', 'rustle', 'rustle', 'rustle', 'rustle', 'rustle', 'owl']; break;
    case 'sheltering': list = ['sparrow', 'sparrow', 'blackbird', 'rook', 'dove']; break;
    case 'foraging': list = ['sparrow', 'sparrow', 'blackbird', 'blackbird', 'dove', 'rustle']; break;
    case 'soaring': list = ['gull', 'swift', 'swift', 'swift']; break;
    case 'shore': list = ['gull', 'wader', 'wader', 'rustle']; break;
    case 'passing': return ['goose'];
    default: return [];
  }
  if (!season) return list;
  // The year in the voices. Out of season a bird is not here (the swifts, the waders), does not sing (the blackbird gives way to the
  // sparrow), or is quiet (the owl); and in the nesting months the chicks beg.
  list = list.filter((s) => !(s === 'swift' && !season.swifts) && !(s === 'wader' && !season.waders) && !(s === 'blackbird' && !season.songbirds) && !(s === 'owl' && !season.owls));
  if (mode === 'soaring' && season.geese) list = [...list, 'goose', 'goose'];
  if (mode === 'nesting' && season.chicks) list = ['gull', 'chick', 'chick'];
  else if (mode === 'nesting' && season.fledglings) list = ['gull', 'chick', 'gull', 'chick'];
  if ((mode === 'foraging' || mode === 'sheltering') && season.chicks) list = [...list, 'chick'];
  if (list.length === 0) list = mode === 'soaring' || mode === 'shore' ? ['gull'] : ['rustle'];
  return list;
}

const rand = (a: number, b: number): number => a + Math.random() * (b - a);

/** Where a sound comes from. A number is the old -1..1 left/right pan (placed on an arc in front); 0 is "everywhere", unplaced. */
export type Place = number | Vec3;

/** Species that cross the sky while they call, how long the call is tracked for, and how fast they fly (m/s). */
const FLIERS: Partial<Record<Species, { dur: number; speed: number; height: [number, number] }>> = {
  goose: { dur: 3.4, speed: 16, height: [14, 30] },
  swift: { dur: 1.4, speed: 22, height: [8, 26] },
  gull: { dur: 1.7, speed: 11, height: [5, 18] },
  wader: { dur: 1.3, speed: 14, height: [2, 6] },
};
/** In these bird scenes the birds that can fly are overhead and moving; in the rest they are perched. */
const FLYING_MODES: ReadonlySet<AudioScene['birds']['mode']> = new Set(['soaring', 'passing', 'shore']);

const FEET: Vec3 = { x: 0, y: -1.5, z: -0.4 };

/** What a bird (or anything moving) is heard through: where it is, over the seconds it is tracked. */
interface Voice { input: GainNode; doppler: ((t: number) => number) | null; path: Flyby | null }

/** One doorway's worth of sound from the next hall: its own pan, its own muffling, its own timing. */
interface PortalVoice {
  key: string;
  p: Portal;
  bus: GainNode;
  pan: PannerNode;
  lp: BiquadFilterNode;
  nextBoom: number;
  nextBird: number;
  nextDrip: number;
}

/** The sea and falling water from one neighbouring hall, heard through the wall or opening (see through.ts). */
interface BedVoice { key: string; v: Through }

/** One leak in the hall as the engine plays it: a place of its own that moves as the listener does, a pitch, a rate, and when it next drips. */
interface LeakVoice { key: string; place: { input: AudioNode; move: (at: Vec3, tc: number) => void; dispose: () => void }; pitch: number; perMin: number; gain: number; wet: boolean; next: number }

export class AudioEngine {
  /** The sea, built from measured recordings (sea.ts). */
  private sea: Sea | null = null;
  private patter: Patter | null = null;
  private falls: Falls | null = null;
  private stream: Stream | null = null;
  private wind: Wind | null = null;
  private stairs: StairsWater | null = null;
  private leakVoices: LeakVoice[] = [];
  /** Two high-passes in a row, so the cut for small speakers is steep (24 dB an octave). */
  private bassHp!: BiquadFilterNode;
  private bassHp2!: BiquadFilterNode;
  private bassShelf!: BiquadFilterNode;
  private bassTrim!: GainNode;
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
  private nextBoom = 0;
  private nextThunder = 0;
  /** Bird calls and thunderclaps played, for the end-to-end tests. */
  private calls = 0;
  private volume = 0.8;
  private muted = false;

  private rumbleGain!: GainNode;
  private rainGain!: GainNode;
  /** Sea and falling water heard through the doorways and walls. */
  private beds: BedVoice[] = [];
  private outBus!: GainNode;
  private outLp!: BiquadFilterNode;
  private outPan!: PannerNode;
  /** Shared panners for small frequent sounds, made when first needed (see stageCell). */
  private stage = new Map<string, GainNode>();
  /** While a moving bird's call is being scheduled, the pitch ratio at a given time; applied by tone() and burst(). */
  private doppler: ((t: number) => number) | null = null;
  private draughtGain!: GainNode;
  private hissGain!: GainNode;
  private ringGain!: GainNode;
  private trafficGain!: GainNode;
  private trafficFilter!: BiquadFilterNode;

  get started(): boolean { return this.ctx !== null; }
  /** True when the browser is actually letting the sound play (it may refuse until you tap or press a key). */
  get running(): boolean { return this.ctx?.state === 'running'; }

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

  /** iOS 16.4+ Audio Session API: "ambient" lets the House's sounds mix with other audio instead of being interrupted by it. */
  private applySessionType(): void {
    try { const s = (navigator as unknown as { audioSession?: { type: string } }).audioSession; if (s) s.type = 'ambient'; } catch { /* unsupported */ }
  }

  /**
   * While the browser's speech voice is talking the sound engine must not try to take the audio back: on iPhones, speech takes
   * over the audio session (the House's sounds drop out for a moment), and resuming the engine at once cuts the voice off after a
   * syllable. So while speech is going the engine stays out of the way, and takes up again a moment after it ends.
   */
  yielding = false;
  private yieldTimer: ReturnType<typeof setTimeout> | null = null;
  yieldToSpeech(on: boolean): void {
    if (this.yieldTimer) { clearTimeout(this.yieldTimer); this.yieldTimer = null; }
    if (on) { this.yielding = true; return; }
    if (!this.yielding) return;
    this.yieldTimer = setTimeout(() => { this.yielding = false; this.yieldTimer = null; this.resume(); }, 500);
  }

  resume(): void {
    if (this.yielding) return;
    const c = this.ctx;
    if (c && c.state !== 'running' && c.state !== 'closed') void c.resume().catch(() => undefined);
  }

  /** Must be called from a user gesture (browsers refuse to make sound otherwise). */
  async start(): Promise<void> {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      return;
    }
    this.applySessionType();
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    this.ctx = ctx;
    this.setupListener();
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
    // the deep-bass stage (see bass.ts): after the muffle, before the volume
    // (for a high-pass, Web Audio's Q is in dB: -3 is the flat, Butterworth response; 0.707 would be a small resonance)
    this.bassHp = ctx.createBiquadFilter(); this.bassHp.type = 'highpass'; this.bassHp.Q.value = -3.0103;
    this.bassHp2 = ctx.createBiquadFilter(); this.bassHp2.type = 'highpass'; this.bassHp2.Q.value = -3.0103;
    this.bassShelf = ctx.createBiquadFilter(); this.bassShelf.type = 'lowshelf'; this.bassShelf.frequency.value = 60;
    this.bassTrim = ctx.createGain();
    this.bassHp.frequency.value = DEEP_BASS.highpassHz;
    this.bassHp2.frequency.value = DEEP_BASS.highpassHz;
    this.bassShelf.gain.value = DEEP_BASS.shelfDb;
    this.bassTrim.gain.value = DEEP_BASS.trim;
    this.lowpass.connect(this.bassHp).connect(this.bassHp2).connect(this.bassShelf).connect(this.bassTrim).connect(this.master);
    this.master.connect(this.analyser);
    this.analyser.connect(ctx.destination);
    this.noise = this.makeNoise(4, 'white');
    this.brown = this.makeNoise(8, 'brown');
    this.buildBeds();
    this.sea = new Sea({ ctx, out: this.bus, spot: (at) => this.spot(at) });
    this.sea.setThump(DEEP_BASS.thump);
    this.timer = setInterval(() => this.tickEvents(), 200);
    if (this.scene) this.apply(this.scene);
    if (ctx.state === 'suspended') await ctx.resume();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    void this.ctx?.close();
    this.ctx = null;
    this.sea?.dispose();
    this.sea = null;
    this.patter?.dispose();
    this.patter = null;
    this.falls?.dispose();
    this.falls = null;
    this.stream?.dispose();
    this.stream = null;
    this.wind?.dispose();
    this.wind = null;
    this.stairs?.dispose();
    this.stairs = null;
    for (const b of this.beds) b.v.dispose();
    this.beds = [];
    for (const l of this.leakVoices) l.place.dispose();
    this.leakVoices = [];
    this.stage.clear();
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
  stats(): { voices: number; portalEvents: number; outsideEvents: number; calls: number } {
    return { voices: this.voices.length, portalEvents: this.portalEvents, outsideEvents: this.outsideEvents, calls: this.calls };
  }

  /** Play one bird call, or thunder, now. For the end-to-end tests and for trying the sounds out. */
  demo(kind: Species | 'thunder'): void {
    const ctx = this.ctx;
    if (!ctx) return;
    if (kind === 'thunder') this.thunder(ctx.currentTime + 0.02, 0.8);
    else this.bird(kind, ctx.currentTime + 0.02, 0.8);
  }

  /** Play a bird call from a given point, or along a given path (or a random fly-past with 'fly'). For tests and for trying the sounds out. */
  demoAt(kind: Species, where: Vec3 | Flyby | 'fly', loud = 0.8): void {
    if (this.ctx) this.bird(kind, this.ctx.currentTime + 0.02, loud, undefined, where);
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

  // -------------------------------------------------------------------------------------------------------------
  // Placing sound in space
  // -------------------------------------------------------------------------------------------------------------

  /** The listener is the visitor: at the origin, facing -Z, head up. It never moves; sources are placed around it. */
  private setupListener(): void {
    const l = (this.ctx as AudioContext).listener;
    if (l.positionX) {
      l.positionX.value = 0; l.positionY.value = 0; l.positionZ.value = 0;
      l.forwardX.value = 0; l.forwardY.value = 0; l.forwardZ.value = -1;
      l.upX.value = 0; l.upY.value = 1; l.upZ.value = 0;
    } else {
      l.setPosition(0, 0, 0); // older Safari has only the method forms
      l.setOrientation(0, 0, -1, 0, 1, 0);
    }
  }

  /** A panner at a point. HRTF gives headphones real direction; loudness is unchanged within REF_DISTANCE and falls beyond it. */
  private makePanner(at: Vec3, hrtf = true): PannerNode {
    const p = (this.ctx as AudioContext).createPanner();
    p.panningModel = hrtf ? 'HRTF' : 'equalpower';
    p.distanceModel = 'inverse';
    p.refDistance = REF_DISTANCE;
    p.rolloffFactor = 1.1;
    p.maxDistance = 10000;
    this.placeAt(p, at);
    return p;
  }

  /** Move a panner to a point, at once, or (with `tc`) easing there so a turn of the head does not click. */
  private placeAt(p: PannerNode, at: Vec3, tc?: number): void {
    if (!p.positionX) { p.setPosition(at.x, at.y, at.z); return; }
    if (tc === undefined) { p.positionX.value = at.x; p.positionY.value = at.y; p.positionZ.value = at.z; return; }
    const now = (this.ctx as AudioContext).currentTime;
    p.positionX.setTargetAtTime(at.x, now, tc);
    p.positionY.setTargetAtTime(at.y, now, tc);
    p.positionZ.setTargetAtTime(at.z, now, tc);
  }

  /**
   * Where to send a small sound so that it is heard from `place`: straight to the mix for 0 ("everywhere"), otherwise into a
   * shared panner for that direction, made the first time it is needed.
   */
  private spot(place: Place): AudioNode {
    if (place === 0) return this.bus;
    const at = typeof place === 'number' ? polar(place * 70, 0, REF_DISTANCE) : place;
    const cell = stageCell(at);
    let g = this.stage.get(cell.key);
    if (!g) {
      const ctx = this.ctx as AudioContext;
      g = ctx.createGain();
      g.connect(this.makePanner(polar(cell.az, cell.el, REF_DISTANCE))).connect(this.bus);
      this.stage.set(cell.key, g);
    }
    return g;
  }

  /**
   * One voice with a panner of its own: a bird on a perch (a point) or crossing the sky (a path). The path is followed by the
   * panner's position, the air takes the highs off with distance, and a Doppler function says how much to bend each note's
   * pitch at the time it is played. Torn down shortly after the call ends.
   */
  private voice(t: number, at: Vec3 | Flyby, tail = 1.5): Voice {
    const ctx = this.ctx as AudioContext;
    const path = 'from' in at ? at : null;
    const start = path ? path.from : (at as Vec3);
    const input = ctx.createGain();
    const air = ctx.createBiquadFilter();
    air.type = 'lowpass';
    const panner = this.makePanner(start);
    input.connect(air).connect(panner).connect(this.bus);
    air.frequency.value = airCutoffHz(distanceOf(start));
    let doppler: Voice['doppler'] = null;
    let life = Math.max(0, t - ctx.currentTime) + tail;
    if (path && panner.positionX) {
      const N = 14;
      panner.positionX.setValueAtTime(start.x, t);
      panner.positionY.setValueAtTime(start.y, t);
      panner.positionZ.setValueAtTime(start.z, t);
      air.frequency.setValueAtTime(airCutoffHz(distanceOf(start)), t);
      for (let i = 1; i <= N; i++) {
        const u = i / N, at2 = t + u * path.dur, p = positionAt(path, u);
        panner.positionX.linearRampToValueAtTime(p.x, at2);
        panner.positionY.linearRampToValueAtTime(p.y, at2);
        panner.positionZ.linearRampToValueAtTime(p.z, at2);
        air.frequency.linearRampToValueAtTime(airCutoffHz(distanceOf(p)), at2);
      }
      const v = velocityOf(path);
      doppler = (tt) => dopplerRatio(positionAt(path, Math.max(0, Math.min(1, (tt - t) / path.dur))), v);
      life += path.dur;
    } else if (path) {
      this.placeAt(panner, positionAt(path, 0.5)); // an old browser without AudioParam positions: hold still in the middle
    }
    setTimeout(() => { input.disconnect(); air.disconnect(); panner.disconnect(); }, life * 1000);
    return { input, doppler, path };
  }

  private buildBeds(): void {
    const ctx = this.ctx as AudioContext;
    // a deep rumble for tides (felt more than heard)
    const rumbleFilter = ctx.createBiquadFilter();
    rumbleFilter.type = 'lowpass';
    rumbleFilter.frequency.value = 140;
    this.rumbleGain = ctx.createGain();
    this.rumbleGain.gain.value = 0;
    this.loop(this.brown).connect(rumbleFilter).connect(this.rumbleGain).connect(this.bus);

    // rain
    // Rain on hard floor and stone: the same sound as water running over steps (a smooth broad body with a crisp spatter of spray over it), which
    // the owner found right for it, in place of the old thin hiss. It all round you, not at a point.
    this.rainGain = ctx.createGain();
    this.rainGain.gain.value = 0;
    {
      const bq = (type: BiquadFilterType, f: number): BiquadFilterNode => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = -3.01; return b; };
      const spray = ctx.createGain(); spray.gain.value = 0.6;
      this.loop(waterBuffer(ctx, 'pink')).connect(bq('highpass', 260)).connect(bq('lowpass', 9500)).connect(this.rainGain);
      this.loop(waterBuffer(ctx, 'foam')).connect(bq('highpass', 1800)).connect(spray).connect(this.rainGain);
      this.rainGain.connect(this.bus);
    }

    // hints of a world outside: always heard muffled and indistinct, as if through a wall
    this.outLp = ctx.createBiquadFilter();
    this.outLp.type = 'lowpass';
    this.outLp.frequency.value = 1300;
    this.outPan = this.makePanner(bearingPosition('ahead', 0));
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
    if (o) this.placeAt(this.outPan, bearingPosition(o.bearing, 0, 5), 0.5);
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

  /** Sea and falling water from next door: a muffled, steady presence behind the wall, shaped by the opening it comes through. */
  /** The sea and falls of the halls next door, each through its own opening. */
  private syncBeds(list: Bed[]): void {
    const ctx = this.ctx as AudioContext;
    const keep: BedVoice[] = [];
    const place = (at: Vec3) => this.placeHandle(at);
    for (const b of list) {
      const at = this.doorPlace(b);
      let v = this.beds.find((x) => x.key === b.key);
      if (!v) v = { key: b.key, v: new Through({ ctx, place }, at) };
      v.v.set({ sea: b.sea, falls: b.falls, lowpassHz: b.lowpassHz, at });
      keep.push(v);
    }
    for (const v of this.beds) if (!keep.includes(v)) v.v.retire();
    this.beds = keep;
  }

  /** The leaks heard from here: each at its own fixed place (moved as you walk, so it stays where it is in the hall), dripping on its own time. */
  private syncLeaks(list: Leak[]): void {
    const t = (this.ctx as AudioContext).currentTime;
    const keep: LeakVoice[] = [];
    for (const l of list) {
      const at = polar(l.az, l.el, 5);
      let v = this.leakVoices.find((x) => x.key === l.key);
      if (v) v.place.move(at, 0.3);
      else v = { key: l.key, place: this.placeHandle(at), pitch: l.pitch, perMin: l.perMin, gain: l.gain, wet: l.wet, next: t + rand(0, 60 / Math.max(0.5, l.perMin)) };
      v.pitch = l.pitch; v.perMin = l.perMin; v.gain = l.gain; v.wet = l.wet;
      keep.push(v);
    }
    for (const v of this.leakVoices) if (!keep.includes(v)) setTimeout(() => v.place.dispose(), 4000); // let the last drop's tail finish
    this.leakVoices = keep;
  }

  /**
   * One drop from a leak, a little different each time. Into water it is a bubble's "bloop" (a short ring that rises as it fades, as the recordings
   * of drips in cool, wet caves have). Onto stone it is a click and a short damped ring with no glide at all: a rising chirp at two or three kilohertz
   * is just what a bird does, and drips falling on stone do not do it.
   */
  private leakDrip(v: LeakVoice, t: number): void {
    const f0 = v.pitch * rand(0.88, 1.12), loud = v.gain * rand(0.6, 1.25);
    if (v.wet) {
      const d = bubbleDamping(f0), dur = 9.2 / d;
      this.tone(t, f0, f0 * (1 + CHIRP * d * dur * 0.35), dur, 'sine', 0.1 * loud * Math.pow(1450 / f0, 0.7), 0, 0.001, v.place.input);
      return;
    }
    const ring = rand(0.05, 0.14); // how long the stone rings
    this.burst(t, 0.012, 'bandpass', f0 * 1.4, 2.5, 0.16 * loud, 0, 0.0004, v.place.input);                                   // the impact itself
    this.tone(t, f0, f0 * 0.985, ring, 'sine', 0.07 * loud * Math.pow(1450 / f0, 0.5), 0, 0.0008, v.place.input);               // its ring, falling a hair
    this.tone(t, f0 * 2.43, f0 * 2.4, ring * 0.45, 'sine', 0.025 * loud, 0, 0.0008, v.place.input);                              // and a higher, shorter partial
  }

  /** A panner of its own that can be moved, for the water voices that have a place in the hall. */
  private placeHandle(at: Vec3): { input: AudioNode; move: (to: Vec3, tc: number) => void; dispose: () => void } {
    const p = this.makePanner(at);
    p.connect(this.bus);
    return { input: p, move: (to, tc) => this.placeAt(p, to, tc), dispose: () => p.disconnect() };
  }

  /** Where a doorway is heard from: its true direction when the visitor's place in the hall is known, else the nearest of four. */
  private doorPlace(d: { bearing: Bearing; pan: number; az?: number }): Vec3 {
    return d.az !== undefined ? polar(d.az, 0, REF_DISTANCE) : bearingPosition(d.bearing, d.pan);
  }

  private syncPortals(list: Portal[]): void {
    const ctx = this.ctx as AudioContext;
    const keep: PortalVoice[] = [];
    for (const p of list) {
      const key = `${p.side}:${p.toName}`;
      let v = this.voices.find((x) => x.key === key);
      if (!v) {
        const bus = ctx.createGain();
        const pan = this.makePanner(this.doorPlace(p));
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        bus.connect(lp).connect(pan).connect(this.bus);
        v = { key, p, bus, pan, lp, nextBoom: 0, nextBird: 0, nextDrip: 0 };
      }
      v.p = p;
      this.placeAt(v.pan, this.doorPlace(p), 0.3);
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
    this.sea?.set(a.sea);
    // rain that lands on water has its own patter (made the first time it is needed)
    const onWater = (a.rain.gain / 0.75) * (a.rain.onWater ?? 0);
    if (onWater > 0.02 && !this.patter) this.patter = new Patter({ ctx, spot: (at) => this.spot(at) });
    this.patter?.set(onWater);
    // falling and running water: made the first time there is any, then follows the scene
    const solo = a.stream?.solo ?? false;
    if (a.falls.gain > 0.02 && !solo && !this.falls) {
      this.falls = new Falls({
        ctx, spot: (at) => this.spot(at),
        place: (at) => this.placeHandle(at),
      });
    }
    // water running down the great stair, and into the shaft beneath it
    if (a.stairs.flow > 0.02 && !this.stairs) this.stairs = new StairsWater({ ctx, place: (at) => this.placeHandle(at) });
    this.stairs?.set({ flow: a.stairs.flow, az: a.stairs.az ?? toPolar(bearingPosition(a.stairs.bearing, 0)).az });
    if (a.stream && !this.stream) this.stream = new Stream({ ctx, place: (at) => this.placeHandle(at) });
    this.stream?.set({ flow: a.stream?.flow ?? 0, near: a.stream?.near ?? 0, dist: a.stream?.dist ?? 5, at: a.stream ? (a.stream.az !== undefined ? polar(a.stream.az, 0, 6) : bearingPosition(a.stream.bearing, a.stream.pan, 6)) : { x: 0, y: 0, z: -6 } });
    this.falls?.set({ dripping: a.water.dripping, gain: solo ? 0 : a.falls.amount, near: a.falls.near, dist: a.falls.dist, at: a.falls.az !== undefined ? polar(a.falls.az, 0, 5) : bearingPosition(a.falls.bearing, a.falls.pan, 5), space: a.space });
    // a tide booming next door is felt through the floor before it reaches you
    const farTide = a.portals.reduce((m, p) => Math.max(m, p.tide.kind === 'booming' ? p.tide.gain : 0), 0);
    ease(this.rumbleGain.gain, Math.max(a.tide.kind === 'none' ? 0 : a.tide.gain * 0.5, farTide * 0.35));
    this.syncPortals(a.portals);
    this.syncBeds(a.beds);
    this.syncLeaks(a.leaks ?? []);
    this.applyOutside(a);
    ease(this.rainGain.gain, a.rain.gain * 0.2);
    if (a.wind.gain > 0.01 && !this.wind) this.wind = new Wind({ ctx, spot: (at) => this.spot(at) });
    this.wind?.set({ gain: a.wind.gain, mps: a.wind.mps ?? a.wind.gain * 30, whistle: a.wind.whistle });
  }

  // -------------------------------------------------------------------------------------------------------------
  // Events: drips, booms, birds, footsteps
  // -------------------------------------------------------------------------------------------------------------

  private tickEvents(): void {
    const ctx = this.ctx;
    const a = this.scene;
    if (!ctx || !a || !this.usable()) return;
    const t = ctx.currentTime;
    // drips: each leak in the hall drips from its own place, at its own pitch and rate (the falls make their own drips: see falls.ts)
    for (const v of this.leakVoices) {
      if (v.perMin > 0.05 && t >= v.next) {
        this.leakDrip(v, t + 0.02);
        v.next = t + (60 / v.perMin) * rand(0.45, 1.8);
      }
    }
    this.falls?.tick(t);
    this.waterEvents(t, a);
    // tide strikes
    if (a.tide.kind !== 'none' && a.tide.kind !== 'submerged' && this.nextBoom === 0) this.nextBoom = t + a.tide.strikeEverySec * rand(0.2, 1); // never a strike the instant a scene opens
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
      if (p.tide.kind === 'booming' && v.nextBoom === 0) v.nextBoom = t + rand(1.5, 9); // likewise a doorway's first boom comes some while in
      if (p.tide.kind === 'booming' && t >= v.nextBoom) {
        this.boom(t + 0.02, 0.45 * p.tide.gain * 2, v.bus);
        this.portalEvents++;
        v.nextBoom = t + rand(6, 11);
      }
      if (p.birds.perMinute > 0 && t >= v.nextBird) {
        const ks = speciesFor(p.birds.mode, p.birds.season);
        if (ks.length) { this.bird(ks[Math.floor(Math.random() * ks.length)] as Species, t + 0.02, p.birds.loudness * 1.6, v.bus); this.portalEvents++; }
        v.nextBird = t + (60 / p.birds.perMinute) * rand(0.5, 1.6);
      }
      if ((p.falls > 0.06 || p.rain > 0.06) && t >= v.nextDrip) {
        this.drip(t + 0.02, 0.08, v.bus);
        this.portalEvents++;
        v.nextDrip = t + rand(0.5, 1.5) / Math.max(0.1, (p.falls + p.rain) * 3);
      }
    }
    // thunder: a crack and a long rumble, far off, more often when the lightning is near
    if (a.thunder > 0.02 && t >= this.nextThunder) {
      this.thunder(t + 0.05, a.thunder);
      this.nextThunder = t + rand(7, 24) / Math.max(0.2, a.thunder);
    }
    // birds
    const kinds = speciesFor(a.birds.mode, a.birds.season);
    if (a.birds.perMinute > 0 && kinds.length > 0 && t >= this.nextBird) {
      this.bird(kinds[Math.floor(Math.random() * kinds.length)] as Species, t + 0.02, a.birds.loudness, undefined, FLYING_MODES.has(a.birds.mode) ? 'fly' : undefined);
      this.nextBird = t + (60 / a.birds.perMinute) * rand(0.5, 1.6);
    }
  }

  /** The sea behind the walls swells and falls with each wave, a little later for each opening. */
  private pulseBeds(t: number, crest: number, rise: number, D: number): void {
    let i = 0;
    for (const b of this.beds) b.v.pulse(t + 0.3 * ++i, crest, rise, D);
  }

  /** The water: waves for the sea, bubbles for falling water, and gusts for the wind. */
  private waterEvents(t: number, a: AudioScene): void {
    // the sea starts its own waves; the sea behind the walls swells with them
    const w = this.sea?.tick(t, a.sea);
    if (w) this.pulseBeds(w.t, Math.min(0.9, w.crest * 0.8 + 0.1), w.rise, w.dur);
  }

  /** Thunder: a crack that only the nearest storms have, then a long low rumble that rolls and dies away. */
  private thunder(t: number, strength: number): void {
    this.calls++;
    const ctx = this.ctx as AudioContext;
    if (strength > 0.5) this.burst(t, 0.12, 'highpass', 1500, 0.5, 0.1 + strength * 0.2, 0, 0.002);
    const dur = rand(2.5, 5) * (0.6 + strength * 0.6);
    const s = ctx.createBufferSource();
    s.buffer = this.brown;
    s.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(260 + strength * 220, t);
    lp.frequency.exponentialRampToValueAtTime(70, t + dur);
    const g = ctx.createGain();
    const peak = 0.12 + strength * 0.5;
    g.gain.setValueAtTime(0.0001, t);
    // it rolls: three or four swells, each smaller than the last
    let at = t + 0.05;
    for (let i = 0; i < 4; i++) {
      const p = peak * Math.pow(0.6, i) * rand(0.7, 1.1);
      g.gain.linearRampToValueAtTime(p, at + 0.25);
      g.gain.linearRampToValueAtTime(p * 0.3, at + dur / 4);
      at += dur / 4;
    }
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.6);
    s.connect(lp).connect(g).connect(this.bus);
    s.start(t, Math.random() * 6);
    s.stop(t + dur + 0.8);
  }

  private env(g: GainNode, t: number, attack: number, hold: number, release: number, peak: number): void {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.setValueAtTime(peak, t + attack + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);
  }

  private burst(t: number, dur: number, type: BiquadFilterType, freq: number, q: number, peak: number, at: Place = 0, attack = 0.004, out?: AudioNode): void {
    const ctx = this.ctx as AudioContext;
    const s = ctx.createBufferSource();
    s.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq * (this.doppler?.(t) ?? 1);
    f.Q.value = q;
    const g = ctx.createGain();
    this.env(g, t, attack, 0, dur, peak);
    s.connect(f).connect(g).connect(out ?? this.spot(at));
    s.start(t, Math.random() * 2);
    s.stop(t + dur + attack + 0.05);
  }

  private tone(t: number, f0: number, f1: number, dur: number, type: OscillatorType, peak: number, at: Place = 0, attack = 0.005, out?: AudioNode): void {
    const ctx = this.ctx as AudioContext;
    const o = ctx.createOscillator();
    o.type = type;
    const k = this.doppler?.(t) ?? 1;
    o.frequency.setValueAtTime(f0 * k, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1 * k), t + dur);
    const g = ctx.createGain();
    this.env(g, t, attack, 0, dur, peak);
    o.connect(g).connect(out ?? this.spot(at));
    o.start(t);
    o.stop(t + dur + attack + 0.05);
  }

  /** One drop's bubble ringing (see bubbles.ts): a pitch of 0.7 to 4.8 kHz that rises a little as it dies, higher ones dying faster. */
  private drip(t: number, peak: number, out?: AudioNode): void {
    const f0 = dripPitch(), d = bubbleDamping(f0), dur = 9.2 / d; // 9.2 time constants: down by 80 dB
    this.tone(t, f0, f0 * (1 + CHIRP * d * dur * 0.35), dur, 'sine', peak * Math.pow(1450 / f0, 0.7), out ? 0 : polar(rand(-180, 180), rand(5, 40), 5), 0.001, out);
  }


  private boom(t: number, peak: number, out?: AudioNode): void {
    this.tone(t, 90, 38, 0.9, 'sine', peak, 0, 0.005, out);
    this.burst(t, 0.6, 'lowpass', 300, 0.5, peak * 0.6, 0, 0.004, out);
  }

  /**
   * A bird call. Through a doorway it keeps the doorway's own placement (the portal bus places it). In the hall it gets a voice of
   * its own: perched somewhere around and above you, or, with `where` = 'fly' (and a species that flies), crossing the sky on a
   * random path, or on the path or point given. The flock is the exception: it is scattered over the sky, burst by burst.
   */
  private bird(sp: Species, t: number, loud: number, out?: AudioNode, where?: 'fly' | Vec3 | Flyby): void {
    this.calls++;
    const pan = 0;
    const prev = this.doppler;
    let answer: Voice | null = null;
    if (!out && sp !== 'flock') {
      const fl = FLIERS[sp];
      const flight = (): Flyby => flybyPath(Math.random, { dur: (fl as NonNullable<typeof fl>).dur, speed: (fl as NonNullable<typeof fl>).speed, closest: [3, 12], height: (fl as NonNullable<typeof fl>).height });
      const at: Vec3 | Flyby = where && where !== 'fly' ? where : where === 'fly' && fl ? flight() : perchPosition(Math.random);
      const voice = this.voice(t, at);
      out = voice.input;
      this.doppler = voice.doppler;
      // a second swift answering from somewhere else
      if (sp === 'swift') answer = this.voice(t + 0.35, where === 'fly' && fl ? flight() : perchPosition(Math.random, [10, 50], [6, 18]));
    }
    try { this.birdCall(sp, t, loud, out, pan, answer); } finally { this.doppler = prev; }
  }

  private birdCall(sp: Species, t: number, loud: number, out: AudioNode | undefined, pan: number, answer: Voice | null): void {
    const v = 0.05 + loud * 0.08;
    switch (sp) {
      case 'goose': {
        // a skein calling to itself high up: a run of low, nasal honks from several throats, each a little different
        const n = 4 + Math.floor(Math.random() * 6);
        for (let i = 0; i < n; i++) {
          const f = rand(330, 480);
          const at = t + i * rand(0.2, 0.45);
          this.tone(at, f, f * rand(0.78, 0.9), rand(0.14, 0.24), 'triangle', v * 0.9, pan, 0.03, out);
          this.tone(at + rand(0, 0.06), f * 1.5, f * 1.2, 0.12, 'sawtooth', v * 0.25, pan, 0.03, out);
        }
        break;
      }
      case 'chick': {
        // a hungry chick: a run of thin, high, quavering peeps, each a little lower, that goes on and on
        const n = 5 + Math.floor(Math.random() * 6);
        const f = rand(3600, 4800);
        for (let i = 0; i < n; i++) this.tone(t + i * rand(0.11, 0.17), f * rand(0.97, 1.04), f * rand(0.82, 0.92), rand(0.05, 0.08), 'sine', v * 0.8, pan, 0.006, out);
        break;
      }
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
      case 'blackbird': {
        // a phrase of rich, fluting notes that rise and fall, with a pause, and sometimes a second phrase
        const phrases = 1 + Math.floor(Math.random() * 2);
        let at = t;
        for (let p = 0; p < phrases; p++) {
          const n = 4 + Math.floor(Math.random() * 4);
          for (let i = 0; i < n; i++) {
            const base = rand(1400, 2600);
            this.tone(at, base, base * rand(0.8, 1.35), rand(0.09, 0.2), 'sine', v * 1.1, pan, 0.012, out);
            at += rand(0.11, 0.22);
          }
          at += rand(0.5, 0.9);
        }
        break;
      }
      case 'swift': {
        // a high thin scream: a fast descending trill, with a second bird answering a little way behind
        const n = 8 + Math.floor(Math.random() * 6);
        for (let i = 0; i < n; i++) this.tone(t + i * 0.052, 7400 - i * 90, 6000 - i * 90, 0.05, 'sine', v * 0.8, pan, 0.004, out);
        if (answer) this.doppler = answer.doppler;
        for (let i = 0; i < n - 3; i++) this.tone(t + 0.35 + i * 0.05, 6600 - i * 80, 5600 - i * 80, 0.05, 'sine', v * 0.5, 0, 0.004, answer ? answer.input : out);
        break;
      }
      case 'wader': {
        // a clear rising "tew-tew-tew" over the water
        const n = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < n; i++) this.tone(t + i * 0.2, 2100, 2800, 0.13, 'sine', v * 1.0, pan, 0.01, out);
        break;
      }
      case 'dove': {
        // a soft, low, rolling coo-coo-coo, three notes, the middle one longest
        this.tone(t, 360, 330, 0.18, 'sine', v * 0.9, pan, 0.04, out);
        this.tone(t + 0.26, 400, 340, 0.36, 'sine', v * 1.0, pan, 0.05, out);
        this.tone(t + 0.78, 370, 320, 0.3, 'sine', v * 0.8, pan, 0.05, out);
        break;
      }
      case 'owl': {
        // two slow, hollow hoots, the second lower
        this.tone(t, 330, 300, 0.45, 'sine', v * 1.1, pan, 0.08, out);
        this.burst(t, 0.4, 'lowpass', 600, 0.5, v * 0.25, pan, 0.08, out);
        this.tone(t + 0.8, 300, 250, 0.7, 'sine', v * 1.0, pan, 0.08, out);
        break;
      }
      case 'starling': {
        // a chatter of clicks and short whistles, over in a moment
        for (let i = 0; i < 12; i++) {
          if (Math.random() < 0.6) this.burst(t + i * rand(0.04, 0.09), 0.02, 'bandpass', rand(3000, 6500), 6, v * 0.9, pan, 0.001, out);
          else this.tone(t + i * 0.07, rand(2200, 4200), rand(2200, 4200), 0.07, 'sine', v * 0.7, pan, 0.005, out);
        }
        break;
      }
      case 'flock':
        for (let i = 0; i < 6; i++) this.burst(t + i * 0.12, 0.5, 'bandpass', rand(2500, 5000), 0.8, v * 0.9, out ? 0 : perchPosition(Math.random, [10, 65], [6, 22]), 0.15, out);
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
    const f = FEET; // under you and a little ahead: the floor, not the middle of your head
    switch (surface) {
      case 'marble': this.burst(t, 0.07, 'bandpass', 1500, 1.2, 0.35, f); this.tone(t, 160, 90, 0.08, 'sine', 0.2, f); break;
      case 'wet': this.burst(t, 0.12, 'bandpass', 900, 0.9, 0.35, f); this.burst(t + 0.02, 0.18, 'highpass', 3000, 0.5, 0.15, f); break;
      case 'shallow': this.burst(t, 0.35, 'bandpass', 600, 0.6, 0.5, f); this.burst(t + 0.05, 0.3, 'highpass', 2500, 0.5, 0.25, f); break;
      case 'rubble': for (let i = 0; i < 5; i++) this.burst(t + i * 0.025, 0.05, 'bandpass', rand(900, 3000), 1.5, 0.28, f); break;
    }
  }
}
