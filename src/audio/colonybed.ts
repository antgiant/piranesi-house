// The low murmur under a colony or a flock of gulls. Recordings of gull colonies and flocks hold far more energy between 200 and 800 Hz than the sum of the single calls does
// (20 to 30 dB below the main band, where our synthesised calls, which start near 900 Hz, leave nothing): the low notes and
// body of many birds at every distance, and their echo off the cliff, blurred into a hum. It is made here as a quiet, slowly swelling band of noise with soft
// humps near 400, 560 and 740 Hz, placed all around so it is diffuse and takes the hall's own echo. Its level follows the colony's loudness. See design/birds.md.

import { waterBuffer } from './buffers';
import type { Vec3 } from './spatial';
import { polar } from './spatial';

export type SpotFn = (at: Vec3) => AudioNode;

const SPOTS: ReadonlyArray<[number, number, number]> = [[-60, 12, 30], [65, 8, 34], [175, 15, 40]];
/** Level at loudness 1 (the calls themselves sit around 0.11). */
const LEVEL = 0.0016;

export class ColonyBed {
  private readonly ctx: BaseAudioContext;
  private readonly sources: AudioScheduledSourceNode[] = [];
  private readonly nodes: AudioNode[] = [];
  private readonly out: GainNode;

  constructor(deps: { ctx: BaseAudioContext; spot: SpotFn }) {
    const ctx = (this.ctx = deps.ctx);
    this.out = ctx.createGain(); this.out.gain.value = 0; this.nodes.push(this.out);
    for (const [az, el, d] of SPOTS) {
      const src = ctx.createBufferSource(); src.buffer = waterBuffer(ctx, 'pink'); src.loop = true;
      src.playbackRate.value = 0.9 + Math.random() * 0.2; src.start(0, Math.random() * src.buffer.duration); this.sources.push(src);
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 200; hp.Q.value = 0.7;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = 0.7;
      const sum = ctx.createGain(); sum.gain.value = 1;
      src.connect(hp).connect(lp).connect(sum);
      for (const [f, g] of [[400, 0.8], [560, 1.0], [740, 0.7]] as const) {
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 2.2;
        const gn = ctx.createGain(); gn.gain.value = g; src.connect(bp).connect(gn).connect(sum); this.nodes.push(bp, gn);
      }
      // a slow swell of its own, so the three places do not breathe together
      const swell = ctx.createGain(); swell.gain.value = 0.7; this.nodes.push(swell);
      const c = ctx.createBufferSource(); c.buffer = waterBuffer(ctx, 'ctl'); c.loop = true; c.playbackRate.value = 0.12 + Math.random() * 0.1; c.start(0, Math.random() * c.buffer.duration); this.sources.push(c);
      const depth = ctx.createGain(); depth.gain.value = 0.3; c.connect(depth).connect(swell.gain);
      sum.connect(swell).connect(this.out); this.nodes.push(hp, lp, sum, depth);
      this.out.connect(deps.spot(polar(az, el, d)));
    }
  }

  /** 0 for no colony; about 0.8 for a full one. */
  set(loudness: number): void {
    const t = this.ctx.currentTime;
    this.out.gain.setTargetAtTime(Math.max(0, loudness) * LEVEL, t, 2);
  }

  dispose(): void {
    for (const s of this.sources) { try { s.stop(); } catch { /* already stopped */ } }
    for (const n of this.nodes) { try { n.disconnect(); } catch { /* already */ } }
  }
}
