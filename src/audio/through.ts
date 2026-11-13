// Water heard through a doorway or a wall: the sea and the falls of the hall next door. It is the same water as in the hall itself, but the opening
// takes the highs away and leaves the low body (the sea's boom and the cave's hollow; the wash of a fall without its sparkle), and it comes from the
// door, from where the door is as you walk about the hall. It swells with the waves of the sea, a little later than they reach you.

import { waterBuffer } from './buffers';
import type { PlaceFactory, PlaceHandle } from './place';
import type { Vec3 } from './spatial';

export interface ThroughScene {
  /** The sea next door beyond what is heard here, 0..1. */
  sea: number;
  /** Falling water next door, 0..1. */
  falls: number;
  /** How open the opening is: a door ahead lets more through than one behind. */
  lowpassHz: number;
  at: Vec3;
}

/** Levels, tuned so the doorway water is as loud as it was before it was rebuilt (-34 dBFS for the sea at 0.3, -51 for falls at 0.12). */
const K = { sea: 0.53, falls: 0.19 };

export class Through {
  private readonly ctx: BaseAudioContext;
  private readonly place: PlaceHandle;
  private lp: BiquadFilterNode;
  private wave: GainNode;
  private seaG: GainNode;
  private fallsG: GainNode;
  private sources: AudioScheduledSourceNode[] = [];
  private nodes: AudioNode[] = [];

  constructor(deps: { ctx: BaseAudioContext; place: PlaceFactory }, at: Vec3) {
    const ctx = (this.ctx = deps.ctx);
    this.place = deps.place(at);
    const g = (v: number): GainNode => { const n = ctx.createGain(); n.gain.value = v; this.nodes.push(n); return n; };
    const f = (type: BiquadFilterType, freq: number, q: number, gain = 0): BiquadFilterNode => {
      const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = freq; b.Q.value = q; b.gain.value = gain; this.nodes.push(b); return b;
    };
    const loop = (name: Parameters<typeof waterBuffer>[1]): AudioBufferSourceNode => {
      const s = ctx.createBufferSource(); s.buffer = waterBuffer(ctx, name); s.loop = true;
      s.playbackRate.value = 0.97 + Math.random() * 0.06; s.start(0, Math.random() * s.buffer.duration);
      this.sources.push(s); return s;
    };
    const sum = g(1);
    // the opening: highs go, the low middle stays
    this.lp = f('lowpass', 900, -3.01);
    const body = f('peaking', 200, 1, 5);
    sum.connect(this.lp).connect(body).connect(this.place.input);
    // the sea: the boom and hollow of the body layer, with a little of the foam above, all swelling with the waves
    this.wave = g(0.5);
    this.seaG = g(0);
    const seaSum = g(1);
    const pink = loop('pink');
    pink.connect(f('lowpass', 800, -3.01)).connect(g(0.8)).connect(seaSum);
    for (const [fr, q, gain] of [[72, 3, 1.8], [140, 3, 1.3], [290, 2.5, 0.8]] as const) pink.connect(f('bandpass', fr, q)).connect(g(gain)).connect(seaSum);
    loop('foam').connect(f('lowpass', 1500, -3.01)).connect(g(0.35)).connect(seaSum);
    seaSum.connect(this.wave).connect(this.seaG).connect(sum);
    // the fall: the wash and the fine bubbles (what the opening lets through of them)
    this.fallsG = g(0);
    const fallsSum = g(1);
    loop('white').connect(f('highpass', 380, -3.01)).connect(f('lowpass', 7000, -3.01)).connect(g(0.5)).connect(fallsSum);
    loop('fine').connect(g(0.9)).connect(fallsSum);
    loop('plops').connect(g(0.45)).connect(fallsSum);
    fallsSum.connect(this.fallsG).connect(sum);
  }

  set(s: ThroughScene): void {
    const t = this.ctx.currentTime;
    this.seaG.gain.setTargetAtTime(s.sea * K.sea, t, 1);
    this.fallsG.gain.setTargetAtTime(s.falls * K.falls, t, 1);
    this.lp.frequency.setTargetAtTime(Math.max(300, s.lowpassHz * 0.5), t, 0.3);
    this.place.move(s.at, 0.3);
  }

  /** A wave of the sea reaches the opening: it swells, then falls back. */
  pulse(t: number, crest: number, rise: number, D: number): void {
    const p = this.wave.gain;
    p.cancelScheduledValues(t);
    p.setValueAtTime(0.25, t);
    p.linearRampToValueAtTime(0.4 + crest * 0.8, t + rise);
    p.setTargetAtTime(0.25, t + rise, D * 0.22);
  }

  /** Let it fade out and then go. */
  retire(): void {
    const t = this.ctx.currentTime;
    this.seaG.gain.setTargetAtTime(0, t, 0.4);
    this.fallsG.gain.setTargetAtTime(0, t, 0.4);
    setTimeout(() => this.dispose(), 2500);
  }

  dispose(): void {
    for (const s of this.sources) { try { s.stop(); } catch { /* already stopped */ } }
    for (const n of this.nodes) { try { n.disconnect(); } catch { /* already */ } }
    this.place.dispose();
    this.sources = []; this.nodes = [];
  }
}
