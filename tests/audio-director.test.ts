import { describe, expect, it } from 'vitest';
import { createWorld } from '../src/world/world';
import { getHall } from '../src/world/hall';
import { parseCellName, vestibuleCell } from '../src/world/layout';
import { sceneAtWorldTime } from '../src/sim/scene';
import { nextJoin } from '../src/sim/tides';
import { MS } from '../src/sim/time';
import { audioFor } from '../src/audio/director';

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
  it('rain is heard in vestibules only when it rains', () => {
    let dry = 0;
    let wet = 0;
    const v = vestibuleCell(w, 3)!;
    for (let t = 0; t < 120 * MS.day; t += 6 * MS.hour) {
      const s = scene({ x: v.x, y: v.y, level: 1 }, t);
      const a = audioFor(w, s);
      if (s.weather.rain === 0) { dry++; expect(a.rain.gain).toBe(0); } else { wet++; expect(a.rain.gain).toBeGreaterThan(0); }
    }
    expect(dry).toBeGreaterThan(0);
    expect(wet).toBeGreaterThan(0);
  });
  it('is deterministic', () => {
    const p = here('Fourth Western Hall');
    expect(audioFor(w, scene(p, 777 * MS.hour))).toEqual(audioFor(createWorld('test-seed'), scene(p, 777 * MS.hour)));
  });
});
