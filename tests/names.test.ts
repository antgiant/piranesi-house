import { describe, expect, it } from 'vitest';
import { look, newGame, step, type Game, type Line } from '../src/game/game';
import { CAPACITY, DAY, FORGOTTEN, HOUR, MINUTE, SPACING, giveName, landmarkChance, rehearse, remembered, retention, type Named } from '../src/game/memory';
import { applySave, toSave } from '../src/game/save';
import { epithetFor } from '../src/world/epithets';
import { getHall } from '../src/world/hall';
import { withRoom } from '../src/web/urlstate';
import { createWorld } from '../src/world/world';

const spot = (x: number) => ({ x, y: 0, level: 1 as const });
const thing = (n: number) => ({ id: `t${n}`, kind: 'statue' as const, hall: spot(n) });

describe('how names are remembered', () => {
  it('fades if never used: most of it after a day, a third after three, gone in a week', () => {
    const list: Named[] = [];
    const r = giveName(list, thing(1), 'Old Horns', 0);
    expect(r.ok).toBe(true);
    const n = list[0] as Named;
    expect(retention(n, 0)).toBe(1);
    expect(retention(n, DAY)).toBeGreaterThan(0.65);
    expect(retention(n, DAY)).toBeLessThan(0.8);
    expect(retention(n, 3 * DAY)).toBeCloseTo(0.37, 1);
    expect(retention(n, 8 * DAY)).toBeLessThan(FORGOTTEN);
    expect(remembered(list, 8 * DAY)).toEqual([]);
  });
  it('lasts longer each time it is brought to mind after a decent interval, but not for being reminded again at once', () => {
    const list: Named[] = [];
    giveName(list, thing(1), 'Old Horns', 0);
    const n = list[0] as Named;
    const plain = retention(n, 6 * DAY);
    expect(rehearse(n, 2 * HOUR)).toBe(true);
    const s1 = n.stability;
    expect(rehearse(n, 2 * HOUR + 5 * MINUTE)).toBe(false); // too soon after: it counts as once
    expect(n.stability).toBe(s1);
    expect(rehearse(n, 6 * HOUR)).toBe(true);
    expect(n.stability).toBeGreaterThan(s1);
    expect(retention(n, 6 * HOUR + 6 * DAY)).toBeGreaterThan(plain * 3);
    // and used over weeks, it is kept for good
    let t = 6 * HOUR;
    for (let i = 0; i < 12; i++) { t += 2 * DAY; rehearse(n, t); }
    expect(retention(n, t + 60 * DAY)).toBeGreaterThan(0.5);
  });
  it('a name that has faded away is not brought back by being half-remembered', () => {
    const list: Named[] = [];
    giveName(list, thing(1), 'Old Horns', 0);
    const n = list[0] as Named;
    const stab = n.stability;
    rehearse(n, 30 * DAY);
    expect(n.stability).toBe(stab);
    expect(retention(n, 30 * DAY)).toBeLessThan(FORGOTTEN);
  });
  it('is crowded by naming a lot at once: the names after the fourth are fixed less well, and the ones before slip', () => {
    const list: Named[] = [];
    const strengths: number[] = [];
    for (let i = 0; i < 9; i++) { giveName(list, thing(i), `Name number ${i}`, i * MINUTE); strengths.push((list[list.length - 1] as Named).strength); }
    for (let i = 0; i < CAPACITY; i++) expect(strengths[i]).toBe(1);
    expect(strengths[CAPACITY + 2]).toBeLessThan(strengths[CAPACITY] as number);
    expect(strengths[8]).toBeLessThan(0.7);
    // the earliest of them has slipped as the others were added
    expect((list[0] as Named).strength).toBeLessThan(0.7);
    // spread over days, the same number of names are all kept
    const spaced: Named[] = [];
    for (let i = 0; i < 9; i++) giveName(spaced, thing(i), `Name number ${i}`, i * DAY);
    for (const n of spaced) expect(n.strength).toBe(1);
  });
  it('after a few hours of heavy naming, fewer names survive a day than the same number given over days', () => {
    const crowd: Named[] = [];
    for (let i = 0; i < 12; i++) giveName(crowd, thing(i), `Crowd ${i}`, i * MINUTE);
    const calm: Named[] = [];
    for (let i = 0; i < 12; i++) giveName(calm, thing(i), `Calm ${i}`, i * 4 * HOUR);
    // judge both a day after the last of them was given
    const keptCrowd = remembered(crowd, 12 * MINUTE + DAY).length;
    const keptCalm = remembered(calm, 12 * 4 * HOUR + DAY).length;
    expect(keptCrowd).toBeLessThan(12);
    expect(keptCrowd).toBeGreaterThan(0);
    expect(keptCalm).toBeGreaterThan(keptCrowd);
  });
  it('wants names to be yours alone', () => {
    const list: Named[] = [];
    giveName(list, thing(1), 'The Weeping Angel', 0);
    const r = giveName(list, thing(2), 'weeping angel', MINUTE);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.why).toBe('taken');
    expect(giveName(list, thing(1), 'Weeping Angel Again', HOUR).ok).toBe(true); // renaming the same thing is fine
    expect(giveName(list, thing(2), '  ', MINUTE).ok).toBe(false);
    expect(giveName(list, thing(2), 'x'.repeat(80), MINUTE).ok).toBe(false);
    // a forgotten name can be given again
    expect(giveName(list, thing(3), 'weeping angel again', 30 * DAY).ok).toBe(true);
  });
  it('is a landmark in proportion to how well it is remembered and what sort of thing it names', () => {
    const list: Named[] = [];
    giveName(list, { id: 'h', kind: 'hall', hall: spot(5) }, 'Hall of Weeping', 0);
    giveName(list, { id: 's', kind: 'statue', hall: spot(6) }, 'Old Horns', 0);
    giveName(list, { id: 'd', kind: 'door', hall: spot(7) }, 'The Squeak', 0);
    expect(landmarkChance(list, spot(5), 0).chance).toBeGreaterThan(0.9);
    expect(landmarkChance(list, spot(6), 0).chance).toBeLessThan(landmarkChance(list, spot(5), 0).chance);
    expect(landmarkChance(list, spot(7), 0).chance).toBeLessThan(landmarkChance(list, spot(6), 0).chance);
    expect(landmarkChance(list, spot(5), 2 * DAY).chance).toBeLessThan(landmarkChance(list, spot(5), 0).chance);
    expect(landmarkChance(list, spot(5), 30 * DAY).chance).toBe(0);
    expect(landmarkChance(list, spot(99), 0).chance).toBe(0);
  });
  it('is spaced: the spacing is half an hour', () => { expect(SPACING).toBe(30 * MINUTE); });
});

const NOW = Date.UTC(2026, 5, 10, 9, 0);
const all = (lines: Line[]): string => lines.map((l) => l.text).join('\n');
const fresh = (seed = 'the-house'): Game => { const g = newGame({ seed, walkPace: Infinity, relicDensity: 0, outsideTraces: false, knownOnly: true }, NOW); look(g, NOW); return g; };

describe('naming things in the House', () => {
  it('halls, statues, the stair and doors can be named, in the ways a person would say it', () => {
    const g = fresh();
    expect(all(step(g, 'call this hall the Hall of Weeping', NOW))).toContain('“Hall of Weeping”');
    expect(all(step(g, 'name the minotaur "Old Horns"', NOW))).toContain('“Old Horns”');
    expect(all(step(g, 'call the stair the Long Climb', NOW))).toContain('“Long Climb”');
    expect(all(step(g, 'call the north door Squeaker', NOW))).toContain('“Squeaker”');
    expect(g.names.map((n) => n.kind).sort()).toEqual(['door', 'hall', 'stair', 'statue']);
    const list = all(step(g, 'names', NOW));
    for (const w of ['Hall of Weeping', 'Old Horns', 'Long Climb', 'Squeaker']) expect(list).toContain(w);
    expect(all(step(g, 'call the elephant Trunk', NOW))).toContain('cannot tell what you mean');
    expect(all(step(g, 'call this hall', NOW))).toMatch(/cannot tell what you mean/);
  });
  it('refuses a name that is already another thing\'s, and says why', () => {
    const g = fresh();
    step(g, 'call this hall Weeping', NOW);
    expect(all(step(g, 'call the minotaur weeping', NOW))).toContain('already call something else');
  });
  it('can be named "it", the thing last looked at closely', () => {
    const g = fresh();
    step(g, 'examine minotaur', NOW);
    expect(all(step(g, 'call it Old Horns', NOW))).toContain('“Old Horns”');
    expect(g.names[0]?.kind).toBe('statue');
  });
  it('warns when too much is being named at once, and the names then do not hold', () => {
    const g = fresh();
    const outs: string[] = [];
    const targets = ['this hall', 'the minotaur', 'the stair', 'the north door', 'the east door', 'the south door', 'the west door'];
    targets.forEach((t, i) => outs.push(all(step(g, `call ${t} Name${i}x`, NOW + i * 1000))));
    expect(outs.slice(CAPACITY).join(' ')).toMatch(/so many things so quickly/);
    const kept = (): number => remembered(g.names, NOW / 1 + 8 * DAY - NOW + 0).length;
    void kept;
    expect(g.names.length).toBe(7);
    const weakest = Math.min(...g.names.map((n) => n.strength));
    expect(weakest).toBeLessThan(0.7);
  });
  it('is shown in the heading and in the glance while remembered, and goes when forgotten', () => {
    const g = fresh();
    step(g, 'call this hall the Hall of Weeping', NOW);
    expect(all(look(g, NOW, true))).toContain('which you call “Hall of Weeping”');
    expect(all(look(g, NOW + HOUR))).toMatch(/This is the place you call “Hall of Weeping”|which you call “Hall of Weeping”/);
    expect(all(look(g, NOW + 10 * DAY, true))).not.toContain('Hall of Weeping');
  });
  it('is taken back by travelling by the name you gave, and fades with the name', () => {
    const g = fresh();
    step(g, 'travel west 2', NOW);
    step(g, 'call this hall the Place of Two', NOW);
    step(g, 'home', NOW);
    expect(all(step(g, 'travel to the place of two', NOW + HOUR))).toMatch(/set out/);
    const old = fresh();
    step(old, 'travel west 2', NOW);
    step(old, 'call this hall the Place of Two', NOW);
    step(old, 'home', NOW);
    expect(all(step(old, 'travel to the place of two', NOW + 12 * DAY))).toMatch(/do not know of a place/);
  });
  it('is saved with the journey, memory and all', () => {
    const g = fresh();
    step(g, 'call this hall the Hall of Weeping', NOW);
    step(g, 'call the minotaur Old Horns', NOW);
    const b = fresh();
    applySave(b, JSON.parse(JSON.stringify(toSave(g, NOW))));
    expect(b.names).toEqual(g.names);
    expect(applySave(fresh(), { version: 1, pos: { x: 0, y: 0, level: 1 }, names: [{ id: 'x', kind: 'spaceship', name: 'n', key: 'n', hall: { x: 0, y: 0, level: 1 }, strength: 1, stability: 1, last: 0, born: 0, rehearsed: 0 }, 'junk', { id: 'ok', kind: 'hall', name: 'Fine', key: 'fine', hall: { x: 1, y: 1, level: 1 }, strength: 0.5, stability: 1000, last: 1, born: 1, rehearsed: 1, uses: 2 }] })).toBe(true);
  });
});

describe('names get you un-lost', () => {
  /** Games that end a way back lost, found once and replayed. */
  function lostGames(n: number): Game[] {
    const out: Game[] = [];
    for (let i = 0; i < 200 && out.length < n; i++) {
      const g = fresh(`landmark-${i}`);
      step(g, 'travel west 30', NOW);
      step(g, 'way back', NOW);
      if (g.belief?.kind === 'lost') out.push(g);
    }
    return out;
  }
  it('a landmark you named greatly raises the chance of recognising where you are', () => {
    // Lost, and stepping into a hall you have been in only once (so, by familiarity alone, you would not know it): with a name you gave
    // it, you usually do; without one, you do not.
    let withName = 0, without = 0;
    const N = 60;
    for (let i = 0; i < N; i++) {
      for (const named of [true, false]) {
        const g = fresh(`lm-${i}`);
        step(g, 'travel west 2', NOW);
        const prev = { x: g.pos.x, y: g.pos.y };
        step(g, 'travel west 1', NOW);
        const target = { x: g.pos.x, y: g.pos.y, level: g.pos.level };
        if (target.x !== prev.x - 1) continue; // the sea was across the way in this world
        g.pos = { x: prev.x, y: prev.y, level: 1, wall: null, pos: 500 };
        g.trail = []; g.visits.set(`1:${target.x},${target.y}`, 0);
        if (named) { const real = getHall(g.world, target.x, target.y, 1); g.names.push({ id: `hall:${real.id}`, kind: 'hall', name: 'Landmark', key: 'landmark', hall: target, strength: 1, stability: 3 * DAY, last: NOW, born: NOW, rehearsed: NOW, uses: 0 }); }
        g.belief = { kind: 'lost' };
        step(g, 'travel west 1', NOW + 1000);
        if (g.pos.x === target.x && g.belief === null) { if (named) withName++; else without++; }
      }
    }
    expect(withName).toBeGreaterThan(N * 0.6);
    expect(without).toBeLessThan(N * 0.15);
  });
  it('arriving among things you named, after a way back went wrong, you may know where you are, and are told what you named', () => {
    let told = '';
    for (const g of lostGames(6)) {
      // name what is here, in a calm moment, then step off and come back to it
      const real = getHall(g.world, g.pos.x, g.pos.y, g.pos.level);
      g.names.push({ id: `hall:${real.id}`, kind: 'hall', name: 'The Wrong Place', key: 'wrong place', hall: { x: g.pos.x, y: g.pos.y, level: g.pos.level }, strength: 1, stability: 3 * DAY, last: NOW, born: NOW, rehearsed: NOW, uses: 0 });
      const exits = g.exitsListed.length ? g.exitsListed : (look(g, NOW), g.exitsListed);
      const first = exits[0]!;
      step(g, `go ${first.index}`, NOW + 1000);
      for (let k = 0; k < 4 && g.belief; k++) {
        const back = g.exitsListed.find((e) => e.to.x === real.x && e.to.y === real.y);
        if (back) { const out = all(step(g, `go ${back.index}`, NOW + 2000 + k * 1000)); if (/The Wrong Place/.test(out)) told = out; }
      }
    }
    expect(told).toMatch(/you called “The Wrong Place”/);
  });
});

describe('narrative names', () => {
  const w = createWorld('the-house');
  it('every hall that has anything to say for itself has one, and the book\'s own places have the names the book gives them', () => {
    expect(epithetFor(w, getHall(w, 0, 0, 1))).toBe('the Hall of the Minotaurs');
    expect(epithetFor(w, getHall(w, -192, 0, 1))).toBe('the Hall of the Single Door');
    expect(epithetFor(w, getHall(w, -88, 0, 1))).toBe('the Hall of the Gulls');
    let some = 0, total = 0;
    const seen = new Set<string>();
    for (let x = -12; x <= 12; x++) for (let y = -6; y <= 6; y++) {
      const ep = epithetFor(w, getHall(w, x, y, 1));
      total++;
      if (ep) { some++; seen.add(ep); expect(ep).toMatch(/^the /i); expect(ep).not.toMatch(/\d/); }
    }
    expect(some / total).toBeGreaterThan(0.9);
    expect(seen.size).toBeGreaterThan(40);
  });
  it('is the same every time for the same hall', () => {
    for (const [x, y] of [[3, 5], [-7, 2], [12, -9]] as const) expect(epithetFor(w, getHall(w, x, y, 1))).toBe(epithetFor(w, getHall(w, x, y, 1)));
  });
  it('appears in the heading, and in the address beside the plain name, which alone finds the place', () => {
    const g = fresh();
    g.pos = { x: -1, y: 0, level: 1, wall: null, pos: 500 };
    const h = all(look(g, NOW, true));
    expect(h).toMatch(/^First Western Hall, the Hall of the Straining Giants/);
    const hash = withRoom('', w, { x: -1, y: 0, level: 1 }, 'the-house', 'the-house', 'the Hall of the Straining Giants');
    const q = new URLSearchParams(hash.slice(1));
    expect(q.get('room')).toBe('First Western Hall');
    expect(q.get('as')).toBe('the Hall of the Straining Giants');
    expect(withRoom(hash, w, { x: -1, y: 0, level: 1 }, 'the-house', 'the-house', null)).not.toContain('as=');
  });
  it('says nothing of a hall you cannot name', () => {
    const g = fresh();
    g.belief = { kind: 'lost' };
    expect(all(look(g, NOW, true))).not.toMatch(/the Hall of/);
  });
});
