import { describe, expect, it } from 'vitest';
import { createWorld } from '../src/world/world';
import { hydrologyAt } from '../src/sim/hydrology';
import { weatherAt, wetSpellIn } from '../src/sim/weather';
import { MS } from '../src/sim/time';

const w = createWorld('test-seed');

/** The start of the first rain that lasts at least `hours` hours (or Infinity), searching from `from`. */
function rainSpell(from: number, hours: number): { start: number; end: number } | null {
  for (let t = from; t < from + 400 * MS.day; t += MS.hour) {
    const rainy = (x: number) => { const k = weatherAt(w, x); return k.precip === 'rain' && k.rain > 300; };
    if (!rainy(t) || (t > from && rainy(t - MS.hour))) continue;
    let e = t;
    while (rainy(e + MS.hour)) e += MS.hour;
    const quiet = (from: number, h: number) => { for (let k = 0; k < h; k++) if (weatherAt(w, from + k * MS.hour).rain > 0) return false; return true; };
    if (e - t >= hours * MS.hour && quiet(e + MS.hour, 36) && quiet(t - 36 * MS.hour, 36)) return { start: t, end: e + MS.hour }; // dry for a day and a half either side
  }
  return null;
}

describe('where the water comes from', () => {
  it('is deterministic and bounded: every figure within its range, at every hour for a year', () => {
    for (let t = 20 * MS.day; t < 385 * MS.day; t += 7 * MS.hour) {
      const a = hydrologyAt(w, t), b = hydrologyAt(w, t);
      expect(a).toEqual(b);
      expect(a.runoff).toBeGreaterThanOrEqual(0); expect(a.runoff).toBeLessThanOrEqual(1);
      expect(a.overflow).toBeGreaterThanOrEqual(0); expect(a.overflow).toBeLessThanOrEqual(1);
      expect(a.flow).toBeGreaterThanOrEqual(0.45); expect(a.flow).toBeLessThanOrEqual(2.5);
      expect(a.dripping).toBeGreaterThanOrEqual(0.25); expect(a.dripping).toBeLessThanOrEqual(4);
      expect(a.streams).toBeGreaterThanOrEqual(0); expect(a.streams).toBeLessThanOrEqual(1.2);
      expect(a.fill).toBeGreaterThanOrEqual(0);
    }
  });
  it('the falls are never dry (the book\'s fresh water is always there), but thin in a dry spell and strong after rain', () => {
    let min = Infinity, max = 0;
    for (let t = 20 * MS.day; t < 385 * MS.day; t += 5 * MS.hour) { const f = hydrologyAt(w, t).flow; min = Math.min(min, f); max = Math.max(max, f); }
    expect(min).toBeGreaterThanOrEqual(0.45);
    expect(min).toBeLessThan(0.7);   // there are dry spells that thin them
    expect(max).toBeGreaterThan(1.6); // and wet ones that swell them well past an ordinary day
  });
  it('rain fills the stores and runs off at once; when it stops the runoff goes in about a day and the stores drain over days', () => {
    const spell = rainSpell(30 * MS.day, 6);
    expect(spell).not.toBeNull();
    const { start, end } = spell!;
    const before = hydrologyAt(w, start - MS.hour);
    const during = hydrologyAt(w, start + (end - start) / 2);
    const atEnd = hydrologyAt(w, end);
    const dayAfter = hydrologyAt(w, end + MS.day);
    const weekAfter = hydrologyAt(w, end + 7 * MS.day);
    expect(during.runoff).toBeGreaterThan(before.runoff + 0.05);
    expect(atEnd.fill).toBeGreaterThan(before.fill);
    expect(atEnd.flow).toBeGreaterThan(before.flow);
    expect(dayAfter.runoff).toBeLessThan(atEnd.runoff * 0.5);   // gone within about a day
    expect(dayAfter.fill).toBeGreaterThan(weekAfter.fill);        // the stores drain more slowly...
    expect(dayAfter.fill).toBeGreaterThan(atEnd.fill * 0.6);      // ...than the runoff did
    expect(dayAfter.flow).toBeLessThan(atEnd.flow);               // so the falls ease back
    expect(dayAfter.dripping).toBeGreaterThan(before.dripping * 0.8);
  });
  it('a long wet spell takes the stores over their brims, and the falls overflow', () => {
    let over = 0, calm = 0;
    for (let t = 20 * MS.day; t < 385 * MS.day; t += 6 * MS.hour) { const h = hydrologyAt(w, t); if (h.overflow > 0.2) over++; if (h.fill < 0.5) calm++; }
    expect(over).toBeGreaterThan(0);
    expect(calm).toBeGreaterThan(0);
  });
  it('is cheap when asked again for the same quarter hour', () => {
    const t = 100 * MS.day + 3 * MS.hour;
    const a0 = performance.now(); hydrologyAt(w, t); const first = performance.now() - a0;
    const b0 = performance.now(); for (let i = 0; i < 1000; i++) hydrologyAt(w, t + i * 1000); const again = performance.now() - b0;
    expect(again).toBeLessThan(first * 5 + 50);
  });

  it('a five-day rain of the book fills the stores over their brims: the falls swell and the stairs run, and over the following week they ease back', () => {
    let spell = null as ReturnType<typeof wetSpellIn>;
    for (let b = 40; b < 600 && !spell; b++) { const sp = wetSpellIn(w, b); if (sp && sp.end - sp.start >= 100 * MS.hour) spell = sp; }
    expect(spell).not.toBeNull();
    const before = hydrologyAt(w, spell!.start - 2 * MS.hour), atEnd = hydrologyAt(w, spell!.end), later = hydrologyAt(w, spell!.end + 6 * MS.day);
    expect(atEnd.overflow).toBeGreaterThan(0.4);
    expect(atEnd.flow).toBeGreaterThan(before.flow + 0.5);
    expect(atEnd.streams).toBeGreaterThan(0.4);
    expect(later.flow).toBeLessThan(atEnd.flow - 0.3);
    expect(later.overflow).toBeLessThan(atEnd.overflow);
  });
});
