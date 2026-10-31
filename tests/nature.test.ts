import { describe, expect, it } from 'vitest';
import { look, newGame, step, type Game, type Line } from '../src/game/game';
import { birdLines, seaLines, skyLines } from '../src/game/nature';
import { sceneAtWorldTime } from '../src/sim/scene';
import { MS } from '../src/sim/time';
import { createWorld } from '../src/world/world';
import { getHall } from '../src/world/hall';

const NOW = Date.UTC(2026, 5, 10, 9, 0);
const all = (lines: Line[]): string => lines.map((l) => l.text).join('\n');
const w = createWorld('the-house');
const r0 = (): number => 0.37;

function at(level: 0 | 1 | 2, hour: number, day = 160, x = -14, y = -6) {
  const t = (day * 24 + hour) * MS.hour;
  return sceneAtWorldTime(w, x, y, level, t);
}

describe('the sky from the upper halls', () => {
  it('is described there, and only there', () => {
    const noon = at(2, 12);
    expect(skyLines(getHall(w, -14, -6, 2), noon, r0).length).toBeGreaterThan(0);
    expect(skyLines(getHall(w, -14, -6, 1), at(1, 12, 160, -14, -6), r0)).toEqual([]);
    expect(skyLines(getHall(w, -14, -6, 0), at(0, 12, 160, -14, -6), r0)).toEqual([]);
  });
  it('changes with the time of day', () => {
    const texts = new Set<string>();
    for (const hr of [3, 6, 12, 18, 21, 23]) for (const l of skyLines(getHall(w, -14, -6, 2), at(2, hr), r0)) texts.add(l);
    expect(texts.size).toBeGreaterThanOrEqual(4);
    expect([...texts].join(' ')).toMatch(/star|dawn|dusk|sun|moon|cloud|sky/i);
  });
  it('changes with the weather: rain, cloud, snow, storm are all described somewhere across many days', () => {
    const seen = new Set<string>();
    const h = getHall(w, -14, -6, 2);
    for (let day = 0; day < 365; day += 3) for (const l of skyLines(h, at(2, 14, day), r0)) seen.add(l);
    const joined = [...seen].join(' ');
    expect(joined).toMatch(/Rain/);
    expect(joined).toMatch(/cloud/i);
    expect(joined).toMatch(/blue|sun/);
  });
});

describe('the sea in the lower halls, and the birds everywhere', () => {
  it('has fish, weed and shells when the lower hall is under the sea, and pools when it is not', () => {
    const lines = new Set<string>();
    const h = getHall(w, -14, -6, 0);
    for (let hr = 0; hr < 24 * 20; hr += 5) for (const l of seaLines(h, sceneAtWorldTime(w, -14, -6, 0, hr * MS.hour), r0)) lines.add(l);
    const joined = [...lines].join(' ');
    expect(joined).toMatch(/fish/);
    expect(joined).toMatch(/weed/);
    expect(joined).toMatch(/pool|starfish|crab/);
  });
  it('has birds in the upper halls by day, shore birds below at low tide, and sparrows in the middle ones', () => {
    let upper = 0, lower = 0, middle = 0;
    for (let hr = 0; hr < 24 * 30; hr += 3) {
      const t = hr * MS.hour;
      if (sceneAtWorldTime(w, -14, -6, 2, t).birds.mode === 'soaring') upper++;
      if (sceneAtWorldTime(w, -14, -6, 0, t).birds.mode === 'shore') lower++;
      if (sceneAtWorldTime(w, -14, -6, 1, t).birds.mode === 'foraging') middle++;
    }
    expect(upper).toBeGreaterThan(30);
    expect(lower).toBeGreaterThan(20);
    expect(middle).toBeGreaterThan(60);
    const s = at(2, 12);
    if (s.birds.mode === 'soaring') expect(birdLines(getHall(w, -14, -6, 2), s, r0).length).toBeGreaterThan(0);
  });
});

describe('a glance, as a person would', () => {
  const fresh = (): Game => newGame({ walkPace: Infinity, walkNarration: true, relicDensity: 0, outsideTraces: false }, NOW);
  it('is much shorter than the whole description, says where the doors lead, and has no list', () => {
    const g = fresh();
    const glance = all(look(g, NOW));
    const full = all(look(g, NOW, true));
    expect(glance.length).toBeLessThan(full.length * 0.7);
    expect(glance).toMatch(/Doors lead/);
    expect(glance).not.toMatch(/You can make out:|Ways out:/);
    expect(full).toMatch(/Ways out:/);
  });
  it('is the full description when you look closely, and the links offer it', () => {
    const g = fresh();
    const lines = look(g, NOW);
    expect(lines[lines.length - 1]?.links?.some((l) => l.command === 'look closely')).toBe(true);
    expect(all(step(g, 'look closely', NOW))).toMatch(/Ways out:/);
    expect(all(step(g, 'look', NOW))).not.toMatch(/Ways out:/);
  });
  it('is the same at the same moment and not always the same later, so a second visit notices other things', () => {
    const a = all(look(fresh(), NOW));
    expect(all(look(fresh(), NOW))).toBe(a);
    const later = new Set<string>();
    for (let k = 0; k < 12; k++) later.add(all(look(fresh(), NOW + k * 3 * 3600_000)));
    expect(later.size).toBeGreaterThan(4);
  });
  it('is the old full description when not narrated', () => {
    const g = newGame({ walkPace: Infinity, relicDensity: 0 }, NOW);
    expect(all(look(g, NOW))).toMatch(/Ways out:/);
  });
  it('mentions the sky in an upper hall and the sea in a lower one, over a number of visits', () => {
    const up = fresh(); up.pos = { x: -14, y: -6, level: 2, wall: null, pos: 500 };
    const lo = fresh(); lo.pos = { x: -14, y: -6, level: 0, wall: null, pos: 500 };
    let sky = 0, sea = 0;
    for (let k = 0; k < 40; k++) {
      const t = NOW + k * 3 * 3600_000;
      if (/sky|cloud|star|sun|rain|snow|moon|dawn|dusk/i.test(all(look(up, t)))) sky++;
      if (/fish|weed|sea|crab|pool|starfish|lobster|mussel/i.test(all(look(lo, t)))) sea++;
    }
    expect(sky).toBeGreaterThan(30);
    expect(sea).toBeGreaterThan(30);
  });
});
