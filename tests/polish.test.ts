import { describe, expect, it } from 'vitest';
import { look, newGame, step, type Game, type Line } from '../src/game/game';
import { shorten, withArticle } from '../src/game/narrator';

const NOW = Date.UTC(2026, 5, 10, 9, 0);
const all = (lines: Line[]): string => lines.map((l) => l.text).join('\n');
const narrated = (): Game => newGame({ walkPace: Infinity, walkNarration: true, relicDensity: 0, outsideTraces: false }, NOW);

describe('saying things as a person would', () => {
  it('puts an article on a statue named the way notes name things', () => {
    expect(withArticle('Old man holding a model of a ship')).toBe('an old man holding a model of a ship');
    expect(withArticle('Winged horse and its colt')).toBe('a winged horse and its colt');
    expect(withArticle('Two laughing children, one holding a flute')).toBe('two laughing children, one holding a flute');
    expect(withArticle('The sphinx')).toBe('the sphinx');
  });
  it('cuts a long line at a clause, not mid-word', () => {
    const s = 'a larger-than-life cartographer, laughing with head thrown back, with an open hand and an empty palm, a snake coiled around the plinth; crusted with shellfish';
    const c = shorten(s, 100);
    expect(c.length).toBeLessThanOrEqual(104);
    expect(c.endsWith('...')).toBe(true);
    expect(c).not.toMatch(/\bwit\.\.\.$/);
    expect(shorten('short', 100)).toBe('short');
  });
  it('says "the" when you go through a door, and spells out small numbers', () => {
    const g = narrated();
    look(g, NOW);
    const out = all(step(g, 'go 1', NOW));
    expect(out).toMatch(/into the (First|Second)/);
    const f = newGame({ walkPace: Infinity, relicDensity: 0 }, NOW);
    f.pos = { x: 3, y: 5, level: 1, wall: null, pos: 500 };
    for (let x = -12; x <= 12; x++) { f.pos = { x, y: 0, level: 1, wall: null, pos: 500 }; expect(all(look(f, NOW))).not.toMatch(/\b[2-4] great staircases/); }
  });
  it('does not announce the same sea sound hall after hall', () => {
    const g = narrated();
    look(g, NOW);
    let count = 0;
    for (let i = 0; i < 6; i++) {
      const out = all(step(g, 'travel west 1', NOW + i * 1000));
      if (/Beneath the floor the sea breathes/.test(out)) count++;
    }
    expect(count).toBeLessThanOrEqual(2);
  });
  it('gives the First Vestibule its minotaurs in the glance, without numbering them', () => {
    let saw = 0;
    for (let k = 0; k < 20; k++) {
      const g = narrated();
      const txt = all(look(g, NOW + k * 3 * 3600_000));
      expect(txt).not.toMatch(/\d of 8/);
      expect(txt).not.toMatch(/Animals of every kind/);
      if (/minotaur/i.test(txt)) saw++;
    }
    expect(saw).toBeGreaterThan(5);
  });
  it('says how big the statues are once for a hall, and not again when looking again', () => {
    const g = narrated();
    g.pos = { x: 1, y: 1, level: 1, wall: null, pos: 500 };
    g.lastChar = '';
    const first = all(look(g, NOW));
    const rest = all(step(g, 'look', NOW + 1000)) + all(step(g, 'look', NOW + 2000));
    const phrase = /none of them higher than your shoulder|two or three times your height|towering six to nine metres|fifteen to twenty metres tall/g;
    const said = (first.match(phrase) ?? []).length + (rest.match(/The statues here are/g) ?? []).length;
    expect(said).toBeLessThanOrEqual(1);
  });
});

describe('help and mistakes', () => {
  it('lists what you can do, in groups', () => {
    const out = all(step(narrated(), 'help', NOW));
    for (const w of ['look closely', 'repeat', 'approach', 'travel to', 'mark', 'wander', 'stop']) expect(out).toContain(w);
  });
  it('suggests what a mistyped word probably meant', () => {
    const g = narrated();
    expect(all(step(g, 'lok', NOW))).toContain('Did you mean "look"');
    expect(all(step(g, 'lisen', NOW))).toContain('Did you mean "listen"');
    expect(all(step(g, 'xyzzyplugh', NOW))).not.toContain('Did you mean');
  });
});

describe('doors, as a person would say them', () => {
  it('on arrival says doors open in many directions, without counting them', () => {
    const g = narrated();
    const out = all(look(g, NOW));
    expect(out).toMatch(/Doors open in every direction|doors in all four walls|Door after door|Doors open in every wall|doors on every side|Each wall has its doors/);
    expect(out).not.toMatch(/\b(three|four|five|six|seven|eight) doors\b/);
    expect(out).not.toMatch(/\(\w+ doors\)/);
  });
  it('gives the count when you look out in a direction, with what lies through it', () => {
    const g = narrated();
    look(g, NOW);
    const north = all(step(g, 'look north', NOW + 1000));
    expect(north).toMatch(/Three doors open along the north wall|doors open|door opens/i);
    expect(north).toMatch(/(Through|Looking through) (it|the one nearest the middle)/);
    expect(all(step(g, 'look to the west', NOW + 2000))).toMatch(/west wall/);
    // a wall with no door says so
    const lonely = narrated();
    lonely.pos = { x: -192, y: 0, level: 1, wall: null, pos: 500 };
    expect(all(step(lonely, 'look west', NOW))).toMatch(/no door in the west wall/);
    expect(all(step(lonely, 'look east', NOW))).toMatch(/single door/);
  });
  it('offers a look in each direction, and the doors themselves once you have looked', () => {
    const g = narrated();
    const links = look(g, NOW).flatMap((l) => l.links ?? []).map((l) => l.command);
    expect(links).toContain('look north');
    const after = step(g, 'look north', NOW + 1000).flatMap((l) => l.links ?? []);
    expect(after.some((l) => /^go \d+$/.test(l.command))).toBe(true);
    expect(after.map((l) => l.label).join(' ')).toMatch(/north door/);
  });
  it('lets a vista run a long way: a long road of halls reads as a long vista', () => {
    const g = narrated();
    g.pos = { x: -3, y: 0, level: 1, wall: null, pos: 500 };
    expect(all(step(g, 'look west', NOW))).toMatch(/great vista of halls|several more halls|a hall or two more/);
  });
});
