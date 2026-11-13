// Water on the great stair. Rain runs off the courtyards and down the stairs in streams; when a tide drains, its water falls back down them. Two voices,
// measured on recordings of a small fall down several steps and of a stream running into a sinkhole:
//   * STEPS: a smooth roar, no pulse to it (the recording has none): broad from about 250 Hz to 1 kHz, falling gently above, with slow wandering.
//     Placed at the stair, so it is where the stair is as you walk about the hall.
//   * SHAFT: below it, the deep chamber the water falls into: a hollow rumble near 120 and 200 Hz with the big slow gurgles of water running into
//     the dark. Placed below you, in the direction of the stair, so you hear that the water goes down.

import { waterBuffer } from './buffers';
import type { PlaceFactory, PlaceHandle } from './place';
import { polar, type Vec3 } from './spatial';

export interface StairsScene {
  /** 0..1.3: how much water is running down, with distance already taken into account. */
  flow: number;
  /** Where the stair is, in degrees from straight ahead (+ right). */
  az: number;
}

const DIST = 6;
/** Levels at flow 1, tuned against the recordings (see design/water-more.md). */
const LEVEL = { steps: 0.2, shaft: 0.24, gurgle: 0.32, plops: 0.07 };
/** The sparkle over the steps' roar, relative to it. */
const SPARKLE = 0.6;
/** Overall trim, in the manner of the other water voices. */
const TRIM = 0.6;

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

export class StairsWater {
  private readonly ctx: BaseAudioContext;
  private readonly steps: PlaceHandle;
  private readonly shaft: PlaceHandle;
  private g: Record<'steps' | 'shaft' | 'gurgle' | 'plops' | 'foam', GainNode>;
  private sources: AudioScheduledSourceNode[] = [];
  private nodes: AudioNode[] = [];

  constructor(deps: { ctx: BaseAudioContext; place: PlaceFactory }) {
    const ctx = (this.ctx = deps.ctx);
    this.steps = deps.place(polar(0, 5, DIST));
    this.shaft = deps.place(polar(0, -50, DIST));
    const gain = (v: number): GainNode => { const n = ctx.createGain(); n.gain.value = v; this.nodes.push(n); return n; };
    const filt = (type: BiquadFilterType, freq: number, q: number, g = 0): BiquadFilterNode => {
      const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = freq; b.Q.value = q; b.gain.value = g; this.nodes.push(b); return b;
    };
    const loop = (name: Parameters<typeof waterBuffer>[1], speed = 1): AudioBufferSourceNode => {
      const s = ctx.createBufferSource(); s.buffer = waterBuffer(ctx, name); s.loop = true;
      s.playbackRate.value = speed * (0.97 + Math.random() * 0.06); s.start(0, Math.random() * s.buffer.duration);
      this.sources.push(s); return s;
    };
    /** Slow random wandering of a level, as the water's own flutter. */
    const flutter = (node: AudioNode, depth: number, speed: number): AudioNode => {
      const wob = gain(1);
      loop('ctl', speed).connect(gain(depth)).connect(wob.gain);
      node.connect(wob);
      return wob;
    };
    // --- steps ---
    const stepsOut = gain(0);
    flutter(loop('pink').connect(filt('highpass', 260, -3.01)).connect(filt('lowpass', 9500, -3.01)), 0.24, 0.6).connect(stepsOut);
    const plopsG = gain(0), foamG = gain(0);
    loop('plops').connect(plopsG).connect(stepsOut);
    loop('foam').connect(filt('highpass', 1800, -3.01)).connect(gain(0.6)).connect(foamG).connect(stepsOut); // a fizz of spray over the roar: what makes it sound like water and not wind
    stepsOut.connect(this.steps.input);
    // --- shaft ---
    const shaftOut = gain(0);
    const hollow = loop('pink');
    const hollowSum = gain(1);
    hollow.connect(filt('highpass', 95, -3.01)).connect(filt('lowpass', 420, -3.01)).connect(gain(0.2)).connect(hollowSum);
    for (const [f, q, gn] of [[125, 4, 1.8], [205, 3, 0.3]] as const) hollow.connect(filt('bandpass', f, q)).connect(gain(gn)).connect(hollowSum);
    flutter(hollowSum, 0.5, 0.35).connect(shaftOut);
    const gurgleG = gain(0);
    loop('gurgle').connect(filt('lowpass', 9500, -3.01)).connect(gurgleG).connect(shaftOut);
    loop('fine').connect(filt('highpass', 800, -3.01)).connect(gain(0.6)).connect(gurgleG); // the splash and spray of it landing
    shaftOut.connect(this.shaft.input);
    this.g = { steps: stepsOut, shaft: shaftOut, gurgle: gurgleG, plops: plopsG, foam: foamG };
  }

  set(s: StairsScene): void {
    const t = this.ctx.currentTime, tc = 1.5;
    const f = clamp(s.flow, 0, 1.3);
    const to = (p: AudioParam, v: number): void => { p.setTargetAtTime(v, t, tc); };
    to(this.g.steps.gain, TRIM * LEVEL.steps * Math.pow(f, 1.2));
    to(this.g.foam.gain, SPARKLE * f);   // relative to the steps' own gain
    to(this.g.plops.gain, 0.12 * f);     // the real steps are smooth: only the odd splash
    to(this.g.shaft.gain, TRIM * LEVEL.shaft * Math.pow(f, 1.1));
    to(this.g.gurgle.gain, LEVEL.gurgle * (0.4 + 0.6 * clamp(f, 0, 1)));
    this.steps.move(polar(s.az, 5, DIST), 0.3);
    this.shaft.move(polar(s.az, -50, DIST), 0.3);
  }

  dispose(): void {
    for (const s of this.sources) { try { s.stop(); } catch { /* already stopped */ } }
    for (const n of this.nodes) { try { n.disconnect(); } catch { /* already */ } }
    this.steps.dispose(); this.shaft.dispose();
    this.sources = []; this.nodes = [];
  }
}
