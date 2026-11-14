import { describe, expect, it } from 'vitest';
import { BANDS, bandTimes, bandpass, buildImpulse, reflections, type Room } from '../src/audio/room';

function seeded(seed: number): () => number { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
const C = 343;

/** Reverberation time of one octave of an impulse response, by Schroeder's backward integration between -5 and -25 dB, from the first reflection. */
function t20(ir: Float32Array, sr: number, fc: number): number {
  const f1 = bandpass(sr, fc, 1.41), f2 = bandpass(sr, fc, 1.41);
  const e = new Float64Array(ir.length);
  let first = -1;
  for (let i = 0; i < ir.length; i++) { const y = f2(f1(ir[i]!)); e[i] = y * y; }
  const peak = Math.max(...Array.from(e.slice(0, Math.min(e.length, sr))));
  for (let i = 0; i < e.length; i++) if (e[i]! > peak * 1e-6) { first = i; break; }
  const s = new Float64Array(e.length - first);
  let acc = 0; for (let i = e.length - 1; i >= first; i--) { acc += e[i]!; s[i - first] = acc; }
  const db = Array.from(s, (v) => 10 * Math.log10(v / s[0]! + 1e-30));
  let a = -1, b = -1; for (let i = 0; i < db.length; i++) { if (a < 0 && db[i]! <= -5) a = i; if (b < 0 && db[i]! <= -25) { b = i; break; } }
  return (b - a) / sr * 3;
}

describe('the echo of a hall', () => {
  const room: Room = { lx: 30, ly: 24, h: 12, px: 9, py: 10, rt: 3 };

  it('lasts less long in the highs, by the stone and the air', () => {
    const t = bandTimes(room);
    for (let i = 1; i < t.length; i++) expect(t[i]!).toBeLessThanOrEqual(t[i - 1]! + 1e-9);
    expect(t[3]!).toBeCloseTo(room.rt, 0);           // 1 kHz is about the stated time (a little under: the air takes some)
    expect(t[5]! / t[3]!).toBeLessThan(0.85);        // 4 kHz: the measured stone rooms are 0.6-0.88
    expect(t[6]! / t[3]!).toBeLessThan(0.6);         // 8 kHz: 0.45-0.8 in small rooms, less in a hall
    const damp = bandTimes({ ...room, damp: 0.42 });
    expect(damp[6]!).toBeLessThan(t[6]!); expect(damp[3]!).toBeCloseTo(t[3]!, 5);
  });

  it('a bigger hall rings longer in the air-limited highs than a small one with the same stone time', () => {
    const big = bandTimes({ rt: 8 })[6]!, small = bandTimes({ rt: 2 })[6]!;
    expect(big / 8).toBeLessThan(small / 2); // the air takes a larger share of a long decay
  });

  it('has no echo until the sound has crossed to a surface and back', () => {
    const r = reflections(room);
    expect(r.length).toBeGreaterThan(20);
    expect(r[0]!.t).toBeGreaterThan(0.015);
    // the nearest surface to the listener is a wall 9 m away or the ceiling 10.4 m above: the first reflection cannot come before the path there and back
    expect(r[0]!.t).toBeGreaterThanOrEqual((2 * 9) / C - 0.002);
    for (let i = 1; i < r.length; i++) expect(r[i]!.t).toBeGreaterThanOrEqual(r[i - 1]!.t);
  });

  it('first echoes come later in a bigger hall', () => {
    const small = reflections({ ...room, lx: 12, ly: 10, h: 6, px: 4, py: 4 })[0]!.t;
    const big = reflections({ ...room, lx: 120, ly: 90, h: 40, px: 40, py: 40 })[0]!.t;
    expect(big).toBeGreaterThan(small * 2);
  });

  it('decays at the stated time in every octave (within a quarter), and is the same every time for the same hall', () => {
    const sr = 24000, a = buildImpulse(sr, room, seeded(5)), b = buildImpulse(sr, room, seeded(5));
    expect(Array.from(a[0].slice(0, 5000))).toEqual(Array.from(b[0].slice(0, 5000)));
    const want = bandTimes(room);
    BANDS.forEach((fc, i) => {
      if (fc > 4000) return; // the top octave is near the Nyquist frequency here
      const got = t20(a[0], sr, fc);
      expect(got / want[i]!).toBeGreaterThan(0.75); expect(got / want[i]!).toBeLessThan(1.3);
    });
  });

  it('the two ears hear different echoes', () => {
    const [L, R] = buildImpulse(24000, room, seeded(3));
    let dot = 0, l = 0, r = 0;
    for (let i = 3000; i < L.length; i++) { dot += L[i]! * R[i]!; l += L[i]! * L[i]!; r += R[i]! * R[i]!; }
    expect(Math.abs(dot / Math.sqrt(l * r))).toBeLessThan(0.3);
  });
});
