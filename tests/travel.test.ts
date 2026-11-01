import { describe, expect, it } from 'vitest';
import { look, newGame, step, tick, type Game, type Line } from '../src/game/game';
import { parse } from '../src/game/parser';
import { findRoute, resolveName, straightRoute } from '../src/game/travel';
import { cellName, vestibuleCell } from '../src/world/layout';
import { createWorld } from '../src/world/world';

const NOW = Date.UTC(2026, 5, 10, 9, 0);
const all = (lines: Line[]): string => lines.map((l) => l.text).join('\n');
const fast = (): Game => newGame({ walkPace: Infinity, relicDensity: 0, outsideTraces: false }, NOW);
const w = createWorld('the-house');

describe('naming places', () => {
  it('understands the House\'s own names, in any case, with or without "the"', () => {
    const v9 = vestibuleCell(w, 9)!;
    expect(resolveName(w, 'the ninth vestibule', 1)).toEqual({ ...v9, level: 1 });
    expect(resolveName(w, 'Ninth Vestibule', 1)).toEqual({ ...v9, level: 1 });
    expect(resolveName(w, 'vestibule 9', 1)).toEqual({ ...v9, level: 1 });
    expect(resolveName(w, 'ninth vestibule lower', 1)).toEqual({ ...v9, level: 0 });
    expect(resolveName(w, 'the eighty-eighth western hall', 1)).toEqual({ x: -88, y: 0, level: 1 });
    expect(resolveName(w, 'one-hundred-and-ninety-second western hall', 1)).toEqual({ x: -192, y: 0, level: 1 });
    expect(resolveName(w, 'first western hall on the upper level', 1)).toEqual({ x: -1, y: 0, level: 2 });
    expect(resolveName(w, 'nowhere at all', 1)).toBeNull();
  });
  it('round-trips every displayed name near home', () => {
    for (let x = -6; x <= 6; x++) for (let y = -6; y <= 6; y++) {
      const name = cellName(w, x, y);
      const got = resolveName(w, name, 1);
      expect(got, name).toEqual({ x, y, level: 1 });
    }
  });
});

describe('routes', () => {
  it('finds a short way to a near place and a long one to the far west', () => {
    const near = findRoute(w, { x: 0, y: 0, level: 1 }, { x: -1, y: 0, level: 1 });
    expect(near?.length).toBe(1);
    const far = findRoute(w, { x: 0, y: 0, level: 1 }, { x: -88, y: 0, level: 1 });
    expect(far).not.toBeNull();
    expect(far!.length).toBeGreaterThanOrEqual(88);
    expect(far!.length).toBeLessThan(200);
    expect(far![far!.length - 1]).toMatchObject({ x: -88, y: 0, level: 1 });
  });
  it('uses a vestibule stair to change level, and refuses the Drowned Halls', () => {
    const up = findRoute(w, { x: 0, y: 0, level: 1 }, { x: 0, y: 0, level: 2 });
    expect(up).toEqual([{ x: 0, y: 0, level: 2, via: 'stairs' }]);
    expect(findRoute(w, { x: 0, y: 0, level: 1 }, { x: 0, y: 0, level: 1 })).toEqual([]);
  });
  it('runs straight through the doors of one side', () => {
    const r = straightRoute(w, { x: 0, y: 0, level: 1 }, 'W', 5);
    expect(r.length).toBe(5);
    expect(r.every((s) => s.level === 1)).toBe(true);
    expect(straightRoute(w, { x: -192, y: 0, level: 1 }, 'W', 5)).toEqual([]);
  });
});

describe('commands', () => {
  it('are understood', () => {
    expect(parse('travel to the ninth vestibule')).toEqual({ t: 'travel', place: 'ninth vestibule' });
    expect(parse('go to the eighty-eighth western hall')).toEqual({ t: 'travel', place: 'eighty-eighth western hall' });
    expect(parse('home')).toEqual({ t: 'travel', place: 'first vestibule' });
    expect(parse('travel west 40')).toEqual({ t: 'trek', side: 'W', n: 40 });
    expect(parse('travel north')).toEqual({ t: 'trek', side: 'N', n: undefined });
    expect(parse('approach 3')).toEqual({ t: 'approach', n: 3 });
    expect(parse('walk to statue 3')).toEqual({ t: 'approach', n: 3 });
    expect(parse('mark the fountain')).toEqual({ t: 'mark', label: 'fountain' });
    expect(parse('marks')).toEqual({ t: 'marks' });
    expect(parse('go to fifth north-eastern hall 2 rows north')).toMatchObject({ t: 'travel' });
    expect(parse('go north')).toEqual({ t: 'go', side: 'N', n: undefined });
    expect(parse('go 3')).toEqual({ t: 'go', side: undefined, n: 3 });
  });
});

describe('a journey', () => {
  it('at instant pace takes you all the way and describes only where you arrive', () => {
    const g = fast();
    look(g, NOW);
    const out = all(step(g, 'travel to the eighth western hall', NOW));
    expect(g.pos).toMatchObject({ x: -8, y: 0, level: 1 });
    expect(g.journey).toBeNull();
    expect(out).toContain('You set out for');
    expect(out).toContain('You pass through');
    expect(out.match(/The middle level\./g)?.length).toBe(1);
  });
  it('can go home again from anywhere', () => {
    const g = fast();
    look(g, NOW);
    step(g, 'travel west 6', NOW);
    expect(g.pos.x).not.toBe(0);
    step(g, 'home', NOW);
    expect(g.pos).toMatchObject({ x: 0, y: 0, level: 1 });
  });
  it('can cross levels by the great stair to a place on another level', () => {
    const g = fast();
    look(g, NOW);
    step(g, 'travel to the first western hall upper', NOW);
    expect(g.pos).toMatchObject({ x: -1, y: 0, level: 2 });
  });
  it('at a real pace goes a leg at a time as the clock runs, and stop ends it where you are', () => {
    const g = newGame({ walkPace: 1, relicDensity: 0, outsideTraces: false }, NOW);
    look(g, NOW);
    let t = NOW;
    const first = all(step(g, 'travel west 4', t));
    expect(first).toContain('You set out for');
    expect(g.walk).not.toBeNull();
    expect(g.journey?.route.length).toBe(4);
    for (let i = 0; i < 40000 && g.journey; i++) { t += 10000; tick(g, t); }
    expect(g.journey).toBeNull();
    expect(g.walk).toBeNull();
    expect(g.pos.x).toBe(-4);
    // and stopping
    const h = newGame({ walkPace: 1, relicDensity: 0, outsideTraces: false }, NOW);
    look(h, NOW);
    step(h, 'travel west 4', NOW);
    const s = all(step(h, 'stop', NOW + 1000));
    expect(s).toContain('You stop');
    expect(h.journey).toBeNull();
    expect(h.walk).toBeNull();
  });
  it('says so plainly when the place is unknown or the way is shut', () => {
    const g = fast();
    look(g, NOW);
    expect(all(step(g, 'travel to nowhere in particular', NOW))).toContain('do not know of a place');
    expect(all(step(g, 'travel to the first vestibule', NOW))).toContain('already there');
  });
});

describe('marks', () => {
  it('remember a place, and take you back to it', () => {
    const g = fast();
    look(g, NOW);
    step(g, 'travel west 3', NOW);
    const out = all(step(g, 'mark the third hall', NOW));
    expect(out).toContain('third hall');
    expect(all(step(g, 'marks', NOW))).toContain('third hall');
    step(g, 'home', NOW);
    expect(g.pos.x).toBe(0);
    step(g, 'travel to the third hall', NOW);
    expect(g.pos.x).toBe(-3);
    expect(all(step(g, 'unmark third hall', NOW))).toContain('forget');
    expect(g.marks.size).toBe(0);
  });
});

describe('approaching a statue', () => {
  it('walks to the statue and tells you about it', () => {
    const g = fast();
    look(g, NOW);
    expect(g.seenListed.length).toBeGreaterThan(0);
    const out = all(step(g, 'approach 1', NOW));
    expect(out).toContain('to stand before statue 1');
    expect(g.pos.wall).toBe(g.seenListed[0]?.statue.wall);
  });
});

describe('getting lost, as in the book', () => {
  it('with no map you can go by name only where you have been, or home, or to a mark', () => {
    const g = newGame({ walkPace: Infinity, relicDensity: 0, outsideTraces: false, knownOnly: true }, NOW);
    look(g, NOW);
    expect(all(step(g, 'travel to the fifth western hall', NOW))).toMatch(/never been to the Fifth Western Hall/);
    expect(g.pos.x).toBe(0);
    step(g, 'travel west 3', NOW); // walking a straight line is always possible; you have now been through them
    expect(all(step(g, 'travel to the second western hall', NOW))).toMatch(/You set out|arrive|Second Western/);
    step(g, 'home', NOW);
    expect(g.pos.x).toBe(0);
    step(g, 'travel west 5', NOW);
    step(g, 'mark the far end', NOW);
    step(g, 'home', NOW);
    step(g, 'travel to the far end', NOW);
    expect(g.pos.x).toBe(-5);
    expect(all(step(g, 'where', NOW))).not.toMatch(/Cell|\d,/);
  });
  it('with a map, you may name any place', () => {
    const g = newGame({ walkPace: Infinity, relicDensity: 0, outsideTraces: false }, NOW);
    look(g, NOW);
    step(g, 'travel to the fifth western hall', NOW);
    expect(g.pos.x).toBe(-5);
  });
});
