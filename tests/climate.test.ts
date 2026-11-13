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

describe('the wind matches Derbyshire and the English coasts', () => {
  it('blows at about 10 mph in an ordinary hour, hard in one hour in a hundred, from the south-west and west, and in spells', () => {
    const w = createWorld('test-seed');
    const sp: number[] = []; const dir: Record<string, number> = {}; const winter: number[] = [], summer: number[] = [];
    for (let t = 0; t < 10 * 365 * MS.day; t += MS.hour) {
      const k = weatherAt(w, t); sp.push(k.windSpeed); dir[k.windDir] = (dir[k.windDir] ?? 0) + 1;
      const d = Math.floor((t / MS.day) % 365); if (d < 59 || d >= 335) winter.push(k.windSpeed); else if (d >= 151 && d < 243) summer.push(k.windSpeed);
    }
    const mph = (v: number): number => (v / 1000) * 36;
    const s = [...sp].sort((a, b) => a - b); const q = (p: number): number => mph(s[Math.floor(p * s.length)]!);
    expect(q(0.5)).toBeGreaterThan(8); expect(q(0.5)).toBeLessThan(11);     // real 9.1-9.9
    expect(q(0.9)).toBeGreaterThan(15); expect(q(0.9)).toBeLessThan(19);    // 16.4-18.3
    expect(q(0.99)).toBeGreaterThan(21); expect(q(0.99)).toBeLessThan(27);  // 23.4-26.5
    const mean = (a: number[]): number => a.reduce((x, y) => x + y, 0) / a.length;
    expect(mean(winter) / mean(summer)).toBeGreaterThan(1.1); expect(mean(winter) / mean(summer)).toBeLessThan(1.5);
    const swW = ((dir.SW ?? 0) + (dir.W ?? 0)) / sp.length; expect(swW).toBeGreaterThan(0.38); expect(swW).toBeLessThan(0.55); // real 38-46%
    const m = mean(sp); let v = 0, c6 = 0, c24 = 0;
    for (let i = 0; i < sp.length - 24; i++) { const a = sp[i]! - m; v += a * a; c6 += a * (sp[i + 6]! - m); c24 += a * (sp[i + 24]! - m); }
    expect(c6 / v).toBeGreaterThan(0.6); expect(c24 / v).toBeGreaterThan(0.3); // real 0.72, 0.40: wind lasts
  });
});
