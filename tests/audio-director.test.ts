import { describe, expect, it } from 'vitest';
import { createWorld } from '../src/world/world';
import { getHall } from '../src/world/hall';
import { parseCellName, vestibuleCell } from '../src/world/layout';
import { sceneAtWorldTime } from '../src/sim/scene';
import { nextJoin } from '../src/sim/tides';
import { MS } from '../src/sim/time';
import { audioFor, bearing, fallSide } from '../src/audio/director';

const w = createWorld('test-seed');
const here = (name: string, level: 0 | 1 | 2 = 1) => {
  const c = parseCellName(w, name)!;
  return { x: c.x, y: c.y, level };
};
const scene = (p: { x: number; y: number; level: 0 | 1 | 2 }, t: number) => sceneAtWorldTime(w, p.x, p.y, p.level, t);

describe('audio director', () => {
  it('the Drowned Halls are hushed: no sea, no tide, no birds', () => {
    const a = audioFor(w, scene({ x: 6, y: 0, level: 1 }, 12 * MS.hour));
    expect(a.hush).toBe(true);
    expect(a.sea.gain).toBe(0);
    expect(a.tide.kind).toBe('none');
    expect(a.birds.perMinute).toBe(0);
  });
  it('the Drowned Halls are hushed against weather too: little wind, no whistling, a muffled rain', () => {
    for (let t = 0; t < 60 * MS.day; t += 5 * MS.hour) {
      const a = audioFor(w, scene({ x: 6, y: 0, level: 1 }, t));
      expect(a.wind.gain).toBeLessThanOrEqual(0.03);
      expect(a.wind.whistle).toBe(0);
      expect(a.rain.gain).toBeLessThanOrEqual(0.2);
    }
  });
  it('the sea is loudest in the lower halls and faintest in the upper ones', () => {
    const p = here('Second Southern Hall');
    const lower = audioFor(w, scene({ ...p, level: 0 }, 5 * MS.hour));
    const mid = audioFor(w, scene(p, 5 * MS.hour));
    const upper = audioFor(w, scene({ ...p, level: 2 }, 5 * MS.hour));
    expect(lower.sea.gain).toBeGreaterThan(mid.sea.gain);
    expect(mid.sea.gain).toBeGreaterThan(upper.sea.gain);
    expect(lower.sea.lowpassHz).toBeGreaterThan(upper.sea.lowpassHz);
  });
  it('the sea is louder near a vestibule than far from one', () => {
    const v = vestibuleCell(w, 3)!;
    const near = audioFor(w, scene({ x: v.x, y: v.y, level: 1 }, MS.hour));
    let far = { x: 5, y: 40, level: 1 as const };
    for (let x = -30; x < 30; x++) for (let y = 30; y < 90; y++) if (getHall(w, x, y, 1).tideReachDm === 0) far = { x, y, level: 1 };
    expect(near.sea.gain).toBeGreaterThan(audioFor(w, scene(far, MS.hour)).sea.gain);
  });
  it('reverb is long in vast vestibules and short in small halls', () => {
    const v = audioFor(w, scene(here('First Vestibule'), MS.hour));
    const small = [...Array(60).keys()].map((i) => audioFor(w, scene({ x: 3 + i, y: -20, level: 1 }, MS.hour))).sort((a, b) => a.reverb.decaySec - b.reverb.decaySec)[0]!;
    expect(v.reverb.decaySec).toBeGreaterThan(small.reverb.decaySec);
    for (const x of [v, small]) {
      expect(x.reverb.decaySec).toBeGreaterThanOrEqual(2.5);
      expect(x.reverb.decaySec).toBeLessThanOrEqual(9);
    }
  });
  it('tides boom with the hall flooded, and the great join submerges you in a hush', () => {
    const ninth = here('Ninth Vestibule');
    const j = nextJoin(w, 0);
    const a = audioFor(w, scene(ninth, j));
    expect(a.tide.kind).toBe('submerged');
    expect(a.muffle).toBeGreaterThan(0.8);
    // some earlier moment: the approach is heard before the water arrives
    let approach = false;
    let booming = false;
    for (let t = 0; t < 2 * MS.day; t += MS.min) {
      const k = audioFor(w, scene(here('Second Southern Hall'), t)).tide.kind;
      if (k === 'approach') approach = true;
      if (k === 'booming') booming = true;
    }
    expect(approach).toBe(true);
    expect(booming).toBe(true);
  });
  it('the dark hall is dark and quiet, with long reverb', () => {
    const a = audioFor(w, scene({ x: -192, y: 0, level: 1 }, MS.hour));
    expect(a.dark).toBe(true);
    expect(a.tide.kind).toBe('none');
    expect(a.sea.gain).toBeLessThan(0.2);
  });
  it('rain is heard in vestibules only when it rains (snow is silent)', () => {
    let dry = 0;
    let wet = 0;
    const v = vestibuleCell(w, 3)!;
    for (let t = 0; t < 120 * MS.day; t += 6 * MS.hour) {
      const s = scene({ x: v.x, y: v.y, level: 1 }, t);
      const a = audioFor(w, s);
      // snow falls silently: only rain is heard
      if (s.weather.precip !== 'rain' || s.weather.rain === 0) { dry++; expect(a.rain.gain).toBe(0); } else { wet++; expect(a.rain.gain).toBeGreaterThan(0); }
    }
    expect(dry).toBeGreaterThan(0);
    expect(wet).toBeGreaterThan(0);
  });
  it('is deterministic', () => {
    const p = here('Fourth Western Hall');
    expect(audioFor(w, scene(p, 777 * MS.hour))).toEqual(audioFor(createWorld('test-seed'), scene(p, 777 * MS.hour)));
  });
});

describe('rain on water', () => {
  it('lands on water wherever the hall is flooded, the sea is underfoot, or water falls: never outside 0..1', () => {
    let flooded = 0, lower = 0, dry = 0;
    for (let t = 0; t < 40 * MS.day; t += 3 * MS.hour) {
      const a = audioFor(w, scene(here('Ninth Vestibule'), t), { portals: false });
      expect(a.rain.onWater).toBeGreaterThanOrEqual(0);
      expect(a.rain.onWater).toBeLessThanOrEqual(1);
      if (a.surface === 'wet' || a.surface === 'shallow') { expect(a.rain.onWater).toBe(1); flooded++; }
      const low = audioFor(w, scene({ ...here('Second Southern Hall'), level: 0 }, t), { portals: false });
      expect(low.rain.onWater).toBeGreaterThanOrEqual(0.7);
      lower++;
      const mid = audioFor(w, scene(here('Second Southern Hall'), t), { portals: false });
      if (mid.surface === 'marble' && mid.falls.gain === 0) { expect(mid.rain.onWater).toBe(0); dry++; }
    }
    expect(flooded).toBeGreaterThan(0);
    expect(lower).toBeGreaterThan(0);
    expect(dry).toBeGreaterThan(0);
  });
});

describe('where the water is', () => {
  const fallHall = (() => {
    for (let x = -12; x < 12; x++) for (let y = -12; y < 12; y++) { const h = getHall(w, x, y, 1); if (h.falls) return { x, y, level: 1 as const, wall: h.falls.wall }; }
    throw new Error('no hall with falls near the origin');
  })();
  it('a fall is on its own wall, and stays put in the hall as you turn: it is ahead, right, behind or left, each once over a full turn', () => {
    const seen = new Set<string>();
    for (const facing of ['N', 'E', 'S', 'W'] as const) {
      const a = audioFor(w, scene(fallHall, MS.hour), { facing, portals: false });
      expect(a.falls.gain).toBeGreaterThan(0);
      expect(a.falls.bearing).toBe(bearing(fallHall.wall, facing));
      seen.add(a.falls.bearing);
    }
    expect(seen.size).toBe(4);
  });
  it('a fall on the wall you face is ahead, and its position along the wall nudges it to one side', () => {
    const a = audioFor(w, scene(fallHall, MS.hour), { facing: fallHall.wall, portals: false });
    expect(a.falls.bearing).toBe('ahead');
    expect(Math.abs(a.falls.pan)).toBeLessThanOrEqual(0.34);
  });
  it('a stream, which has no wall of its own, keeps one fixed side for each hall', () => {
    expect(fallSide(3, -4, 1)).toBe(fallSide(3, -4, 1));
    const sides = new Set<string>();
    for (let x = 0; x < 40; x++) sides.add(fallSide(x, x * 3 % 17, 1));
    expect(sides.size).toBe(4);
  });
});
