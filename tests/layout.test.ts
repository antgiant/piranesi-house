import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { createWorld } from '../src/world/world';
import { ordinalWord, parseOrdinal } from '../src/world/words';
import {
  cellKind, cellName, exits, isOnRay, isVestibule, parseCellName, rayOf, vestibuleCell, vestibuleNumber, wallDoors,
  DARK_HALL,
  type Side,
} from '../src/world/layout';
import { Rng, hashInts } from '../src/world/rng';

const world = createWorld('test-seed');

describe('rng', () => {
  it('is deterministic and order-sensitive', () => {
    expect(hashInts(1, 2, 3)).toBe(hashInts(1, 2, 3));
    expect(hashInts(1, 2, 3)).not.toBe(hashInts(1, 3, 2));
    const a = new Rng(42);
    const b = new Rng(42);
    expect([a.u32(), a.u32(), a.int(100)]).toEqual([b.u32(), b.u32(), b.int(100)]);
  });
  it('spreads reasonably', () => {
    const r = new Rng(7);
    const buckets = new Array(10).fill(0);
    for (let i = 0; i < 20000; i++) buckets[r.int(10)]++;
    for (const n of buckets) expect(n).toBeGreaterThan(1700);
  });
});

describe('ordinals (book style)', () => {
  it('matches the forms used in the book', () => {
    expect(ordinalWord(1)).toBe('First');
    expect(ordinalWord(21)).toBe('Twenty-First');
    expect(ordinalWord(43)).toBe('Forty-Third');
    expect(ordinalWord(78)).toBe('Seventy-Eighth');
    expect(ordinalWord(192)).toBe('One-Hundred-and-Ninety-Second');
    expect(ordinalWord(768)).toBe('Seven-Hundred-and-Sixty-Eighth');
    expect(ordinalWord(960)).toBe('Nine-Hundred-and-Sixtieth');
  });
  it('round-trips 1..9999', () => {
    for (let i = 1; i <= 9999; i += 7) expect(parseOrdinal(ordinalWord(i))).toBe(i);
  });
});

describe('canon: layout facts', () => {
  it('the First Vestibule is the origin and a vestibule', () => {
    expect(cellKind(world, 0, 0)).toBe('vestibule');
    expect(cellName(world, 0, 0)).toBe('First Vestibule');
    expect(vestibuleNumber(world, 0, 0)).toBe(1);
  });
  it('the Ninth Vestibule is two halls west and north of the First (P-001)', () => {
    const c = vestibuleCell(world, 9)!;
    expect(c).toEqual({ x: -2, y: 1 });
    expect(cellName(world, c.x, c.y)).toBe('Ninth Vestibule');
  });
  it('the Second Southern Hall is two halls east of the Second South-Western Hall (P-003)', () => {
    const sw = parseCellName(world, 'Second South-Western Hall')!;
    const s = parseCellName(world, 'Second Southern Hall')!;
    expect(s.x - sw.x).toBe(2);
    expect(s.y).toBe(sw.y);
  });
  it('the 192nd Western Hall is the windowless dark hall with exactly one door', () => {
    expect(parseCellName(world, 'One-Hundred-and-Ninety-Second Western Hall')).toEqual(DARK_HALL);
    const all = exits(world, DARK_HALL.x, DARK_HALL.y);
    expect(all).toHaveLength(1);
    expect(all[0]!.side).toBe('E');
  });
  it('the dog-fox route works with the stated door counts (ROUTE-DOGFOX)', () => {
    // Leave the First Vestibule by its west door (the ordinary one, not the corridor door).
    const west = wallDoors(world, 0, 0, 'W').filter((d) => d.corridor === 0);
    expect(west).toHaveLength(1);
    let at = west[0]!.to;
    expect(cellName(world, at.x, at.y)).toBe('First Western Hall');
    // Heading west, the right-hand wall is north. Third door counting from the east end.
    const north = wallDoors(world, at.x, at.y, 'N').sort((a, b) => b.pos - a.pos);
    expect(north.length).toBeGreaterThanOrEqual(3);
    const entryPos = north[2]!.pos;
    at = north[2]!.to;
    expect(cellName(world, at.x, at.y)).toBe('First North-Western Hall');
    // Entered from the south at entryPos; heading west the left-hand wall is south.
    const south = wallDoors(world, at.x, at.y, 'S').filter((d) => d.pos < entryPos).sort((a, b) => b.pos - a.pos);
    const third = south[2]!;
    expect(third.corridor).toBeGreaterThan(0);
    expect(cellName(world, third.to.x, third.to.y)).toBe('Fourth Western Hall');
    // The statue's hall: north-western corner of the Fourth Western Hall is checked in the statue tests.
  });
  it('the First Vestibule opens to the First Northern, Western, Eastern halls and a corridor to the First South-Western (P-012)', () => {
    const names = exits(world, 0, 0).map((e) => `${e.corridor ? 'corridor:' : ''}${cellName(world, e.to.x, e.to.y)}`);
    for (const n of ['First Northern Hall', 'First Western Hall', 'First Eastern Hall', 'corridor:First South-Western Hall']) {
      expect(names).toContain(n);
    }
  });
});

describe('invariants', () => {
  it('vestibules never sit on a ray and the first ring is all halls', () => {
    for (let x = -40; x <= 40; x++) for (let y = -40; y <= 40; y++) {
      if (x === 0 && y === 0) continue;
      if (isVestibule(world, x, y)) expect(isOnRay(x, y)).toBe(false);
    }
  });
  it('about one cell in nine is a vestibule', () => {
    let v = 0;
    for (let x = -60; x < 60; x++) for (let y = -60; y < 60; y++) if (isVestibule(world, x, y)) v++;
    const share = v / (120 * 120);
    expect(share).toBeGreaterThan(0.08);
    expect(share).toBeLessThan(0.12);
  });
  it('names are unique and round-trip', () => {
    const seen = new Map<string, string>();
    for (let x = -45; x <= 45; x++) for (let y = -45; y <= 45; y++) {
      const n = cellName(world, x, y);
      expect(seen.has(n), `${n} duplicated at ${x},${y} and ${seen.get(n)}`).toBe(false);
      seen.set(n, `${x},${y}`);
      expect(parseCellName(world, n), n).toEqual({ x, y });
    }
  });
  it('vestibule numbering is stable as the search radius grows', () => {
    const first = vestibuleCell(world, 40)!;
    vestibuleCell(world, 3000);
    expect(vestibuleCell(world, 40)).toEqual(first);
    expect(vestibuleNumber(world, first.x, first.y)).toBe(40);
  });
  it('doors are reciprocal for ordinary neighbours', () => {
    fc.assert(fc.property(fc.integer({ min: -60, max: 60 }), fc.integer({ min: -60, max: 60 }), fc.constantFrom<Side>('N', 'E', 'S', 'W'), (x, y, side) => {
      const mine = wallDoors(world, x, y, side).filter((d) => d.corridor === 0);
      const nx = x + (side === 'E' ? 1 : side === 'W' ? -1 : 0);
      const ny = y + (side === 'N' ? 1 : side === 'S' ? -1 : 0);
      const opp = { N: 'S', S: 'N', E: 'W', W: 'E' }[side] as 'N' | 'S' | 'E' | 'W';
      const theirs = wallDoors(world, nx, ny, opp).filter((d) => d.corridor === 0);
      expect(mine.map((d) => d.pos)).toEqual(theirs.map((d) => d.pos));
    }), { numRuns: 400 });
  });
  it('rays partition the plane', () => {
    for (let x = -30; x <= 30; x++) for (let y = -30; y <= 30; y++) {
      if (x === 0 && y === 0) continue;
      expect(rayOf(x, y)).not.toBeNull();
    }
  });
});
