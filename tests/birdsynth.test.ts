import { describe, expect, it } from 'vitest';
import { CALLS, type CallName, type MeasuredCall } from '../src/audio/birdcalls';
import { LIB } from '../src/audio/birdlib';
import { renderCall } from '../src/audio/birdsynth';
import { plan, type Voice } from '../src/audio/birdsong';

function seeded(seed: number): () => number { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
const sr = 22050;

/** The frequency (Hz) of the strongest component of a mono signal. */
function peakHz(x: Float32Array, lo: number, hi: number): number {
  const n = 1 << Math.floor(Math.log2(x.length)); let best = 0, bestF = 0;
  for (let hz = lo; hz < hi; hz += 25) {
    let re = 0, im = 0; const w = (2 * Math.PI * hz) / sr;
    for (let i = 0; i < n; i += 2) { re += x[i]! * Math.cos(w * i); im += x[i]! * Math.sin(w * i); }
    const m = re * re + im * im; if (m > best) { best = m; bestF = hz; }
  }
  return bestF;
}

describe('a bird call made from its measured template', () => {
  const names = Object.keys(CALLS) as CallName[];
  it('is finite, normalised and about as long as the measured calls', () => {
    for (const nm of names) for (let i = 0; i < 6; i++) {
      const c = renderCall(sr, CALLS[nm], seeded(i + 1));
      const peak = c.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
      expect(c.every(Number.isFinite)).toBe(true);
      expect(peak).toBeGreaterThan(0.5); expect(peak).toBeLessThanOrEqual(1.0001);
      const dur = c.length / sr;
      if ((CALLS[nm] as MeasuredCall).click) { expect(dur).toBeLessThan(0.05); continue; }
      expect(dur).toBeGreaterThan(CALLS[nm].durRange[0] * 0.95 - 0.005); expect(dur).toBeLessThan(CALLS[nm].durRange[1] * 1.05 + 0.005);
    }
  });
  it('sits where the bird sings: a gull mew near its measured pitch, a buzzard higher, a rook lower than either', () => {
    const f = (nm: CallName): number => peakHz(renderCall(sr, CALLS[nm], seeded(3)), 200, 4000);
    const gull = f('gullMew'), buzzard = f('buzzardMew'), rook = f('rookCaw');
    expect(gull).toBeGreaterThan(900); expect(gull).toBeLessThan(3500);
    expect(buzzard).toBeGreaterThan(2000); expect(buzzard).toBeLessThan(3500);
    expect(rook).toBeLessThan(buzzard);
  });
  it('differs from one call to the next, but is the same for the same seed', () => {
    const a = renderCall(sr, CALLS.gullMew, seeded(1)), b = renderCall(sr, CALLS.gullMew, seeded(2)), c = renderCall(sr, CALLS.gullMew, seeded(1));
    expect(Array.from(a.slice(0, 300))).toEqual(Array.from(c.slice(0, 300)));
    expect(Array.from(a.slice(0, 300))).not.toEqual(Array.from(b.slice(0, 300)));
  });
  it('a pitch scale moves the call', () => {
    const centroid = (x: Float32Array): number => { let m = 0, w = 0; for (let hz = 200; hz < 6000; hz += 50) { let re = 0, im = 0; const k = (2 * Math.PI * hz) / sr; for (let i = 0; i < x.length; i += 2) { re += x[i]! * Math.cos(k * i); im += x[i]! * Math.sin(k * i); } const p = re * re + im * im; m += hz * p; w += p; } return m / w; };
    const lo = centroid(renderCall(sr, CALLS.gullMew, seeded(4), { pitch: 0.8 })), hi = centroid(renderCall(sr, CALLS.gullMew, seeded(4), { pitch: 1.25 }));
    expect(hi).toBeGreaterThan(lo * 1.2);
  });
});

describe('what the birds say', () => {
  const voices: Voice[] = ['gull', 'rook', 'sparrow', 'blackbird', 'buzzard', 'owl', 'albatross', 'chick'];
  it('makes a short, ordered plan of known calls for every bird in every situation', () => {
    for (const who of voices) for (const ctx of ['colony', 'air', 'roost', 'rain', 'flock', 'greeting', 'nest'] as const) for (let i = 0; i < 40; i++) {
      const p = plan(who, ctx, seeded(i * 7 + 1));
      expect(p.length).toBeGreaterThan(0); expect(p.length).toBeLessThan(80);
      for (let k = 0; k < p.length; k++) {
        const n = p[k]!; expect(n.call in CALLS || n.call in LIB).toBe(true); expect(n.dt).toBeGreaterThanOrEqual(0); expect(n.gain).toBeGreaterThan(0); expect(n.pitch).toBeGreaterThan(0.6); expect(n.pitch).toBeLessThan(1.4);
        if (k > 0) expect(n.dt).toBeGreaterThanOrEqual(p[k - 1]!.dt);
      }
      expect(p[p.length - 1]!.dt).toBeLessThan(30);
    }
  });
  it('gives the albatross its clacking and then a whirr, and the gull colony its alarm run and its laughing long call', () => {
    const alb = plan('albatross', 'greeting', seeded(2));
    expect(alb.filter((n) => n.call.startsWith('albatrossClap')).length).toBeGreaterThanOrEqual(5); expect(alb[alb.length - 1]!.call).toBe('albatrossWhirr');
    let long = 0, alarm = 0;
    for (let i = 0; i < 100; i++) { const p = plan('gull', 'colony', seeded(i + 11)); if (p.filter((n) => n.call === 'gullNote').length >= 9) long++; else if (p.length >= 3 && p.every((n) => n.call === 'gullAlarm')) alarm++; }
    expect(long).toBeGreaterThan(5); expect(alarm).toBeGreaterThan(20);
  });
  it('spaces the notes as the recordings did', () => {
    const p = plan('gull', 'colony', seeded(5)).filter((n) => n.call === 'gullNote');
    for (let k = 1; k < p.length; k++) { const g = p[k]!.dt - p[k - 1]!.dt; expect(g).toBeGreaterThan(0.15); expect(g).toBeLessThan(0.4); }
  });
});
