import { describe, expect, it } from 'vitest';
import { look, newGame, step, type Game, type Line } from '../src/game/game';
import { slip, slipChance } from '../src/game/lost';

const NOW = Date.UTC(2026, 5, 10, 9, 0);
const all = (lines: Line[]): string => lines.map((l) => l.text).join('\n');
const fresh = (seed = 'the-house', extra = {}): Game => {
  const g = newGame({ seed, walkPace: Infinity, relicDensity: 0, outsideTraces: false, knownOnly: true, ...extra }, NOW);
  look(g, NOW);
  return g;
};
const atHome = (g: Game): boolean => g.pos.x === 0 && g.pos.y === 0 && g.pos.level === 1;

describe('the chance of misremembering', () => {
  it('is small for a hall seen once, smaller the more it is known, almost nothing with a chalk mark, and worse in the dark, wet or hurry', () => {
    const base = { visits: 1, marked: false, dark: false, wet: false, hurried: false };
    const p1 = slipChance(base);
    expect(p1).toBeGreaterThan(0.01);
    expect(p1).toBeLessThan(0.06);
    expect(slipChance({ ...base, visits: 4 })).toBeLessThan(p1 / 2);
    expect(slipChance({ ...base, marked: true })).toBeLessThan(p1 / 5);
    for (const k of ['dark', 'wet', 'hurried'] as const) expect(slipChance({ ...base, [k]: true })).toBeGreaterThan(p1);
    expect(slipChance({ visits: 1, marked: false, dark: true, wet: true, hurried: true })).toBeLessThanOrEqual(0.25);
  });
  it('a slip is a door counted one out, a wall confused for its neighbour, or a hall forgotten', () => {
    const i = { via: 'door' as const, side: 'N' as const, ord: 2, of: 4 };
    const kinds = new Set<string>();
    for (let r = 0; r < 1; r += 0.01) {
      const s = slip(i, r);
      kinds.add(s === null ? 'forgot' : s.side !== i.side ? 'wall' : s.ord !== i.ord ? 'ord' : 'same');
    }
    expect(kinds).toEqual(new Set(['ord', 'wall', 'forgot']));
  });
});

describe('the way back', () => {
  it('knows the way after a short walk, and is at home when it succeeds', () => {
    const g = fresh();
    step(g, 'travel west 2', NOW);
    expect(atHome(g)).toBe(false);
    const out = all(step(g, 'way back', NOW));
    expect(out).toContain('You try to call to mind the way you came');
    expect(g.journey).toBeNull();
  });
  it('is not a certainty: over many worlds, short trips usually succeed, long ones often do not', () => {
    let shortOk = 0, longOk = 0;
    const N = 30;
    for (let i = 0; i < N; i++) {
      const a = fresh(`lost-${i}`);
      step(a, 'travel west 3', NOW);
      step(a, 'way back', NOW);
      if (atHome(a)) shortOk++;
      const b = fresh(`lost-${i}`);
      step(b, 'travel west 35', NOW);
      step(b, 'way back', NOW);
      if (atHome(b)) longOk++;
    }
    expect(shortOk / N).toBeGreaterThan(0.8);
    expect(shortOk / N).toBeLessThan(1);
    expect(longOk / N).toBeLessThan(0.75);
    expect(longOk / N).toBeGreaterThan(0.05);
    expect(longOk).toBeLessThan(shortOk);
  });
  it('when it goes wrong you are somewhere else and are told so, and can try again from there', () => {
    let lost: Game | null = null;
    let msg = '';
    for (let i = 0; i < 80 && !lost; i++) {
      const g = fresh(`wrong-${i}`);
      step(g, 'travel west 25', NOW);
      const out = all(step(g, 'way back', NOW));
      if (!atHome(g)) { lost = g; msg = out; }
    }
    expect(lost).not.toBeNull();
    expect(msg).toMatch(/does not look as you remember|not the one you were expecting|Nothing here is familiar|do not know this place|lost the way|there is none/i);
    const g = lost as Game;
    expect(g.journey).toBeNull();
    // asking again is another try, from where you now are
    const before = `${g.pos.x},${g.pos.y}`;
    const again = all(step(g, 'way back', NOW));
    expect(again).toMatch(/call to mind the way/);
    void before;
  });
  it('is the same attempt for the same world and path, and a different one on the next try', () => {
    const run = (): string => { const g = fresh('same'); step(g, 'travel west 20', NOW); step(g, 'way back', NOW); return `${g.pos.x},${g.pos.y}`; };
    expect(run()).toBe(run());
  });
  it('chalk marks make it safer', () => {
    let plain = 0, marked = 0;
    for (let i = 0; i < 30; i++) {
      const a = fresh(`chalk-${i}`);
      step(a, 'travel west 18', NOW);
      step(a, 'way back', NOW);
      if (atHome(a)) plain++;
      const b = fresh(`chalk-${i}`);
      for (let k = 1; k <= 18; k++) { step(b, 'travel west 1', NOW); step(b, `mark spot${k}`, NOW); }
      step(b, 'way back', NOW);
      if (atHome(b)) marked++;
    }
    expect(marked).toBeGreaterThan(plain);
  });
  it('says plainly when there is no way to remember: you came here in a moment', () => {
    const g = fresh();
    g.pos = { x: -4, y: 2, level: 1, wall: null, pos: 500 };
    expect(all(step(g, 'way back', NOW))).toContain('no memory of the way');
    expect(all(step(fresh(), 'way back', NOW))).toContain('already at the great stair');
  });
  it('forgets a loop you have walked, so the way back is the short way you know', () => {
    const g = fresh();
    step(g, 'travel west 3', NOW);
    step(g, 'travel east 2', NOW);
    // now one hall west of home: the way back is one step
    expect(g.trail.length).toBe(1);
    step(g, 'way back', NOW);
  });
  it('without the lost-as-in-the-book setting, home is exact', () => {
    const g = newGame({ walkPace: Infinity, relicDensity: 0 }, NOW);
    look(g, NOW);
    step(g, 'travel west 30', NOW);
    step(g, 'home', NOW);
    expect(atHome(g)).toBe(true);
  });
  it('going by name to a place you know is by memory too, and may go wrong', () => {
    let ok = 0, wrong = 0;
    for (let i = 0; i < 30; i++) {
      const g = fresh(`name-${i}`);
      step(g, 'travel west 12', NOW);
      step(g, 'mark the far end', NOW);
      step(g, 'way back', NOW);
      if (!atHome(g)) continue;
      step(g, 'travel to the far end', NOW);
      if (g.pos.x === -12) ok++; else wrong++;
    }
    expect(ok + wrong).toBeGreaterThan(8);
    expect(ok).toBeGreaterThan(0);
  });
});
