// Water running along a channel on the hall's floor: a trickle over stones when the flow is small, a river when it is large (design/turbulence.md).
//
// Smooth (a small flow): single bubbles and gurgles as the water folds over stones, a few at a time, each of them clear. Turbulent (a large one): the
// surface is white, the events merge into a broad rush, and underneath it a deep low roar of the mass of water moving. The single events do not
// "keep going" beneath a big flow: they are buried by it. Fed by the same flow as the fall that makes it (or by rain, in the halls with only a stream).

import { waterBuffer } from './buffers';
import { airCutoffHz, polar, type Vec3 } from './spatial';
import { discreteShare, loudness, smooth, turbulence } from './turbulence';
import type { PlaceFactory, PlaceHandle } from './place';

export interface StreamScene {
  /** 1 = an ordinary day for this water (see hydrology): 0.3 a trickle .. 2 a river. */
  flow: number;
  /** Loudness for how near it is, and how far in metres. */
  near: number;
  dist: number;
  at: Vec3;
}

/** Levels at flow 1 and at a full river, tuned against the stream and cascade recordings. */
const LEVEL = { babble: 0.05, trickle: 0.1, fine: 0.2, wash: 0.3, rush: 0.1, rumble: 0.035 };
const TRIM = 0.4;
const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

export class Stream {
  private readonly ctx: BaseAudioContext;
  private readonly place: PlaceHandle;
  private sources: AudioScheduledSourceNode[] = [];
  private nodes: AudioNode[] = [];
  private air: BiquadFilterNode;
  private g: Record<'babble' | 'trickle' | 'fine' | 'wash' | 'rush' | 'rumble', GainNode>;
  private washHp: BiquadFilterNode;
  private washLp: BiquadFilterNode;
  private rushLp: BiquadFilterNode;
  private rate: AudioBufferSourceNode[] = [];

  constructor(deps: { ctx: BaseAudioContext; place: PlaceFactory }) {
    const ctx = (this.ctx = deps.ctx);
    this.place = deps.place({ x: 0, y: 0, z: -5 });
    const gain = (v: number): GainNode => { const n = ctx.createGain(); n.gain.value = v; this.nodes.push(n); return n; };
    const filt = (type: BiquadFilterType, f: number, q: number): BiquadFilterNode => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; this.nodes.push(b); return b; };
    const loop = (name: Parameters<typeof waterBuffer>[1], speed = 1): AudioBufferSourceNode => {
      const s = ctx.createBufferSource(); s.buffer = waterBuffer(ctx, name); s.loop = true;
      s.playbackRate.value = speed * (0.97 + Math.random() * 0.06); s.start(0, Math.random() * s.buffer.duration);
      this.sources.push(s); return s;
    };
    const flutter = (node: AudioNode, depth: number, speed: number): AudioNode => { const w = gain(1); loop('ctl', speed).connect(gain(depth)).connect(w.gain); node.connect(w); return w; };
    const sum = gain(1);
    const mk = (src: AudioNode, k: keyof Stream['g'], wob = 0): GainNode => { const g = gain(0); (wob ? flutter(src, wob, 0.45) : src).connect(g).connect(sum); return g; };
    const babble = loop('gurgle', 1.1), trickle = loop('trickle', 1.05), fine = loop('fine', 1);
    this.rate.push(babble, trickle, fine);
    this.washHp = filt('highpass', 700, -3.01); this.washLp = filt('lowpass', 7000, -3.01);
    this.rushLp = filt('lowpass', 1400, -3.01);
    const whiteRoar = loop('white');
    const pinkRush = loop('pink');
    const brown = loop('brown');
    this.g = {
      babble: mk(babble.connect(filt('highpass', 200, -3.01)), 'babble'),
      trickle: mk(trickle, 'trickle'),
      fine: mk(fine.connect(filt('highpass', 900, -3.01)), 'fine'),
      wash: mk(whiteRoar.connect(this.washHp).connect(this.washLp), 'wash', 0.22),
      rush: mk(pinkRush.connect(filt('highpass', 120, -3.01)).connect(this.rushLp), 'rush', 0.3),
      rumble: mk(brown.connect(filt('lowpass', 150, -3.01)), 'rumble', 0.3),
    };
    this.air = filt('lowpass', 18000, -3.01);
    sum.connect(this.air).connect(this.place.input);
  }

  set(s: StreamScene): void {
    const t = this.ctx.currentTime, tc = 1.2;
    const to = (p: AudioParam, v: number): void => { p.setTargetAtTime(v, t, tc); };
    const T = turbulence(s.flow, 'stream');
    const near = s.near;
    const lv = loudness(s.flow) * near;
    // single events: the loudness they have in a small flow (they do not grow), then buried
    const pool = loudness(0.5) * near * discreteShare(T);
    to(this.g.babble.gain, TRIM * LEVEL.babble * pool);
    to(this.g.trickle.gain, TRIM * LEVEL.trickle * pool * 1.4);
    to(this.g.fine.gain, TRIM * LEVEL.fine * pool);
    // the roar: surface white from about the knee, the wide rush of a deep channel, the mass of it below
    to(this.g.wash.gain, TRIM * LEVEL.wash * lv * (0.04 + 1.5 * smooth(T, 0, 0.55)));
    to(this.g.rush.gain, TRIM * LEVEL.rush * lv * (0.02 + 1.6 * smooth(T, 0.1, 1)));
    to(this.g.rumble.gain, TRIM * LEVEL.rumble * lv * smooth(T, 0.4, 1) * 2.2);
    to(this.washHp.frequency, 800 - 500 * smooth(T, 0, 1));          // a bigger flow is deeper
    to(this.washLp.frequency, 9000 - 3500 * smooth(T, 0, 1));
    to(this.rushLp.frequency, 2200 - 900 * smooth(T, 0, 1));
    for (const r of this.rate) to(r.playbackRate, 1.25 - 0.45 * smooth(T, 0, 1)); // bigger bubbles ring lower
    to(this.air.frequency, airCutoffHz(s.dist));
    this.place.move(s.at, 0.3);
  }

  dispose(): void {
    for (const x of this.sources) { try { x.stop(); } catch { /* already */ } }
    for (const n of this.nodes) { try { n.disconnect(); } catch { /* already */ } }
    this.place.dispose();
    this.sources = []; this.nodes = [];
  }
}
void clamp; void polar;
