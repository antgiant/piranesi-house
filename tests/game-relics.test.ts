import { describe, expect, it } from 'vitest';
import { diffScenes, look, newGame, step, tick, type Game, type Line } from '../src/game/game';
import { audioFor } from '../src/audio/director';
import { outsideEventForDay } from '../src/sim/outside';
import { sceneAtWorldTime } from '../src/sim/scene';
import { MS } from '../src/sim/time';
import { createWorld } from '../src/world/world';

const NOW = Date.UTC(2026, 5, 10, 9, 0);
const all = (lines: Line[]): string => lines.map((l) => l.text).join('\n');
const FAST = { walkPace: Infinity };
const fresh = (extra = {}): Game => {
  const g = newGame({ ...FAST, ...extra }, NOW);
  return g;
};

describe('what was left behind', () => {
  it('the First Vestibule shows the sleeping bag and the litter by the stair', () => {
    const g = fresh();
    const out = all(look(g, NOW));
    expect(out).toContain('Left behind by someone, long ago:');
    expect(out).toMatch(/stiff old sleeping bag/);
    expect(g.relicsListed.length).toBeGreaterThanOrEqual(2);
  });
  it('is numbered after the statues, and examining it shows our description and notes it privately', () => {
    const g = fresh();
    look(g, NOW);
    const n = g.seenListed.length + g.relicsListed.findIndex((r) => r.kind === 'old-sleeping-bag') + 1;
    const out = all(step(g, `examine ${n}`, NOW));
    expect(out).toMatch(/pale hollow beneath the great stair/);
    expect(out).toContain('You make a note of it');
    expect(g.found.size).toBe(1);
    expect(all(step(g, `examine ${n}`, NOW))).not.toContain('You make a note of it');
    expect(g.found.size).toBe(1);
  });
  it('can be examined by name', () => {
    const g = fresh();
    look(g, NOW);
    expect(all(step(g, 'examine sleeping bag', NOW))).toMatch(/hollow beneath the great stair/);
  });
  it('"found" lists what you have noticed, and starts empty', () => {
    const g = fresh();
    look(g, NOW);
    expect(all(step(g, 'found', NOW))).toMatch(/not yet noticed anything/);
    step(g, `examine ${g.seenListed.length + 1}`, NOW);
    expect(all(step(g, 'found', NOW))).toMatch(/1\. .*\(First Vestibule\)/);
  });
  it('your list is yours alone: a new game starts with nothing', () => {
    const a = fresh();
    look(a, NOW);
    step(a, `examine ${a.seenListed.length + 1}`, NOW);
    expect(a.found.size).toBe(1);
    expect(fresh().found.size).toBe(0);
  });
  it('can be turned off entirely', () => {
    const g = fresh({ relicDensity: 0 });
    const out = all(look(g, NOW));
    expect(out).not.toContain('Left behind');
    expect(g.relicsListed).toEqual([]);
  });
  it('the gull colony has its scraps, and nothing pretends to be anything else', () => {
    const g = fresh();
    g.pos = { x: -88, y: 0, level: 1, wall: null, pos: 500 };
    const out = all(look(g, NOW));
    expect(out).toMatch(/torn scraps of paper scattered over the pavement/);
    const n = g.seenListed.length + g.relicsListed.findIndex((r) => r.id.endsWith('scraps-floor')) + 1;
    expect(all(step(g, `examine ${n}`, NOW))).toMatch(/Almost all are blank or smeared beyond reading/);
  });
});

describe('hints of an outside', () => {
  const w = createWorld('the-house');
  const day = Array.from({ length: 200 }, (_, i) => i).find((d) => { const e = outsideEventForDay(w, d); return e && e.x === 0 && e.y === 0 && e.kind === 'draught'; })!;
  const e = outsideEventForDay(w, day)!;
  const mid = Math.floor((e.startMs + e.endMs) / 2);

  it('is described in the room while it happens, in words that never explain it', () => {
    const g = fresh({ startAtWorldMs: mid });
    const out = all(look(g, NOW));
    expect(out).toMatch(/cold draught creeps out of the south-east corner, in the shadow between the two minotaurs/);
    expect(out).toMatch(/smelling of rain and metal/);
    expect(out).not.toMatch(/outside|another world|portal|door to/i);
  });
  it('is announced once, when it begins, and heard in the sound', () => {
    const g = fresh({ startAtWorldMs: e.startMs - 30_000 });
    look(g, NOW);
    const before = sceneAtWorldTime(w, 0, 0, 1, e.startMs - 30_000);
    const during = sceneAtWorldTime(w, 0, 0, 1, mid);
    expect(before.outside).toBeNull();
    expect(diffScenes(before, during, audioFor(w, during)).join(' ')).toMatch(/draught/);
    const a = audioFor(w, during, { facing: 'N' });
    expect(a.outside?.kind).toBe('draught');
    expect(a.outside!.gain).toBeGreaterThan(0.9);
    expect(audioFor(w, before).outside).toBeNull();
    // and once only: the same event twice in a row says nothing more
    expect(diffScenes(during, sceneAtWorldTime(w, 0, 0, 1, mid + MS.sec), audioFor(w, during)).join(' ')).not.toMatch(/draught/);
  });
  it('arrives through tick as a live event while you stand there', () => {
    const g = fresh({ startAtWorldMs: e.startMs - 5_000 });
    look(g, NOW);
    const lines = tick(g, NOW + 20_000);
    expect(all(lines)).toMatch(/draught/);
  });
  it('can be turned off', () => {
    const g = fresh({ startAtWorldMs: mid, outsideTraces: false });
    expect(all(look(g, NOW))).not.toMatch(/draught/);
  });
  it('is described elsewhere without the minotaurs, and never in a lake', () => {
    const other = Array.from({ length: 400 }, (_, i) => i).map((d) => outsideEventForDay(w, d)).find((x) => x && !x.corner && x.kind === 'voices')!;
    const g = fresh({ startAtWorldMs: Math.floor((other.startMs + other.endMs) / 2) });
    g.pos = { x: other.x, y: other.y, level: 1, wall: null, pos: 500 };
    const out = all(look(g, NOW));
    if (!g.world.seedText.includes('x') && !/Drowned|lake/.test(out)) expect(out).toMatch(/almost voices|that are almost voices/);
    expect(out).not.toMatch(/two minotaurs/);
  });
});
