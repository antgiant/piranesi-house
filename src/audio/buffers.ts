// The looping noise and bubble buffers the water voices play, made once for each audio context and shared. Each voice plays them from its own
// offset and speed, so voices sharing a buffer are still independent. Made on first use (a buffer of bubbles takes tens of milliseconds).

import { FINE, GURGLE, PLOPS, TRICKLE, fillSwarm } from './bubbles';
import { fillBrown, fillControl, fillFoam, fillPatter, fillPink, fillWhite, makeBuffer } from './noise';

export type BufferName = 'white' | 'pink' | 'brown' | 'ctl' | 'foam' | 'patter' | 'fine' | 'plops' | 'trickle' | 'gurgle';

const MAKE: Record<BufferName, { secs: number; rms: number; fill: (d: Float32Array, sr: number) => void }> = {
  white: { secs: 12, rms: 0.25, fill: fillWhite },
  pink: { secs: 12, rms: 0.25, fill: fillPink },
  brown: { secs: 12, rms: 0.25, fill: fillBrown },
  ctl: { secs: 12, rms: 1, fill: fillControl },
  foam: { secs: 12, rms: 0.3, fill: fillFoam },
  patter: { secs: 12, rms: 0.25, fill: fillPatter },
  fine: { secs: 8, rms: 0.25, fill: (d, sr) => fillSwarm(d, sr, FINE) },
  plops: { secs: 10, rms: 0.25, fill: (d, sr) => fillSwarm(d, sr, PLOPS) },
  trickle: { secs: 8, rms: 0.25, fill: (d, sr) => fillSwarm(d, sr, TRICKLE) },
  gurgle: { secs: 10, rms: 0.25, fill: (d, sr) => fillSwarm(d, sr, GURGLE) },
};

const cache = new WeakMap<BaseAudioContext, Partial<Record<BufferName, AudioBuffer>>>();

export function waterBuffer(ctx: BaseAudioContext, name: BufferName): AudioBuffer {
  let m = cache.get(ctx);
  if (!m) { m = {}; cache.set(ctx, m); }
  let b = m[name];
  if (!b) {
    const spec = MAKE[name];
    b = makeBuffer(ctx, spec.secs, spec.fill, spec.rms);
    m[name] = b;
  }
  return b;
}
