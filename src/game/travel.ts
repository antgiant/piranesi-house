// Getting about a House too large to cross one door at a time: finding a route to a named place, and a straight run in one
// direction. Pure functions of the world; the game turns a route into a journey of real walking time.

import { getHall } from '../world/hall';
import { cellName, exits as hallExits, parseCellName, vestibuleCell, type Level, type Side } from '../world/layout';
import type { World } from '../world/world';

export interface Spot { x: number; y: number; level: Level }
/** One leg of a route: arrive at this spot, by a door (or long passage) or by the great stair. */
export interface Step extends Spot { via: 'door' | 'stairs' }

const key = (s: Spot): string => `${s.level}:${s.x},${s.y}`;

/** A hall you cannot walk through: the Drowned Halls' floor is gone under still water. */
export function impassable(world: World, s: Spot): boolean {
  const h = getHall(world, s.x, s.y, s.level);
  return h.regions.drowned && s.level === 1;
}

interface Node { s: Spot; g: number; f: number; from: Node | null; via: 'door' | 'stairs' }

/**
 * The shortest way from one hall to another, through doors, long passages and the great stairs of vestibules. Counts a stair
 * as three halls' walking. Returns the legs to take (not including where you stand), or null if no way is found.
 */
export function findRoute(world: World, from: Spot, to: Spot, maxExpansions = 60000): Step[] | null {
  if (key(from) === key(to)) return [];
  if (impassable(world, to)) return null;
  const h = (s: Spot): number => Math.abs(s.x - to.x) + Math.abs(s.y - to.y) + 3 * Math.abs(s.level - to.level);
  const open: Node[] = [{ s: from, g: 0, f: h(from), from: null, via: 'door' }];
  const best = new Map<string, number>([[key(from), 0]]);
  let expansions = 0;
  while (open.length && expansions++ < maxExpansions) {
    // the open list is small relative to the work done per node; pick the lowest f
    let bi = 0;
    for (let i = 1; i < open.length; i++) if ((open[i] as Node).f < (open[bi] as Node).f) bi = i;
    const cur = open.splice(bi, 1)[0] as Node;
    if (key(cur.s) === key(to)) {
      const out: Step[] = [];
      for (let n: Node | null = cur; n && n.from; n = n.from) out.push({ ...n.s, via: n.via });
      return out.reverse();
    }
    if ((best.get(key(cur.s)) ?? Infinity) < cur.g) continue;
    const next: { s: Spot; cost: number; via: 'door' | 'stairs' }[] = [];
    for (const e of hallExits(world, cur.s.x, cur.s.y, cur.s.level)) {
      const s: Spot = { x: e.to.x, y: e.to.y, level: cur.s.level };
      if (!impassable(world, s)) next.push({ s, cost: 1 + e.corridor, via: 'door' });
    }
    const here = getHall(world, cur.s.x, cur.s.y, cur.s.level);
    if (here.kind === 'vestibule' && here.stairs.length > 0) {
      for (const l of [cur.s.level - 1, cur.s.level + 1]) if (l >= 0 && l <= 2) next.push({ s: { ...cur.s, level: l as Level }, cost: 3, via: 'stairs' });
    }
    for (const n of next) {
      const g = cur.g + n.cost;
      if (g < (best.get(key(n.s)) ?? Infinity)) {
        best.set(key(n.s), g);
        open.push({ s: n.s, g, f: g + h(n.s), from: cur, via: n.via });
      }
    }
  }
  return null;
}

/** Keep going through the doors on one side of each hall, up to `n` halls or until there is no door that way. */
export function straightRoute(world: World, from: Spot, side: Side, n: number): Step[] {
  const out: Step[] = [];
  let cur = from;
  for (let i = 0; i < n; i++) {
    const doors = hallExits(world, cur.x, cur.y, cur.level).filter((e) => e.side === side);
    if (doors.length === 0) break;
    // the door nearest the middle of the wall is the one a straight run would take
    const e = doors.slice().sort((a, b) => Math.abs(a.pos - 500) - Math.abs(b.pos - 500))[0] as (typeof doors)[number];
    const next: Spot = { x: e.to.x, y: e.to.y, level: cur.level };
    if (impassable(world, next)) break;
    out.push({ ...next, via: 'door' });
    cur = next;
  }
  return out;
}

/** "ninth vestibule" or "88th western hall"-style text to a place the House has a name for. */
export function titleCase(s: string): string {
  return s.replace(/\b([a-z])/g, (c) => c.toUpperCase()).replace(/-And-/g, '-and-');
}

const LEVEL_WORDS: Record<string, Level> = { lower: 0, middle: 1, upper: 2 };

/**
 * Understand a place named by the visitor: "the Ninth Vestibule", "eighty-eighth western hall", "fifth north-eastern hall,
 * 2 rows north", optionally followed by "upper"/"lower"/"middle". Returns null if there is no such place.
 */
export function resolveName(world: World, text: string, defaultLevel: Level): Spot | null {
  let t = text.toLowerCase().replace(/[.!?]+$/, '').trim();
  let level = defaultLevel;
  const lm = /\b(?:on the |in the )?(upper|lower|middle)(?: level| halls?)?\s*$/.exec(t);
  if (lm) {
    level = LEVEL_WORDS[lm[1] as string] as Level;
    t = t.slice(0, lm.index).trim();
  }
  t = t.replace(/\b(halls?) (\d+ rows? )/, '$1, $2').replace(/^(the|to|toward|towards)\s+/, '').replace(/^(the)\s+/, '').trim();
  const [head, ...tail] = t.split(',');
  const name = [titleCase((head ?? '').trim()), ...tail.map((x) => x.trim())].join(', ');
  let c = parseCellName(world, name);
  if (!c) {
    const m = /^vestibule (\d+)$/.exec(t) ?? /^(\d+)(?:st|nd|rd|th) vestibule$/.exec(t);
    if (m) c = vestibuleCell(world, Number(m[1]));
  }
  return c ? { x: c.x, y: c.y, level } : null;
}

export const nameOf = (world: World, s: Spot): string => getHall(world, s.x, s.y, s.level).name || cellName(world, s.x, s.y);
