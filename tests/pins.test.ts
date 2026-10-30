import { describe, expect, it } from 'vitest';
import { createWorld } from '../src/world/world';
import { cellKind, cellName, parseCellName, vestibuleCell, vestibuleNumber, wallDoors, type Cell } from '../src/world/layout';
import { shortestRooms } from '../src/world/path';
import { getHall } from '../src/world/hall';

const cheb = (a: Cell, b: Cell) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
const adjacent = (a: Cell, b: Cell) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;

describe.each(['test-seed', 'another', 'the-house'])('rooms the book locates relative to one another (%s)', (seed) => {
  const w = createWorld(seed);
  const hall = (name: string) => {
    const c = parseCellName(w, name);
    if (!c) throw new Error(`no such room: ${name}`);
    return c;
  };
  const vest = (n: number) => vestibuleCell(w, n)!;
  const hasDoor = (a: Cell, b: Cell) =>
    (['N', 'E', 'S', 'W'] as const).some((s) => wallDoors(w, a.x, a.y, s).some((d) => d.corridor === 0 && d.to.x === b.x && d.to.y === b.y));

  it('the Ninth Vestibule is two halls west and north of the First (P-001)', () => {
    const c = vest(9);
    expect(c.x).toBeLessThan(0);
    expect(c.y).toBeGreaterThan(0);
    expect(cheb(c, { x: 0, y: 0 })).toBe(2);
  });

  it('the Twenty-Second Vestibule is five halls south and west of the First (P-002)', () => {
    const c = vest(22);
    expect(c.x).toBeLessThan(0);
    expect(c.y).toBeLessThan(0);
    expect(cheb(c, { x: 0, y: 0 })).toBe(5);
  });

  it('the Sixth Vestibule feeds the Second Southern Hall, which is two east of the Second South-Western (P-003, P-006)', () => {
    const southern = hall('Second Southern Hall');
    expect(adjacent(vest(6), southern)).toBe(true);
    expect(hasDoor(southern, vest(6))).toBe(true);
    const sw = hall('Second South-Western Hall');
    expect(southern.x - sw.x).toBe(2);
    expect(southern.y).toBe(sw.y);
  });

  it('the Tenth and Twelfth Vestibules both flood the Eighth Northern Hall (P-005)', () => {
    const e = hall('Eighth Northern Hall');
    expect(adjacent(vest(10), e)).toBe(true);
    expect(adjacent(vest(12), e)).toBe(true);
    expect(hasDoor(e, vest(10))).toBe(true);
    expect(hasDoor(e, vest(12))).toBe(true);
  });

  it('a swept-away man is carried seven halls, from the Eighth Northern to the Third Western Hall (P-004)', () => {
    expect(cheb(hall('Eighth Northern Hall'), hall('Third Western Hall'))).toBe(7);
  });

  it('the Sixth North-Western Hall lies beside the Twenty-Fourth Vestibule, the Eighteenth beyond it (P-011)', () => {
    const six = hall('Sixth North-Western Hall');
    const v = vest(24);
    const eighteen = hall('Eighteenth North-Western Hall');
    expect(adjacent(six, v)).toBe(true);
    expect(adjacent(v, eighteen)).toBe(true);
    // on opposite sides: they are collinear with the vestibule between them
    expect(six.x - v.x).toBe(v.x - eighteen.x);
    expect(six.y - v.y).toBe(v.y - eighteen.y);
    expect(hasDoor(six, v)).toBe(true);
    expect(hasDoor(v, eighteen)).toBe(true);
  });

  it('the Sixth North-Western Hall is the thirteenth room from the First Vestibule (P-010)', () => {
    expect(shortestRooms(w, { x: 0, y: 0 }, hall('Sixth North-Western Hall'))).toBe(13);
  });

  it('the Fifth and Fourth North-Western Halls share a door, where the Faun stands', () => {
    const five = hall('Fifth North-Western Hall');
    const four = hall('Fourth North-Western Hall');
    expect(adjacent(five, four)).toBe(true);
    expect(hasDoor(five, four)).toBe(true);
  });

  it('the pinned rooms have the right kinds, and the swapped names still round-trip', () => {
    for (const n of [6, 9, 10, 12, 22, 24]) {
      const c = vest(n);
      expect(cellKind(w, c.x, c.y)).toBe('vestibule');
      expect(vestibuleNumber(w, c.x, c.y)).toBe(n);
    }
    for (const name of ['Sixth North-Western Hall', 'Eighteenth North-Western Hall', 'Fourth North-Western Hall', 'Third Western Hall']) {
      const c = hall(name);
      expect(cellKind(w, c.x, c.y)).toBe('hall');
      expect(cellName(w, c.x, c.y)).toBe(name);
    }
  });

  it('the rooks nest in the Sixth North-Western Hall, wherever it ended up', () => {
    const c = hall('Sixth North-Western Hall');
    expect(getHall(w, c.x, c.y).tags).toContain('rook-flock');
  });
});
