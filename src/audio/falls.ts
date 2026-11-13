// Falling and running fresh water, rebuilt from recordings of small falls, cave streams, stairs, drips and fountains (design/falls-model.md).
//
// What a fall is, as heard: a body of turbulent wash; a crowd of small ringing bubbles (the physics is in bubbles.ts), with now and then
// a large one you can pick out; the space ringing with it (a cave or tunnel adds a standing resonance, like the echo off the far wall in the
// recordings); and it comes from somewhere: a point in the hall you can face, with a diffuse wash of the same water all round you.
//
//   * POINT: wash + fine bubbles + plops + trickle, through the room's resonance, placed in 3D at the fall.
//   * DIFFUSE: four more independent copies of the wash and fine bubbles in the surround ring, quieter, so the water fills the space.
//   * DRIPS: live single drops (pitch 0.7-4.8 kHz) from near the fall, now and then.
// The scene's falls gain (0.3 for a hall with falls, 0.18 for a stream) sets the level; "flow" (the share of falls over trickle) sets the mix.

import { FINE, PLOPS, TRICKLE, CHIRP, bubbleDamping, dripPitch, fillSwarm } from './bubbles';
import { fillControl, fillWhite, makeBuffer } from './noise';
import { AROUND, polar, type Vec3 } from './spatial';

export type Space = 'small' | 'large' | 'vast';

export interface FallsDeps {
  ctx: BaseAudioContext;
  /** An input heard from a point around the listener (shared ring). */
  spot: (at: Vec3) => AudioNode;
  /** A panner of its own for the fall, which can be moved (the listener turns; the fall stays where it is in the hall). */
  place: (at: Vec3) => { input: AudioNode; move: (at: Vec3, tc: number) => void; dispose: () => void };
}

export interface FallsScene { gain: number; at: Vec3; space: Space }

const BUF_SEC = 10;
/** The standing echo of the space, in seconds: the cave recording's resonances sat 23 Hz apart, an echo about 43 ms long. */
const ROOM_DELAY: Record<Space, number> = { small: 0.03, large: 0.043, vast: 0.065 };
/** The scene's gain at which the level is "one": a hall with falls. */
const REF_GAIN = 0.3;
/** Level of each layer at one, tuned against the measured recordings. */
const LEVEL = { wash: 0.22, fine: 0.26, plops: 0.24, trickle: 0.1, diffuse: 0.45, resonance: 0.22 };
/** Overall trim: falling water is a presence in the hall, not the loudest thing in it. */
const TRIM = 0.25;

const rand = (a: number, b: number): number => a + Math.random() * (b - a);
const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

export class Falls {
  private readonly ctx: BaseAudioContext;
  private readonly spot: FallsDeps['spot'];
  private readonly place: ReturnType<FallsDeps['place']>;
  private sources: AudioScheduledSourceNode[] = [];
  private nodes: AudioNode[] = [];
  private layer: Record<'wash' | 'fine' | 'plops' | 'trickle', GainNode> = {} as never;
  private diffuse: GainNode[] = [];
  private delay!: DelayNode;
  private dripIn: AudioNode;
  private nextDrip = 0;
  private level = 0;
  private flow = 0;
  /** Live drips made so far (for tests). */
  drips = 0;

  constructor(deps: FallsDeps) {
    const ctx = (this.ctx = deps.ctx);
    this.spot = deps.spot;
    this.place = deps.place({ x: 0, y: 0, z: -5 });
    this.dripIn = this.place.input;
    const white = makeBuffer(ctx, BUF_SEC, fillWhite, 0.25);
    const fine = makeBuffer(ctx, 8, (d, sr) => fillSwarm(d, sr, FINE), 0.25);
    const plops = makeBuffer(ctx, BUF_SEC, (d, sr) => fillSwarm(d, sr, PLOPS), 0.25);
    const trickle = makeBuffer(ctx, 8, (d, sr) => fillSwarm(d, sr, TRICKLE), 0.25);
    const ctl = makeBuffer(ctx, BUF_SEC, fillControl, 1);

    // --- the point source: layers summed, through the room's resonance, then placed ---
    const sum = this.g(1);
    const mk = (buf: AudioBuffer, speed = 1): AudioBufferSourceNode => {
      const s = ctx.createBufferSource();
      s.buffer = buf; s.loop = true; s.playbackRate.value = speed * rand(0.98, 1.02);
      s.start(0, Math.random() * buf.duration);
      this.sources.push(s);
      return s;
    };
    const washShaped = (): AudioNode => {
      // turbulent wash: white noise from 380 Hz up to about 14 kHz, brightened above 4.5 kHz, with a body bump near 650 Hz
      const hp = this.f('highpass', 380, -3.01), body = this.f('peaking', 650, 1.2, 1), lp = this.f('lowpass', 12000, -3.01), air = this.f('highshelf', 4500, 0.7, 5), top = this.f('lowpass', 14500, -3.01);
      mk(white).connect(hp).connect(body).connect(lp).connect(air).connect(top);
      return top;
    };
    const flutter = (node: AudioNode, depth: number, speed: number): AudioNode => {
      const wob = this.g(1);
      mk(ctl, speed).connect(this.g(depth)).connect(wob.gain);
      node.connect(wob);
      return wob;
    };
    const layers = { wash: washShaped(), fine: mk(fine), plops: mk(plops), trickle: mk(trickle) };
    for (const k of ['wash', 'fine', 'plops', 'trickle'] as const) {
      const g = this.g(0);
      (k === 'wash' ? flutter(layers[k], 0.22, 0.5) : layers[k]).connect(g).connect(sum);
      this.layer[k] = g;
    }
    // the space's resonance: a delay line that feeds back through a low-pass, so the low-middle of the wash rings at 1/delay spacing
    this.delay = ctx.createDelay(0.2);
    this.delay.delayTime.value = ROOM_DELAY.large;
    const fb = this.g(0.5), lpFb = this.f('lowpass', 520, -3.01), tap = this.g(LEVEL.resonance);
    this.nodes.push(this.delay);
    sum.connect(this.delay);
    this.delay.connect(lpFb).connect(fb).connect(this.delay);
    lpFb.connect(tap);
    const mix = this.g(1);
    sum.connect(mix);
    tap.connect(mix);
    mix.connect(this.place.input);

    // --- the diffuse surround: independent copies, quieter, in four directions around ---
    for (const i of [0, 1, 4, 5]) {
      const at = AROUND[i]!;
      const out = this.g(0);
      const w = washShaped(), f = mk(fine);
      const wg = this.g(LEVEL.wash), fg = this.g(LEVEL.fine), mixd = this.g(1);
      flutter(w, 0.25, 0.5).connect(wg).connect(mixd);
      f.connect(fg).connect(mixd);
      mixd.connect(out).connect(this.spot(polar(at.az, at.el, 5)));
      this.diffuse.push(out);
    }
  }

  private g(v: number): GainNode { const g = this.ctx.createGain(); g.gain.value = v; this.nodes.push(g); return g; }
  private f(type: BiquadFilterType, freq: number, q: number, gain = 0): BiquadFilterNode {
    const b = this.ctx.createBiquadFilter();
    b.type = type; b.frequency.value = freq; b.Q.value = q; b.gain.value = gain;
    this.nodes.push(b);
    return b;
  }

  /** Follow the scene: how much water, where it is, and the size of the space it rings in. */
  set(s: FallsScene): void {
    const t = this.ctx.currentTime, tc = 1.2;
    this.level = clamp(s.gain / REF_GAIN, 0, 1.4);
    this.flow = clamp((s.gain - 0.08) / 0.22, 0, 1); // a stream is mostly trickle; a fall is mostly wash and fine bubbles
    const L = this.level, f = this.flow;
    const to = (p: AudioParam, v: number): void => { p.setTargetAtTime(v, t, tc); };
    to(this.layer.wash.gain, TRIM * LEVEL.wash * L * (0.4 + 0.6 * f));
    to(this.layer.fine.gain, TRIM * LEVEL.fine * L * (0.3 + 0.7 * f));
    to(this.layer.plops.gain, TRIM * LEVEL.plops * L * (0.5 + 0.5 * f));
    to(this.layer.trickle.gain, TRIM * LEVEL.trickle * L * (1 - 0.8 * f));
    for (const d of this.diffuse) to(d.gain, TRIM * LEVEL.diffuse * L * (0.4 + 0.6 * f));
    this.delay.delayTime.setTargetAtTime(ROOM_DELAY[s.space], t, 0.5);
    this.place.move(s.at, 0.3);
  }

  /** Called a few times a second: starts the occasional single drop, from near the fall. */
  tick(t: number): void {
    if (this.level < 0.05 || t < this.nextDrip) return;
    // a stream drips more, in the wetter, quieter way; a strong fall hides most of its drips
    this.drip(t + 0.02);
    this.nextDrip = t + rand(1.5, 5) / (0.4 + this.level * (1.2 - 0.6 * this.flow));
  }

  private drip(t: number): void {
    const ctx = this.ctx;
    this.drips++;
    const f0 = dripPitch();
    const d = bubbleDamping(f0), dur = 6.2 / d;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f0 * (1 + CHIRP * d * dur), t + dur);
    const g = ctx.createGain();
    const peak = 0.05 * Math.pow(1450 / f0, 0.7) * rand(0.6, 1.3) * clamp(this.level, 0.3, 1);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.001);
    g.gain.setTargetAtTime(0.0001, t + 0.001, 1 / d);
    o.connect(g).connect(this.dripIn);
    o.start(t); o.stop(t + dur + 0.05);
  }

  dispose(): void {
    for (const s of this.sources) { try { s.stop(); } catch { /* already stopped */ } }
    for (const n of this.nodes) { try { n.disconnect(); } catch { /* already */ } }
    this.place.dispose();
    this.sources = []; this.nodes = []; this.diffuse = [];
  }
}
