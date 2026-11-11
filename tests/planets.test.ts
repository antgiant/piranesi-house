import { describe, expect, it } from 'vitest';
import { moonSky, planetsVisible, sunLongitude, zodiacAt, compassWord, heightPhrase } from '../src/sim/planets';
import { MS, clock, moon } from '../src/sim/time';
import { sceneAtWorldTime } from '../src/sim/scene';
import { lightSentence } from '../src/game/narrator';
import { createWorld } from '../src/world/world';
import { getHall } from '../src/world/hall';

const w = createWorld('the-house');
const at = (iso: string): number => Date.parse(iso) - Date.UTC(2026, 0, 1);

describe('the sun, the zodiac and the planets', () => {
  it('puts the sun where it belongs at the equinoxes and solstices', () => {
    const near = (a: number, b: number, tol = 3): boolean => Math.abs(((a - b + 540) % 360) - 180) <= tol;
    expect(near(sunLongitude(at('2026-03-20T12:00:00Z')), 0)).toBe(true);
    expect(near(sunLongitude(at('2026-06-21T12:00:00Z')), 90)).toBe(true);
    expect(near(sunLongitude(at('2026-09-23T12:00:00Z')), 180)).toBe(true);
    expect(near(sunLongitude(at('2026-12-21T12:00:00Z')), 270)).toBe(true);
  });
  it('names the figure the sun is in, as the calendar knows it', () => {
    expect(zodiacAt(sunLongitude(at('2026-07-20T12:00:00Z')))).toBe('the Crab');
    expect(zodiacAt(sunLongitude(at('2026-08-20T12:00:00Z')))).toBe('the Lion');
    expect(zodiacAt(sunLongitude(at('2026-12-25T12:00:00Z')))).toBe('the Archer');
  });
  it('shows Venus only near the sun, and low, in the evening or the morning, and never by day', () => {
    let seen = 0;
    for (let d = 0; d < 800; d++) for (const h of [5, 6, 18, 19, 20, 22, 2]) {
      const t = d * MS.day + h * MS.hour;
      const c = clock(t);
      for (const p of planetsVisible(t, c.dayOfYear, c.minuteOfDay)) {
        expect(p.alt).toBeGreaterThanOrEqual(6);
        if (p.name === 'Venus') { seen++; expect(p.elongation).toBeLessThanOrEqual(48); }
      }
    }
    expect(seen).toBeGreaterThan(50);
    for (let d = 0; d < 200; d++) { const t = d * MS.day + 12 * MS.hour; const c = clock(t); expect(planetsVisible(t, c.dayOfYear, c.minuteOfDay)).toEqual([]); }
  });
  it('shows the outer planets on some nights, and they change through the year', () => {
    const names = new Set<string>();
    for (let d = 0; d < 800; d += 3) { const t = d * MS.day + 23 * MS.hour; const c = clock(t); for (const p of planetsVisible(t, c.dayOfYear, c.minuteOfDay)) names.add(p.name); }
    expect(names.has('Jupiter') || names.has('Saturn') || names.has('Mars')).toBe(true);
    expect(names.size).toBeGreaterThanOrEqual(2);
  });
  it('words compass points and heights', () => {
    expect(compassWord(0)).toBe('north'); expect(compassWord(95)).toBe('east'); expect(compassWord(181)).toBe('south'); expect(compassWord(359)).toBe('north');
    expect(heightPhrase(5)).toBe('low'); expect(heightPhrase(80)).toBe('almost overhead');
  });
});

describe('the moon in the sky', () => {
  it('rises in the east, stands in the south and sets in the west', () => {
    const seen = new Set<string>();
    for (let t = 0; t < 29 * MS.day; t += 41 * MS.min) {
      const c = clock(t);
      const m = moon(w, t, c);
      const s = moonSky(m, t, c.minuteOfDay);
      if (!m.up) { expect(s).toBeNull(); continue; }
      expect(s).not.toBeNull();
      for (const d of ['east', 'south-east', 'south', 'south-west', 'west']) if (s!.where.endsWith(d)) seen.add(d);
    }
    expect(seen.size).toBe(5);
  });
  it('is said in an upper hall at night and, if pale, by day; and the planets are named in the dark hall frame only in the east', () => {
    const up = getHall(w, 3, 3, 2);
    let night = 0, day = 0, planet = 0;
    for (let t = 0; t < 120 * MS.day; t += 53 * MS.min) {
      const sc = sceneAtWorldTime(w, 3, 3, 2, t, { forecast: false });
      const txt = lightSentence(up, sc);
      if (/moon stands/.test(txt)) { night++; expect(txt).toMatch(/among the |among /); }
      if (/pale .* moon hangs/.test(txt)) { day++; expect(sc.light.sunPhase).toBe('day'); }
      if (/, hangs (low|part-way|high|almost)/.test(txt)) planet++;
    }
    expect(night).toBeGreaterThan(20);
    expect(day).toBeGreaterThan(3);
    expect(planet).toBeGreaterThan(3);
  });
});
