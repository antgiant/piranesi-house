// Where the listener is inside a hall, and what that does to the sound. The halls are huge (one is about 330 ft across and the great road
// crosses hundreds of them), and walking across one takes minutes, so the soundscape follows you through it: a doorway you walk toward
// grows louder and turns from ahead to beside you as you pass it; a fall is loud near its wall and a far murmur across the floor. Positions
// are metres from the hall's south-west corner; the heading is degrees clockwise from north. Pure, so it can be tested without any audio.

import type { Side } from '../world/layout';
import type { Bearing } from './director';

export interface Pose { x: number; y: number; heading: number }

export interface Extents { xExtent: number; yExtent: number }

const SIDE_HEADING: Record<Side, number> = { N: 0, E: 90, S: 180, W: 270 };
const HEADINGS: Side[] = ['N', 'E', 'S', 'W'];

export const headingOf = (side: Side): number => SIDE_HEADING[side];

/** The nearest compass side to a heading, for the parts of the soundscape that still think in four directions. */
export function sideOfHeading(heading: number): Side {
  return HEADINGS[Math.round((((heading % 360) + 360) % 360) / 90) % 4] as Side;
}

/** The point on a wall, `pos` (0..1000) of the way from its low end (west or south) to its high end. */
export function wallPoint(h: Extents, side: Side, pos: number): { x: number; y: number } {
  const f = pos / 1000;
  switch (side) {
    case 'N': return { x: f * h.xExtent, y: h.yExtent };
    case 'S': return { x: f * h.xExtent, y: 0 };
    case 'E': return { x: h.xExtent, y: f * h.yExtent };
    default: return { x: 0, y: f * h.yExtent };
  }
}

/** Where a standing visitor is: on a wall at a position along it, or (no wall) in the middle of the floor. */
export function standingPoint(h: Extents, wall: Side | null, pos: number): { x: number; y: number } {
  return wall ? wallPoint(h, wall, pos) : { x: h.xExtent / 2, y: h.yExtent / 2 };
}

/** The nearest point of a stretch of wall (`from` to `to`, 0..1000 along it) to the listener. */
export function nearestOnWall(h: Extents, side: Side, from: number, to: number, at: { x: number; y: number }): { x: number; y: number } {
  const lo = Math.min(from, to), hi = Math.max(from, to);
  const a = wallPoint(h, side, lo), b = wallPoint(h, side, hi);
  return { x: Math.max(Math.min(a.x, b.x), Math.min(Math.max(a.x, b.x), at.x)), y: Math.max(Math.min(a.y, b.y), Math.min(Math.max(a.y, b.y), at.y)) };
}

/** Which way a point is from the listener, relative to where they face: 0 ahead, +90 to the right, 180 behind, -90 to the left. */
export function azimuthTo(pose: Pose, p: { x: number; y: number }): number {
  const compass = (Math.atan2(p.x - pose.x, p.y - pose.y) * 180) / Math.PI;
  let az = compass - pose.heading;
  while (az > 180) az -= 360;
  while (az <= -180) az += 360;
  return az;
}

export const distanceTo = (pose: Pose, p: { x: number; y: number }): number => Math.hypot(p.x - pose.x, p.y - pose.y);

/** The four directions the narrator speaks in, from a continuous azimuth. */
export function bearingFromAz(az: number): Bearing {
  const a = Math.abs(az);
  return a <= 45 ? 'ahead' : a >= 135 ? 'behind' : az > 0 ? 'right' : 'left';
}

/**
 * How loud something is for how far away it is. `reach` (metres) is the distance at which it is at half of `peak`; `floor` is what is
 * still heard in the far corner of a huge hall. Falls steadily with distance, never to nothing, and never above `peak`.
 */
export function proximity(distance: number, reach: number, peak: number, floor: number): number {
  const d = Math.max(0, distance);
  return Math.max(floor, Math.min(peak, (peak * reach) / (reach + d)));
}

/** Heading, in degrees clockwise from north, of a move from one point to another; `fallback` if it is hardly a move. */
export function headingOfMove(from: { x: number; y: number }, to: { x: number; y: number }, fallback: number): number {
  const dx = to.x - from.x, dy = to.y - from.y;
  if (Math.hypot(dx, dy) < 1) return fallback;
  return (((Math.atan2(dx, dy) * 180) / Math.PI) % 360 + 360) % 360;
}
