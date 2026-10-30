// Outside traces: very rare hints that something exists beyond the House. A draught that smells of rain and metal,
// a few seconds of muffled sound that is almost voices, a low rushing like nothing in the House, a wrapper skittering
// across the pavement. Nothing to enter, nobody to meet, never explained.
//
// A pure schedule per in-world day: at most one event a day, most days none, and mostly in the First Vestibule's
// south-east corner (between the two minotaurs there). Everyone in the same hall at the same moment sees the same thing.

import type { Hall } from '../world/hall';
import type { Side } from '../world/layout';
import { Rng, hashInts } from '../world/rng';
import type { World } from '../world/world';
import { MS, floorDiv } from './time';

export type OutsideKind = 'draught' | 'voices' | 'traffic' | 'wrapper';

export interface OutsideEvent {
  kind: OutsideKind;
  startMs: number;
  endMs: number;
  x: number;
  y: number;
  /** Where in the hall it seems to come from. */
  wall: Side;
  pos: number;
  /** True for the First Vestibule's south-east corner. */
  corner: boolean;
}

export interface OutsideNow {
  event: OutsideEvent;
  /** 0..1 through the event. */
  progress: number;
  /** 0..1 loudness: a gentle rise, a plateau, a fade. */
  gain: number;
  id: string;
}

/** About two days in five have an event at all. */
const DAYS_WITH_EVENT_PER_100 = 40;
/** Of those, how many are at the First Vestibule (the rest are somewhere within 12 halls of it). */
const AT_ORIGIN_PER_100 = 85;
const DURATION_S: Record<OutsideKind, number> = { draught: 120, voices: 18, traffic: 30, wrapper: 8 };

export function outsideEventForDay(world: World, day: number): OutsideEvent | null {
  const r = new Rng(hashInts(world.seed, 0x0075, day));
  if (!r.chance(DAYS_WITH_EVENT_PER_100, 100)) return null;
  const kind = r.weighted([['draught', 40], ['voices', 25], ['traffic', 15], ['wrapper', 20]] as const);
  let x = 0;
  let y = 0;
  let wall: Side = 'S';
  let pos = 930; // the south-east corner, between the two minotaurs there
  let corner = true;
  if (!r.chance(AT_ORIGIN_PER_100, 100)) {
    corner = false;
    x = r.range(-12, 12);
    y = r.range(-12, 12);
    wall = r.pick(['N', 'E', 'S', 'W'] as const);
    pos = r.range(100, 900);
  }
  const startMin = r.range(0, 1380);
  const startMs = day * MS.day + startMin * MS.min + r.range(0, 59) * MS.sec;
  return { kind, startMs, endMs: startMs + DURATION_S[kind] * MS.sec, x, y, wall, pos, corner };
}

/** The event you can perceive in this hall at time t, or null. Only the middle level, and never in a lake or the dark hall. */
export function outsideAt(world: World, hall: Hall, t: number): OutsideNow | null {
  if (hall.level !== 1 || hall.regions.drowned || hall.tags.includes('dark-hall')) return null;
  const day = floorDiv(t, MS.day);
  const e = outsideEventForDay(world, day);
  if (!e || e.x !== hall.x || e.y !== hall.y || t < e.startMs || t >= e.endMs) return null;
  const p = (t - e.startMs) / (e.endMs - e.startMs);
  const gain = p < 0.2 ? p / 0.2 : p > 0.7 ? (1 - p) / 0.3 : 1;
  return { event: e, progress: p, gain: Math.max(0, Math.min(1, gain)), id: `${e.kind}@${e.startMs}` };
}
