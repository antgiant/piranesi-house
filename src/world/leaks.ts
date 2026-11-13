// Where the water drips from. Every hall has leaks: places in the ceiling, on the statues and along the walls where water finds its way through
// and falls. A leak is a fixed point in the hall (so you can walk toward it, or stop beside it, and it is where it was), and it has its own
// way of dripping: how fast when the stone is wet, and a pitch of its own (the size of the drop and what it lands on). They are derived from the seed,
// not stored in the hall, so they change nothing about how the world is generated and need no world version. Pure and deterministic.

import { hashInts } from './rng';
import type { Hall } from './hall';
import type { World } from './world';

export interface Leak {
  id: string;
  /** Metres from the hall's south-west corner. */
  x: number;
  y: number;
  /** Height of the drip above the floor: high in the ceiling, lower on a statue, or near the floor. */
  z: number;
  /** Drips a minute in ordinary weather. */
  perMin: number;
  /** The pitch of its drops, in Hz (one leak keeps nearly one pitch). */
  pitch: number;
}

const cache = new WeakMap<World, Map<string, Leak[]>>();
const u = (h: number): number => (h >>> 0) / 4294967296;

/** A bigger hall has more leaks: a small hall a few, a great vestibule a dozen or more. */
export function leakCount(h: Pick<Hall, 'xExtent' | 'yExtent'>): number {
  return Math.max(3, Math.min(16, Math.round(2 + (h.xExtent * h.yExtent) / 5000)));
}

export function leaksOf(world: World, h: Hall): Leak[] {
  const key = `${h.x},${h.y},${h.level}`;
  let m = cache.get(world);
  if (!m) { m = new Map(); cache.set(world, m); }
  const hit = m.get(key);
  if (hit) return hit;
  const out: Leak[] = [];
  const n = leakCount(h);
  for (let i = 0; i < n; i++) {
    const r = (k: number): number => u(hashInts(world.seed, 0x1ea6, h.x, h.y, h.level, i, k));
    const high = r(3) < 0.7; // most drip from the ceiling and the upper statues; some from low down onto the floor
    out.push({
      id: `${h.x},${h.y},${h.level}#${i}`,
      x: 3 + r(0) * Math.max(1, h.xExtent - 6),
      y: 3 + r(1) * Math.max(1, h.yExtent - 6),
      z: high ? 3 + r(2) * Math.max(1, h.heightM - 4) : 0.2 + r(2) * 1.6,
      perMin: 0.4 + r(4) * 2.6,
      pitch: Math.min(4400, Math.max(800, 1450 * Math.exp((r(5) + r(6) - 1) * 1.1))),
    });
  }
  if (m.size > 3000) m.clear();
  m.set(key, out);
  return out;
}
