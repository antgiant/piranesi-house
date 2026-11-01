import { describe, expect, it } from 'vitest';
import { ATTRIBUTES, COMPANIONS_SOLITARY, COMPANIONS_WITH, FIGURES, POSES, THEMES } from '../src/data/catalogue';
import { KIND_LISTS } from '../src/data/kindlists';
import { getHall } from '../src/world/hall';
import { hallStatues } from '../src/world/slots';
import { signature } from '../src/world/statues';
import { createWorld } from '../src/world/world';

// Anything after about the end of the eighteenth century, or any machine of ours, has no place in the House.
const MODERN = /\b(phone|computer|car|cars|gun|plastic|wire|bottle|camera|television|radio|bicycle|engine|battery|railway|aeroplane|airplane|aircraft|rocket|submarine|tank|machine-gun|revolver|rifle|bomb|grenade|telegraph|photograph|electric|electricity|steam|steamship|locomotive|tractor|motor|robot|nurse|policeman|soldier of the war|astronaut|factory)\b/i;

const lists = [
  ...FIGURES.map((f) => f.label),
  ...Object.values(POSES).flat(),
  ...ATTRIBUTES,
  ...COMPANIONS_SOLITARY,
  ...COMPANIONS_WITH,
  ...Object.values(KIND_LISTS).flatMap((l) => [...l.poses, ...l.attributes, ...l.solitary, ...l.withs]),
];

describe('the catalogue of figures', () => {
  it('is large, and every figure has a unique id and label', () => {
    expect(FIGURES.length).toBeGreaterThan(600);
    expect(new Set(FIGURES.map((f) => f.id)).size).toBe(FIGURES.length);
    expect(new Set(FIGURES.map((f) => f.label.toLowerCase())).size).toBe(FIGURES.length);
  });
  it('covers every theme with plenty to choose from', () => {
    for (const t of THEMES) expect(FIGURES.filter((f) => f.themes.includes(t)).length, t).toBeGreaterThanOrEqual(30);
  });
  it('has people, creatures, spirits and made things, each in good number', () => {
    for (const k of ['human', 'animal', 'mythic', 'object'] as const) expect(FIGURES.filter((f) => f.kind === k).length, k).toBeGreaterThanOrEqual(60);
  });
  it('keeps the original figures that other rules refer to', () => {
    for (const id of ['giant', 'river-god', 'cyclops', 'triton', 'north-wind']) expect(FIGURES.some((f) => f.id === id), id).toBe(true);
  });
  it('has nothing modern anywhere in the wording (S-R09)', () => {
    for (const s of lists) expect(s, s).not.toMatch(MODERN);
  });
  it('gives each non-person kind enough poses, attributes and companions, all distinct', () => {
    for (const [k, l] of Object.entries(KIND_LISTS)) {
      expect(l.poses.length, `${k} poses`).toBeGreaterThanOrEqual(12);
      expect(l.attributes.length, `${k} attributes`).toBeGreaterThanOrEqual(32);
      expect(l.solitary.length + l.withs.length, `${k} companions`).toBeGreaterThanOrEqual(12);
      for (const arr of [l.poses, l.attributes, [...l.solitary, ...l.withs]]) expect(new Set(arr).size).toBe(arr.length);
    }
  });
});

describe('statues drawn from the wider cast', () => {
  const w = createWorld('test-seed');
  const cells: [number, number, 0 | 1 | 2][] = [[3, 5, 1], [-7, 2, 1], [12, -9, 1], [0, 0, 1], [20, 20, 2], [-4, 8, 0], [1, 1, 1], [-30, 11, 1]];
  it('show many different figures in one hall, from every kind, and are all unique', () => {
    for (const [x, y, l] of cells) {
      const h = getHall(w, x, y, l);
      const ss = hallStatues(w, h);
      if (ss.length < 100 || h.regions.drowned) continue;
      const figs = new Set(ss.map((s) => s.figure));
      expect(figs.size, h.name).toBeGreaterThan(20);
      expect(new Set(ss.map(signature)).size, `unique in ${h.name}`).toBe(ss.length);
    }
  });
  it('never describe a thing with a person\'s pose, nor a person with a thing\'s', () => {
    const personPoses = new Set(Object.values(POSES).flat());
    const thingPoses = new Set(Object.values(KIND_LISTS).flatMap((l) => l.poses));
    const kindOf = new Map(FIGURES.map((f) => [f.label, f.kind]));
    for (const [x, y, l] of cells) {
      const h = getHall(w, x, y, l);
      if (h.regions.drowned) continue;
      for (const s of hallStatues(w, h)) {
        if (s.canonId) continue;
        const kind = kindOf.get(s.figure);
        if (kind === 'object') expect(personPoses.has(s.pose), `${s.figure}: ${s.pose}`).toBe(false);
        if (kind === 'human') expect(thingPoses.has(s.pose), `${s.figure}: ${s.pose}`).toBe(false);
      }
    }
  });
});

import { listsFor, subOf, SUB_KINDS } from '../src/data/sublists';

describe('wording that fits what is carved', () => {
  it('has a full set of phrases for every sort of subject, all distinct', () => {
    for (const s of SUB_KINDS) {
      const l = listsFor(s);
      expect(l.poses.length, `${s} poses`).toBeGreaterThanOrEqual(12);
      expect(l.attributes.length, `${s} attributes`).toBeGreaterThanOrEqual(24);
      expect(l.solitary.length + l.withs.length, `${s} companions`).toBeGreaterThanOrEqual(12);
      for (const arr of [l.poses, l.attributes, [...l.solitary, ...l.withs]]) expect(new Set(arr).size, s).toBe(arr.length);
      for (const p of [...l.poses, ...l.attributes, ...l.solitary, ...l.withs]) expect(p, p).not.toMatch(MODERN);
    }
  });
  it('sorts the catalogue sensibly', () => {
    const sub = (label: string): string => subOf(FIGURES.find((f) => f.label === label)!);
    expect(sub('heron')).toBe('bird');
    expect(sub('dolphin')).toBe('sea');
    expect(sub('bee')).toBe('insect');
    expect(sub('tortoise')).toBe('reptile');
    expect(sub('lion')).toBe('beast');
    expect(sub('galleon under full sail')).toBe('vessel');
    expect(sub('trebuchet')).toBe('weapon');
    expect(sub('harp')).toBe('instrument');
    expect(sub('coach and four')).toBe('vehicle');
    expect(sub('lighthouse')).toBe('construction');
    expect(sub('forge bellows')).not.toBe('instrument');
  });
  it('never gives a bird a paw or a ship a coat: every statue\'s words come from its own sort of subject', () => {
    const w = createWorld('test-seed');
    const personPoses = new Set(Object.values(POSES).flat());
    const personAttrs = new Set(ATTRIBUTES);
    let checked = 0;
    for (const [x, y] of [[3, 5], [-7, 2], [12, -9], [0, 0], [-4, 8], [9, 1]] as const) {
      const h = getHall(w, x, y, 1);
      if (h.regions.drowned) continue;
      for (const s of hallStatues(w, h)) {
        if (s.canonId) continue;
        const fig = FIGURES.find((f) => f.label === s.figure)!;
        const sb = subOf(fig);
        if (sb === 'human') { expect(personPoses.has(s.pose) || s.pose !== '', s.pose).toBe(true); continue; }
        const l = listsFor(sb);
        expect(l.poses.includes(s.pose), `${s.figure} (${sb}): ${s.pose}`).toBe(true);
        expect(l.attributes.includes(s.attribute), `${s.figure} (${sb}): ${s.attribute}`).toBe(true);
        expect([...l.solitary, ...l.withs].includes(s.companion), `${s.figure} (${sb}): ${s.companion}`).toBe(true);
        expect(personAttrs.has(s.attribute) && sb !== 'mythic' && sb !== 'beast' && sb !== 'tool', `${s.figure}: ${s.attribute}`).toBe(false);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(300);
  });
});
