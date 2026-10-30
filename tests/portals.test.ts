import { describe, expect, it } from 'vitest';
import { audioFor, bearing } from '../src/audio/director';
import { newGame, look, step } from '../src/game/game';
import { sceneAtWorldTime } from '../src/sim/scene';
import { tideAt } from '../src/sim/tides';
import { MS } from '../src/sim/time';
import { getHall } from '../src/world/hall';
import { exits, parseCellName, type Side } from '../src/world/layout';
import { createWorld } from '../src/world/world';

const w = createWorld('test-seed');
const NOW = Date.UTC(2026, 5, 10, 9, 0);

describe('where a door is, relative to the way you face', () => {
  it.each([
    ['N', 'N', 'ahead'], ['E', 'N', 'right'], ['S', 'N', 'behind'], ['W', 'N', 'left'],
    ['N', 'E', 'left'], ['E', 'E', 'ahead'], ['S', 'E', 'right'], ['W', 'E', 'behind'],
    ['N', 'W', 'right'], ['W', 'W', 'ahead'], ['E', 'S', 'left'],
  ] as [Side, Side, string][])('a %s door while facing %s is %s', (door, facing, expected) => {
    expect(bearing(door, facing)).toBe(expected);
  });
  it('with no facing you look north', () => {
    expect(bearing('E', null)).toBe('right');
  });
});

describe('a tide is heard through the door before it reaches you (milestone 4)', () => {
  // The Second Southern Hall is next to the Sixth Vestibule. Its neighbours are a room further from the sea, so water
  // arrives later and shallower there. Find a moment when it is wet next door but dry here.
  const south = parseCellName(w, 'Second Southern Hall')!;
  const B = getHall(w, south.x, south.y, 1);

  function witness() {
    for (const e of exits(w, south.x, south.y, 1)) {
      if (e.corridor > 0) continue;
      const A = getHall(w, e.to.x, e.to.y, 1);
      if (A.regions.drowned) continue;
      for (let t = 0; t < 6 * MS.day; t += MS.min) {
        const wetB = tideAt(w, B, t).depthDm > 0;
        const dryA = tideAt(w, A, t).depthDm === 0;
        if (wetB && dryA) {
          const sA = sceneAtWorldTime(w, A.x, A.y, 1, t);
          if (sA.nextTide && sA.nextTide.startMs - t <= 6 * MS.min) continue; // want it not yet announced by the forecast
          return { A, t };
        }
      }
    }
    return null;
  }

  it('finds such a moment', () => {
    expect(witness()).not.toBeNull();
  });
  it('and the doorway carries the boom of waves while your own floor is still dry', () => {
    const { A, t } = witness()!;
    const s = sceneAtWorldTime(w, A.x, A.y, 1, t);
    expect(s.tide.depthDm).toBe(0);
    const a = audioFor(w, s, { facing: 'N' });
    expect(a.tide.kind === 'none' || a.tide.kind === 'approach').toBe(true);
    const p = a.portals.find((x) => x.toName === B.name);
    expect(p, 'a portal toward the wet hall').toBeDefined();
    expect(p!.tide.kind).toBe('booming');
    expect(p!.tide.gain).toBeGreaterThan(0.05);
    expect(p!.pan).toBeGreaterThanOrEqual(-1);
    expect(p!.pan).toBeLessThanOrEqual(1);
  });
  it('one sentence per wall and neighbour, however many doors there are', () => {
    const { A, t } = witness()!;
    const a = audioFor(w, sceneAtWorldTime(w, A.x, A.y, 1, t), { facing: 'N' });
    const keys = a.portals.map((p) => `${p.side}:${p.toName}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
  it('and "listen" says so in words', () => {
    const { A, t } = witness()!;
    const g = newGame({ seed: 'test-seed', startAtWorldMs: t, walkPace: Infinity }, NOW);
    g.pos = { x: A.x, y: A.y, level: 1, wall: null, pos: 500 };
    look(g, NOW);
    const out = step(g, 'listen', NOW).map((l) => l.text).join(' ');
    expect(out).toMatch(/Through the (north|east|south|west) door, (ahead of you|to your right|to your left|behind you), comes the boom of waves/);
  });
});

describe('other things carry through doors', () => {
  it('a gull colony next door is heard in the nesting season', () => {
    const colony = parseCellName(w, 'Eighty-Eighth Western Hall')!;
    const door = exits(w, colony.x, colony.y, 1).find((e) => e.corridor === 0 && e.to.y === 0)!;
    const A = getHall(w, door.to.x, door.to.y, 1);
    let found = false;
    for (let d = 100; d < 240 && !found; d++) {
      const t = d * MS.day + 13 * MS.hour; // early summer to autumn, midday
      const s = sceneAtWorldTime(w, A.x, A.y, 1, t);
      const p = audioFor(w, s).portals.find((x) => x.toName === 'Eighty-Eighth Western Hall');
      if (p && p.birds.mode === 'nesting') {
        found = true;
        expect(p.birds.loudness).toBeGreaterThan(0.2);
        expect(p.birds.perMinute).toBeGreaterThan(0);
      }
    }
    expect(found).toBe(true);
  });
  it('nothing leaks out of a Drowned Hall, or the dark hall', () => {
    const outside = getHall(w, 2, 0, 1);
    for (let t = 0; t < 5 * MS.day; t += 3 * MS.hour) {
      const a = audioFor(w, sceneAtWorldTime(w, outside.x, outside.y, 1, t));
      for (const p of a.portals) {
        const n = parseCellName(w, p.toName)!;
        expect(getHall(w, n.x, n.y, 1).regions.drowned).toBe(false);
      }
    }
    const next = getHall(w, -191, 0, 1);
    for (let t = 0; t < 2 * MS.day; t += 3 * MS.hour) {
      const a = audioFor(w, sceneAtWorldTime(w, next.x, next.y, 1, t));
      expect(a.portals.some((p) => p.toName.startsWith('One-Hundred-and-Ninety-Second'))).toBe(false);
    }
  });
  it('portals are few, sorted loudest first, and sane', () => {
    const v = parseCellName(w, 'Ninth Vestibule')!;
    for (let t = 0; t < 4 * MS.day; t += 2 * MS.hour) {
      const a = audioFor(w, sceneAtWorldTime(w, v.x, v.y, 1, t));
      expect(a.portals.length).toBeLessThanOrEqual(10);
      for (let i = 1; i < a.portals.length; i++) expect(a.portals[i - 1]!.loudness).toBeGreaterThanOrEqual(a.portals[i]!.loudness);
      for (const p of a.portals) {
        expect(p.loudness).toBeGreaterThan(0.05);
        expect(p.loudness).toBeLessThanOrEqual(1);
        expect(p.lowpassHz).toBeLessThan(3000);
      }
    }
  });
  it('a doorway behind you is more muffled than one ahead', () => {
    const v = parseCellName(w, 'Ninth Vestibule')!;
    let seenBehind = false;
    let seenAhead = false;
    for (let t = 0; t < 10 * MS.day && !(seenBehind && seenAhead); t += MS.hour) {
      const s = sceneAtWorldTime(w, v.x, v.y, 1, t);
      for (const p of audioFor(w, s, { facing: 'N' }).portals) {
        if (p.bearing === 'behind') { seenBehind = true; expect(p.lowpassHz).toBeLessThan(1500); }
        if (p.bearing === 'ahead') { seenAhead = true; expect(p.lowpassHz).toBeGreaterThan(2000); }
      }
    }
    expect(seenBehind || seenAhead).toBe(true);
  });
  it('is deterministic, and portals=false turns the neighbours off', () => {
    const v = parseCellName(w, 'Ninth Vestibule')!;
    const s = sceneAtWorldTime(w, v.x, v.y, 1, 3 * MS.day);
    expect(audioFor(w, s, { facing: 'W' })).toEqual(audioFor(createWorld('test-seed'), s, { facing: 'W' }));
    expect(audioFor(w, s, { portals: false }).portals).toEqual([]);
  });
});

describe('facing follows where you walk', () => {
  it('turns you toward the door you head for', () => {
    const g = newGame({ walkPace: Infinity }, NOW);
    look(g, NOW);
    expect(g.facing).toBe('N');
    step(g, 'go west', NOW);
    expect(g.facing).toBe('W');
    step(g, 'go north 3', NOW);
    expect(g.facing).toBe('N');
  });
});
