// Rain on water: a patter of small drops landing, all around you. It is the sound the sea's foam used to make before the foam was
// changed to a smooth fizz (those pops, softened: see PATTER in noise.ts). Where rain falls on standing water (a hall the tide has flooded,
// a pool under falls or a stream, the sea itself) this joins the ordinary rain, so it sounds like drops landing on water and not only
// on stone. Each direction has its own noise and its own slow flutter, as in the sea.

import { fillControl, fillPatter, makeBuffer } from './noise';
import { AROUND, polar, type Vec3 } from './spatial';

export interface PatterDeps {
  ctx: BaseAudioContext;
  /** An input heard from a point around the listener (shared with the rest of the soundscape). */
  spot: (at: Vec3) => AudioNode;
  voices?: number;
}

const BUF_SEC = 12;
const SPOT_DIST = 5;
/** The patter's level at full: tuned to sit with the ordinary rain layer. */
const LEVEL = 0.2;

const rand = (a: number, b: number): number => a + Math.random() * (b - a);

export class Patter {
  private readonly ctx: BaseAudioContext;
  private masters: GainNode[] = [];
  private sources: AudioScheduledSourceNode[] = [];
  private nodes: AudioNode[] = [];

  constructor(deps: PatterDeps) {
    const ctx = (this.ctx = deps.ctx);
    const n = Math.max(2, Math.min(deps.voices ?? 6, AROUND.length));
    const drops = makeBuffer(ctx, BUF_SEC, fillPatter, 0.25);
    const ctl = makeBuffer(ctx, BUF_SEC, fillControl, 1);
    for (let i = 0; i < n; i++) {
      const at = AROUND[i]!;
      const src = ctx.createBufferSource();
      src.buffer = drops; src.loop = true; src.playbackRate.value = rand(0.97, 1.03);
      src.start(0, Math.random() * drops.duration);
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1100; hp.Q.value = 0.5;
      const wob = ctx.createGain(); wob.gain.value = 1;
      // a slow random flutter, so the rain comes in gusts and the directions do not move together
      const lfo = ctx.createBufferSource();
      lfo.buffer = ctl; lfo.loop = true; lfo.playbackRate.value = rand(0.4, 0.7); lfo.start(0, Math.random() * ctl.duration);
      const depth = ctx.createGain(); depth.gain.value = 0.3;
      lfo.connect(depth).connect(wob.gain);
      const m = ctx.createGain(); m.gain.value = 0;
      src.connect(hp).connect(wob).connect(m).connect(deps.spot(polar(at.az, at.el, SPOT_DIST)));
      this.masters.push(m);
      this.sources.push(src, lfo);
      this.nodes.push(hp, wob, depth, m);
    }
  }

  /** 0..1: how hard the rain falls on water here. */
  set(level: number): void {
    const t = this.ctx.currentTime;
    for (const m of this.masters) m.gain.setTargetAtTime(Math.max(0, Math.min(1, level)) * LEVEL, t, 1.5);
  }

  dispose(): void {
    for (const s of this.sources) { try { s.stop(); } catch { /* already stopped */ } }
    for (const n of this.nodes) { try { n.disconnect(); } catch { /* already */ } }
    this.sources = []; this.nodes = []; this.masters = [];
  }
}
