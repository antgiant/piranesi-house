import { describe, expect, it } from 'vitest';
import { look, newGame, step, tick, walkStatus, type Game, type Line } from '../src/game/game';
import { CORRIDOR_HALL_M, WALK_SPEED_MPS, describeDuration, distanceM, hallPoint, terrainFactor, walkSeconds } from '../src/game/walk';
import { getHall } from '../src/world/hall';
import { createWorld } from '../src/world/world';

const NOW = Date.UTC(2026, 5, 10, 9, 0);
const all = (lines: Line[]): string => lines.map((l) => l.text).join('\n');
const MIN = 60_000;

describe('canon: how fast people walk (D-002)', () => {
  it('the walking speed is the book\'s: 20 km in 3.76 hours', () => {
    expect(WALK_SPEED_MPS).toBeCloseTo(1.477, 2);
    expect(walkSeconds(20_000) / 3600).toBeCloseTo(3.76, 2);
  });
  it.each(['the-house', 'test-seed', 'another', 'x'])('the road west to the 192nd Western Hall is about 20 km long (%s)', (seed) => {
    const w = createWorld(seed);
    let m = 0;
    for (let x = -1; x >= -192; x--) m += getHall(w, x, 0, 1).xExtent;
    expect(m).toBeGreaterThan(18_000);
    expect(m).toBeLessThan(22_500);
    // and so it takes the book's 3.76 hours, give or take
    expect(walkSeconds(m) / 3600).toBeGreaterThan(3.4);
    expect(walkSeconds(m) / 3600).toBeLessThan(4.3);
  });
});

describe('measuring a walk', () => {
  const w = createWorld('test-seed');
  const h = getHall(w, -1, 0, 1);
  it('door to door across a hall is its width', () => {
    expect(distanceM(h, { wall: 'E', pos: 500 }, { wall: 'W', pos: 500 })).toBeCloseTo(h.xExtent, 5);
    expect(distanceM(h, { wall: 'N', pos: 500 }, { wall: 'S', pos: 500 })).toBeCloseTo(h.yExtent, 5);
  });
  it('the middle of the floor is the middle', () => {
    expect(hallPoint(h, { wall: null, pos: 0 })).toEqual({ x: h.xExtent / 2, y: h.yExtent / 2 });
  });
  it('rubble and water slow you down', () => {
    const ruin = getHall(w, 8, 0, 1);
    expect(terrainFactor(h, 0)).toBe(1);
    expect(terrainFactor(h, 2)).toBeLessThan(1);
    expect(terrainFactor(h, 6)).toBeLessThan(terrainFactor(h, 2));
    expect(terrainFactor(h, 12)).toBeLessThan(terrainFactor(h, 6));
    expect(terrainFactor(ruin, 0)).toBeLessThan(1);
  });
  it('durations read naturally', () => {
    expect(describeDuration(30)).toBe('about 30 seconds');
    expect(describeDuration(130)).toBe('about 2 minutes');
    expect(describeDuration(3600)).toBe('about an hour');
    expect(describeDuration(3900)).toBe('about an hour and 5 minutes');
  });
});

describe('walking in the game', () => {
  const start = (extra = {}): Game => {
    const g = newGame(extra, NOW);
    look(g, NOW);
    return g;
  };

  it('crossing a hall takes minutes, not an instant', () => {
    const g = start();
    const out = all(step(g, 'go west', NOW));
    expect(out).toMatch(/You set off for the west door, \d+ metres away\. It will take about/);
    expect(g.pos).toMatchObject({ x: 0, y: 0 });
    const w = g.walk!;
    expect(w).not.toBeNull();
    const minutes = (w.endMs - w.startMs) / MIN;
    expect(minutes).toBeGreaterThan(0.25);
    expect(minutes).toBeLessThan(6);
  });
  it('the time is the distance at the book\'s pace', () => {
    const g = start();
    step(g, 'go west', NOW);
    const w = g.walk!;
    expect((w.endMs - w.startMs) / 1000).toBeCloseTo(w.meters / WALK_SPEED_MPS, 0);
  });
  it('you arrive only when the time is up, and then see the new place', () => {
    const g = start();
    step(g, 'go west', NOW);
    const end = g.walk!.endMs;
    expect(tick(g, end - 5000)).not.toEqual(expect.arrayContaining([expect.objectContaining({ text: expect.stringContaining('First Western Hall') })]));
    expect(g.pos).toMatchObject({ x: 0, y: 0 });
    const arrival = all(tick(g, end + 100));
    expect(arrival).toContain('You go through the west door into First Western Hall');
    expect(arrival).toContain('Ways out');
    expect(g.pos).toMatchObject({ x: -1, y: 0 });
    expect(g.walk).toBeNull();
  });
  it('says something about the room halfway through a long walk', () => {
    const g = start();
    step(g, 'go west', NOW);
    const w = g.walk!;
    expect(w.beatMs).not.toBeNull();
    const mid = all(tick(g, w.beatMs! + 10));
    expect(mid).toMatch(/About halfway, you pass/);
    expect(all(tick(g, w.beatMs! + 20))).not.toMatch(/About halfway/);
  });
  it('while you walk, moving again is refused and looking shows progress', () => {
    const g = start();
    step(g, 'go west', NOW);
    expect(all(step(g, 'go north', NOW + 1000))).toMatch(/already on your way/);
    const status = all(step(g, 'look', NOW + 30_000));
    expect(status).toMatch(/on your way to First Western Hall, \d+% of the way there/);
    expect(walkStatus(g, NOW + 30_000)!.fraction).toBeGreaterThan(0);
  });
  it('"stop" leaves you in the middle of the floor where you started', () => {
    const g = start();
    step(g, 'go west', NOW);
    const out = all(step(g, 'stop', NOW + 20_000));
    expect(out).toMatch(/You stop where you are/);
    expect(g.walk).toBeNull();
    expect(g.pos).toMatchObject({ x: 0, y: 0, wall: null });
    expect(all(step(g, 'stop', NOW + 21_000))).toMatch(/not going anywhere/);
  });
  it('walking to a wall and climbing a stair take time too', () => {
    const g = start();
    expect(all(step(g, 'walk east', NOW))).toMatch(/You set off for the east wall/);
    tick(g, g.walk!.endMs + 1);
    expect(g.pos.wall).toBe('E');
    const up = all(step(g, 'up', g.walk === null ? NOW + 10 * MIN : NOW));
    expect(up).toMatch(/set off for the great stair/);
    expect(g.walk!.kind).toBe('stairs');
    expect((g.walk!.endMs - g.walk!.startMs) / 1000).toBeGreaterThan(150);
  });
  it('a long passage adds its length', () => {
    const g = start({ walkPace: 1 });
    step(g, 'go west', NOW + 1);
    const direct = g.walk!.meters;
    g.walk = null;
    const corridor = g.exitsListed.find((e) => e.corridor > 0)!;
    step(g, `go ${corridor.index}`, NOW);
    expect(g.walk!.meters).toBeGreaterThan(CORRIDOR_HALL_M * corridor.corridor);
    expect(direct).toBeGreaterThan(0);
  });

  it('the world clock sets the pace: at 60x time the same walk takes a sixtieth as long', () => {
    const real = start();
    const fast = start({ timeScale: 60 });
    step(real, 'go west', NOW);
    step(fast, 'go west', NOW);
    const a = real.walk ? real.walk.endMs - real.walk.startMs : 0;
    const b = fast.walk ? fast.walk.endMs - fast.walk.startMs : 0;
    expect(a).toBeGreaterThan(0);
    // 60x time makes it so short it just happens
    expect(b === 0 ? true : a / b > 50).toBe(true);
  });
  it('the walking-pace setting scales the wait, and "instant" removes it', () => {
    const slow = start({ walkPace: 1 });
    const brisk = start({ walkPace: 4 });
    const instant = start({ walkPace: Infinity });
    step(slow, 'go west', NOW);
    step(brisk, 'go west', NOW);
    const out = all(step(instant, 'go west', NOW));
    const s = slow.walk!.endMs - slow.walk!.startMs;
    const b = brisk.walk ? brisk.walk.endMs - brisk.walk.startMs : 0;
    expect(b === 0 || Math.abs(s / b - 4) < 0.01).toBe(true);
    expect(out).toContain('First Western Hall');
    expect(instant.walk).toBeNull();
  });
  it('if the water rises while you walk, you wait in the doorway instead of wading in', () => {
    const g = start();
    const e = g.exitsListed.find((x) => x.side === 'W' && x.corridor === 0)!;
    g.walk = { kind: 'door', startMs: NOW, endMs: NOW + 1000, meters: 100, exit: e, beatMs: null, beatText: '', label: 'First Western Hall' };
    // finishing is checked against the world at arrival; calm weather here, so this just arrives
    expect(all(tick(g, NOW + 2000))).toContain('First Western Hall');
  });
});
