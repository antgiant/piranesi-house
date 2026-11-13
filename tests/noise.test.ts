import { describe, expect, it } from 'vitest';
import { FOAM, PATTER, fillPops, fillPink, normalise, type PopSpec } from '../src/audio/noise';

// What went wrong with the first surf foam: it was thousands of small pitched pops with a few loud ones, and it sounded like pebbles or ice
// clinking, not foam. These tests count the audible clinks (a pop that stands well clear of the wash around it) and so guard against it.

function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}
const SR = 48000;

/** A second-order section (RBJ cookbook), run in place. */
function biquad(x: Float32Array, type: 'hp' | 'lp', f: number): Float32Array {
  const w = (2 * Math.PI * f) / SR, c = Math.cos(w), al = Math.sin(w) / (2 * Math.SQRT1_2);
  const a0 = 1 + al;
  const b = type === 'hp' ? [(1 + c) / 2, -(1 + c), (1 + c) / 2] : [(1 - c) / 2, 1 - c, (1 - c) / 2];
  const a1 = (-2 * c) / a0, a2 = (1 - al) / a0;
  const out = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const y = (b[0]! * x[i]! + b[1]! * x1 + b[2]! * x2) / a0 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x[i]!; y2 = y1; y1 = y; out[i] = y;
  }
  return out;
}

/** Audible clinks per second: peaks in the 1.5-8 kHz level (2 ms steps) at least 9 dB over the running median of the last ~100 ms. */
function clinksPerSecond(x: Float32Array): number {
  let y = x;
  for (let i = 0; i < 2; i++) { y = biquad(y, 'hp', 1500); y = biquad(y, 'lp', 8000); }
  const step = Math.floor(SR * 0.002), n = Math.floor(y.length / step);
  const db = new Float64Array(n);
  for (let i = 0; i < n; i++) { let s = 0; for (let k = 0; k < step; k++) s += y[i * step + k]! ** 2; db[i] = 10 * Math.log10(s / step + 1e-18); }
  const half = 25;
  const ex = new Float64Array(n);
  for (let i = half; i < n - half; i++) {
    const win = Array.from(db.subarray(i - half, i + half + 1)).sort((p, q) => p - q);
    ex[i] = db[i]! - win[half]!;
  }
  let count = 0, last = -100;
  for (let i = half + 1; i < n - half - 1; i++) if (ex[i]! >= 9 && ex[i]! >= ex[i - 1]! && ex[i]! > ex[i + 1]! && i - last >= 12) { count++; last = i; }
  return count / (n * 0.002);
}

const render = (spec: PopSpec, secs: number, seed: number): Float32Array => {
  const d = new Float32Array(SR * secs);
  fillPops(d, SR, spec, seeded(seed));
  normalise(d, 0.1);
  return d;
};

// the first version of the foam, kept here as the thing to stay away from
const ORIGINAL_FOAM: PopSpec = { perSec: 2200, fLo: 1400, fHi: 9500, tauMs: 0.9, fRef: 3000, power: 2.4, base: 0.3, spread: 1.0, tilt: 0.5, cap: 99 };

describe('surf foam and rain-on-water textures', () => {
  it('the original foam recipe does clink (the detector can see it)', () => {
    expect(clinksPerSecond(render(ORIGINAL_FOAM, 16, 1))).toBeGreaterThan(5);
  });
  it('the foam does not clink: no more than the cleanest real surf recording (about 2 a second), in fact next to none', () => {
    for (const seed of [1, 2, 3]) expect(clinksPerSecond(render(FOAM, 16, seed))).toBeLessThan(0.6);
  });
  it('the patter is a pattering of distinct drops: clearly more than the foam, clearly fewer than the original', () => {
    const p = clinksPerSecond(render(PATTER, 16, 5));
    expect(p).toBeGreaterThan(1.5);
    expect(p).toBeLessThan(clinksPerSecond(render(ORIGINAL_FOAM, 16, 5)));
  });
  it('plain noise has no clinks either, so the foam is no worse than noise', () => {
    const d = new Float32Array(SR * 16);
    fillPink(d, SR, seeded(9));
    normalise(d, 0.1);
    expect(clinksPerSecond(d)).toBeLessThan(0.6);
  });
  it('is repeatable with a seeded random source, and bounded', () => {
    const a = render(FOAM, 2, 4), b = render(FOAM, 2, 4);
    expect(Array.from(a.subarray(0, 50))).toEqual(Array.from(b.subarray(0, 50)));
    let peak = 0;
    for (const v of a) peak = Math.max(peak, Math.abs(v));
    expect(peak).toBeLessThan(2);
    expect(Number.isFinite(peak)).toBe(true);
  });
});
