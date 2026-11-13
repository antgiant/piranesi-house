import { describe, expect, it } from 'vitest';
import { createWorld } from '../src/world/world';
import { getHall } from '../src/world/hall';
import { leakCount, leaksOf } from '../src/world/leaks';
import { sceneAtWorldTime } from '../src/sim/scene';
import { hydrologyAt } from '../src/sim/hydrology';
import { MS } from '../src/sim/time';
import { audioFor } from '../src/audio/director';
import { azimuthTo } from '../src/audio/pose';

const w = createWorld('test-seed');
const hall = getHall(w, 3, 2, 1);
const scene = (x: number, y: number, t: number, level: 0 | 1 | 2 = 1) => sceneAtWorldTime(w, x, y, level, t, { forecast: false });

describe('where water drips from (the leaks of a hall)', () => {
  it('are fixed: the same every time, and different from hall to hall', () => {
    const a = leaksOf(w, hall), b = leaksOf(w, hall);
    expect(a).toEqual(b);
    expect(leaksOf(w, getHall(w, 4, 2, 1)).map((l) => l.x)).not.toEqual(a.map((l) => l.x));
    expect(leaksOf(createWorld('another'), hall).map((l) => l.x)).not.toEqual(a.map((l) => l.x));
  });
  it('lie inside the hall, from near the floor to near the ceiling, with a pitch and a rate of their own', () => {
    for (let x = -6; x < 6; x++) for (let y = -6; y < 6; y++) {
      const h = getHall(w, x, y, 1);
      const ls = leaksOf(w, h);
      expect(ls.length).toBe(leakCount(h));
      expect(new Set(ls.map((l) => l.id)).size).toBe(ls.length);
      for (const l of ls) {
        expect(l.x).toBeGreaterThanOrEqual(3 - 1e-9); expect(l.x).toBeLessThanOrEqual(Math.max(4, h.xExtent - 3) + 1e-9);
        expect(l.y).toBeGreaterThanOrEqual(3 - 1e-9); expect(l.y).toBeLessThanOrEqual(Math.max(4, h.yExtent - 3) + 1e-9);
        expect(l.z).toBeGreaterThanOrEqual(0.2); expect(l.z).toBeLessThanOrEqual(h.heightM);
        expect(l.pitch).toBeGreaterThanOrEqual(800); expect(l.pitch).toBeLessThanOrEqual(4400);
        expect(l.perMin).toBeGreaterThanOrEqual(0.4); expect(l.perMin).toBeLessThanOrEqual(3.0);
        expect(typeof l.wet).toBe('boolean');
      }
    }
  });
  it('most drops fall onto stone, and some into water', () => {
    let wet = 0, total = 0;
    for (let x = -10; x < 10; x++) for (let y = -10; y < 10; y++) for (const l of leaksOf(w, getHall(w, x, y, 1))) { total++; if (l.wet) wet++; }
    expect(wet / total).toBeGreaterThan(0.2);
    expect(wet / total).toBeLessThan(0.4);
  });
  it('a big hall has more than a small one', () => {
    expect(leakCount({ xExtent: 250, yExtent: 136 })).toBeGreaterThan(leakCount({ xExtent: 60, yExtent: 40 }));
    expect(leakCount({ xExtent: 5, yExtent: 5 })).toBe(3);
    expect(leakCount({ xExtent: 5000, yExtent: 5000 })).toBe(16);
  });
});

describe('the leaks as heard', () => {
  it('each stays where it is as you walk: its direction from you changes with where you stand, and it keeps its key and its pitch', () => {
    const t = 7 * MS.hour;
    const sc = scene(hall.x, hall.y, t);
    const p1 = { x: hall.xExtent * 0.3, y: hall.yExtent * 0.5, heading: 0 }, p2 = { x: hall.xExtent * 0.32, y: hall.yExtent * 0.5, heading: 0 };
    const a1 = audioFor(w, sc, { portals: false, pose: p1 }), a2 = audioFor(w, sc, { portals: false, pose: p2 });
    expect(a1.leaks.length).toBeGreaterThan(0);
    const leaks = leaksOf(w, hall);
    for (const l of a1.leaks) {
      const world = leaks.find((q) => q.id === l.key)!;
      expect(l.pitch).toBe(world.pitch);
      expect(l.az).toBeCloseTo(azimuthTo(p1, world), 6);          // from here, toward where it truly is
      const l2 = a2.leaks.find((q) => q.key === l.key);
      if (l2) { expect(l2.pitch).toBe(l.pitch); expect(l2.az).toBeCloseTo(azimuthTo(p2, world), 6); }
    }
    // turn on the spot: the same leaks, each swung round by exactly the turn
    const turned = audioFor(w, sc, { portals: false, pose: { ...p1, heading: 90 } });
    for (const l of a1.leaks) {
      const m = turned.leaks.find((q) => q.key === l.key);
      if (!m) continue;
      let d = l.az - m.az; while (d > 180) d -= 360; while (d < -180) d += 360;
      expect(Math.abs(d - 90)).toBeLessThan(1e-6);
      expect(m.gain).toBeCloseTo(l.gain, 9);   // turning changes where, not how loud
    }
  });
  it('the nearest are the ones heard: at most four, loudest first, and a leak beside you is louder than one across the hall', () => {
    const sc = scene(hall.x, hall.y, 7 * MS.hour);
    const lk = [...leaksOf(w, hall)].sort((x, y) => y.perMin - x.perMin)[0]!; // the busiest leak, so it is surely among those heard
    const here = audioFor(w, sc, { portals: false, pose: { x: lk.x + 2, y: lk.y, heading: 0 } });
    expect(here.leaks.length).toBeLessThanOrEqual(4);
    const mine = here.leaks.find((q) => q.key === lk.id)!;
    expect(mine).toBeDefined();
    expect(mine.gain).toBe(Math.max(...here.leaks.map((q) => q.gain))); // the one beside you is the loudest of them
    const far = audioFor(w, sc, { portals: false, pose: { x: lk.x > hall.xExtent / 2 ? 4 : hall.xExtent - 4, y: lk.y, heading: 0 } });
    const f = far.leaks.find((q) => q.key === lk.id);
    if (f) expect(f.gain).toBeLessThan(mine.gain);
  });
  it('drip faster when the stone is wet and slower when it is dry, and hardly at all in the hushed halls', () => {
    let wet: { t: number; d: number } | null = null, dry: { t: number; d: number } | null = null;
    for (let t = 20 * MS.day; t < 300 * MS.day; t += 5 * MS.hour) {
      const d = hydrologyAt(w, t).dripping;
      if (!wet || d > wet.d) wet = { t, d };
      if (!dry || d < dry.d) dry = { t, d };
    }
    expect(wet!.d).toBeGreaterThan(dry!.d * 2);
    // an ordinary hall (the hushed Drowned Halls and the dark hall ignore the weather on purpose)
    let ord = hall;
    for (let x = -8; x < 8; x++) for (let y = -8; y < 8; y++) { const h = getHall(w, x, y, 1); if (ord === hall && !h.regions.drowned && !h.tags.includes('dark-hall') && h.xExtent * h.yExtent > 8000) ord = h; }
    const pose = { x: ord.xExtent / 2, y: ord.yExtent / 2, heading: 0 };
    const rate = (t: number) => audioFor(w, scene(ord.x, ord.y, t), { portals: false, pose }).leaks.reduce((s, l) => s + l.perMin, 0);
    expect(rate(wet!.t)).toBeGreaterThan(rate(dry!.t) * 1.5);
    // the Drowned Halls: a few drops now and then
    const drowned = getHall(w, 6, 0, 1);
    expect(drowned.regions.drowned).toBe(true);
    const dpose = { x: drowned.xExtent / 2, y: drowned.yExtent / 2, heading: 0 };
    const dr = audioFor(w, scene(6, 0, wet!.t), { portals: false, pose: dpose });
    for (const l of dr.leaks) expect(l.perMin).toBeLessThan(0.5);
  });
});
