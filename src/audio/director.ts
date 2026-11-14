// The audio director: a pure function from SceneState to a description of the soundscape. The Web Audio engine realises
// it, and the narrator reads it back as prose ("listen"), so what you hear and what you read cannot disagree.

import { sceneAtWorldTime, type SceneState } from '../sim/scene';
import type { BirdMode } from '../sim/light';
import type { BirdSeason } from '../sim/seasons';
import { exits as hallExits, type Side } from '../world/layout';
import type { OutsideKind } from '../sim/outside';
import { getHall } from '../world/hall';
import { nearbyVestibules } from '../world/tidegeo';
import type { World } from '../world/world';
import { hydrologyAt } from '../sim/hydrology';
import { leaksOf } from '../world/leaks';
import { azimuthTo, bearingFromAz, distanceTo, headingOf, nearestOnWall, proximity, sideOfHeading, wallPoint, type Pose } from './pose';

export type Surface = 'marble' | 'wet' | 'shallow' | 'rubble' | 'snow';
export type TideSound = 'none' | 'approach' | 'booming' | 'submerged';

export type Bearing = 'ahead' | 'right' | 'behind' | 'left';

const SIDE_INDEX: Record<Side, number> = { N: 0, E: 1, S: 2, W: 3 };

/** Where a door is relative to the way you are facing. */
export function bearing(side: Side, facing: Side | null): Bearing {
  const rel = (SIDE_INDEX[side] - SIDE_INDEX[facing ?? 'N'] + 4) % 4;
  return (['ahead', 'right', 'behind', 'left'] as const)[rel] as Bearing;
}

/** What leaks through one doorway from the hall beyond. Only things that actually carry are listed. */
export interface Portal {
  side: Side;
  /** 0..1000 along the wall. */
  pos: number;
  toName: string;
  bearing: Bearing;
  /** -1 (left) .. 1 (right). */
  pan: number;
  /** Where the doorway is from where you stand, in degrees from straight ahead (+ right): set when the visitor's place in the hall is known. */
  az?: number;
  /** A doorway muffles; a door behind you muffles more. */
  lowpassHz: number;
  tide: { kind: 'none' | 'approach' | 'booming'; gain: number };
  birds: { mode: BirdMode; perMinute: number; loudness: number; season?: BirdSeason };
  falls: number;
  rain: number;
  /** The loudest component, 0..1, for sorting and thresholds. */
  loudness: number;
}

/**
 * Water heard through a doorway or a wall: not events but a steady, muffled presence of the sea or of falling water in the next hall,
 * which pulses with the swell. Only the sound engine uses it (the narrator speaks of `portals`).
 */
export interface Bed {
  key: string;
  side: Side;
  /** Where the opening is relative to the way you face (the engine places the sound in 3D from this). */
  bearing: Bearing;
  pan: number;
  az?: number;
  lowpassHz: number;
  /** The sea next door beyond what is heard here, 0..1. */
  sea: number;
  /** Falling water next door, 0..1. */
  falls: number;
}

/** One leak, as heard: where it is from where you stand, how fast it drips, how loud it is for how far, and the pitch of its drops. */
export interface Leak { key: string; az: number; el: number; perMin: number; gain: number; pitch: number; /** Falls into water (a bubble's "bloop") rather than onto stone (a click and a ring). */ wet: boolean }

export interface AudioOpts {
  /** Where the visitor is in the hall and which way they head (see pose.ts): sounds then follow them through it, not only from hall to hall. */
  pose?: Pose;
  /** The way you face (the way you last walked); doors are placed to your left, right, ahead or behind. */
  facing?: Side | null;
  /** Compute what arrives through the doorways (default true). */
  portals?: boolean;
}

export interface AudioScene {
  reverb: { decaySec: number; wet: number; dampHz: number };
  /** The sea heard through the floor. */
  sea: { gain: number; lowpassHz: number; swellSec: number };
  tide: { kind: TideSound; gain: number; character: string | null; strikeEverySec: number };
  /** Falling and running fresh water here, and which way it is from where you face (it has a place in the hall: it stays put as you turn). */
  /** The water running away along the floor: the stream the fall makes (or the rain's stream where there is no fall), a trickle to a river as its flow grows. `flow` is 1 on an ordinary day. */
  stream?: { flow: number; /** No fall in this hall: this stream is all the running water there is. */ solo: boolean; near: number; dist: number; bearing: Bearing; pan: number; az?: number };
  falls: { gain: number; /** The water itself, before distance: how much falls (0.3 an ordinary day). The sound's character follows this. */ amount: number; /** How near it is, as a loudness factor (1 at the foot, down to 0.3 across a huge floor), and how far, in metres. */ near: number; dist: number; bearing: Bearing; /** -1..1 along the wall when it is ahead, as for doors. */ pan: number; /** From where you stand, in degrees from straight ahead (+ right), when your place in the hall is known. */ az?: number };
  /** Rain, and how much of it lands on water (a hall the tide has flooded, falls or a stream, the lower halls by the sea): 0..1. */
  rain: { gain: number; onWater: number };
  wind: { gain: number; whistle: number; /** Metres a second at 10 m (1000 of the weather's scale is 36 mph): the character and the whistles' pitch follow it. */ mps?: number };
  birds: { mode: BirdMode; perMinute: number; loudness: number; species: string[]; season: BirdSeason };
  /** 0..1: how much high frequency is taken away (cloud, water over the head). */
  muffle: number;
  /** The Drowned Halls are unusually silent. */
  hush: boolean;
  /** No light at all (the dark hall). */
  dark: boolean;
  surface: Surface;
  /** Rough size of the space for the narrator. */
  space: 'small' | 'large' | 'vast';
  /** Thunder, 0..1: how much of a storm's thunder reaches here (the upper halls, open to the sky, hear it most). */
  thunder: number;
  /** The leaks that can be heard from where you stand: each a fixed point in the hall, dripping at its own pitch and rate (the weather sets the rate). */
  leaks: Leak[];
  /** Water running down the great stair (rain streams, or a tide draining back down it), and where the stair is from where you stand. */
  stairs: { flow: number; cause: 'rain' | 'drain' | null; bearing: Bearing; az?: number };
  /** The state of the water, from the weather so far: how much a fall carries, how often water drips, whether the stores overflow (for the engine). */
  water: { flow: number; dripping: number; overflow: number; runoff: number; streams: number };
  /** What drifts in through the doorways from the neighbouring halls, loudest first. */
  portals: Portal[];
  /** The steady wash of sea and falling water from the neighbouring halls (for the engine only). */
  beds: Bed[];
  /** A rare hint of a world outside, happening now in this hall. */
  outside: { kind: OutsideKind; gain: number; id: string; bearing: Bearing } | null;
}

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

/** Which wall a stream runs down (streams have no wall of their own): a fixed choice for each hall, so it stays put as you turn. */
export function fallSide(x: number, y: number, level: number): Side {
  const h = (Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ Math.imul(level + 1, 83492791)) >>> 0;
  return (['N', 'E', 'S', 'W'] as const)[(h >>> 7) % 4] as Side;
}

/** A neighbouring hall heard through one doorway: a fraction of its level. */
const DOOR_ATTEN = 0.45;
/** At this distance (metres, about 130 ft) a doorway is heard at half its closest loudness. */
const DOOR_REACH_M = 40;
/** The same for the water of a fall, which carries further across a hall. */
const FALLS_REACH_M = 30;
/** The sea and tide come up the stairs: a little louder near them, a little softer across the floor. */
const STAIR_REACH_M = 40;
/** Water down the stair carries about as far across a hall as a fall does. */
const STAIR_WATER_REACH_M = 35;
/** From this depth (decimetres) the water is over a person's head: the tide is 'submerged' (see the tide sounds). */
const SUBMERGED_DM = 16;
/** A drip is quiet: heard at half its closest loudness 60 ft away, and the nearest few are all there is room to hear. */
const LEAK_REACH_M = 18;
const MAX_LEAKS = 4;
const MAX_PORTALS = 10;

function portalsFor(world: World, s: SceneState, facing: Side | null, ownSea: number, pose?: Pose): { portals: Portal[]; beds: Bed[] } {
  const beds: Bed[] = [];
  const h = s.hall;
  const heard = new Map<string, AudioScene>();
  const out: Portal[] = [];
  const merged = new Set<string>();
  const doors = hallExits(world, h.x, h.y, h.level).filter((e) => e.corridor === 0); // a long passage swallows what is beyond
  for (const e of doors) {
    // several doors in one wall to the same hall are one source of sound: one portal, at the middle of them
    const wallKey = `${e.side}:${e.to.x},${e.to.y}`;
    if (merged.has(wallKey)) continue;
    merged.add(wallKey);
    const same = doors.filter((d) => d.side === e.side && d.to.x === e.to.x && d.to.y === e.to.y);
    const midPos = Math.round(same.reduce((n, d) => n + d.pos, 0) / same.length);
    // where the door is from where you stand: loud and ahead as you walk toward it, beside you as you pass, faint and behind as you leave it
    const at = wallPoint(h, e.side, midPos);
    const az = pose ? azimuthTo(pose, at) : undefined;
    const k = pose ? proximity(distanceTo(pose, at), DOOR_REACH_M, 1.9, 0.25) : 1;
    const dirOf = (): Bearing => (az !== undefined ? bearingFromAz(az) : bearing(e.side, facing));
    const muffle = (b: Bearing): number => (az !== undefined ? 2400 - 1300 * (Math.abs(az) / 180) : b === 'behind' ? 1100 : b === 'ahead' ? 2400 : 1800);
    const key = `${e.to.x},${e.to.y}`;
    let a = heard.get(key);
    if (!a) {
      a = audioFor(world, sceneAtWorldTime(world, e.to.x, e.to.y, h.level, s.t, { forecast: false }), { portals: false, facing });
      heard.set(key, a);
    }
    if (a.hush) continue;
    {
      // the sea (or a waterfall) in the next hall, heard through the opening or the wall
      const sea = (a.sea.gain > ownSea + 0.05 ? (a.sea.gain - ownSea * 0.5) * DOOR_ATTEN : 0) * k;
      const fl = a.falls.gain * DOOR_ATTEN * k;
      if (sea > 0.03 || fl > 0.03) {
        const bb = dirOf();
        beds.push({ key: `${e.side}:${e.to.x},${e.to.y}`, side: e.side, bearing: bb, pan: bb === 'left' ? -0.85 : bb === 'right' ? 0.85 : bb === 'ahead' ? (midPos - 500) / 1500 : 0, az, lowpassHz: muffle(bb), sea, falls: fl });
      }
    }
    if (a.dark) continue;
    const tideKind = a.tide.kind === 'booming' || a.tide.kind === 'submerged' ? 'booming' : a.tide.kind === 'approach' ? 'approach' : 'none';
    const tideGain = tideKind === 'none' ? 0 : Math.min(1, a.tide.gain * DOOR_ATTEN * (tideKind === 'booming' ? 1 : 0.8) * k);
    const birdLoud = a.birds.perMinute > 0 ? a.birds.loudness * DOOR_ATTEN * k : 0;
    const falls = a.falls.gain * DOOR_ATTEN * k;
    const rain = a.rain.gain * DOOR_ATTEN * k;
    const loudness = Math.max(tideGain, birdLoud, falls * 1.4, rain * 1.4);
    if (loudness < 0.06) continue;
    const b = dirOf();
    const pan = b === 'left' ? -0.85 : b === 'right' ? 0.85 : b === 'ahead' ? (midPos - 500) / 1500 : 0;
    out.push({
      side: e.side, pos: midPos, toName: getName(world, e.to.x, e.to.y, h.level), bearing: b, pan, az,
      lowpassHz: muffle(b),
      tide: { kind: tideKind, gain: tideGain },
      birds: { mode: a.birds.mode, perMinute: birdLoud > 0 ? a.birds.perMinute : 0, loudness: birdLoud, season: a.birds.season },
      falls, rain, loudness,
    });
  }
  return { portals: out.sort((x, y) => y.loudness - x.loudness).slice(0, MAX_PORTALS), beds: beds.sort((x, y) => y.sea + y.falls - x.sea - x.falls).slice(0, 4) };
}

function getName(world: World, x: number, y: number, level: 0 | 1 | 2): string {
  return getHall(world, x, y, level).name;
}

export function audioFor(world: World, s: SceneState, opts: AudioOpts = {}): AudioScene {
  const h = s.hall;
  const pose = opts.pose;
  const facing: Side | null = pose ? sideOfHeading(pose.heading) : opts.facing ?? null; // for the parts that still think in four directions
  const drowned = h.regions.drowned && h.level === 1;
  const dark = h.tags.includes('dark-hall');

  // --- reverb: marble is nearly reflective, so a literal Sabine figure is far too long. Map room volume (m^3, roughly
  // 1e5 to 1e7) logarithmically onto 2.5..9 seconds instead: about 5 s in an ordinary hall, 7 s in a great vestibule. ---
  const volume = h.xExtent * h.yExtent * h.heightM;
  const decaySec = clamp(2.5 + 3.25 * (Math.log10(volume) - 5), 2.5, 9);
  const space: AudioScene['space'] = volume < 400_000 ? 'small' : volume < 900_000 ? 'large' : 'vast';
  const cloudy = s.here.cloudHere;
  const reverb = {
    decaySec: drowned ? 3 : cloudy > 400 ? decaySec * 0.6 : decaySec,
    wet: drowned ? 0.2 : dark ? 0.5 : 0.34,
    dampHz: cloudy > 400 ? 2200 : drowned ? 3500 : 5200,
  };

  // --- the sea: loud in the lower halls, near the stairs, quiet far from any vestibule, absent in the lake ---
  let nearest = 9;
  for (const v of nearbyVestibules(world, h.x, h.y)) nearest = Math.min(nearest, v.rooms);
  let seaGain = h.level === 0 ? 0.8 : h.level === 2 ? 0.08 : nearest <= 2 ? [0.5, 0.36, 0.26][nearest] as number : 0.16;
  if (drowned) seaGain = 0;
  if (dark) seaGain = 0.12;
  const seaLow = h.level === 0 ? 1800 : h.level === 2 ? 300 : 700;

  // --- tides ---
  let tideKind: TideSound = 'none';
  let tideGain = 0;
  const depth = s.tide.depthDm;
  if (!drowned && !dark) {
    if (depth > 0) {
      tideKind = depth >= 16 ? 'submerged' : 'booming';
      tideGain = clamp(0.3 + depth / 40, 0.3, 1);
    } else if (s.nextTide && s.nextTide.startMs - s.t <= 6 * 60_000) {
      tideKind = 'approach';
      tideGain = clamp(0.5 - (s.nextTide.startMs - s.t) / (12 * 60_000), 0.1, 0.5);
    }
  }
  const strike = depth > 0 ? clamp(Math.round(14 - depth / 3), 4, 12) : 8;

  // the sea and the tides come up the stairs: a little louder near them, a little softer across a huge floor
  if (pose && h.stairs.length > 0) {
    const d = Math.min(...h.stairs.map((st) => distanceTo(pose, wallPoint(h, st.wall, st.pos))));
    const near = 0.7 + 0.6 * (STAIR_REACH_M / (STAIR_REACH_M + d));
    seaGain = Math.min(1, seaGain * near);
    tideGain = Math.min(1, tideGain * near);
  }

  // --- weather ---
  // The water follows the weather, but not at once: rain runs off in hours and fills the stores over days (see sim/hydrology.ts). A fall
  // thins in a dry spell and swells after rain; rain streams run down the stairs and walls of the open halls while it runs off.
  const hy = hydrologyAt(world, s.t);
  const falls = !drowned && h.falls ? 0.3 * hy.flow : 0;
  const openToRain = h.kind === 'vestibule' || h.level === 2 || h.regions.cloud;
  const streamy = !dark && !h.falls && (s.here.streams || (openToRain && hy.streams > 0.12));
  const streams = streamy && !drowned ? 0.18 * Math.max(0.5, Math.min(1.6, 0.5 + 1.3 * hy.streams)) : 0;
  // where the water is: a fall runs down a known wall (the hall says which, and where along it); a stream has no wall, so it gets a fixed one
  const fallWall = h.falls ? h.falls.wall : fallSide(h.x, h.y, h.level);
  const fallMid = h.falls ? (h.falls.from + h.falls.to) / 2 : 500;
  let fallAz: number | undefined;
  let fallNear = 1; // louder near the wall the water runs down, a far murmur across a huge floor
  let fallDist = 5;
  if (pose) {
    const pt = nearestOnWall(h, fallWall, h.falls ? h.falls.from : 400, h.falls ? h.falls.to : 600, pose);
    fallAz = azimuthTo(pose, pt);
    fallDist = distanceTo(pose, pt);
    fallNear = proximity(fallDist, FALLS_REACH_M, 1.7, 0.3);
  }
  // the channel: below a fall the water runs away across the floor; where there is no fall, rain's stream is the only running water
  const streamFlow = drowned || dark ? 0 : h.falls ? hy.flow * 0.8 : streamy ? (streams / 0.18) * 1.1 : 0;
  const fallBearing = fallAz !== undefined ? bearingFromAz(fallAz) : bearing(fallWall, facing);
  // The Drowned Halls are cut off: windows half-submerged or choked with rubble, so little weather reaches them.
  // How much of the rain outside is heard, by where you are: the upper halls have half a roof, so they hear all of it; a
  // vestibule is open to the courtyards and hears it all; an ordinary hall hears it through its windows; the lower halls hear
  // only a hiss, through the sea; the Drowned Halls are mostly cut off. Snow makes none, only a soft hush.
  const w = s.weather;
  const raining = w.precip === 'rain' ? w.rain / 1000 : 0;
  const rainSeen = dark ? 0 : h.level === 2 ? raining : h.level === 0 ? raining * 0.15 : h.kind === 'vestibule' ? raining : Math.max(s.here.rainHere / 1000, raining * 0.3);
  const rain = clamp(rainSeen * (drowned ? 0.2 : 0.75), 0, 0.75);
  const snowing = w.precip === 'snow' && !dark && !drowned && h.level !== 0 && (h.level === 2 || h.kind === 'vestibule') ? clamp(w.rain / 1000, 0, 1) : 0;
  const thunderBase = h.level === 2 ? 1 : h.level === 0 ? 0.25 : h.kind === 'vestibule' ? 0.8 : 0.5;
  const thunder = dark || drowned ? 0 : w.lightning ? thunderBase : w.storm ? thunderBase * 0.35 : 0;
  const exposed = !drowned && (h.kind === 'vestibule' || h.regions.cloud || h.level === 2 || h.regions.derelict >= 60);
  const windGain = exposed ? clamp(0.04 + (s.weather.windSpeed / 1000) * 0.5, 0, 0.55) : clamp((s.weather.windSpeed / 1000) * (drowned ? 0.02 : 0.08), 0, 0.1);
  const whistle = exposed && s.weather.windSpeed > 400 ? clamp((s.weather.windSpeed - 400) / 1000, 0, 0.5) : 0;

  // --- birds ---
  const b = s.birds;
  const birds = { mode: b.mode, perMinute: b.mode === 'silent' || b.mode === 'none' ? 0 : Math.round((b.loudness / 1000) * 24), loudness: b.loudness / 1000, species: b.species, season: b.season };

  const muffle = clamp((cloudy / 1000) * 0.35 + (s.here.fogHere / 1000) * 0.2 + (tideKind === 'submerged' ? 0.9 : 0) + snowing * 0.25, 0, 0.95);
  const surface: Surface = depth >= 4 ? 'shallow' : depth > 0 ? 'wet' : snowing > 0.3 ? 'snow' : h.regions.derelict >= 60 ? 'rubble' : 'marble';

  // --- water on the stair: rain streams (the open halls) and the drain of a tide, the two things that make it run ---
  let stairsFlow = 0, stairsCause: 'rain' | 'drain' | null = null, stairAz: number | undefined, stairBearing: Bearing = 'ahead';
  if (h.stairs.length > 0 && !drowned && !dark) {
    const rain = hy.streams * (openToRain ? 1 : 0.35) * 0.8;
    // water runs down the stair while a tide drains through the shallows; once it is over your head the stair is under it and there is nothing to hear running
    const submerged = s.tide.depthDm >= SUBMERGED_DM;
    const drain = s.tide.depthDm > 0 && !submerged && s.tide.trend === 'falling' ? Math.min(1.2, 0.5 + s.tide.depthDm / 40) : 0;
    stairsFlow = submerged ? 0 : Math.max(rain, drain);
    stairsCause = stairsFlow < 0.05 ? null : drain > rain ? 'drain' : 'rain';
    if (stairsCause === null) stairsFlow = 0;
    const near = pose
      ? h.stairs.map((st) => ({ st, p: wallPoint(h, st.wall, st.pos) })).sort((a, b) => distanceTo(pose, a.p) - distanceTo(pose, b.p))[0]!
      : { st: h.stairs[0]!, p: null };
    if (pose && near.p) {
      stairAz = azimuthTo(pose, near.p);
      stairBearing = bearingFromAz(stairAz);
      stairsFlow *= proximity(distanceTo(pose, near.p), STAIR_WATER_REACH_M, 1.8, 0.25);
    } else stairBearing = bearing(near.st.wall, facing);
  }

  // --- leaks: fixed points that drip; the stone drips more while it is wet (hydrology), hardly at all in the hushed halls ---
  const listener = pose ?? { x: h.xExtent / 2, y: h.yExtent / 2, heading: opts.facing ? headingOf(opts.facing) : 0 };
  const leakRate = drowned ? 0.1 : dark ? 0.6 : hy.dripping;
  // A drop is only heard against quiet: running water (falls, a stream on the stairs, a downpour) buries it, and a drop only "bloops" where there is
  // still water to fall into (a flooded floor), otherwise it lands on stone.
  const masking = Math.min(1, Math.max((falls + streams) * fallNear * 0.9, stairsFlow * 0.8, rain * 0.9));
  const standing = depth > 0 || drowned;
  const leaks: Leak[] = leaksOf(world, h).map((l) => {
    const dx = l.x - listener.x, dy = l.y - listener.y, horiz = Math.hypot(dx, dy), dz = l.z - 1.6;
    const dist = Math.hypot(horiz, dz);
    return { key: l.id, az: azimuthTo(listener, l), el: (Math.atan2(dz, Math.max(0.5, horiz)) * 180) / Math.PI, perMin: l.perMin * leakRate, gain: proximity(dist, LEAK_REACH_M, 1.5, 0) * (1 - 0.92 * masking), pitch: l.pitch, wet: l.wet && standing };
  }).filter((l) => l.gain > 0.08).sort((a, b) => b.gain * Math.sqrt(b.perMin) - a.gain * Math.sqrt(a.perMin)).slice(0, MAX_LEAKS);

  const through = opts.portals === false ? { portals: [] as Portal[], beds: [] as Bed[] } : portalsFor(world, s, facing, seaGain, pose);
  return {
    reverb,
    sea: { gain: seaGain, lowpassHz: seaLow, swellSec: h.level === 0 ? 7 : 11 },
    tide: { kind: tideKind, gain: tideGain, character: s.tide.character?.sound ?? null, strikeEverySec: strike },
    stream: streamFlow > 0.02 ? { flow: streamFlow, solo: !h.falls, near: fallNear, dist: fallDist, bearing: fallBearing, pan: fallBearing === 'ahead' && !pose ? (fallMid - 500) / 1500 + 0.4 : 0, az: fallAz !== undefined ? fallAz + (h.falls ? 40 : 0) : undefined } : undefined,
    falls: { gain: (falls + streams) * fallNear, amount: falls + streams, near: fallNear, dist: fallDist, bearing: fallBearing, pan: fallBearing === 'ahead' && !pose ? (fallMid - 500) / 1500 : 0, az: fallAz },
    rain: { gain: rain, onWater: depth > 0 ? 1 : h.level === 0 ? 0.7 : h.falls || s.here.streams ? 0.6 : 0 },
    wind: { gain: windGain * (1 - snowing * 0.4), whistle, mps: (s.weather.windSpeed / 1000) * 16.1 },
    thunder,
    birds,
    muffle,
    hush: drowned,
    dark,
    surface,
    space,
    leaks,
    stairs: { flow: stairsFlow, cause: stairsCause, bearing: stairBearing, az: stairAz },
    water: { flow: hy.flow, dripping: hy.dripping, overflow: hy.overflow, runoff: hy.runoff, streams: hy.streams },
    portals: through.portals,
    beds: through.beds,
    outside: s.outside ? { kind: s.outside.event.kind, gain: s.outside.gain, id: s.outside.id, bearing: bearing(s.outside.event.wall, facing) } : null,
  };
}
