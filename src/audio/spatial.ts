// The geometry of the soundscape, kept apart from the Web Audio nodes so it can be tested without a browser.
//
// The listener sits at the origin facing -Z (the Web Audio default): +X is to the right, +Y is up, -Z is straight ahead.
// The director already says where a door is *relative to the way the visitor faces* (ahead, left, behind, right), so the
// listener never has to turn: the sources are placed around them. Distances are in metres.

import type { Bearing } from './director';

export interface Vec3 { x: number; y: number; z: number }

export const SPEED_OF_SOUND = 343;
/** Inside this distance a source is no louder; beyond it, loudness falls as the PannerNode's inverse model says. */
export const REF_DISTANCE = 4;

const RAD = Math.PI / 180;

/** A point from azimuth (0 = ahead, +90 = right, 180 = behind), elevation (+90 = overhead) and distance. */
export function polar(azDeg: number, elDeg: number, dist: number): Vec3 {
  const az = azDeg * RAD, el = elDeg * RAD;
  return { x: dist * Math.cos(el) * Math.sin(az), y: dist * Math.sin(el), z: -dist * Math.cos(el) * Math.cos(az) };
}

/** The inverse of `polar`: azimuth in (-180, 180], elevation in [-90, 90], distance. */
export function toPolar(v: Vec3): { az: number; el: number; dist: number } {
  const dist = Math.hypot(v.x, v.y, v.z);
  if (dist === 0) return { az: 0, el: 0, dist: 0 };
  return { az: Math.atan2(v.x, -v.z) / RAD, el: Math.asin(Math.max(-1, Math.min(1, v.y / dist))) / RAD, dist };
}

export const distanceOf = (v: Vec3): number => Math.hypot(v.x, v.y, v.z);

/**
 * Where a doorway sits around the listener. Sides are hard left and right, behind is behind, and an opening ahead is nudged
 * by `pan` (the director's -1..1 position along the wall) so a door off to one side of the far wall is heard off to that side.
 */
export function bearingPosition(bearing: Bearing, pan: number, dist = REF_DISTANCE): Vec3 {
  switch (bearing) {
    case 'left': return polar(-90, 0, dist);
    case 'right': return polar(90, 0, dist);
    case 'behind': return polar(180, 0, dist);
    default: return polar(Math.max(-1, Math.min(1, pan)) * 75, 0, dist);
  }
}

/**
 * The pitch ratio (heard / emitted) of a source at `pos` moving with velocity `vel` (m/s), for a listener at rest at the origin.
 * Above 1 while it approaches, below 1 once it has passed. The Web Audio PannerNode has no Doppler of its own.
 */
export function dopplerRatio(pos: Vec3, vel: Vec3, c = SPEED_OF_SOUND): number {
  const d = distanceOf(pos);
  if (d < 1e-6) return 1;
  const away = (pos.x * vel.x + pos.y * vel.y + pos.z * vel.z) / d; // radial speed; positive = receding
  // a bird is never supersonic, but keep the ratio sane whatever it is asked
  return c / Math.max(c * 0.2, c + away);
}

/** Air takes the highs off a distant sound: no loss within the reference distance, then a slow fall to a dull floor. */
export function airCutoffHz(dist: number): number {
  return Math.max(3500, 18000 / (1 + Math.max(0, dist - REF_DISTANCE) / 20));
}

/** A straight, constant-speed path through the air. */
export interface Flyby { from: Vec3; to: Vec3; dur: number }

export const positionAt = (f: Flyby, u: number): Vec3 => ({
  x: f.from.x + (f.to.x - f.from.x) * u,
  y: f.from.y + (f.to.y - f.from.y) * u,
  z: f.from.z + (f.to.z - f.from.z) * u,
});

export const velocityOf = (f: Flyby): Vec3 => ({ x: (f.to.x - f.from.x) / f.dur, y: (f.to.y - f.from.y) / f.dur, z: (f.to.z - f.from.z) / f.dur });

export interface FlybyOpts {
  /** Seconds the call lasts, and so how long the bird is tracked. */
  dur: number;
  /** Metres per second. */
  speed: number;
  /** Horizontal distance of closest approach, and the height it flies at. */
  closest: [number, number];
  height: [number, number];
}

/**
 * A fly-past: a straight line that passes the listener at a random side, height and moment, so the sound sweeps from one
 * side to the other, loudest at the closest point, rising in pitch on the way in and falling on the way out.
 */
export function flybyPath(rand: () => number, o: FlybyOpts): Flyby {
  const between = (r: [number, number]): number => r[0] + rand() * (r[1] - r[0]);
  const az = rand() * 360 - 180; // which side the line passes on
  const closest = polar(az, 0, between(o.closest));
  const h = between(o.height);
  // fly along the line perpendicular to the direction of the closest point, either way
  const dir = rand() < 0.5 ? 1 : -1;
  const along = { x: -Math.cos(az * RAD) * dir, z: -Math.sin(az * RAD) * dir };
  const len = o.speed * o.dur;
  const u0 = 0.2 + rand() * 0.6; // how far along the call the bird is at closest approach
  const climb = (rand() - 0.5) * 0.3 * len;
  const at = (s: number, y: number): Vec3 => ({ x: closest.x + along.x * s, y, z: closest.z + along.z * s });
  return { from: at(-len * u0, h - climb * u0), to: at(len * (1 - u0), h + climb * (1 - u0)), dur: o.dur };
}

/** A perch: somewhere around and a little above the listener, near enough to hear clearly. */
export function perchPosition(rand: () => number, elevation: [number, number] = [2, 35], distance: [number, number] = [4, 14]): Vec3 {
  return polar(rand() * 360 - 180, elevation[0] + rand() * (elevation[1] - elevation[0]), distance[0] + rand() * (distance[1] - distance[0]));
}

/**
 * Directions around the listener for sounds that surround: front pair, sides, rear pair, then overhead and behind-above. The sea and the
 * rain on water each use the first few; all land on a cell of the shared ring below, so they cost no panners of their own.
 */
export const AROUND: readonly { az: number; el: number }[] = [
  { az: -35, el: 0 }, { az: 35, el: 0 }, { az: -95, el: 8 }, { az: 95, el: 8 }, { az: -150, el: 0 }, { az: 150, el: 0 },
  { az: 0, el: 30 }, { az: 180, el: 25 },
];

const AZ_STEP = 30;
const EL_CELLS = [-50, 0, 35, 70];

/**
 * Many tiny sounds (bubbles, laps, footsteps) cannot each have an HRTF panner of their own, which would cost far too much on a
 * phone. They share a ring of fixed directions instead; this picks the nearest. Returns a stable key and the direction.
 */
export function stageCell(v: Vec3): { key: string; az: number; el: number } {
  const p = toPolar(v);
  let el = EL_CELLS[0] as number;
  for (const e of EL_CELLS) if (Math.abs(e - p.el) < Math.abs(el - p.el)) el = e;
  // straight up or down has no azimuth worth keeping
  const az = Math.abs(el) >= 70 ? 0 : Math.round(p.az / AZ_STEP) * AZ_STEP;
  const wrapped = ((az + 180) % 360 + 360) % 360 - 180 || 0;
  return { key: `${wrapped}:${el}`, az: wrapped, el };
}
