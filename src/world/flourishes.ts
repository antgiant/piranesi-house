// Architectural flourishes: each hall's own few strange, enormous and beautiful things above the statues, drawn from the
// catalogue in architecture.ts. A pure function of the seed, the hall and its level, so every view agrees. They sit above
// the statues and take up no statue slots.

import type { Hall } from './hall';
import type { Side } from './layout';
import { SIDES } from './layout';
import { DEFS, type Def, type Family } from './architecture';
import { Rng, hashInts } from './rng';
import type { World } from './world';

export interface Flourish {
  id: string;
  kind: string;
  fam: Family;
  wall: Side;
  /** 0..1000 along the wall, low end (west or south) to high end. */
  along: number;
  /** Height above the floor, metres. */
  heightM: number;
  /** A sentence for looking around. */
  text: string;
  /** A phrase for something seen in passing, to follow "You pass" or "Overhead". */
  pass: string;
}

const WALL: Record<Side, string> = { N: 'north', E: 'east', S: 'south', W: 'west' };
const metres = (v: number): string => `${Math.max(2, Math.round(v))} metres`;

function fill(s: string, wall: Side, hall: Hall, def: Def, n: number): string {
  return s
    .replace(/\{w\}/g, WALL[wall])
    .replace(/\{y\}/g, metres(hall.heightM * def.at))
    .replace(/\{h\}/g, metres(hall.heightM))
    .replace(/\{n\}/g, String(n));
}

const cache = new WeakMap<World, Map<string, readonly Flourish[]>>();

/** Only some halls have a stair among their flourishes, and never a vestibule, which has its real stairs. */
const STAIR_CHANCE = 14;
/** At most this many of any one family in a hall, so the strange things differ in kind. */
const FAMILY_LIMIT: Partial<Record<Family, number>> = { stairs: 1, machine: 1, bridge: 1, nature: 2 };

/**
 * The flourishes of a hall: three to five (four to six in a vestibule), none in the dark hall or the Drowned Halls. Many kinds are
 * for any hall; some belong to one level only (the upper halls have a half-open roof, the lower ones weed and tide-marks).
 */
export function flourishesFor(world: World, hall: Hall): readonly Flourish[] {
  let m = cache.get(world);
  if (!m) { m = new Map(); cache.set(world, m); }
  const hit = m.get(hall.id);
  if (hit) return hit;
  const out: Flourish[] = [];
  const dark = hall.tags.includes('dark-hall');
  const drowned = hall.tags.includes('drowned');
  if (!dark && !drowned) {
    const r = new Rng(hashInts(world.seed, 0xf10b, hall.x, hall.y, hall.level));
    const total = (hall.kind === 'vestibule' ? 4 : 3) + r.int(3);
    const stairsOk = hall.kind !== 'vestibule' && r.chance(STAIR_CHANCE, 100);
    const pool = DEFS.filter((k) => (k.minH ?? 0) <= hall.heightM && (!k.levels || k.levels.includes(hall.level)) && (k.fam !== 'stairs' || stairsOk));
    const used = new Set<string>();
    const perFam = new Map<Family, number>();
    let walls = r.shuffle([...SIDES]);
    for (let i = 0; i < total; i++) {
      // a hall chosen to have a stair among its strange things has it as the first of them
      const avail = pool.filter((k) => !used.has(k.id) && (perFam.get(k.fam) ?? 0) < (FAMILY_LIMIT[k.fam] ?? 3) && (!(stairsOk && i === 0) || k.fam === 'stairs'));
      if (avail.length === 0) break;
      // a hall's own level is a better source of strange things than the common stock: favour its own kinds
      const w = (k: Def): number => k.weight * (k.levels ? 2.5 : 1);
      let t = r.int(Math.round(avail.reduce((s, k) => s + w(k), 0)));
      const kind = avail.find((k) => (t -= w(k)) < 0) ?? (avail[0] as Def);
      used.add(kind.id);
      perFam.set(kind.fam, (perFam.get(kind.fam) ?? 0) + 1);
      if (walls.length === 0) walls = r.shuffle([...SIDES]);
      const wall = walls.pop() as Side;
      const [lo, hi] = kind.n ?? [3, 9];
      const n = lo + r.int(hi - lo + 1);
      const v = kind.v[r.int(kind.v.length)] as readonly [string, string];
      out.push({
        id: `${hall.id}/f/${i}`, kind: kind.id, fam: kind.fam, wall, along: 80 + r.int(840), heightM: Math.round(hall.heightM * kind.at),
        text: fill(v[0], wall, hall, kind, n), pass: fill(v[1], wall, hall, kind, n),
      });
    }
  }
  if (m.size > 4000) m.clear();
  m.set(hall.id, out);
  return out;
}
