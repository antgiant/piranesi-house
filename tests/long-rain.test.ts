import { describe, expect, it } from 'vitest';
import { createWorld } from '../src/world/world';
import { weatherAt, wetSpellIn } from '../src/sim/weather';
import { MS, clock } from '../src/sim/time';

// The book records one autumn rain that went on for five days, steady and soaking, over all the vestibules (canon WX-002, WX-009). The showers of the
// weather model last hours; these tests keep the long rains the book describes.
const seeds = ['test-seed', 'the-house', 'another', 'x', 'y'];

describe('the long rains of the book', () => {
  it('last two to five days, there are three or four a year, most in autumn and winter, and they never run into each other', () => {
    for (const seed of seeds) {
      const w = createWorld(seed);
      const years = 40, blocks = Math.floor((years * 365) / 12);
      let n = 0, autumnWinter = 0, longest = 0, shortest = Infinity;
      let prevEnd = -Infinity;
      for (let b = 0; b < blocks; b++) {
        const s = wetSpellIn(w, b);
        if (!s) continue;
        const h = (s.end - s.start) / MS.hour;
        n++; longest = Math.max(longest, h); shortest = Math.min(shortest, h);
        const season = clock(s.start).season;
        if (season === 'autumn' || season === 'winter') autumnWinter++;
        expect(s.start).toBeGreaterThanOrEqual(b * 12 * MS.day);
        expect(s.end).toBeLessThanOrEqual((b + 1) * 12 * MS.day);
        expect(s.start).toBeGreaterThanOrEqual(prevEnd);
        prevEnd = s.end;
      }
      expect(n / years).toBeGreaterThan(2.5);
      expect(n / years).toBeLessThan(5);
      expect(autumnWinter / n).toBeGreaterThan(0.6);
      expect(shortest).toBeGreaterThanOrEqual(48);
      expect(longest).toBeGreaterThanOrEqual(110);   // five days happens
      expect(longest).toBeLessThanOrEqual(120);
    }
  });

  it('under one it rains steadily (not in showers), under a thick grey sky, with the wind down', () => {
    const w = createWorld('test-seed');
    let spell = null as ReturnType<typeof wetSpellIn>;
    for (let b = 40; b < 400 && !spell; b++) { const s = wetSpellIn(w, b); if (s && s.end - s.start >= 90 * MS.hour) spell = s; }
    expect(spell).not.toBeNull();
    const { start, end } = spell!;
    const rains: number[] = [];
    for (let t = start + 8 * MS.hour; t < end - 8 * MS.hour; t += MS.hour) {
      const k = weatherAt(w, t);
      expect(k.cloud).toBeGreaterThanOrEqual(700);
      expect(k.rain).toBeGreaterThanOrEqual(300);
      expect(k.rain).toBeLessThanOrEqual(700);
      expect(k.storm).toBe(false);
      rains.push(k.rain);
    }
    // steady: the hour-to-hour change is small, unlike a shower
    let maxStep = 0;
    for (let i = 1; i < rains.length; i++) maxStep = Math.max(maxStep, Math.abs((rains[i] as number) - (rains[i - 1] as number)));
    expect(maxStep).toBeLessThan(60);
    // it comes and goes as rain does: eased in and out, with cloud before the first drops
    expect(weatherAt(w, start - MS.hour).rain).toBeLessThan(150);
    expect(weatherAt(w, end + MS.hour).rain).toBeLessThan(150);
    const calm = (from: number, to: number) => { let s = 0, c = 0; for (let t = from; t < to; t += MS.hour) { s += weatherAt(w, t).windSpeed; c++; } return s / c; };
    expect(calm(start + 12 * MS.hour, end - 12 * MS.hour)).toBeLessThan(calm(start - 20 * MS.day, start - 2 * MS.day) + 100);
  });

  it('keeps the showers too, and rain still only falls under cloud', () => {
    const w = createWorld('the-house');
    let showers = 0;
    for (let t = 0; t < 400 * MS.day; t += MS.hour) {
      const k = weatherAt(w, t);
      if (k.rain > 0) expect(k.cloud).toBeGreaterThanOrEqual(600);
      const b = Math.floor(t / (12 * MS.day)), s = wetSpellIn(w, b);
      if (k.rain > 0 && !(s && t >= s.start && t < s.end)) showers++;
    }
    expect(showers).toBeGreaterThan(100);
  });

  it('is deterministic', () => {
    const w = createWorld('test-seed'), w2 = createWorld('test-seed');
    for (let t = 0; t < 60 * MS.day; t += 5 * MS.hour) expect(weatherAt(w, t)).toEqual(weatherAt(w2, t));
  });
});
