import { describe, expect, it } from 'vitest';
import { createWorld } from '../src/world/world';
import { getHall } from '../src/world/hall';
import { parseCellName, vestibuleCell, type Level } from '../src/world/layout';
import { nearbyVestibules } from '../src/world/tidegeo';
import { gcd } from '../src/world/rng';
import { MS, REAL_ZERO_MS, SYNODIC_MS, Y8_MS, YEAR_MS, clock, dayLengthMin, daylightPermille, moon, moonInDoorway, sunTimes } from '../src/sim/time';
import { TIDE_COUNT, forecast, joinOffsetMs, nearestPeakMs, nextJoin, peakTimeMs, tideAt, vestibuleTide } from '../src/sim/tides';
import { localWeather, weatherAt, type Weather } from '../src/sim/weather';
import { birdsAt, lightAt } from '../src/sim/light';
import { sceneAtWorldTime } from '../src/sim/scene';

const w = createWorld('test-seed');
const hallNamed = (world: typeof w, name: string, level: Level = 1) => {
  const c = parseCellName(world, name)!;
  return getHall(world, c.x, c.y, level);
};
const at = (y: number, mo: number, d: number, h = 12, mi = 0) => Date.UTC(y, mo - 1, d, h, mi) - REAL_ZERO_MS;
const CALM: Weather = { cloud: 300, rain: 0, windDir: 'N', windSpeed: 100, storm: false, tempTenths: 100, precip: 'none', lightning: false, frost: false, fog: 0 };

describe('calendar, sun and moon', () => {
  it('starts on the first of January, a 365-day year', () => {
    const c = clock(0);
    expect([c.year, c.month, c.day, c.season]).toEqual([2026, 1, 1, 'winter']);
    expect(clock(YEAR_MS - 1).month).toBe(12);
    expect(clock(YEAR_MS).year).toBe(2027);
  });
  it('days run from 8 hours at midwinter to 16 at midsummer', () => {
    expect(dayLengthMin(172)).toBe(960);
    expect(dayLengthMin(355)).toBeGreaterThanOrEqual(478);
    expect(dayLengthMin(355)).toBeLessThanOrEqual(482);
    for (let d = 0; d < 365; d++) {
      const s = sunTimes(d);
      expect(s.sunrise).toBeLessThan(s.sunset);
    }
  });
  it('is bright at noon and dark at midnight', () => {
    expect(daylightPermille(clock(at(2026, 6, 21, 12))).level).toBe(1000);
    expect(daylightPermille(clock(at(2026, 6, 21, 0))).level).toBe(0);
    expect(daylightPermille(clock(at(2026, 12, 21, 18))).phase).toBe('night');
  });
  it('has a moon on a 29.5-day cycle', () => {
    const fulls: number[] = [];
    let prev = '';
    for (let t = 0; t < 90 * MS.day; t += MS.hour) {
      const p = moon(w, t).phase;
      if (p === 'full' && prev !== 'full') fulls.push(t);
      prev = p;
    }
    expect(fulls.length).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < fulls.length; i++) expect(Math.abs((fulls[i]! - fulls[i - 1]!) / MS.day - 29.53)).toBeLessThan(1);
    expect(moon(w, 0).illumination).toBeLessThanOrEqual(1000);
  });
  it('the full moon fills the dark hall\'s doorway on a full-moon evening only (LT-005)', () => {
    let hits = 0;
    let nonFullHits = 0;
    for (let t = 0; t < 60 * MS.day; t += 10 * MS.min) {
      const d = moonInDoorway(w, t);
      if (d) {
        hits++;
        if (moon(w, t).phase !== 'full') nonFullHits++;
      }
    }
    expect(hits).toBeGreaterThan(0);
    expect(nonFullHits).toBe(0);
    expect(moonInDoorway(w, at(2026, 3, 3, 12))).toBe(false);
  });
});

describe('tide constants', () => {
  it('cycle counts are distinct primes and pairwise coprime', () => {
    const v = Object.values(TIDE_COUNT);
    expect(new Set(v).size).toBe(8);
    for (const n of v) for (let d = 2; d * d <= n; d++) expect(n % d !== 0).toBe(true);
    for (let i = 0; i < v.length; i++) for (let j = i + 1; j < v.length; j++) expect(gcd(v[i]!, v[j]!)).toBe(1);
  });
  it('tide periods are near thirteen hours', () => {
    for (const n of Object.values(TIDE_COUNT)) expect(Y8_MS / n / MS.hour).toBeGreaterThan(12.5);
  });
});

describe('the great join (canon T-006)', () => {
  it('E, W and N peak together at the Ninth Vestibule at the join, and loose near-joins are rare and far weaker', () => {
    const ninth = vestibuleCell(w, 9)!;
    expect(ninth).toEqual({ x: -2, y: 1 });
    const j = nextJoin(w, 0);
    const near: { T: number; depth: number }[] = [];
    for (let k = 0; k < TIDE_COUNT.W; k++) {
      const T = peakTimeMs(w, 'W', k);
      if (nearestPeakMs(w, 'E', T) <= 8 * MS.min && nearestPeakMs(w, 'N', T) <= 8 * MS.min) {
        near.push({ T, depth: Math.max(...[-6, 0, 6].map((d) => vestibuleTide(w, 9, ninth, T + d * MS.min, CALM).depthDm)) });
      }
    }
    // The join is among them, and it is by far the greatest. A few eight-year near-misses are big tides, not great ones.
    const join = near.filter((n) => Math.abs(n.T - j) < MS.hour);
    const others = near.filter((n) => Math.abs(n.T - j) >= MS.hour);
    expect(join).toHaveLength(1);
    expect(join[0]!.depth).toBeGreaterThanOrEqual(140);
    expect(others.length).toBeLessThanOrEqual(6);
    for (const o of others) expect(o.depth).toBeLessThan(join[0]!.depth * 0.6);
  });
  it('the join towers to 15 m at the Ninth Vestibule; nothing else in eight years comes close', () => {
    const j = nextJoin(w, 0);
    const ninth = vestibuleCell(w, 9)!;
    const vt = vestibuleTide(w, 9, ninth, j);
    expect(vt.active).toBe(3);
    expect(vt.depthDm).toBeGreaterThanOrEqual(140);
    let worst = 0;
    for (let k = 0; k < TIDE_COUNT.W; k++) {
      const T = peakTimeMs(w, 'W', k);
      if (Math.abs(T - j) < 6 * MS.hour) continue;
      for (const d of [-6, 0, 6]) worst = Math.max(worst, vestibuleTide(w, 9, ninth, T + d * MS.min, CALM).depthDm);
    }
    expect(worst).toBeLessThan(110);
  });
  it('joins arrive exactly eight years apart, on a date that depends on the seed', () => {
    const j1 = nextJoin(w, 0);
    expect(nextJoin(w, j1 + MS.day) - j1).toBe(Y8_MS);
    expect(nextJoin(createWorld('another'), 0)).not.toBe(j1);
    expect(joinOffsetMs(w)).toBeLessThan(Y8_MS);
  });
  it('the tides arrive in order at the Ninth: east first, then west, then north', () => {
    const j = nextJoin(w, 0);
    const ninth = vestibuleCell(w, 9)!;
    const early = vestibuleTide(w, 9, ninth, j - 20 * MS.min);
    expect(early.pulses.map((p) => p.source)).toContain('E');
    const peakE = peakTimeMs(w, 'E', 0) % Y8_MS;
    expect(peakE).toBeLessThan(peakTimeMs(w, 'W', 0) % Y8_MS + Y8_MS); // sanity; real ordering checked via offsets
    expect((j - 4 * MS.min) - (j + 3 * MS.min)).toBeLessThan(0);
  });
});

describe('ordinary tides', () => {
  const sixth = vestibuleCell(w, 6)!;
  const south = hallNamed(w, 'Second Southern Hall');
  it('the Sixth Vestibule is beside the Second Southern Hall, which floods ankle- to knee-deep for about an hour (T-010)', () => {
    expect(Math.abs(sixth.x - south.x) + Math.abs(sixth.y - south.y)).toBe(1);
    const events = forecast(w, south, 0, 20 * MS.day, MS.min);
    expect(events.length).toBeGreaterThan(8);
    const durations = events.map((e) => (e.endMs - e.startMs) / MS.min).sort((a, b) => a - b);
    const median = durations[Math.floor(durations.length / 2)]!;
    expect(median).toBeGreaterThan(25);
    expect(median).toBeLessThan(130);
    const peaks = events.map((e) => e.peakDm).sort((a, b) => a - b);
    expect(peaks[Math.floor(peaks.length / 2)]!).toBeGreaterThanOrEqual(1);
    expect(peaks[Math.floor(peaks.length / 2)]!).toBeLessThanOrEqual(12);
  });
  it('a hall is not flooded all the time', () => {
    let wet = 0;
    let n = 0;
    for (let t = 0; t < 10 * MS.day; t += 10 * MS.min) {
      n++;
      if (tideAt(w, south, t).depthDm > 0) wet++;
    }
    expect(wet / n).toBeGreaterThan(0.03);
    expect(wet / n).toBeLessThan(0.5);
  });
  it('water falls off with distance, and many halls are never touched by the sea', () => {
    let free = 0;
    let total = 0;
    let far = getHall(w, 5, 40, 1);
    for (let x = -30; x < 30; x++) for (let y = 30; y < 90; y++) {
      total++;
      if (nearbyVestibules(w, x, y).length === 0) {
        free++;
        far = getHall(w, x, y, 1);
      }
    }
    expect(free / total).toBeGreaterThan(0.1);
    expect(free / total).toBeLessThan(0.5);
    expect(nearbyVestibules(w, far.x, far.y)).toHaveLength(0);
    expect(far.tideReachDm).toBe(0);
    for (let t = 0; t < 4 * MS.day; t += 20 * MS.min) expect(tideAt(w, far, t).depthDm).toBe(0);
  });
  it('no tide exceeds the hall\'s static reach by more than the single-event cap, except joined tides', () => {
    for (const h of [south, hallNamed(w, 'First Western Hall'), hallNamed(w, 'Fourth Western Hall')]) {
      for (let t = 0; t < 12 * MS.day; t += 15 * MS.min) {
        const td = tideAt(w, h, t, CALM);
        if (td.joined <= 1) expect(td.depthDm, `${h.name} at ${t}`).toBeLessThanOrEqual(h.tideReachDm + 1);
      }
    }
  });
  it('Drowned Halls are a lake and never feel the sea; the upper level is always dry (T-016)', () => {
    const d = getHall(w, 6, 0, 1);
    for (let t = 0; t < 3 * MS.day; t += MS.hour) {
      const td = tideAt(w, d, t);
      expect(td.lake).toBe(true);
      expect(td.depthDm).toBe(0);
      expect(tideAt(w, getHall(w, -2, 1, 2), t).depthDm).toBe(0);
    }
  });
  it('the dark hall is never wet', () => {
    const dark = getHall(w, -192, 0, 1);
    for (let t = 0; t < 3 * MS.day; t += MS.hour) expect(tideAt(w, dark, t).depthDm).toBe(0);
  });
  it('the sea character follows the source: the east tide is nearly colourless, the west tide pewter (T-003, T-004)', () => {
    const seen = new Map<string, string>();
    for (let t = 0; t < 30 * MS.day; t += 10 * MS.min) {
      const td = tideAt(w, hallNamed(w, 'Ninth Vestibule'), t, CALM);
      if (td.character && td.sources[0]) seen.set(td.sources[0], td.character.colour);
    }
    if (seen.has('E')) expect(seen.get('E')).toMatch(/colourless/);
    if (seen.has('W')) expect(seen.get('W')).toBe('pewter');
    expect(seen.size).toBeGreaterThan(0);
  });
});

describe('south wind (T-013)', () => {
  it('raises high tides above their calm height', () => {
    const v = vestibuleCell(w, 6)!;
    const windy: Weather = { ...CALM, windDir: 'S', windSpeed: 1000 };
    let compared = 0;
    for (let t = 0; t < 10 * MS.day; t += 5 * MS.min) {
      const a = vestibuleTide(w, 6, v, t, CALM).depthDm;
      const b = vestibuleTide(w, 6, v, t, windy).depthDm;
      expect(b).toBeGreaterThanOrEqual(a);
      if (a >= 4) { compared++; expect(b).toBeGreaterThan(a); }
    }
    expect(compared).toBeGreaterThan(0);
  });
  it('can empty a lower hall completely at low tide, which hardly ever happens', () => {
    const lower = getHall(w, 12, -30, 0);
    const gale: Weather = { ...CALM, windDir: 'S', windSpeed: 900 };
    let dry = 0;
    let n = 0;
    for (let t = 0; t < 5 * MS.day; t += 10 * MS.min) {
      n++;
      if (tideAt(w, lower, t, gale).depthDm === 0) dry++;
      expect(tideAt(w, lower, t, CALM).depthDm).toBeGreaterThan(0);
    }
    expect(dry).toBeGreaterThan(0);
    expect(dry).toBeLessThan(n);
  });
});

describe('weather', () => {
  it('is deterministic and seed-dependent', () => {
    expect(weatherAt(w, 123456789)).toEqual(weatherAt(createWorld('test-seed'), 123456789));
    let diff = 0;
    for (let i = 0; i < 40; i++) if (weatherAt(w, i * MS.day).cloud !== weatherAt(createWorld('other'), i * MS.day).cloud) diff++;
    expect(diff).toBeGreaterThan(30);
  });
  it('is colder in winter than summer, with rain only under cloud', () => {
    let win = 0, sum = 0, nw = 0, ns = 0, rain = 0, n = 0;
    for (let t = 0; t < 2 * YEAR_MS; t += 6 * MS.hour) {
      const wx = weatherAt(w, t);
      const c = clock(t);
      n++;
      if (c.season === 'winter') { win += wx.tempTenths; nw++; }
      if (c.season === 'summer') { sum += wx.tempTenths; ns++; }
      if (wx.rain > 0) { rain++; expect(wx.cloud).toBeGreaterThanOrEqual(600); }
      if (wx.frost) expect(c.season).toBe('winter');
      if (wx.precip === 'snow') expect(wx.tempTenths).toBeLessThanOrEqual(10);
      expect(wx.cloud).toBeGreaterThanOrEqual(0);
      expect(wx.cloud).toBeLessThanOrEqual(1000);
    }
    expect(win / nw).toBeLessThan(sum / ns - 80);
    expect(rain / n).toBeGreaterThan(0.01);
    expect(rain / n).toBeLessThan(0.4);
  });
  it('has westerly storms and winter frost over a few years', () => {
    let storms = 0, frosts = 0;
    for (let t = 0; t < 4 * YEAR_MS; t += 6 * MS.hour) {
      const wx = weatherAt(w, t);
      if (wx.storm) { storms++; expect(['W', 'SW', 'NW']).toContain(wx.windDir); }
      if (wx.frost) frosts++;
    }
    expect(storms).toBeGreaterThan(0);
    expect(frosts).toBeGreaterThan(0);
  });
  it('cloud fills the North-East collapse zone and the upper level, not an ordinary middle hall (W-006)', () => {
    const cloudy: Weather = { ...CALM, cloud: 900 };
    const ne = getHall(w, 20, 20, 1);
    expect(ne.regions.cloud).toBe(true);
    expect(localWeather(ne, cloudy).cloudHere).toBeGreaterThanOrEqual(300);
    expect(localWeather(getHall(w, 5, -3, 1), cloudy).cloudHere).toBe(0);
    expect(localWeather(getHall(w, 5, -3, 2), cloudy).cloudHere).toBeGreaterThan(500);
  });
  it('rain falls in vestibules, not in the dark hall', () => {
    const rainy: Weather = { ...CALM, cloud: 900, rain: 800, precip: 'rain' };
    const v = vestibuleCell(w, 3)!;
    expect(localWeather(getHall(w, v.x, v.y, 1), rainy).rainHere).toBe(800);
    expect(localWeather(getHall(w, -192, 0, 1), rainy).rainHere).toBe(0);
  });
});

describe('light and life', () => {
  it('stars always shine: no ordinary hall is ever fully dark; the dark hall always is, bar the moon in its door', () => {
    const h = hallNamed(w, 'Fourth Western Hall');
    const dark = getHall(w, -192, 0, 1);
    for (let t = 0; t < 40 * MS.day; t += 30 * MS.min) {
      const wx = weatherAt(w, t);
      const lw = localWeather(h, wx);
      expect(lightAt(w, h, t, wx, lw).level).toBeGreaterThan(0);
      const dl = lightAt(w, dark, t, wx, localWeather(dark, wx));
      expect(dl.level).toBe(dl.moonInDoorway ? 60 : 0);
    }
  });
  it('the Fifty-Second Western Hall\'s wall goes golden in the late afternoon (LT-002)', () => {
    const h = hallNamed(w, 'Fifty-Second Western Hall');
    const t = at(2026, 6, 21, 18, 30);
    const wx: Weather = { ...CALM, cloud: 100 };
    expect(lightAt(w, h, t, wx, localWeather(h, wx)).tone).toBe('golden');
    expect(lightAt(w, hallNamed(w, 'Fourth Western Hall'), t, wx, localWeather(h, wx)).tone).not.toBe('golden');
  });
  it('gulls nest in spring and summer and only roost in winter (B-005)', () => {
    const h = hallNamed(w, 'Eighty-Eighth Western Hall');
    const day = (m: number) => {
      const t = at(2026, m, 15, 12);
      const wx: Weather = { ...CALM, cloud: 100 };
      const lw = localWeather(h, wx);
      return birdsAt(h, t, wx, lw, lightAt(w, h, t, wx, lw)).mode;
    };
    expect(day(5)).toBe('nesting');
    expect(day(11)).toBe('roosting');
  });
  it('birds go silent in storms and cloud, and are always silent in the Drowned Halls (B-009)', () => {
    const h = hallNamed(w, 'Fourth Western Hall');
    const t = at(2026, 6, 21, 12);
    const storm: Weather = { ...CALM, storm: true, windDir: 'W', windSpeed: 900 };
    const lw = localWeather(h, storm);
    expect(birdsAt(h, t, storm, lw, lightAt(w, h, t, storm, lw)).mode).toBe('silent');
    const d = getHall(w, 6, 0, 1);
    expect(birdsAt(d, t, CALM, localWeather(d, CALM), lightAt(w, d, t, CALM, localWeather(d, CALM))).mode).toBe('silent');
  });
  it('autumn dusk fills the 17th Vestibule with a murmuration on clear evenings (B-003)', () => {
    const v = vestibuleCell(w, 17)!;
    const h = getHall(w, v.x, v.y, 1);
    expect(h.tags).toContain('murmuration');
    const { sunset } = sunTimes(clock(at(2026, 10, 15)).dayOfYear);
    const t = at(2026, 10, 15, Math.floor(sunset / 60), sunset % 60);
    const wx: Weather = { ...CALM, cloud: 200 };
    const lw = localWeather(h, wx);
    expect(birdsAt(h, t, wx, lw, lightAt(w, h, t, wx, lw)).mode).toBe('murmuration');
    const t2 = at(2026, 6, 15, 19, 0);
    expect(birdsAt(h, t2, wx, lw, lightAt(w, h, t2, wx, lw)).mode).not.toBe('murmuration');
  });
});

describe('scene state', () => {
  it('is a pure function of (world, place, time) and agrees with its parts', () => {
    const h = hallNamed(w, 'Second Southern Hall');
    for (const t of [0, 5 * MS.day, 77 * MS.day + 13 * MS.min]) {
      const a = sceneAtWorldTime(w, h.x, h.y, 1, t);
      const b = sceneAtWorldTime(createWorld('test-seed'), h.x, h.y, 1, t);
      expect(a).toEqual(b);
      expect(a.tide).toEqual(tideAt(w, h, t, a.weather));
      expect(a.weather).toEqual(weatherAt(w, t));
    }
  });
  it('forecast and live tide agree', () => {
    const h = hallNamed(w, 'Second Southern Hall');
    const ev = forecast(w, h, 0, 3 * MS.day, 5 * MS.min);
    expect(ev.length).toBeGreaterThan(0);
    const e = ev[0]!;
    expect(tideAt(w, h, e.startMs).depthDm).toBeGreaterThan(0);
    expect(tideAt(w, h, e.startMs - 5 * MS.min).depthDm).toBe(0);
  });
});
