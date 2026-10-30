// Walking: how far, how fast, how long. All measured in the world's own seconds, so it follows the world clock:
// at real time a 200 m hall takes about two and a quarter minutes; at 60x time it takes two seconds.

import type { Hall } from '../world/hall';
import type { Side } from '../world/layout';

/** The book: 20 km to the 192nd Western Hall in 3.76 hours, rests excluded (canon D-002). About 1.48 m/s. */
export const WALK_SPEED_MPS = 20_000 / (3.76 * 3600);
/** The book's pace in km/h (5.3). */
export const BOOK_KMH = WALK_SPEED_MPS * 3.6;
/** The top of the speed control: a two-hour marathon, 42.195 km in 7200 s (5.86 m/s, 21.1 km/h). */
export const MARATHON_MPS = 42_195 / 7200;
export const MARATHON_KMH = MARATHON_MPS * 3.6;
/** How many times the book's pace the marathon pace is (about 3.97). */
export const MAX_PACE = MARATHON_MPS / WALK_SPEED_MPS;

/** Pace multiplier for a chosen speed in km/h, held between the book's pace and the marathon pace. */
export const paceFromKmh = (kmh: number): number => Math.max(1, Math.min(MAX_PACE, kmh / BOOK_KMH));

/** How you are moving, from your pace multiplier. */
export function gait(pace: number): 'walk' | 'jog' | 'run' {
  const mps = WALK_SPEED_MPS * pace;
  return mps < 2.2 ? 'walk' : mps < 4 ? 'jog' : 'run';
}

/** Footsteps per second: about 2 at a walk, about 3 (180 a minute) at marathon pace. */
export const stepsPerSecond = (pace: number): number => 1.95 + 0.35 * (Math.max(1, Math.min(MAX_PACE, pace)) - 1);
/** Thickness of a wall and doorway, walked through at each door. */
export const DOORWAY_M = 12;
/** One hall's worth of passage, for the long corridors between distant halls. */
export const CORRIDOR_HALL_M = 130;
/** The great stairs are about 25 m high with steps nearly twice the comfortable height: slow going up, easier down. */
export const STAIR_UP_S = 150;
export const STAIR_DOWN_S = 120;

export interface Spot {
  wall: Side | null;
  /** 0..1000 along the wall, low end (west or south) to high end. */
  pos: number;
}

/** A point on the floor, in metres from the hall's south-west corner. */
export function hallPoint(h: Hall, s: Spot): { x: number; y: number } {
  const f = s.pos / 1000;
  switch (s.wall) {
    case 'N': return { x: f * h.xExtent, y: h.yExtent };
    case 'S': return { x: f * h.xExtent, y: 0 };
    case 'E': return { x: h.xExtent, y: f * h.yExtent };
    case 'W': return { x: 0, y: f * h.yExtent };
    default: return { x: h.xExtent / 2, y: h.yExtent / 2 };
  }
}

export function distanceM(h: Hall, a: Spot, b: Spot): number {
  const p = hallPoint(h, a);
  const q = hallPoint(h, b);
  return Math.hypot(p.x - q.x, p.y - q.y);
}

/** Slower over rubble and through water. */
export function terrainFactor(h: Hall, waterDm: number): number {
  let f = 1;
  if (h.regions.derelict >= 60) f *= 0.6;
  if (waterDm >= 9) f *= 0.45;
  else if (waterDm >= 4) f *= 0.65;
  else if (waterDm > 0) f *= 0.9;
  return f;
}

export const walkSeconds = (meters: number, factor = 1): number => meters / (WALK_SPEED_MPS * factor);

/** "about 40 seconds", "about 2 minutes", "about an hour and ten minutes". */
export function describeDuration(seconds: number): string {
  const s = Math.max(1, Math.round(seconds));
  if (s < 50) return `about ${Math.max(5, Math.round(s / 5) * 5)} seconds`;
  const m = Math.round(s / 60);
  if (m < 2) return 'about a minute';
  if (m < 60) return `about ${m} minutes`;
  const h = Math.floor(m / 60);
  const r = Math.round((m % 60) / 5) * 5;
  if (r === 0) return h === 1 ? 'about an hour' : `about ${h} hours`;
  return `about ${h === 1 ? 'an hour' : `${h} hours`} and ${r} minutes`;
}

export function describeDistance(meters: number): string {
  return meters < 950 ? `${Math.max(5, Math.round(meters / 5) * 5)} metres` : `${(meters / 1000).toFixed(1)} kilometres`;
}
