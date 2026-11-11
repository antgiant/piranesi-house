import { describe, expect, it } from 'vitest';
import { type Line } from '../src/game/game';
import { CONSTELLATIONS, framedInDoorway, siderealHours, skyAbove } from '../src/sim/stars';
import { moonInDoorway } from '../src/sim/time';
import { createWorld } from '../src/world/world';
import { getHall } from '../src/world/hall';
import { sceneAtWorldTime } from '../src/sim/scene';
import { lightSentence } from '../src/game/narrator';


describe('the stars in the single doorway', () => {
  it('turn through the night: the sky framed changes with the hour and with the season', () => {
    const seen = new Set<string>();
    for (const day of [10, 100, 170, 250, 330]) for (let h = 20; h < 30; h++) for (const c of framedInDoorway(day, (h % 24) * 60)) seen.add(c);
    expect(seen.size).toBeGreaterThanOrEqual(12);
    expect(framedInDoorway(170, 22 * 60).join()).not.toBe(framedInDoorway(170, 3 * 60).join());
    expect(framedInDoorway(170, 22 * 60).join()).not.toBe(framedInDoorway(330, 22 * 60).join());
    for (const c of framedInDoorway(170, 23 * 60)) expect(CONSTELLATIONS.some((k) => k.name === c)).toBe(true);
  });
  it('sidereal time runs a little faster than the clock and wraps', () => {
    const a = siderealHours(100, 0), b = siderealHours(101, 0);
    expect((b - a + 24) % 24).toBeCloseTo(0.0657, 2);
    for (let d = 0; d < 365; d += 30) for (let m = 0; m < 1440; m += 240) { const s = siderealHours(d, m); expect(s).toBeGreaterThanOrEqual(0); expect(s).toBeLessThan(24); }
  });
  it('the dark hall shows them at night when it is clear, and the moon in the doorway when it is full', () => {
    const w = createWorld('the-house');
    let moon = 0, stars = 0, dark = 0;
    const hall = getHall(w, -192, 0, 1);
    for (let t = 0; t < 90 * 24 * 3_600_000; t += 20 * 60_000) {
      const txt = lightSentence(hall, sceneAtWorldTime(w, -192, 0, 1, t));
      if (moonInDoorway(w, t)) { moon++; expect(txt).toMatch(/full moon stands centred in the single doorway/); }
      else if (/tall pale frame of the night sky/.test(txt)) { stars++; expect(txt).toMatch(/the (Hunter|Bull|Twins|Lion|Maiden|Scales|Scorpion|Archer|Eagle|Swan|Lyre|Winged Horse|Chained Woman|Queen|Hero|Charioteer|Great Dog|Herdsman|Kneeling|Ram|Fishes|Water-bearer|Sea-goat|Crab|Dolphin|Little Horse)|few stars/); }
      else if (/no light at all/.test(txt)) dark++;
    }
    expect(moon).toBeGreaterThan(5);
    expect(stars).toBeGreaterThan(20);
    expect(dark).toBeGreaterThan(20); // by day and under cloud the hall is as dark as the book says
  });
});

describe('the sky above the open roofs', () => {
  it('changes through the night and with the season, and always names a real figure', () => {
    const seen = new Set<string>();
    for (const day of [10, 100, 170, 250, 330]) for (let h = 20; h < 30; h++) { const s = skyAbove(day, (h % 24) * 60); for (const n of [s.overhead, s.rising]) if (n) { seen.add(n); expect(CONSTELLATIONS.some((c) => c.name === n)).toBe(true); } }
    expect(seen.size).toBeGreaterThanOrEqual(10);
    expect(skyAbove(170, 22 * 60)).not.toEqual(skyAbove(330, 22 * 60));
    expect(skyAbove(170, 22 * 60)).not.toEqual(skyAbove(170, 3 * 60));
  });
  it('is described in the upper halls on a clear night, and not by day, under cloud, or below', () => {
    const w2 = createWorld('the-house');
    const up = getHall(w2, 3, 3, 2);
    let said = 0;
    for (let t = 0; t < 60 * 24 * 3_600_000; t += 37 * 60_000) {
      const sc = sceneAtWorldTime(w2, 3, 3, 2, t, { forecast: false });
      const txt = lightSentence(up, sc);
      const night = sc.light.sunPhase === 'night' && sc.weather.cloud < 600 && sc.weather.precip === 'none' && sc.here.fogHere < 300;
      if (/Through the broken roof/.test(txt)) { said++; expect(night).toBe(true); } else if (night) expect(skyAbove(sc.clock.dayOfYear, sc.clock.minuteOfDay).overhead === null && skyAbove(sc.clock.dayOfYear, sc.clock.minuteOfDay).rising === null).toBe(true);
    }
    expect(said).toBeGreaterThan(10);
    const low = getHall(w2, 3, 3, 1);
    for (let t = 0; t < 10 * 24 * 3_600_000; t += 3_600_000) expect(lightSentence(low, sceneAtWorldTime(w2, 3, 3, 1, t, { forecast: false }))).not.toMatch(/Through the broken roof/);
  });
});
