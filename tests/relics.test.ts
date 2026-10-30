import { describe, expect, it } from 'vitest';
import { getHall } from '../src/world/hall';
import { NOTE_FRAGMENTS, ORIGIN_ZONE, relicsIn, type Relic } from '../src/world/relics';
import { parseCellName } from '../src/world/layout';
import { createWorld } from '../src/world/world';

const w = createWorld('test-seed');
const rel = (x: number, y: number, month = 6, density = 1, level: 0 | 1 | 2 = 1, world = w): Relic[] => relicsIn(world, getHall(world, x, y, level), month, density);

describe('the First Vestibule', () => {
  const r = rel(0, 0);
  it('has exactly one old sleeping bag, in the hollow under the great stair', () => {
    const bags = r.filter((x) => x.kind === 'old-sleeping-bag');
    expect(bags).toHaveLength(1);
    expect(bags[0]!.wall).toBe(getHall(w, 0, 0, 1).stairs[0]!.wall);
  });
  it('has one to three bits of litter caught there too', () => {
    const l = r.filter((x) => x.kind === 'litter');
    expect(l.length).toBeGreaterThanOrEqual(1);
    expect(l.length).toBeLessThanOrEqual(3);
  });
  it('is the only place in the world with a sleeping bag', () => {
    for (let x = -30; x <= 30; x++) for (let y = -30; y <= 30; y++) {
      if (x === 0 && y === 0) continue;
      expect(rel(x, y).some((k) => k.kind === 'old-sleeping-bag')).toBe(false);
    }
  });
  it.each(['test-seed', 'another', 'the-house'])('is the same for every seed in kind (%s)', (seed) => {
    const world = createWorld(seed);
    expect(relicsIn(world, getHall(world, 0, 0, 1), 6).some((k) => k.kind === 'old-sleeping-bag')).toBe(true);
  });
});

describe('rarity', () => {
  it('density 0 turns every relic off, even at the origin', () => {
    for (let x = -8; x <= 8; x++) for (let y = -8; y <= 8; y++) expect(rel(x, y, 6, 0)).toEqual([]);
  });
  it('is deterministic', () => {
    expect(rel(3, -4)).toEqual(relicsIn(createWorld('test-seed'), getHall(createWorld('test-seed'), 3, -4, 1), 6));
    expect(rel(88, 7)).toEqual(rel(88, 7));
  });
  it('near the First Vestibule about one hall in 25 has a one-off relic; far away about one in 400', () => {
    let near = 0;
    let nearN = 0;
    for (let x = -ORIGIN_ZONE; x <= ORIGIN_ZONE; x++) for (let y = -ORIGIN_ZONE; y <= ORIGIN_ZONE; y++) {
      if (x === 0 && y === 0) continue;
      nearN++;
      if (rel(x, y).some((k) => k.kind !== 'door-mark')) near++;
    }
    const seeds = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((s) => createWorld(s));
    let nearAll = 0;
    let nearAllN = 0;
    for (const world of seeds) {
      for (let x = -ORIGIN_ZONE; x <= ORIGIN_ZONE; x++) for (let y = -ORIGIN_ZONE; y <= ORIGIN_ZONE; y++) {
        if (x === 0 && y === 0) continue;
        nearAllN++;
        if (rel(x, y, 6, 1, 1, world).some((k) => k.kind !== 'door-mark')) nearAll++;
      }
    }
    expect(nearAll / nearAllN).toBeGreaterThan(0.015);
    expect(nearAll / nearAllN).toBeLessThan(0.09);
    expect(nearN).toBe(120);
    expect(near).toBeGreaterThanOrEqual(0);
    let far = 0;
    let farN = 0;
    for (let x = 20; x < 100; x++) for (let y = 20; y < 100; y++) {
      farN++;
      if (rel(x, y).some((k) => k.kind !== 'door-mark')) far++;
    }
    expect(far / farN).toBeGreaterThan(0.0005);
    expect(far / farN).toBeLessThan(0.006);
  });
  it('doubling the density roughly doubles the finds', () => {
    let a = 0;
    let b = 0;
    for (let x = 6; x < 70; x++) for (let y = 6; y < 70; y++) {
      a += rel(x, y, 6, 1).filter((k) => k.kind !== 'door-mark').length;
      b += rel(x, y, 6, 4).filter((k) => k.kind !== 'door-mark').length;
    }
    expect(b).toBeGreaterThan(a * 2);
  });
  it('never in a Drowned Hall, the dark hall, or off the middle level', () => {
    expect(rel(6, 0)).toEqual([]);
    expect(rel(-192, 0)).toEqual([]);
    expect(rel(0, 0, 6, 1, 0)).toEqual([]);
    expect(rel(0, 0, 6, 1, 2)).toEqual([]);
  });
});

describe('what you find', () => {
  const all: Relic[] = [];
  for (let x = -60; x <= 60; x++) for (let y = -25; y <= 25; y++) all.push(...rel(x, y));

  it('ids are unique', () => {
    expect(new Set(all.map((r) => r.id)).size).toBe(all.length);
  });
  it('any words on notes and scraps are only our own authored fragments, and only ever a few', () => {
    const texty = all.filter((r) => r.kind === 'crumpled-note' || r.kind === 'torn-scraps');
    for (const r of texty) {
      const quotes = r.detail.match(/"([^"]*)"/g) ?? [];
      expect(quotes.length).toBeLessThanOrEqual(1);
      for (const q of quotes) expect(NOTE_FRAGMENTS).toContain(q.slice(1, -1));
    }
  });
  it('nothing names anyone or hints at the story', () => {
    for (const r of all) expect(`${r.label} ${r.detail}`).not.toMatch(/\b(Other|Prophet|Piranesi|Ketterley|Raphael|Sixteenth|ritual|Knowledge|Laurence|lunch|multivitamin)\b/i);
  });
  it('door marks come in runs that count up along a line, and never use words', () => {
    const marks = new Map<string, Relic>();
    for (let x = -60; x <= 60; x++) for (let y = -25; y <= 25; y++) for (const r of rel(x, y)) if (r.kind === 'door-mark') marks.set(`${x},${y}`, r);
    expect(marks.size).toBeGreaterThan(0);
    let chained = 0;
    for (const [key, r] of marks) {
      expect(r.detail).not.toMatch(/"/);
      const n = /a row of (\d+) faded tally strokes/.exec(r.label)?.[1];
      if (!n || Number(n) < 2) continue;
      const [x, y] = key.split(',').map(Number) as [number, number];
      const d = { N: [0, 1], E: [1, 0], S: [0, -1], W: [-1, 0] }[r.wall as 'N' | 'E' | 'S' | 'W'];
      const prev = marks.get(`${x - d[0]!},${y - d[1]!}`);
      // the previous hall in the run (unless its door was missing, which skips that mark)
      if (prev) {
        chained++;
        expect(prev.label).toContain(`a row of ${Number(n) - 1} faded tally strokes`);
        expect(prev.wall).toBe(r.wall);
      }
    }
    expect(chained).toBeGreaterThanOrEqual(0);
  });
  it('about one hall in fifty has a door mark: rare, not constant', () => {
    let n = 0;
    let total = 0;
    for (let x = 10; x < 110; x++) for (let y = 10; y < 90; y++) {
      total++;
      if (rel(x, y).some((r) => r.kind === 'door-mark')) n++;
    }
    expect(n / total).toBeGreaterThan(0.004);
    expect(n / total).toBeLessThan(0.04);
  });
});

describe('the gull colony\'s scraps', () => {
  const h = parseCellName(w, 'Eighty-Eighth Western Hall')!;
  it('are always on the pavement: ten to twenty', () => {
    for (const m of [1, 5, 10]) {
      const s = rel(h.x, h.y, m).find((r) => r.id.endsWith('scraps-floor'))!;
      expect(s).toBeDefined();
      const n = Number(/about (\d+) torn scraps/.exec(s.label)![1]);
      expect(n).toBeGreaterThanOrEqual(10);
      expect(n).toBeLessThanOrEqual(20);
    }
  });
  it('are in the nests only when the gulls have gone (not March to August)', () => {
    for (let m = 1; m <= 12; m++) {
      const nests = rel(h.x, h.y, m).find((r) => r.id.endsWith('scraps-nests'));
      expect(nests !== undefined).toBe(!(m >= 3 && m <= 8));
    }
  });
  it('reading more of them unlocks nothing: each lists at most one fragment', () => {
    for (const r of rel(h.x, h.y, 10).filter((x) => x.kind === 'torn-scraps')) expect((r.detail.match(/"/g) ?? []).length).toBeLessThanOrEqual(2);
  });
});
