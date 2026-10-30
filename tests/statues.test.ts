import { describe, expect, it } from 'vitest';
import canonStatues from '../src/generated/canon-statues.json';
import { GENERIC_CANON, PLACEMENTS } from '../src/data/canonPlacement';
import { createWorld } from '../src/world/world';
import { getHall, wallGrids } from '../src/world/hall';
import { cellFromRay, parseCellName, type Level } from '../src/world/layout';
import { canonLocations, hallStatues, hallSlots, slotAt } from '../src/world/slots';
import { describeStatue, signature } from '../src/world/statues';
import { CORAL } from '../src/world/regions';

const SEEDS = ['test-seed', 'another', 'the-house'];

function hallByName(w: ReturnType<typeof createWorld>, name: string, level: Level = 1) {
  const c = parseCellName(w, name);
  if (!c) throw new Error(`no such place ${name}`);
  return getHall(w, c.x, c.y, level);
}

describe.each(SEEDS)('canon fixtures hold for every seed (%s)', (seed) => {
  const w = createWorld(seed);

  it('Woman with the Beehive: Ninth Vestibule, west wall, about 15 m up, very large', () => {
    const h = hallByName(w, 'Ninth Vestibule');
    const s = hallStatues(w, h).find((x) => x.canonId === 'ST-BEEHIVE-WOMAN')!;
    expect(s.wall).toBe('W');
    expect(s.baseM).toBeCloseTo(15, 0);
    expect(s.heightM).toBeGreaterThanOrEqual(3.5);
    expect(h.stairs.map((x) => x.name)).toEqual(['westernmost', 'middle', 'easternmost']);
  });

  it('Horned Giants: a pair flanking the east door of the First Western Hall, far larger than their neighbours', () => {
    const h = hallByName(w, 'First Western Hall');
    const g = hallStatues(w, h).filter((x) => x.canonId === 'ST-HORNED-GIANTS');
    expect(g).toHaveLength(2);
    for (const s of g) {
      expect(s.wall).toBe('E');
      expect(s.heightM).toBe(6);
      expect(s.baseM).toBe(2);
      expect(s.heightM).toBeGreaterThan((h.statueHeightDm / 10) * 2.5);
    }
    const door = h.doors.E[0]!.pos;
    const [lo, hi] = g.map((s) => (s.alongM * 1000) / h.yExtent).sort((a, b) => a - b) as [number, number];
    expect(lo).toBeLessThan(door);
    expect(hi).toBeGreaterThan(door);
  });

  it('eight different minotaurs, each about 9 m, in the First Vestibule', () => {
    const h = hallByName(w, 'First Vestibule');
    const m = hallStatues(w, h).filter((x) => x.canonId === 'ST-MINOTAURS');
    expect(m).toHaveLength(8);
    expect(new Set(m.map((s) => s.canonLabel)).size).toBe(8);
    for (const s of m) expect(s.heightM).toBe(9);
  });

  it('dog-fox stands in the Fourth Western Hall near its north-west corner', () => {
    const h = hallByName(w, 'Fourth Western Hall');
    const s = hallStatues(w, h).find((x) => x.canonId === 'ST-DOGFOX')!;
    expect(s.wall).toBe('N');
    expect(s.alongM).toBeLessThan(h.xExtent * 0.12);
  });

  it('Faun stands beside a door in the Fifth North-Western Hall', () => {
    const h = hallByName(w, 'Fifth North-Western Hall');
    const s = hallStatues(w, h).find((x) => x.canonId === 'ST-FAUN')!;
    const door = h.doors[s.wall][0]!.pos;
    expect(Math.abs((s.alongM * 1000) / h.yExtent - door)).toBeLessThan(80);
  });

  it('Angel on the rose bush is about 5 m up in the north-east corner of the Second Northern Hall', () => {
    const h = hallByName(w, 'Second Northern Hall');
    const s = hallStatues(w, h).find((x) => x.canonId === 'ST-ANGEL-ROSE')!;
    expect(s.baseM).toBe(5);
    expect(s.wall).toBe('N');
    expect(s.alongM).toBeGreaterThan(h.xExtent * 0.85);
  });

  it('bird-message statues share the Second North-Eastern Hall', () => {
    const h = hallByName(w, 'Second North-Eastern Hall');
    const ids = new Set(hallStatues(w, h).map((x) => x.canonId));
    for (const id of ['ST-ANGEL-TRUMPET', 'ST-SHIP-WAVES', 'ST-MAN-BOOK', 'ST-WOMAN-CLOUD-SHIELD', 'ST-CHILD-FLOWER', 'ST-GRAIN-MICE']) {
      expect(ids.has(id), id).toBe(true);
    }
  });

  it('the upper hall above the 19th Eastern Hall is violent, with the trampled man', () => {
    const h = hallByName(w, 'Nineteenth Eastern Hall', 2);
    expect(h.mood).toBe('violent');
    expect(hallStatues(w, h).some((x) => x.canonId === 'ST-TRAMPLED-MAN')).toBe(true);
  });

  it('the 192nd Western Hall: windowless, one door, a crowd, the banner bearer at the back', () => {
    const h = hallByName(w, 'One-Hundred-and-Ninety-Second Western Hall');
    expect(Object.values(h.windows).every((n) => n === 0)).toBe(true);
    expect(Object.values(h.doors).flat()).toHaveLength(1);
    expect(h.mood).toBe('crowd');
    expect(h.tags).toContain('dark-hall');
    expect(hallStatues(w, h).some((x) => x.canonId === 'ST-MOON-CROWD')).toBe(true);
  });

  it('the 88th Western Hall holds the gull colony, the 43rd Vestibule the albatross nest', () => {
    expect(hallByName(w, 'Eighty-Eighth Western Hall').tags).toContain('gull-colony');
    expect(hallByName(w, 'Forty-Third Vestibule').tags).toContain('albatross-nest');
  });

  it('the Coral group lives in the Coral Halls', () => {
    const loc = canonLocations(w, 'ST-CORAL-GROUP');
    expect(loc).toHaveLength(6);
    const hallIds = new Set(loc.map((l) => l.hallId));
    expect(hallIds.size).toBe(1);
    const [x, y] = [...hallIds][0]!.slice(2).split(',').map(Number) as [number, number];
    expect(x).toBeGreaterThanOrEqual(CORAL.x0);
    expect(x).toBeLessThanOrEqual(CORAL.x1);
    expect(y).toBeGreaterThanOrEqual(CORAL.y0);
    expect(y).toBeLessThanOrEqual(CORAL.y1);
  });
});

describe('canon coverage', () => {
  const w = createWorld('test-seed');
  it('every canon statue id is placed or explicitly generic', () => {
    const placed = new Set(PLACEMENTS.map((p) => p.id));
    for (const s of canonStatues as { id: string }[]) {
      expect(placed.has(s.id) || s.id in GENERIC_CANON, s.id).toBe(true);
    }
  });
  it('every placement resolves to a real slot and is present in the world', () => {
    const wanted = new Map<string, number>();
    for (const p of PLACEMENTS) wanted.set(p.id, (wanted.get(p.id) ?? 0) + 1);
    for (const [id, n] of wanted) expect(canonLocations(w, id).length, id).toBe(n);
  });
  it('canon statues fit inside their halls', () => {
    for (const p of PLACEMENTS) {
      for (const loc of canonLocations(w, p.id)) {
        const [x, y, l] = loc.hallId.slice(2).split(',').map(Number) as [number, number, Level];
        const h = getHall(w, x, y, l);
        expect(p.baseM + p.sizeM, `${p.id} in ${h.name}`).toBeLessThanOrEqual(h.heightM);
      }
    }
  });
});

describe('statue invariants', () => {
  const w = createWorld('test-seed');
  const halls: ReturnType<typeof getHall>[] = [];
  for (let x = -4; x <= 4; x++) for (let y = -4; y <= 4; y++) for (const l of [0, 1, 2] as Level[]) halls.push(getHall(w, x, y, l));

  it('hall statue counts are in the hundreds to low thousands', () => {
    for (const h of halls) {
      if (h.regions.drowned && h.level === 1) continue; // few, colossal statues
      const n = hallStatues(w, h).length;
      expect(n, h.id).toBeGreaterThan(60);
      expect(n, h.id).toBeLessThanOrEqual(4600);
    }
  });

  it('size is uniform within a hall (canon S-R04) and colossal only in the Drowned Halls (S-R05)', () => {
    for (const h of halls.filter((_, i) => i % 3 === 0)) {
      const base = h.statueHeightDm / 10;
      for (const s of hallStatues(w, h)) {
        if (s.canonId) continue;
        expect(s.heightM / base, h.id).toBeGreaterThan(0.85);
        expect(s.heightM / base, h.id).toBeLessThan(1.15);
      }
      if (h.sizeClass === 'colossal') expect(h.regions.drowned && h.level === 1).toBe(true);
    }
  });

  it('no two statues look alike within a 7x7 window of halls (S-R08)', () => {
    const seen = new Map<string, string>();
    for (let x = -3; x <= 3; x++) for (let y = -3; y <= 3; y++) {
      const h = getHall(w, x, y, 1);
      for (const s of hallStatues(w, h)) {
        if (s.canonId) continue;
        const sig = signature(s);
        expect(seen.has(sig), `${s.id} duplicates ${seen.get(sig)}`).toBe(false);
        seen.set(sig, s.id);
      }
    }
  });

  it('uniqueness also holds across levels of the same cell', () => {
    const seen = new Set<string>();
    for (const l of [0, 1, 2] as Level[]) {
      for (const s of hallStatues(w, getHall(w, 5, -4, l))) {
        const sig = signature(s);
        expect(seen.has(sig)).toBe(false);
        seen.add(sig);
      }
    }
  });

  it('walls are populated, with rare absences (S-R01, S-R03)', () => {
    let empties = 0;
    let total = 0;
    for (const h of halls.slice(0, 600)) {
      for (const g of wallGrids(h)) {
        let n = 0;
        for (let t = 0; t < g.tiers; t++) for (let s = 0; s < g.slots; s++) {
          const sl = slotAt(w, h, g.wall, t, s);
          total++;
          if (sl.kind === 'empty') empties++;
          else n++;
        }
        expect(n, `${h.id} ${g.wall}`).toBeGreaterThan(0);
      }
    }
    const rate = empties / total;
    expect(rate).toBeGreaterThan(0.003);
    expect(rate).toBeLessThan(0.08);
  });

  it('seaweed and shellfish only below the tide line (S-R12)', () => {
    for (const h of halls) {
      if (h.level !== 1) continue;
      for (const s of hallStatues(w, h)) {
        const baseDm = s.baseM * 10;
        if (s.canonId) continue;
        if (h.tideReachDm === 0) expect(s.condition.seaweed || s.condition.shellfish, s.id).toBe(false);
        else if (baseDm > h.tideReachDm + 4) expect(s.condition.seaweed || s.condition.shellfish, s.id).toBe(false);
      }
    }
  });

  it('water wear only appears in halls with a fall of water; coral only in the Coral Halls', () => {
    for (const h of halls.filter((_, i) => i % 3 === 1)) {
      for (const s of hallStatues(w, h)) {
        if (s.condition.waterWorn) expect(h.falls, h.id).not.toBeNull();
        expect(s.condition.coral && !h.regions.coral, s.id).toBe(false);
      }
    }
    const far = getHall(w, -10, -50, 1);
    expect(far.regions.coral).toBe(true);
    expect(hallStatues(w, far).some((s) => s.condition.coral)).toBe(true);
  });

  it('Drowned Halls are colossal, giants, and never touched by the tides (T-016)', () => {
    const h = getHall(w, 6, 0, 1);
    expect(h.regions.drowned).toBe(true);
    expect(h.sizeClass).toBe('colossal');
    expect(h.tideReachDm).toBe(0);
    const s = hallStatues(w, h).filter((x) => !x.canonId);
    expect(s.length).toBeGreaterThan(0);
    expect(s.every((x) => x.heightM >= 12)).toBe(true);
  });

  it('violent halls come in clusters, never alone (S-R06)', () => {
    let violent = 0;
    for (const l of [1, 2] as Level[]) for (let x = -50; x <= 50; x++) for (let y = -50; y <= 50; y++) {
      if (getHall(w, x, y, l).mood !== 'violent') continue;
      violent++;
      const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => getHall(w, x + dx!, y + dy!, l).mood === 'violent');
      expect(nb, `lonely violent hall ${x},${y},${l}`).toBe(true);
    }
    expect(violent).toBeGreaterThan(0);
  });

  it('courtyards have 3, 4, 6 or 8 sides, mostly 4 (W-005)', () => {
    let four = 0;
    for (const h of halls) {
      expect([3, 4, 6, 8]).toContain(h.courtyardSides);
      if (h.courtyardSides === 4) four++;
    }
    expect(four / halls.length).toBeGreaterThan(0.8);
  });

  it('descriptions never contain modern objects (S-R09)', () => {
    const banned = /\b(phone|computer|car|gun|plastic|wire|bottle|camera|television|radio|bicycle|engine|battery)\b/i;
    for (const h of halls.slice(0, 80)) for (const s of hallStatues(w, h)) expect(describeStatue(h, s)).not.toMatch(banned);
  });
});

describe('showDead toggle changes only the occupants (RL-041)', () => {
  const on = createWorld('test-seed', { showDead: true });
  const off = createWorld('test-seed', { showDead: false });
  it('keeps layout and statue ids identical', () => {
    for (const [r, n] of [['NW', 3], ['SW', 14], ['SE', 6]] as const) {
      const c = cellFromRay(r, n, 0)!;
      const a = getHall(on, c.x, c.y, 1);
      const b = getHall(off, c.x, c.y, 1);
      expect(a.features.length).toBeGreaterThan(0);
      expect(a.features.map((f) => f.id)).toEqual(b.features.map((f) => f.id));
      expect(a.features.every((f) => f.occupant !== null)).toBe(true);
      expect(b.features.every((f) => f.occupant === null)).toBe(true);
      expect(hallStatues(on, a).map((s) => s.id)).toEqual(hallStatues(off, b).map((s) => s.id));
      expect(a.slotCount).toBe(b.slotCount);
    }
  });
});

describe('determinism', () => {
  it('the same seed gives the same hall every time; a different seed gives a different one', () => {
    const a = createWorld('seed-one');
    const b = createWorld('seed-one');
    const c = createWorld('seed-two');
    const sa = hallStatues(a, getHall(a, 7, 9, 1)).map(describeStatue.bind(null, getHall(a, 7, 9, 1)));
    const sb = hallStatues(b, getHall(b, 7, 9, 1)).map(describeStatue.bind(null, getHall(b, 7, 9, 1)));
    const sc = hallStatues(c, getHall(c, 7, 9, 1)).map(describeStatue.bind(null, getHall(c, 7, 9, 1)));
    expect(sa).toEqual(sb);
    expect(sa).not.toEqual(sc);
  });
  it('slot lookup agrees with full iteration', () => {
    const w = createWorld('test-seed');
    const h = getHall(w, 3, -8, 1);
    const flat = [...hallSlots(w, h)];
    const g = wallGrids(h)[1]!;
    expect(slotAt(w, h, g.wall, 1, 2)).toEqual(flat[g.offset + 1 * g.slots + 2]);
  });
});
