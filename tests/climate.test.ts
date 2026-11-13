import { describe, expect, it } from 'vitest';
import { createWorld } from '../src/world/world';
import { weatherAt } from '../src/sim/weather';
import { MS } from '../src/sim/time';

// The rain is fitted to ten years (2014-2023) of real hourly precipitation for an English coast and the author's home in Derbyshire (design/weather-vs-book.md,
// scripts/climate). These keep it there: wet hours, the shortness of spells, how they gather into episodes, and a rain that falls all through the year.
// "Wet" is 0.1 mm in the records, 0.02 of the model's scale; an "episode" joins wet hours with gaps of six hours or less.

function episodes(wet: boolean[], gap = 6): number[] {
  const out: number[] = []; let s = -1, last = -1;
  for (let i = 0; i < wet.length; i++) if (wet[i]) { if (s < 0) s = i; else if (i - last - 1 > gap) { out.push(last + 1 - s); s = i; } last = i; }
  if (s >= 0) out.push(last + 1 - s);
  return out;
}
function spells(wet: boolean[]): number[] { const o: number[] = []; let r = 0; for (const v of wet) { if (v) r++; else if (r) { o.push(r); r = 0; } } if (r) o.push(r); return o; }

describe('the rain matches an English coast', () => {
  const years = 10;
  for (const seed of ['test-seed', 'the-house', 'another']) {
    it(`(${seed}) is falling about a fifth to a quarter of the hours, in short spells that gather into episodes, all year round`, () => {
      const w = createWorld(seed);
      const wet: boolean[] = [], season: Record<string, number[]> = { winter: [], spring: [], summer: [], autumn: [] };
      for (let t = 0; t < years * 365 * MS.day; t += MS.hour) {
        const k = weatherAt(w, t);
        const isWet = k.rain >= 20;
        wet.push(isWet);
        const c = Math.floor((t / MS.day) % 365);
        season[c < 59 || c >= 335 ? 'winter' : c < 151 ? 'spring' : c < 243 ? 'summer' : 'autumn']!.push(isWet ? 1 : 0);
      }
      const frac = wet.filter(Boolean).length / wet.length;
      expect(frac).toBeGreaterThan(0.19); expect(frac).toBeLessThan(0.28);
      const sp = spells(wet).sort((a, b) => a - b);
      expect(sp[Math.floor(sp.length / 2)]).toBeGreaterThanOrEqual(2); expect(sp[Math.floor(sp.length / 2)]).toBeLessThanOrEqual(4);
      expect(sp[Math.floor(sp.length * 0.9)]).toBeLessThanOrEqual(16);
      const ev = episodes(wet);
      const per = (h: number) => ev.filter((d) => d >= h).length / years;
      expect(per(12)).toBeGreaterThan(55); expect(per(12)).toBeLessThan(95);   // real coasts 63-84
      expect(per(24)).toBeGreaterThan(22); expect(per(24)).toBeLessThan(42);   // 23-38
      expect(per(48)).toBeGreaterThan(5);  expect(per(48)).toBeLessThan(12);   // 5-10
      expect(per(72)).toBeGreaterThan(1.2); expect(per(72)).toBeLessThan(4.5); // 1.7-3.5
      // all through the year: the wettest season has under 1.6 times the wet hours of the driest (the real coasts: 1.1 to 1.3)
      const shares = Object.values(season).map((a) => a.reduce((x, y) => x + y, 0) / a.length);
      expect(Math.max(...shares) / Math.min(...shares)).toBeLessThan(1.6);
    });
  }
});
