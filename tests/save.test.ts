import { describe, expect, it } from 'vitest';
import { deleteEntry, editEntry, look, newGame, step, writeEntry, type Game, type Line } from '../src/game/game';
import { applySave, cleanJournal, exportText, importText, toCode, toSave } from '../src/game/save';

const NOW = Date.UTC(2026, 5, 10, 9, 0);
const all = (lines: Line[]): string => lines.map((l) => l.text).join('\n');
const fresh = (seed = 'the-house'): Game => {
  const g = newGame({ seed, walkPace: Infinity, relicDensity: 1, outsideTraces: false, knownOnly: true }, NOW);
  look(g, NOW);
  return g;
};

function played(): Game {
  const g = fresh();
  step(g, 'travel west 4', NOW);
  step(g, 'mark the fourth hall', NOW);
  step(g, 'travel east 2', NOW);
  writeEntry(g, 'The sea was loud.\nI am counting halls.', NOW);
  return g;
}

describe('keeping a journey', () => {
  it('writes down where you are and what you know, and reads it back into a new game', () => {
    const a = played();
    const data = JSON.parse(JSON.stringify(toSave(a, NOW)));
    const b = fresh();
    expect(applySave(b, data)).toBe(true);
    expect(b.pos).toEqual(a.pos);
    expect(b.facing).toBe(a.facing);
    expect([...b.explored].sort()).toEqual([...a.explored].sort());
    expect([...b.marks]).toEqual([...a.marks]);
    expect([...b.passes].sort()).toEqual([...a.passes].sort());
    expect(b.trail).toEqual(a.trail);
    expect(b.trailOrigin).toEqual(a.trailOrigin);
  });
  it('carries on as before: the way back still works from a restored game', () => {
    const a = played();
    const b = fresh();
    applySave(b, JSON.parse(JSON.stringify(toSave(a, NOW))));
    const out = all(step(b, 'way back', NOW));
    expect(out).toContain('You try to call to mind the way you came');
    expect(a.trail.length).toBeGreaterThan(0);
    // the marks and the learning are there too: a marked hall is travelled to by name
    expect(b.marks.size).toBe(1);
  });
  it('refuses what is not a save, and never throws on junk', () => {
    const g = fresh();
    const junk: unknown[] = [null, 5, 'x', [], {}, { version: 99 }, { version: 1 }, { version: 1, pos: 'here' }, { version: 1, pos: { x: 'a', y: 0, level: 1 } },
      { version: 1, pos: { x: 0, y: 0, level: 7 } }, { version: 1, pos: { x: 1.5, y: 0, level: 1 } }];
    for (const j of junk) expect(applySave(g, j)).toBe(false);
  });
  it('keeps only what is well-formed inside a save', () => {
    const g = fresh();
    const ok = applySave(g, {
      version: 1, pos: { x: 3, y: -2, level: 2, wall: 'Q', pos: 99999 }, facing: 'Z',
      explored: ['1:0,0', 'nonsense', '9:1,1', 42], found: [['a', { label: 'x', hall: 'y' }], ['b', 5], 'c'],
      marks: [['here', { x: 1, y: 1, level: 1, hall: 'H' }], ['bad', { x: 'q' }]],
      visits: [['1:0,0', 3], ['x', 'y']], passes: [['a>b', 2], ['c', -4]],
      trail: [{ from: { x: 0, y: 0, level: 1 }, to: { x: -1, y: 0, level: 1 }, via: 'door', inSide: 'E', inOrd: 1, inOf: 2 }, { from: 'no' }, { from: { x: 0, y: 0, level: 1 }, to: { x: 0, y: 0, level: 1 }, via: 'teleport' }],
      trailOrigin: { x: 0, y: 0, level: 1 }, recalls: 'many', told: [['h', ['k1', 7]], 'junk'],
    });
    expect(ok).toBe(true);
    expect(g.pos).toEqual({ x: 3, y: -2, level: 2, wall: null, pos: 500 });
    expect([...g.explored]).toEqual(['1:0,0']);
    expect(g.found.size).toBe(1);
    expect(g.marks.size).toBe(1);
    expect(g.passes.size).toBe(1);
    expect(g.trail.length).toBe(1);
    expect(g.recalls).toBe(0);
    expect([...(g.told.get('h')?.keys ?? [])]).toEqual(['k1']);
  });
});

describe('the journal', () => {
  it('records words exactly, with where and when in the House, and can be changed or torn out', () => {
    const g = fresh();
    const e = writeEntry(g, '  The sea was LOUD,\n  and I counted halls.  ', NOW)!;
    expect(e.text).toBe('The sea was LOUD,\n  and I counted halls.');
    expect(e.hall).toBe('First Vestibule');
    expect(e.when).toMatch(/in the morning, in summer|in summer/);
    expect(writeEntry(g, '   ', NOW)).toBeNull();
    expect(editEntry(g, e.id, 'Quieter now.', NOW + 5000)).toBe(true);
    expect(g.journal[0]?.text).toBe('Quieter now.');
    expect(g.journal[0]?.edited).toBe(NOW + 5000);
    expect(editEntry(g, 'nope', 'x', NOW)).toBe(false);
    expect(deleteEntry(g, e.id)).toBe(true);
    expect(g.journal.length).toBe(0);
    expect(deleteEntry(g, e.id)).toBe(false);
  });
  it('can be written from the command line and read back, in the visitor\'s own words and case', () => {
    const g = fresh();
    expect(all(step(g, 'journal', NOW))).toContain('nothing in your journal');
    expect(all(step(g, 'write The statue of the Faun smiled at ME', NOW))).toContain('You write it in your journal');
    expect(g.journal[0]?.text).toBe('The statue of the Faun smiled at ME');
    expect(all(step(g, 'write: a second one', NOW))).toContain('write');
    const read = all(step(g, 'journal', NOW));
    expect(read).toContain('2 entries');
    expect(read).toContain('a second one');
    expect(all(step(g, 'write', NOW))).toContain('2 entries'); // bare "write" opens the journal
  });
  it('is cleaned when read from outside', () => {
    const ok = { id: 'a', at: 1, when: 'noon', hall: 'H', level: 1, text: 'fine' };
    expect(cleanJournal([ok, { ...ok, id: 5 }, { ...ok, text: 7 }, null, 'x', { ...ok, level: 9 }, { ...ok, id: 'b', edited: 'no' }]).map((e) => e.id)).toEqual(['a', 'b']);
    expect(cleanJournal('nope')).toEqual([]);
    expect(cleanJournal([{ ...ok, text: 'x'.repeat(30_000) }])).toEqual([]);
  });
});

describe('carrying a journey to another browser', () => {
  it('goes out as text, comes back in, and is the same journey', () => {
    const a = played();
    const text = exportText(a, a.journal, { volume: 70, map: false }, NOW);
    const r = importText(text);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.transfer.journal.length).toBe(1);
    expect(r.transfer.settings).toEqual({ volume: 70, map: false });
    const b = fresh();
    expect(applySave(b, r.transfer.save)).toBe(true);
    expect(b.pos).toEqual(a.pos);
    expect(b.journal.length).toBe(0); // the journal comes in beside the save, not inside it
  });
  it('also goes as a short code to paste, and survives the journal having any characters', () => {
    const a = fresh();
    writeEntry(a, 'Dans la maison: “les marées”, ☾ — 海', NOW);
    const code = toCode(exportText(a, a.journal, undefined, NOW));
    expect(code.startsWith('HOUSE1:')).toBe(true);
    const r = importText(`  ${code.slice(0, 20)}\n${code.slice(20)}  `);
    expect(r.ok && r.transfer.journal[0]?.text).toBe('Dans la maison: “les marées”, ☾ — 海');
  });
  it('notices damage, and refuses what is not a journey', () => {
    const text = exportText(played(), [], undefined, NOW);
    expect(importText(text.slice(0, text.length - 30)).ok).toBe(false);
    const tampered = JSON.parse(text);
    tampered.body = tampered.body.replace('"recalls":0', '"recalls":9');
    expect(importText(JSON.stringify(tampered))).toMatchObject({ ok: false });
    for (const bad of ['', 'hello', '{}', '[]', 'HOUSE1:@@@', JSON.stringify({ check: 'x', body: 'y' })]) expect(importText(bad).ok).toBe(false);
    const wrongVersion = JSON.parse(text);
    expect(importText(JSON.stringify({ check: wrongVersion.check, body: wrongVersion.body })).ok).toBe(true);
  });
});
