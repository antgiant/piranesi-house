import { describe, expect, it } from 'vitest';
import { listenerPose, look, newGame, step, tick, type Game, type Line } from '../src/game/game';
import { parse } from '../src/game/parser';
import { applySave, toSave } from '../src/game/save';
import { getHall } from '../src/world/hall';

const NOW = Date.UTC(2026, 5, 10, 9, 0);
const all = (lines: Line[]): string => lines.map((l) => l.text).join('\n');
const start = (): Game => { const g = newGame({}, NOW); look(g, NOW); return g; };
const hall = (g: Game) => getHall(g.world, g.pos.x, g.pos.y, g.pos.level);

describe('you can stop anywhere', () => {
  it('stopping mid-walk leaves you where the walk had taken you, on the open floor', () => {
    const g = start();
    const h = hall(g);
    step(g, 'go west', NOW);
    const w = g.walk!;
    const half = w.startMs + (w.endMs - w.startMs) / 2;
    const expected = listenerPose(g, half);
    const out = all(step(g, 'stop', half));
    expect(out).toMatch(/You stop where you are\. You stand/);
    expect(g.walk).toBeNull();
    expect(g.pos.wall).toBeNull();
    expect(g.pos.at!.x).toBeCloseTo(expected.x, 6);
    expect(g.pos.at!.y).toBeCloseTo(expected.y, 6);
    expect(g.pos.at!.x).toBeLessThan(h.xExtent / 2);   // west of where you started
    expect(g.pos.at!.x).toBeGreaterThan(0);
    // the sound's pose agrees with where you stopped, and you face the way you were going
    const p = listenerPose(g, half + 1000);
    expect(p.x).toBeCloseTo(g.pos.at!.x, 6);
    expect(p.heading).toBeGreaterThan(200); expect(p.heading).toBeLessThan(340);
  });
  it('walks from there are measured from there, not from the middle of the floor', () => {
    const g = start();
    step(g, 'go west', NOW);
    const full = g.walk!.endMs - g.walk!.startMs;
    const half = g.walk!.startMs + full * 0.75;
    step(g, 'stop', half);
    step(g, 'go west', half);
    const rest = g.walk!.endMs - g.walk!.startMs;
    expect(rest).toBeLessThan(full * 0.45); // a quarter of the way left, plus the doorway
    expect(rest).toBeGreaterThan(full * 0.05);
  });
  it('is remembered by a save and read back, and a damaged point is ignored', () => {
    const g = start();
    step(g, 'go west', NOW);
    step(g, 'stop', g.walk!.startMs + (g.walk!.endMs - g.walk!.startMs) / 3);
    const saved = JSON.parse(JSON.stringify(toSave(g, NOW)));
    const g2 = newGame({}, NOW);
    expect(applySave(g2, saved)).toBe(true);
    expect(g2.pos.at).toEqual(g.pos.at);
    expect(g2.pos.heading).toBeCloseTo(g.pos.heading!, 6);
    saved.pos.at = { x: 'far', y: null };
    const g3 = newGame({}, NOW);
    expect(applySave(g3, saved)).toBe(true);
    expect(g3.pos.at).toBeUndefined();
  });
});

describe('walking by distance, toward things, and facing', () => {
  it('"walk north 100 feet" is a walk of that many feet across the open floor, ending where it says', () => {
    expect(parse('walk north 100 feet')).toEqual({ t: 'walkby', side: 'N', meters: 30.48 });
    expect(parse('go east 50 yards')).toEqual({ t: 'walkby', side: 'E', meters: 45.72 });
    expect(parse('walk south 20 metres')).toEqual({ t: 'walkby', side: 'S', meters: 20 });
    expect(parse('walk west 40 paces')).toEqual({ t: 'walkby', side: 'W', meters: 30 });
    expect(parse('walk east')).toEqual({ t: 'walk', wall: 'E' }); // without a distance: still to the wall
    const g = start();
    const h = hall(g);
    const out = all(step(g, 'walk north 30 metres', NOW));
    expect(out).toMatch(/set off for a point on the open floor to the north, \d+ metres away/);
    expect(g.walk!.kind).toBe('point');
    tick(g, g.walk!.endMs + 10);
    expect(g.pos.at!.y).toBeCloseTo(h.yExtent / 2 + 30, 6);
    expect(g.pos.at!.x).toBeCloseTo(h.xExtent / 2, 6);
    expect(g.pos.wall).toBeNull();
    expect(g.pos.heading).toBeCloseTo(0, 6);
  });
  it('stops at the wall if you ask for more than there is, and says so if you are against it', () => {
    const g = start();
    const h = hall(g);
    step(g, 'walk north 5000 metres', NOW);
    tick(g, g.walk!.endMs + 10);
    expect(g.pos.at!.y).toBeLessThan(h.yExtent);
    expect(g.pos.at!.y).toBeGreaterThan(h.yExtent - 1.5);
    expect(all(step(g, 'walk north 10 metres', g.walk ? g.walk.endMs : NOW + 1e7))).toMatch(/no room to walk further/);
  });
  it('"walk toward the middle" returns you to the middle of the floor, and says if you are there', () => {
    const g = start();
    expect(parse('walk toward the middle')).toEqual({ t: 'toward', what: 'middle' });
    expect(all(step(g, 'walk toward the middle', NOW))).toMatch(/already in the middle/);
    step(g, 'walk east 20 metres', NOW);
    tick(g, g.walk!.endMs + 10);
    step(g, 'walk toward the middle', g.walk ? g.walk.endMs : NOW + 1e7);
    tick(g, g.walk!.endMs + 10);
    expect(g.pos.at!.x).toBeCloseTo(hall(g).xExtent / 2, 6);
  });
  it('"walk toward the falls" takes you to a few metres from the water, or says there is none', () => {
    expect(parse('walk toward the falls')).toEqual({ t: 'toward', what: 'falls' });
    expect(parse('head for the stairs')).toEqual({ t: 'toward', what: 'stairs' });
    expect(parse('toward the waterfall')).toEqual({ t: 'toward', what: 'falls' });
    let spot: { x: number; y: number } | null = null;
    let dry: { x: number; y: number } | null = null;
    const g = start();
    for (let x = -12; x < 12; x++) for (let y = -12; y < 12; y++) { const hh = getHall(g.world, x, y, 1); if (hh.falls && !spot) spot = { x, y }; if (!hh.falls && !dry) dry = { x, y }; }
    g.pos = { x: dry!.x, y: dry!.y, level: 1, wall: null, pos: 500 };
    expect(all(step(g, 'walk toward the falls', NOW))).toMatch(/no fall of water/);
    g.pos = { x: spot!.x, y: spot!.y, level: 1, wall: null, pos: 500 };
    const h = hall(g);
    step(g, 'walk toward the falls', NOW);
    expect(g.walk).not.toBeNull();
    tick(g, g.walk!.endMs + 10);
    const f = h.falls!;
    const wallX = f.wall === 'W' ? 0 : f.wall === 'E' ? h.xExtent : null;
    const wallY = f.wall === 'S' ? 0 : f.wall === 'N' ? h.yExtent : null;
    const gap = wallX !== null ? Math.abs(g.pos.at!.x - wallX) : Math.abs(g.pos.at!.y - (wallY as number));
    expect(gap).toBeLessThan(6);
  });
  it('"face east" turns you, and the sound\'s heading follows', () => {
    expect(parse('face east')).toEqual({ t: 'face', side: 'E' });
    expect(parse('turn to the south')).toEqual({ t: 'face', side: 'S' });
    const g = start();
    expect(all(step(g, 'face east', NOW))).toMatch(/turn to face the east wall/);
    expect(listenerPose(g, NOW).heading).toBe(90);
  });
  it('cannot be started while you are on your way', () => {
    const g = start();
    step(g, 'go west', NOW);
    expect(all(step(g, 'walk north 10 metres', NOW + 1000))).toMatch(/still on your way/);
    expect(all(step(g, 'face south', NOW + 1000))).toMatch(/still on your way/);
  });
});
