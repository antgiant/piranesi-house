// The address bar and the room: the fragment names the hall you are in (and the level, and the world if it is not the usual one),
// so a copied address takes someone to the same room. Other parts of the fragment (developer overrides) are kept as they are.
// Pure functions of strings, so they can be tested without a page.

import { getHall } from '../world/hall';
import type { Level } from '../world/layout';
import type { World } from '../world/world';
import { resolveName, type Spot } from '../game/travel';

const LEVELS = ['lower', 'middle', 'upper'] as const;

/** The hall named by a fragment such as `#room=Fifth+Western+Hall&level=upper`, or null if it names none we know. */
export function parseRoom(world: World, hash: string): Spot | null {
  const q = new URLSearchParams(hash.replace(/^#/, ''));
  const name = q.get('room');
  if (!name) return null;
  const lv = LEVELS.indexOf((q.get('level') ?? 'middle') as (typeof LEVELS)[number]);
  return resolveName(world, name, (lv < 0 ? 1 : lv) as Level);
}

/** The world named by a fragment, if any (only given when it is not the usual one). */
export function parseSeed(hash: string): string | null {
  return new URLSearchParams(hash.replace(/^#/, '')).get('seed');
}

/** The fragment that says where you are: your hall, your level unless it is the middle one, the world unless it is the usual one. */
export function withRoom(hash: string, world: World, spot: Spot, seed: string, defaultSeed: string, as?: string | null): string {
  const q = new URLSearchParams(hash.replace(/^#/, ''));
  q.set('room', getHall(world, spot.x, spot.y, spot.level).name);
  // what the place is called in the telling: a narrative name beside the plain one, for people to read. Only `room` finds the place.
  if (as) q.set('as', as); else q.delete('as');
  if (spot.level === 1) q.delete('level'); else q.set('level', LEVELS[spot.level]);
  if (seed === defaultSeed) q.delete('seed'); else q.set('seed', seed);
  return `#${q.toString()}`;
}

/** The same fragment without the room: for starting afresh. */
export function withoutRoom(hash: string): string {
  const q = new URLSearchParams(hash.replace(/^#/, ''));
  q.delete('room');
  q.delete('as');
  q.delete('level');
  const s = q.toString();
  return s ? `#${s}` : '';
}
