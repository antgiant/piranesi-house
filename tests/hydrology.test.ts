import { describe, expect, it } from 'vitest';
import { createWorld } from '../src/world/world';
import { hydrologyAt } from '../src/sim/hydrology';
import { weatherAt, wetSpellIn } from '../src/sim/weather';
import { MS } from '../src/sim/time';

const w = createWorld('test-seed');

/** The sum of the rain in a window of hours, in "full rain" hours (1 = an hour of the heaviest rain). */
function rainIn(from: number, hours: number): number {
  let sum = 0;
  for (let k = 0; k < hours; k++) { const x = weatherAt(w, from + k * MS.hour); if (x.precip === 'rain') sum += x.rain / 1000; }
  return sum;
}

/** The first rain event (a window of `hours` hours with at least `min` full-rain hours), with a dry day before it and a dry day and more after it. */
function rainSpell(from: number, hours: number, min = 2.5): { start: number; end: number } | null {
  for (let t = from; t < from + 400 * MS.day; t += MS.hour) {
    if (rainIn(t, hours) < min) continue;
    if (rainIn(t - 20 * MS.hour, 20) > 0.5) continue;
    if (rainIn(t + hours * MS.hour, 78) > 1.0) continue; // and three quiet days after, so that nothing refills the stores
    return { start: t, end: t + hours * MS.hour };
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
    const spell = rainSpell(30 * MS.day, 10);
    expect(spell).not.toBeNull();
    const { start, end } = spell!;
    const before = hydrologyAt(w, start - MS.hour);
    const during = hydrologyAt(w, start + (end - start) / 2);
    const atEnd = hydrologyAt(w, end);
    const dayAfter = hydrologyAt(w, end + MS.day);
    const weekAfter = hydrologyAt(w, end + 3 * MS.day); // (three days on: the stores are well down)
    expect(during.runoff).toBeGreaterThan(before.runoff + 0.05);
    expect(atEnd.fill).toBeGreaterThan(before.fill);
    expect(atEnd.flow).toBeGreaterThan(before.flow);
    expect(dayAfter.runoff).toBeLessThan(atEnd.runoff * 0.5);   // gone within about a day
    expect(dayAfter.fill).toBeGreaterThan(weekAfter.fill);        // the stores drain more slowly...
    expect(dayAfter.fill).toBeGreaterThan(atEnd.fill * 0.6);      // ...than the runoff did
    expect(dayAfter.flow).toBeLessThan(atEnd.flow);               // so the falls ease back
    expect(dayAfter.dripping).toBeGreaterThan(0.25);       // the stone is still dripping a day after the rain has gone (a dry spell's floor is 0.25)...
    expect(dayAfter.dripping).toBeLessThan(atEnd.dripping); // ...but less than at the end of the rain
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
