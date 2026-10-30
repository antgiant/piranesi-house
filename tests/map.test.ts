import { describe, expect, it } from 'vitest';
import { look, newGame, step, exploredKey } from '../src/game/game';
import { mapView } from '../src/game/mapdata';
import { tideAt } from '../src/sim/tides';
import { getHall } from '../src/world/hall';
import { exits, parseCellName, vestibuleCell } from '../src/world/layout';
import { nextJoin } from '../src/sim/tides';

const NOW = Date.UTC(2026, 5, 10, 9, 0);
const fresh = () => {
  const g = newGame({ walkPace: Infinity }, NOW);
  look(g, NOW);
  return g;
};

describe('fog of war', () => {
  it('on arrival you know only the First Vestibule and what its doors open onto', () => {
    const g = fresh();
    const m = mapView(g, 1, NOW);
    expect(m.visited).toBe(1);
    const doors = exits(g.world, 0, 0, 1);
    const neighbours = new Set(doors.map((d) => `${d.to.x},${d.to.y}`));
    expect(m.known).toBe(neighbours.size);
    for (const c of m.cells) {
      if (c.state === 'known') expect(neighbours.has(`${c.x},${c.y}`)).toBe(true);
    }
    expect(m.cells.find((c) => c.state === 'here')).toMatchObject({ x: 0, y: 0, name: 'First Vestibule' });
  });
  it('nothing beyond the doors is shown, however close', () => {
    const g = fresh();
    const m = mapView(g, 1, NOW);
    const shown = new Set(m.cells.map((c) => `${c.x},${c.y}`));
    // (2,2) is two steps from the origin and behind other halls: not seen
    expect(shown.has('2,2')).toBe(false);
    expect(shown.has('0,3')).toBe(false);
  });
  it('walking reveals more, and a visited hall is never also "known"', () => {
    const g = fresh();
    step(g, 'go west', NOW);
    const m = mapView(g, 1, NOW);
    expect(m.visited).toBe(2);
    expect(m.cells.find((c) => c.state === 'here')!.name).toBe('First Western Hall');
    expect(m.cells.find((c) => c.name === 'First North-Western Hall')!.state).toBe('known');
    const seen = new Set<string>();
    for (const c of m.cells) {
      expect(seen.has(`${c.x},${c.y}`)).toBe(false);
      seen.add(`${c.x},${c.y}`);
    }
    expect(g.explored.has(exploredKey(1, 0, 0))).toBe(true);
    expect(g.explored.has(exploredKey(1, -1, 0))).toBe(true);
  });
  it('each level has its own map', () => {
    const g = fresh();
    step(g, 'up', NOW);
    expect(g.pos.level).toBe(2);
    expect(mapView(g, 2, NOW).visited).toBe(1);
    expect(mapView(g, 1, NOW).visited).toBe(1);
    expect(mapView(g, 0, NOW).visited).toBe(0);
    expect(mapView(g, 2, NOW).cells.find((c) => c.state === 'here')).toBeDefined();
    expect(mapView(g, 1, NOW).cells.find((c) => c.state === 'here')).toBeUndefined();
  });
  it('a long passage is shown as a link, to a place you have only heard of', () => {
    const g = fresh();
    step(g, 'go west', NOW);
    step(g, 'go north 3', NOW);
    const m = mapView(g, 1, NOW);
    const here = m.cells.find((c) => c.state === 'here')!;
    expect(here.name).toBe('First North-Western Hall');
    expect(here.links.length).toBeGreaterThan(0);
    expect(m.cells.find((c) => c.name === 'Fourth Western Hall')!.state).toBe('known');
  });
  it('the radius clips the view', () => {
    const g = fresh();
    step(g, 'go west', NOW);
    expect(mapView(g, 1, NOW, 0).cells.every((c) => c.x === g.pos.x && c.y === g.pos.y)).toBe(true);
  });
  it('is only ever memory: a new game starts with nothing explored', () => {
    const a = fresh();
    step(a, 'go west', NOW);
    const b = fresh();
    expect(mapView(b, 1, NOW).visited).toBe(1);
  });
});

describe('what the map says about water', () => {
  it('matches the simulation for every visited hall', () => {
    const g = fresh();
    for (let i = 0; i < 4; i++) step(g, `go ${(i % 2) + 1}`, NOW + i);
    for (const t of [0, 3 * 86_400_000, 40 * 3_600_000]) {
      const m = mapView(g, 1, NOW + 0, 14);
      for (const c of m.cells.filter((x) => x.state !== 'known')) {
        const h = getHall(g.world, c.x, c.y, 1);
        expect(c.waterDm).toBe(tideAt(g.world, h, (NOW - g.cfg.realZeroMs) * g.cfg.timeScale).depthDm);
      }
      void t;
    }
  });
  it('shows the great join flooding the Ninth Vestibule, and marks lakes and ruins', () => {
    const j = nextJoin(newGame({}, NOW).world, 0);
    const g = newGame({ startAtWorldMs: j, walkPace: Infinity }, NOW);
    const ninth = vestibuleCell(g.world, 9)!;
    g.pos = { x: ninth.x, y: ninth.y, level: 1, wall: null, pos: 500 };
    look(g, NOW);
    const m = mapView(g, 1, NOW);
    expect(m.cells.find((c) => c.state === 'here')!.waterDm).toBeGreaterThanOrEqual(140);
    const drowned = parseCellName(g.world, 'Sixth Eastern Hall')!;
    g.pos = { x: drowned.x, y: drowned.y, level: 1, wall: null, pos: 500 };
    look(g, NOW);
    const d = mapView(g, 1, NOW).cells.find((c) => c.state === 'here')!;
    expect(d.lake).toBe(true);
    expect(d.ruined).toBe(true);
  });
  it('shows you walking toward a door', () => {
    const g = newGame({}, NOW);
    look(g, NOW);
    step(g, 'go west', NOW);
    const m = mapView(g, 1, NOW + 20_000);
    expect(m.walk).not.toBeNull();
    expect(m.walk!.x).toBe(-1);
    expect(m.walk!.fraction).toBeGreaterThan(0);
    expect(m.walk!.fraction).toBeLessThan(1);
  });
});
