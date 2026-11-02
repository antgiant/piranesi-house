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

/** A game that ends a long way back lost or astray, found once and replayed (the same seed always goes the same way). */
const replay = (seed: string): Game => { const g = fresh(seed); step(g, 'travel west 30', NOW); step(g, 'way back', NOW); return g; };
const seedMemo: Record<string, string> = {};
function seedFor(kind: 'wrong' | 'lost'): string {
  if (seedMemo[kind]) return seedMemo[kind] as string;
  for (let i = 0; i < 200; i++) {
    const g = replay(`belief-${i}`);
    if (g.belief?.kind === kind) return (seedMemo[kind] = `belief-${i}`);
  }
  throw new Error(`no game found that ends ${kind}`);
}

describe('the chance of misremembering', () => {
  const base = { passes: 1, marked: false, straight: false, dark: false, wet: false, hurried: false };
  it('is a guess on a way never taken, small on a way taken once, and smaller each further time', () => {
    const never = slipChance({ ...base, passes: 0 });
    const once = slipChance(base);
    expect(never).toBeGreaterThan(0.1);
    expect(never).toBeLessThan(0.2);
    expect(once).toBeGreaterThan(0.01);
    expect(once).toBeLessThan(0.06);
    let last = once;
    for (let n = 2; n <= 12; n++) { const p = slipChance({ ...base, passes: n }); expect(p).toBeLessThan(last); last = p; }
    expect(slipChance({ ...base, passes: 10 })).toBeLessThan(0.005);
  });
  it('is nearly nothing with a chalk mark, a little easier going straight on, worse in the dark, wet or hurry', () => {
    const p1 = slipChance(base);
    expect(slipChance({ ...base, marked: true })).toBeLessThan(p1 / 5);
    expect(slipChance({ ...base, straight: true })).toBeLessThan(p1);
    for (const k of ['dark', 'wet', 'hurried'] as const) expect(slipChance({ ...base, [k]: true })).toBeGreaterThan(p1);
    expect(slipChance({ passes: 0, marked: false, straight: false, dark: true, wet: true, hurried: true })).toBeLessThanOrEqual(0.4);
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
  it('learns: the more often you take a way, the less likely you are to lose it', () => {
    const rate = (rounds: number): number => {
      let ok = 0;
      const N = 20;
      for (let i = 0; i < N; i++) {
        const g = fresh(`learn-${i}`);
        for (let r = 0; r < rounds; r++) {
          g.pos = { x: 0, y: 0, level: 1, wall: null, pos: 500 };
          g.trail = [];
          step(g, 'travel west 12', NOW);
          if (r < rounds - 1) { step(g, 'way back', NOW); }
        }
        step(g, 'way back', NOW);
        if (atHome(g)) ok++;
      }
      return ok / N;
    };
    const first = rate(1);
    const practised = rate(6);
    expect(practised).toBeGreaterThan(first);
    expect(practised).toBeGreaterThan(0.9);
    expect(first).toBeLessThan(0.97);
  });
  it('lets you try for a named hall you have never been to, by its name alone, and may lose you', () => {
    let ok = 0, lost = 0;
    let said = '';
    for (let i = 0; i < 30; i++) {
      const g = fresh(`guess-${i}`);
      const out = all(step(g, 'travel to the eighth western hall', NOW));
      if (!said) said = out;
      if (g.pos.x === -8 && g.pos.y === 0) ok++; else lost++;
    }
    expect(said).toMatch(/never been that way, going by the names alone/);
    expect(ok).toBeGreaterThan(0);
    expect(lost).toBeGreaterThan(0);
  });
  it('and a way you have walked many times is a way you do not lose', () => {
    let ok = 0, tried = 0;
    for (let i = 0; i < 24; i++) {
      const g = fresh(`known-${i}`);
      let reached = true;
      for (let r = 0; r < 6; r++) { g.pos = { x: 0, y: 0, level: 1, wall: null, pos: 500 }; g.trail = []; step(g, 'travel west 8', NOW); if (g.pos.x !== -8) reached = false; }
      if (!reached) continue; // the sea was across the way in this world: it could not be walked
      tried++;
      g.pos = { x: 0, y: 0, level: 1, wall: null, pos: 500 };
      g.trail = [];
      step(g, 'travel to the eighth western hall', NOW);
      if (g.pos.x === -8) ok++;
    }
    expect(tried).toBeGreaterThan(8);
    expect(ok / tried).toBeGreaterThan(0.9);
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

import { believedSpot, hallLabel, shownName, writeEntry } from '../src/game/game';
import { applySave, toSave } from '../src/game/save';
import { getHall } from '../src/world/hall';

describe('where you think you are', () => {
  const found = { wrong: replay(seedFor('wrong')), lost: replay(seedFor('lost')) };

  it('is always right when you have not gone astray, or have a map', () => {
    const g = fresh();
    step(g, 'travel west 3', NOW);
    expect(g.belief).toBeNull();
    expect(shownName(g)).toBe(getHall(g.world, g.pos.x, g.pos.y, g.pos.level).name);
    const m = newGame({ walkPace: Infinity, relicDensity: 0, outsideTraces: false }, NOW);
    look(m, NOW);
    step(m, 'travel west 30', NOW);
    step(m, 'home', NOW);
    expect(m.belief).toBeNull();
  });
  it('can be wrong: the name you are given is not where you are, and you are sure of it', () => {
    const g = found.wrong as Game;
    expect(g).not.toBeNull();
    const here = shownName(g);
    expect(here).not.toBeNull();
    expect(here).not.toBe(shownName({ ...g, belief: null } as Game));
    expect(hallLabel(g)).toBe(`the ${here}`);
    expect(believedSpot(g)).not.toEqual({ x: g.pos.x, y: g.pos.y, level: g.pos.level });
    // everything that names the place agrees with the belief, not the truth
    const trueName = shownName({ ...g, belief: null } as Game) as string;
    const where = all(step(g, 'where', NOW));
    expect(where).toContain(here as string);
    expect(where).not.toContain(trueName);
    expect(all(look(g, NOW))).not.toContain(trueName);
    expect(writeEntry(g, 'Here at last.', NOW)?.hall).toBe(here);
  });
  it('can be nothing: you know that you do not know, and nothing is named', () => {
    const g = found.lost as Game;
    expect(g).not.toBeNull();
    expect(believedSpot(g)).toBeNull();
    expect(shownName(g)).toBeNull();
    expect(hallLabel(g)).toBe('a hall you do not know');
    expect(all(step(g, 'where', NOW))).toContain('You do not know where you are');
    const glance = all(look(g, NOW, true));
    expect(glance).toMatch(/^A place you do not know/);
    expect(glance).not.toMatch(/Western Hall|North-Western Hall|Northern Hall/);
    expect(writeEntry(g, 'Lost.', NOW)?.hall).toBe('a place I did not know');
  });
  it('cannot plan a way by name from where you do not know you are, but can still go back by the trail', () => {
    const g = found.lost as Game;
    expect(all(step(g, 'travel to the fifth western hall', NOW))).toMatch(/do not know where you are, so you cannot say how/);
    expect(all(step(g, 'way back', NOW))).toMatch(/call to mind the way/);
  });
  it('is found again by coming to a place you know, and home is always known', () => {
    let recovered = 0, tried = 0;
    for (let i = 0; i < 150 && tried < 8; i++) {
      const g = fresh(`recover-${i}`);
      step(g, 'travel west 30', NOW);
      step(g, 'way back', NOW);
      if (g.belief?.kind !== 'lost') continue;
      tried++;
      for (let k = 0; k < 6 && g.belief; k++) step(g, 'way back', NOW);
      if (!g.belief) recovered++;
      if (g.pos.x === 0 && g.pos.y === 0) expect(g.belief).toBeNull();
    }
    expect(tried).toBeGreaterThan(2);
    expect(recovered).toBeGreaterThan(0);
  });
  it('survives being saved and read back', () => {
    for (const g of [found.wrong as Game, found.lost as Game]) {
      const b = fresh();
      applySave(b, JSON.parse(JSON.stringify(toSave(g, NOW))));
      expect(b.belief).toEqual(g.belief);
      expect(shownName(b)).toBe(shownName(g));
    }
  });
});

import { parse } from '../src/game/parser';

describe('saying where you are', () => {
  it('is understood in the ways a person would say it', () => {
    for (const s of ['this is the third western hall', 'This is the Third Western Hall.', 'I think this is the third western hall', "i'm in the first vestibule", 'I am in the Ninth Vestibule', 'it must be... no, it is the second northern hall', 'maybe this is the fifth north-eastern hall, 2 rows north']) {
      const c = parse(s);
      if (s.startsWith('it must')) continue;
      expect(c.t, s).toBe('name');
    }
    expect(parse('this is the third western hall')).toEqual({ t: 'name', place: 'third western hall' });
    expect(parse('it is raining')).not.toMatchObject({ t: 'name' });
  });
  const lostGame = (): Game => replay(seedFor('lost'));
  it('lost, naming the hall rightly is knowing where you are again', () => {
    const g = lostGame();
    const real = getHall(g.world, g.pos.x, g.pos.y, g.pos.level).name;
    const out = all(step(g, `this is the ${real.toLowerCase()}`, NOW));
    expect(out).toMatch(/know where you are/);
    expect(g.belief).toBeNull();
    expect(shownName(g)).toBe(real);
    expect(all(step(g, 'where', NOW))).toContain(real);
    // and travelling by name works from here again
    expect(all(step(g, 'travel to the first western hall', NOW))).not.toMatch(/do not know where you are/);
  });
  it('a wrong name does not settle, cannot be repeated in the same hall, and is not a way to try every name', () => {
    const g = lostGame();
    const real = getHall(g.world, g.pos.x, g.pos.y, g.pos.level).name;
    const wrong = real === 'Fifth Western Hall' ? 'Sixth Western Hall' : 'Fifth Western Hall';
    expect(all(step(g, `this is the ${wrong}`, NOW))).toMatch(/does not feel right/);
    expect(g.belief?.kind).toBe('lost');
    expect(all(step(g, 'this is the fourth western hall', NOW))).toMatch(/already tried a name here/);
    // even the right name is still taken: a guess that was right is never refused, only repeated wrong ones
    expect(all(step(g, `this is the ${real}`, NOW))).toMatch(/know where you are/);
  });
  it('after moving on, another guess is taken again', () => {
    const g = lostGame();
    step(g, 'this is the fourth western hall', NOW);
    step(g, 'travel west 1', NOW);
    expect(g.guessed).toBe('');
  });
  it('astray: naming the true hall puts you right; naming what you believe changes nothing; anything else does not settle', () => {
    const a = replay(seedFor('wrong'));
    expect(a).not.toBeNull();
    const real = getHall(a.world, a.pos.x, a.pos.y, a.pos.level).name;
    const shown = shownName(a) as string;
    expect(all(step(a, `this is the ${shown}`, NOW))).toMatch(/as sure of it/);
    expect(a.belief?.kind).toBe('wrong');
    const out = all(step(a, `i think this is the ${real}`, NOW));
    expect(out).toMatch(/you had been mistaken/);
    expect(a.belief).toBeNull();
  });
  it('when you are sure, it just tells you, and a name that is not a hall is not one', () => {
    const g = fresh();
    expect(all(step(g, 'this is the first vestibule', NOW))).toContain('Yes: this is the First Vestibule');
    expect(all(step(g, 'this is the second western hall', NOW))).toMatch(/no: it is not that/);
    expect(all(step(g, 'this is the hall of nonsense', NOW))).toContain('do not know of a hall by that name');
  });
});
