import { describe, expect, it } from 'vitest';
import { look, newGame, step, tick, type Game, type Line } from '../src/game/game';
import { getHall } from '../src/world/hall';
import { flourishesFor } from '../src/world/flourishes';
import { createWorld } from '../src/world/world';

const NOW = Date.UTC(2026, 5, 10, 9, 0);
const all = (lines: Line[]): string => lines.map((l) => l.text).join('\n');
const narrated = (pace = 1): Game => {
  const g = newGame({ walkPace: pace, relicDensity: 0, outsideTraces: false, walkNarration: true }, NOW);
  look(g, NOW);
  return g;
};
const MODERN = /\b(phone|computer|car|gun|plastic|wire|bottle|camera|television|radio|bicycle|engine|battery|electric|steam|machine)\b/i;

describe('walking, narrated', () => {
  it('does not give distances or times', () => {
    const g = narrated();
    const out = all(step(g, 'go west', NOW));
    expect(out).toMatch(/You set off for the west door\./);
    expect(out).not.toMatch(/metres|minutes|seconds|It will take|hours/);
    expect(all(step(g, 'look', NOW + 1000))).not.toMatch(/to go|% of the way/);
    // no time in the journey intro either
    const h = narrated();
    const j = all(step(h, 'travel west 4', NOW));
    expect(j).toMatch(/You set out for/);
    expect(j).not.toMatch(/minutes|hours|halls away|on foot at your pace/);
    expect(all(step(narrated(), 'down', NOW))).not.toMatch(/minutes|in all/);
  });
  it('describes what is passed, several times along a long walk, with some silences', () => {
    const g = narrated();
    step(g, 'go west', NOW);
    const w = g.walk!;
    const slots = w.beats.length;
    expect(slots).toBeGreaterThanOrEqual(3);
    // every beat is spaced out, and none comes in the first few seconds
    const times = w.beats.map((b) => b.atMs - w.startMs);
    expect(times[0]!).toBeGreaterThanOrEqual(4900);
    for (let i = 1; i < times.length; i++) expect(times[i]! - times[i - 1]!).toBeGreaterThan(2000);
    const said: string[] = [];
    for (let t = NOW; t <= w.endMs; t += 1000) said.push(...tick(g, t).map((l) => l.text));
    const beats = said.filter((s) => !/^You go through|^You set off/.test(s) && s.length < 700);
    expect(beats.length).toBeGreaterThanOrEqual(3);
    expect(new Set(beats).size).toBe(beats.length);
    for (const b of beats) expect(b).not.toMatch(/About halfway|metres away/);
  });
  it('at a brisk pace says little or nothing, since the walk is over so soon', () => {
    const g = narrated(10);
    step(g, 'go west', NOW);
    expect(g.walk === null || g.walk.beats.length <= 1).toBe(true);
  });
  it('is the same walk described the same way', () => {
    const a = narrated(); step(a, 'go west', NOW);
    const b = narrated(); step(b, 'go west', NOW);
    expect(a.walk!.beats.map((x) => x.text)).toEqual(b.walk!.beats.map((x) => x.text));
  });
  it('is the old note and countdown when not narrated', () => {
    const g = newGame({ walkPace: 1, relicDensity: 0, outsideTraces: false }, NOW);
    look(g, NOW);
    expect(all(step(g, 'go west', NOW))).toMatch(/It will take/);
  });
});

describe('flourishes', () => {
  it('have stairs in only a minority of halls, and each level has things of its own', () => {
    const w2 = createWorld('the-house');
    let stairs = 0, halls = 0;
    for (let x = -15; x <= 15; x++) for (let y = -8; y <= 8; y++) {
      const h = getHall(w2, x, y, 1);
      if (h.tags.includes('dark-hall') || h.tags.includes('drowned')) continue;
      halls++;
      if (flourishesFor(w2, h).some((z) => z.fam === 'stairs')) stairs++;
    }
    expect(stairs / halls).toBeLessThan(0.3);
    expect(stairs / halls).toBeGreaterThan(0.05);
    const upper = new Set<string>(), lower = new Set<string>();
    for (let x = -8; x <= 8; x++) for (let y = -5; y <= 5; y++) {
      for (const z of flourishesFor(w2, getHall(w2, x, y, 2))) upper.add(z.kind);
      for (const z of flourishesFor(w2, getHall(w2, x, y, 0))) lower.add(z.kind);
    }
    expect([...upper].some((k) => k === 'open-roof' || k === 'roof-beams-sky' || k === 'parapet-clouds')).toBe(true);
    expect([...lower].some((k) => k === 'sea-arches' || k === 'tide-notches' || k === 'barnacle-piers')).toBe(true);
    expect([...lower].some((k) => k === 'open-roof')).toBe(false);
    expect([...upper].some((k) => k === 'sea-arches')).toBe(false);
  });
  const w = createWorld('the-house');
  it('are deterministic, a few per hall, and appear in the description', () => {
    let some = 0;
    for (let x = -12; x <= 12; x++) for (let y = -6; y <= 6; y++) {
      const h = getHall(w, x, y, 1);
      const f = flourishesFor(w, h);
      expect(flourishesFor(w, h)).toBe(f);
      if (h.tags.includes('dark-hall') || h.tags.includes('drowned')) { expect(f.length).toBe(0); continue; }
      expect(f.length).toBeGreaterThanOrEqual(3);
      expect(f.length).toBeLessThanOrEqual(6);
      expect(new Set(f.map((z) => z.kind)).size).toBe(f.length);
      expect(f.filter((z) => z.fam === 'stairs').length).toBeLessThanOrEqual(1);
      if (h.kind === 'vestibule') expect(f.some((z) => z.fam === 'stairs')).toBe(false);
      for (const z of f) { expect(z.text).not.toMatch(MODERN); expect(z.pass).not.toMatch(MODERN); expect(z.heightM).toBeLessThanOrEqual(h.heightM); some++; }
    }
    expect(some).toBeGreaterThan(500);
    const g = newGame({ walkPace: Infinity }, NOW);
    expect(all(look(g, NOW))).toContain('Above the statues the building does stranger things.');
  });
  it('differ from hall to hall: many different kinds are seen', () => {
    const kinds = new Set<string>();
    for (let x = -10; x <= 10; x++) for (let y = -5; y <= 5; y++) for (const f of flourishesFor(w, getHall(w, x, y, 1))) kinds.add(f.kind);
    expect(kinds.size).toBeGreaterThanOrEqual(100);
  });
});
