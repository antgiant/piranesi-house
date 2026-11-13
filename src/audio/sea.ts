// The sea, built from measurements of real surf-in-a-cave recordings (see design/sea-model.md). Entirely procedural.
//
// What the recordings showed, and what is done about it:
//  * Deep energy: much of a real wave's power is below 100 Hz, some of it below 20 Hz. A SUB layer (about 15-90 Hz) and a BODY layer of
//    broad "hollow" resonances (about 70, 140 and 290 Hz) are rendered as a mid/side pair so they are wide but not hard-panned.
//  * The highs are different in each ear (interchannel correlation near 0 above 5 kHz in the binaural recordings). The mid ROAR, the
//    HISS and the foam CRACKLE are therefore made by separate sources placed in several directions around the listener (HRTF, via the
//    engine's shared spots), each with its own noise.
//  * Foam is not filtered noise but thousands of tiny bubble pops: the CRACKLE buffer is built from decaying ringing pops.
//  * A wave is a swell: the deep layers rise first and slowest, the roar next, the hiss and crackle crest with the wave and take
//    a long time to wash away. The wave arrives on one side and travels across the space (each direction is a little later).
//  * Then come the impact (a low thump and a slap of spray) and a short run of gurgles as the water drains.
//
// The sea is driven by the same three numbers as before (gain, how muffled, how long a swell), so the director need not change.

import { waterBuffer } from './buffers';
import { randn } from './noise';
import { AROUND as SPOTS, polar, type Vec3 } from './spatial';

export interface SeaScene { gain: number; lowpassHz: number; swellSec: number }

export interface SeaDeps {
  ctx: BaseAudioContext;
  /** Where unplaced (stereo) sound goes. */
  out: AudioNode;
  /** An input that is heard from a point around the listener. Several callers may share one. */
  spot: (at: Vec3) => AudioNode;
  /** How many directions the mid/high layers are spread over (default 6). Fewer is cheaper. */
  voices?: number;
}

/** A wave that has just been started, so the engine can echo it through the doorways. */
export interface WaveInfo { t: number; rise: number; crest: number; dur: number }

const SPOT_DIST = 5;

const BUF_SEC = 12;
const rand = (a: number, b: number): number => a + Math.random() * (b - a);
const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

// ---- noise made once, shared by every voice (each plays it from its own offset and speed, so they are independent) ----------------

// ---- the layers ------------------------------------------------------------------------------------------------------------------

type LayerName = 'sub' | 'body' | 'roar' | 'hiss' | 'crack';

/**
 * One layer: a gain stage per source that waves are added to (`env`: floor level plus each wave's swell, summed by the audio graph) and
 * a master per source for the scene's level. Deep layers have two sources (mid and side); the others have one per direction.
 */
interface Layer { env: GainNode[]; master: GainNode[]; floor: number }

/** How each layer follows a wave: how long it takes to rise (as a share of the wave), how it decays, and how it scales with size. */
const SHAPE: Record<LayerName, { rise: number; tau: number; power: number }> = {
  sub: { rise: 0.42, tau: 0.34, power: 1 },
  body: { rise: 0.44, tau: 0.26, power: 1 },
  roar: { rise: 0.46, tau: 0.22, power: 1.1 },
  hiss: { rise: 0.52, tau: 0.3, power: 1.4 },
  crack: { rise: 0.52, tau: 0.3, power: 1.25 },
};

/** Level of each layer at full scene gain, and its floor between waves. Tuned against the measured recordings. */
const LEVEL: Record<LayerName, { gain: number; floor: number; swing: number }> = {
  sub: { gain: 0.55, floor: 0.26, swing: 0.9 },
  body: { gain: 0.6, floor: 0.14, swing: 1 },
  roar: { gain: 0.4, floor: 0.15, swing: 1 },
  hiss: { gain: 0.16, floor: 0.06, swing: 1 },
  crack: { gain: 0.24, floor: 0.03, swing: 1 },
};
/** Overall trim, so that the whole sea sits at about the loudness of the sea it replaces and never nears clipping. */
const TRIM = 0.78;

export class Sea {
  private readonly ctx: BaseAudioContext;
  private readonly out: AudioNode;
  private readonly spot: (at: Vec3) => AudioNode;
  private readonly n: number;
  private layers = {} as Record<LayerName, Layer>;
  private nodes: AudioNode[] = [];
  private roarLp: BiquadFilterNode[] = [];
  private hissLp: BiquadFilterNode[] = [];
  private sources: AudioScheduledSourceNode[] = [];
  private buffers!: { white: AudioBuffer; pink: AudioBuffer; brown: AudioBuffer; crackle: AudioBuffer; ctl: AudioBuffer };
  private lfOut!: GainNode;
  private nextWave = 0;
  private waves = 0;
  private level = 0;
  private thump = 1;

  constructor(deps: SeaDeps) {
    this.ctx = deps.ctx;
    this.out = deps.out;
    this.spot = deps.spot;
    this.n = clamp(deps.voices ?? 6, 2, SPOTS.length);
    this.build();
  }

  /** How hard each wave's low thump is struck (the deep-bass setting): 1 is standard, 0 none. */
  setThump(k: number): void { this.thump = Math.max(0, k); }

  /** Waves made so far (for tests). */
  get waveCount(): number { return this.waves; }

  private track<T extends AudioNode>(n: T): T { this.nodes.push(n); return n; }

  private gain(v: number): GainNode { const g = this.track(this.ctx.createGain()); g.gain.value = v; return g; }

  private filter(type: BiquadFilterType, f: number, q = 0.707): BiquadFilterNode {
    const b = this.track(this.ctx.createBiquadFilter());
    b.type = type; b.frequency.value = f; b.Q.value = q;
    return b;
  }

  private loop(buf: AudioBuffer, speed = 1): AudioBufferSourceNode {
    const s = this.ctx.createBufferSource();
    s.buffer = buf;
    s.loop = true;
    s.playbackRate.value = speed * rand(0.97, 1.03); // so that no two voices ever repeat in step
    s.start(0, Math.random() * buf.duration);
    this.sources.push(s);
    return s;
  }

  private build(): void {
    const ctx = this.ctx;
    this.buffers = { white: waterBuffer(ctx, 'white'), pink: waterBuffer(ctx, 'pink'), brown: waterBuffer(ctx, 'brown'), crackle: waterBuffer(ctx, 'foam'), ctl: waterBuffer(ctx, 'ctl') };
    const merger = this.track(ctx.createChannelMerger(2));
    this.lfOut = this.gain(1);
    merger.connect(this.lfOut).connect(this.out);

    // --- deep layers: mid/side. The same wave drives the mid and the side, so only the mid carries the width control. ---
    const deep = (name: 'sub' | 'body', make: (src: AudioBufferSourceNode) => AudioNode): void => {
      const env: GainNode[] = [], master: GainNode[] = [];
      for (const kind of ['mid', 'side'] as const) {
        const src = this.loop(name === 'sub' ? this.buffers.brown : this.buffers.pink);
        const e = this.gain(LEVEL[name].floor);
        make(src).connect(e);
        const m = this.gain(0);
        e.connect(m);
        env.push(e); master.push(m);
        if (kind === 'mid') { m.connect(merger, 0, 0); m.connect(merger, 0, 1); } else {
          // side: added to the left, taken from the right (so it widens without moving the middle). 0.28 keeps the two ears ~0.9 alike.
          const w = this.gain(0.28), inv = this.gain(-0.28);
          m.connect(w).connect(merger, 0, 0);
          m.connect(inv).connect(merger, 0, 1);
        }
      }
      this.layers[name] = { env, master, floor: LEVEL[name].floor };
    };
    deep('sub', (src) => {
      const hp = this.filter('highpass', 15, 0.8), lp = this.filter('lowpass', 75, 0.8), lp2 = this.filter('lowpass', 95, 0.5);
      src.connect(hp).connect(lp).connect(lp2);
      return lp2;
    });
    deep('body', (src) => {
      // the hollow of the cave: broad resonances near 70, 140 and 290 Hz over a low-passed bed
      const sum = this.gain(1);
      const bed = this.filter('lowpass', 1100, 0.5);
      src.connect(bed).connect(this.gain(0.9)).connect(sum);
      for (const [f, q, g] of [[72, 3, 1.5], [140, 3, 1.1], [290, 2.5, 0.7]] as const) src.connect(this.filter('bandpass', f, q)).connect(this.gain(g)).connect(sum);
      return sum;
    });

    // --- mid and high layers: one source per direction, each placed around the listener ---
    const pos: Layer[] = (['roar', 'hiss', 'crack'] as const).map((name) => ({ env: [], master: [], floor: LEVEL[name].floor }));
    this.layers.roar = pos[0]!; this.layers.hiss = pos[1]!; this.layers.crack = pos[2]!;
    for (let i = 0; i < this.n; i++) {
      const at = SPOTS[i]!;
      const sum = this.gain(1);
      sum.connect(this.spot(polar(at.az, at.el, SPOT_DIST)));
      // each direction flutters on its own: the wash is turbulent, not a clean swell. Foam flutters faster and deeper than the roar.
      const FLUTTER = { roar: { speed: 0.55, depth: 0.32 }, hiss: { speed: 1.0, depth: 0.32 }, crack: { speed: 1.0, depth: 0.28 } } as const;
      const add = (layer: Layer, name: 'roar' | 'hiss' | 'crack', node: AudioNode): void => {
        const e = this.gain(LEVEL[name].floor), m = this.gain(0), wob = this.gain(1);
        const fl = FLUTTER[name];
        this.loop(this.buffers.ctl, fl.speed).connect(this.gain(fl.depth)).connect(wob.gain);
        node.connect(e).connect(wob).connect(m).connect(sum);
        layer.env.push(e); layer.master.push(m);
      };
      const rlp = this.filter('lowpass', 1800, 0.6); this.roarLp.push(rlp);
      this.loop(this.buffers.pink).connect(this.filter('highpass', 220, 0.7)).connect(rlp);
      add(this.layers.roar, 'roar', rlp);
      const hlp = this.filter('lowpass', 6000, 0.5); this.hissLp.push(hlp);
      this.loop(this.buffers.pink).connect(this.filter('highpass', 1000, 0.5)).connect(hlp);
      add(this.layers.hiss, 'hiss', hlp);
      add(this.layers.crack, 'crack', this.loop(this.buffers.crackle));
    }
  }

  /** Follow the scene: the overall level, and how bright the mid and high layers are (a muffled sea is mostly deep). */
  set(s: SeaScene): void {
    const t = this.ctx.currentTime, tc = 1.2;
    this.level = s.gain;
    const k = TRIM * s.gain;
    const b = clamp((s.lowpassHz - 250) / 1550, 0, 1); // 0 in the upper halls, 1 in the lowest
    const to = (p: AudioParam, v: number): void => { p.setTargetAtTime(v, t, tc); };
    for (const m of this.layers.sub.master) to(m.gain, k * LEVEL.sub.gain);
    for (const m of this.layers.body.master) to(m.gain, k * LEVEL.body.gain * (0.5 + 0.5 * b));
    for (const m of this.layers.roar.master) to(m.gain, k * LEVEL.roar.gain * (0.12 + 0.88 * b));
    for (const m of this.layers.hiss.master) to(m.gain, k * LEVEL.hiss.gain * Math.pow(b, 1.4));
    for (const m of this.layers.crack.master) to(m.gain, k * LEVEL.crack.gain * Math.pow(b, 1.4));
    for (const f of this.roarLp) to(f.frequency, 500 + b * 2800);
    for (const f of this.hissLp) to(f.frequency, 2200 + b * 5300);
  }

  /** Called a few times a second. Starts the next wave when it is due; returns it (or null) so the doorways can pulse with it. */
  tick(t: number, s: SeaScene): WaveInfo | null {
    if (s.gain < 0.03 || t < this.nextWave) return null;
    return this.wave(t + 0.05, s);
  }

  private wave(t: number, s: SeaScene): WaveInfo {
    const ctx = this.ctx;
    const D = s.swellSec * rand(0.85, 1.3);
    this.waves++;
    // a lognormal run of sizes, with a bigger wave every few
    let a = clamp(Math.exp(randn() * 0.42) * 0.72, 0.22, 1.0);
    if (this.waves % 4 === 0) a = Math.min(1.15, a * 1.25); // never so big that every layer crests at once past full scale
    // it arrives on one side and passes across: each direction is later by how far round from there it is
    const theta = rand(-Math.PI, Math.PI);
    const b = clamp((s.lowpassHz - 250) / 1550, 0, 1);
    const one = this.gain(1); // the shared "trigger": a constant 1 for this wave to shape
    let cs: AudioScheduledSourceNode;
    if (ctx.createConstantSource) {
      const c = ctx.createConstantSource(); c.offset.value = 1; cs = c; c.connect(one);
    } else {
      const buf = ctx.createBuffer(1, 128, ctx.sampleRate); buf.getChannelData(0).fill(1);
      const c = ctx.createBufferSource(); c.buffer = buf; c.loop = true; cs = c; c.connect(one);
    }
    cs.start(t);
    let lifeEnd = t;
    const swell = (target: AudioParam, name: LayerName, delay: number, size: number): void => {
      const sh = SHAPE[name];
      const g = this.gain(0);
      const rise = D * sh.rise, t0 = t + delay;
      const peak = LEVEL[name].swing * Math.pow(size, sh.power);
      const curve = new Float32Array(48);
      for (let i = 0; i < curve.length; i++) { const u = i / (curve.length - 1); curve[i] = peak * Math.sin(u * Math.PI / 2) ** 2; }
      g.gain.setValueCurveAtTime(curve, t0, rise);
      g.gain.setTargetAtTime(0, t0 + rise + 0.001, D * sh.tau);
      one.connect(g).connect(target);
      lifeEnd = Math.max(lifeEnd, t0 + rise + D * sh.tau * 6);
    };
    for (const name of ['sub', 'body'] as const) for (const e of this.layers[name].env) swell(e.gain, name, 0, a);
    const dir = Math.random() < 0.5 ? 1 : -1;
    for (let i = 0; i < this.n; i++) {
      const delay = 0.9 * (1 + dir * Math.cos((SPOTS[i]!.az * Math.PI) / 180 - theta)) / 2;
      for (const name of ['roar', 'hiss', 'crack'] as const) swell(this.layers[name].env[i]!.gain, name, delay * (name === 'roar' ? 1 : 1.15), a);
    }
    cs.stop(lifeEnd + 0.1);
    const ms = Math.max(0, (lifeEnd - ctx.currentTime + 1) * 1000);
    setTimeout(() => { try { one.disconnect(); } catch { /* gone */ } }, ms);

    const rise = D * 0.5;
    const crestAt = t + rise;
    this.impact(crestAt, a, s.gain, b);
    this.gurgles(crestAt + 0.3, a, s.gain);
    // now and then two waves close together, now and then a lull
    const roll = Math.random();
    this.nextWave = t + D * (roll < 0.15 ? rand(0.45, 0.6) : roll > 0.9 ? rand(1.3, 1.7) : rand(0.82, 1.1));
    return { t, rise, crest: a, dur: D };
  }

  /** The wave strikes: a low thump you feel more than hear, a slap, and a puff of spray from somewhere around you. */
  private impact(t: number, a: number, gain: number, bright: number): void {
    const ctx = this.ctx;
    const amp = gain * a;
    if (amp < 0.02) return;
    const thump = this.thump;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(rand(48, 62), t);
    o.frequency.exponentialRampToValueAtTime(rand(24, 30), t + 1.1);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.3 * TRIM * amp * amp * thump + 0.0001, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.3);
    o.connect(g).connect(this.lfOut);
    o.start(t); o.stop(t + 1.4);
    // the slap of water on rock: a short low-mid burst through the middle
    const s = ctx.createBufferSource();
    s.buffer = this.buffers.pink;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = rand(180, 420); f.Q.value = 0.9;
    const sg = ctx.createGain();
    sg.gain.setValueAtTime(0.0001, t);
    sg.gain.linearRampToValueAtTime(0.28 * amp * amp, t + 0.02);
    sg.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    s.connect(f).connect(sg).connect(this.lfOut);
    s.start(t, Math.random() * 8); s.stop(t + 0.6);
    // spray
    if (bright > 0.1 && a > 0.4) {
      const w = ctx.createBufferSource();
      w.buffer = this.buffers.white;
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2400;
      const wg = ctx.createGain();
      wg.gain.setValueAtTime(0.0001, t);
      wg.gain.linearRampToValueAtTime(0.1 * amp * bright * a, t + 0.012);
      wg.gain.exponentialRampToValueAtTime(0.0001, t + rand(0.25, 0.5));
      w.connect(hp).connect(wg).connect(this.spot(polar(rand(-180, 180), rand(0, 35), SPOT_DIST)));
      w.start(t, Math.random() * 8); w.stop(t + 0.6);
    }
  }

  /** As the water drains back: a run of bubbles that thins out, each from its own place, each a small chirp rising in pitch. */
  private gurgles(t: number, a: number, gain: number): void {
    const n = Math.round(clamp(a, 0.2, 1.4) * 9 * Math.min(1, gain * 1.6));
    let at = t;
    for (let i = 0; i < n; i++) {
      at += rand(0.05, 0.22) * (1 + i * 0.18);
      this.bubble(at, (0.03 + Math.random() * 0.07) * gain * TRIM);
    }
  }

  private bubble(t: number, peak: number): void {
    const ctx = this.ctx;
    const f0 = Math.exp(rand(Math.log(280), Math.log(2600)));
    const dur = rand(0.04, 0.13);
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f0 * rand(1.25, 1.8), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.spot(polar(rand(-180, 180), rand(-25, 35), SPOT_DIST)));
    o.start(t); o.stop(t + dur + 0.05);
  }

  dispose(): void {
    for (const s of this.sources) { try { s.stop(); } catch { /* not started or already stopped */ } }
    for (const n of this.nodes) { try { n.disconnect(); } catch { /* already */ } }
    this.sources = []; this.nodes = [];
  }
}
