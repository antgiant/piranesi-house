// Names the visitor gives to things, and how well they are remembered. A name is a landmark: coming upon a thing you have named is the
// surest way to know where you are. But names are remembered as people remember: name too many things in a short time and some will not
// stay; leave a name unused and it fades; bring it to mind again, after a decent interval, and it lasts longer.
//
// Pure, with time passed in (the House's own clock), so it can be tested exactly.

import type { Spot } from './travel';

export type ThingKind = 'hall' | 'statue' | 'stair' | 'door' | 'flourish' | 'relic';

/** A named thing. */
export interface Named {
  /** A stable identity for the thing in the world: the same thing has the same id for everyone. */
  id: string;
  kind: ThingKind;
  /** What the visitor called it, as they wrote it. */
  name: string;
  /** The same, lower-cased with its article taken off, for finding it again. */
  key: string;
  /** The hall it is in (the hall itself, for a hall). */
  hall: Spot;
  /** How firmly it was fixed when it was named (0 to 1): high when little else was being named. */
  strength: number;
  /** How slowly it fades (ms). Each time it is brought to mind, with a decent interval between, this grows. */
  stability: number;
  /** When it was last named or brought to mind (House time, ms), and when it was first named. */
  last: number;
  born: number;
  /** When it last counted as brought to mind, so that being reminded a dozen times in a minute is no more than once. */
  rehearsed: number;
  uses: number;
}

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

/** A new name fades over a few days if it is never used: after a day about three-quarters is left, after three days a third. */
export const FIRST_STABILITY = 3 * DAY;
/** The longest a name can be made to last by being used (years). */
const MAX_STABILITY = 400 * DAY;
/** A name is brought to mind for the purpose of lasting longer at most this often. */
export const SPACING = 30 * MINUTE;
/** Names given within this long of each other compete for the same attention. */
export const WINDOW = 30 * MINUTE;
/** About this many names can be given in that time and kept; more than that and some are lost. */
export const CAPACITY = 4;
/** Below this much remembered, a name cannot be recalled at all; below this much more, it comes only half. */
export const FORGOTTEN = 0.25;
export const SURE = 0.6;

/** How much of a name is still remembered, from 0 (gone) to 1 (as fresh as when it was fixed). */
export function retention(n: Named, now: number): number {
  const dt = Math.max(0, now - n.last);
  return n.strength * Math.exp(-dt / n.stability);
}

export const normalise = (s: string): string =>
  s.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().replace(/^["“'‘]+|["”'’.!?,;:]+$/g, '').trim();
export const keyOf = (s: string): string => normalise(s).toLowerCase().replace(/^(the|a|an)\s+/, '');
export const MAX_NAME = 60;

/** For matching what was typed against a name: lower case, with the little words dropped, since commands lose them on the way in. */
export const looseKey = (s: string): string => s.toLowerCase().replace(/[^a-z0-9\s'-]/g, ' ').split(/\s+/).filter((w) => w && !['the', 'a', 'an', 'of', 'to', 'at', 'through', 'toward', 'towards', 'on', 'into', 'in'].includes(w)).join(' ');

export type NameResult =
  | { ok: true; named: Named; /** How many names have now been given within the window, this one included. */ recent: number; overloaded: boolean }
  | { ok: false; why: 'empty' | 'long' | 'taken'; other?: Named };

/**
 * Give a thing a name. A name already given to another thing (and still remembered) is refused: a name that is yours alone is a landmark;
 * one that two things share is no use to anyone. Giving the thing a new name replaces the old.
 *
 * Naming a lot in a short time costs: past `CAPACITY` within `WINDOW`, each further name is fixed less firmly, and the names given just before
 * it slip a little, because attention is shared out among them.
 */
export function giveName(list: Named[], thing: { id: string; kind: ThingKind; hall: Spot }, nameIn: string, now: number): NameResult {
  // kept without its article, so that "the Hall of Weeping" and "Hall of Weeping" are the same name
  const name = normalise(nameIn).replace(/^(the|a|an)\s+(?=\S)/i, '');
  const key = keyOf(name);
  if (!key) return { ok: false, why: 'empty' };
  if (name.length > MAX_NAME) return { ok: false, why: 'long' };
  const other = list.find((n) => n.key === key && n.id !== thing.id && retention(n, now) >= FORGOTTEN);
  if (other) return { ok: false, why: 'taken', other };
  const at = list.findIndex((n) => n.id === thing.id);
  if (at >= 0) list.splice(at, 1);
  const recent = list.filter((n) => now - n.born <= WINDOW);
  const count = recent.length + 1;
  const over = Math.max(0, count - CAPACITY);
  for (const r of recent) r.strength = Math.max(0.15, r.strength - 0.05 * over);
  // a name given to something that has a name already is the same attention, not more: the old name's strength is not inherited
  const named: Named = {
    id: thing.id, kind: thing.kind, name, key, hall: thing.hall,
    strength: Math.max(0.45, 1 - 0.1 * over), stability: FIRST_STABILITY, last: now, born: now, rehearsed: now, uses: 0,
  };
  list.push(named);
  return { ok: true, named, recent: count, overloaded: over > 0 };
}

/**
 * Bring a name to mind (it was used, or the thing it names was met again). If it has been long enough since last time, that makes it hold
 * longer and a little firmer: the spacing effect. Brought to mind a dozen times in a minute, it counts once.
 */
export function rehearse(n: Named, now: number): boolean {
  n.uses++;
  if (now - n.rehearsed < SPACING) return false;
  // it must still be there to be brought to mind: a forgotten name is not made stronger by being half-recalled
  const r = retention(n, now);
  n.rehearsed = now;
  if (r < FORGOTTEN * 0.5) return false;
  n.stability = Math.min(MAX_STABILITY, n.stability * 1.8);
  n.strength = Math.min(1, Math.max(r, n.strength) + 0.3 * (1 - Math.max(r, n.strength)));
  n.last = now;
  return true;
}

/** Names that are remembered at all, firmest first. */
export function remembered(list: Named[], now: number): { n: Named; r: number }[] {
  return list.map((n) => ({ n, r: retention(n, now) })).filter((x) => x.r >= FORGOTTEN).sort((a, b) => b.r - a.r);
}

/** What a name is worth for knowing where you are, by the sort of thing it is: a whole hall is the surest; a door or a scrap of litter least. */
export const WEIGHT: Record<ThingKind, number> = { hall: 1, stair: 0.95, statue: 0.9, flourish: 0.85, relic: 0.6, door: 0.6 };

/**
 * The chance that something you have named, here, tells you where you are: the best of the names remembered of things in this hall,
 * each by how well it is remembered and what sort of thing it is. Nothing named here, or all of it forgotten: nothing.
 */
export function landmarkChance(list: Named[], here: Spot, now: number): { chance: number; by: Named | null } {
  let best = 0;
  let by: Named | null = null;
  for (const n of list) {
    if (n.hall.x !== here.x || n.hall.y !== here.y || n.hall.level !== here.level) continue;
    const p = retention(n, now) * WEIGHT[n.kind];
    if (p > best) { best = p; by = n; }
  }
  return { chance: best < FORGOTTEN * 0.5 ? 0 : Math.min(0.95, best), by };
}

/** Drop names that have faded away completely and have not been thought of for a long while. */
export function tidy(list: Named[], now: number): void {
  for (let i = list.length - 1; i >= 0; i--) {
    const n = list[i] as Named;
    if (retention(n, now) < 0.02 && now - n.last > 60 * DAY) list.splice(i, 1);
  }
}

export function howSure(r: number): string {
  return r >= 0.85 ? 'You are sure of it.' : r >= SURE ? 'You are fairly sure of it.' : r >= 0.4 ? 'You are not quite sure of it any more.' : 'You half remember it.';
}
