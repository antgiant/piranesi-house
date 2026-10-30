// Shared tide geometry: how far a vestibule's water reaches into the surrounding middle halls.
// Used both by the static Hall record (tideReachDm) and by the live simulation, so they cannot disagree.

import type { Cell } from './layout';
import { isVestibule, vestibuleNumber } from './layout';
import type { World } from './world';

/**
 * Percent of a vestibule's water depth that reaches a hall N rooms (Manhattan) away. Two rooms: with a vestibule in
 * every 3x3 block, a longer reach would leave almost no dry halls, and the book has many ("Dry Halls ... not flooded
 * in recent Times").
 */
export const FALLOFF_PCT: readonly number[] = [100, 62, 28];
export const MAX_ROOMS = FALLOFF_PCT.length - 1;
/** Deepest ordinary single tide at a vestibule, in decimetres (about waist height on the first tier of statues). */
export const REACH_MAX_DM = 16;

export interface NearVestibule {
  n: number;
  cell: Cell;
  rooms: number;
}

export function nearbyVestibules(world: World, x: number, y: number): NearVestibule[] {
  const out: NearVestibule[] = [];
  for (let dy = -MAX_ROOMS; dy <= MAX_ROOMS; dy++) {
    for (let dx = -MAX_ROOMS; dx <= MAX_ROOMS; dx++) {
      const rooms = Math.abs(dx) + Math.abs(dy);
      if (rooms > MAX_ROOMS) continue;
      const cx = x + dx;
      const cy = y + dy;
      if (!isVestibule(world, cx, cy)) continue;
      const n = vestibuleNumber(world, cx, cy);
      if (n !== null) out.push({ n, cell: { x: cx, y: cy }, rooms });
    }
  }
  return out.sort((a, b) => a.rooms - b.rooms || a.n - b.n);
}

/** Highest ordinary tide a hall sees, in decimetres. */
export function regularReachDm(world: World, x: number, y: number): number {
  const near = nearbyVestibules(world, x, y);
  let best = 0;
  for (const v of near) best = Math.max(best, Math.floor((REACH_MAX_DM * (FALLOFF_PCT[v.rooms] as number)) / 100));
  return best;
}
