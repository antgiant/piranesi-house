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

export type Surface = 'marble' | 'wet' | 'shallow' | 'rubble';
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
  pan: number;
  lowpassHz: number;
  /** The sea next door beyond what is heard here, 0..1. */
  sea: number;
  /** Falling water next door, 0..1. */
  falls: number;
}

export interface AudioOpts {
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
  falls: { gain: number };
  rain: { gain: number };
  wind: { gain: number; whistle: number };
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
  /** What drifts in through the doorways from the neighbouring halls, loudest first. */
  portals: Portal[];
  /** The steady wash of sea and falling water from the neighbouring halls (for the engine only). */
  beds: Bed[];
  /** A rare hint of a world outside, happening now in this hall. */
  outside: { kind: OutsideKind; gain: number; id: string; bearing: Bearing } | null;
}

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

/** A neighbouring hall heard through one open door: a fraction of its level. */
const DOOR_ATTEN = 0.45;
const MAX_PORTALS = 10;

function portalsFor(world: World, s: SceneState, facing: Side | null, ownSea: number): { portals: Portal[]; beds: Bed[] } {
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
    const key = `${e.to.x},${e.to.y}`;
    let a = heard.get(key);
    if (!a) {
      a = audioFor(world, sceneAtWorldTime(world, e.to.x, e.to.y, h.level, s.t, { forecast: false }), { portals: false, facing });
      heard.set(key, a);
    }
    if (a.hush) continue;
    {
      // the sea (or a waterfall) in the next hall, heard through the opening or the wall
      const sea = a.sea.gain > ownSea + 0.05 ? (a.sea.gain - ownSea * 0.5) * DOOR_ATTEN : 0;
      const fl = a.falls.gain * DOOR_ATTEN;
      if (sea > 0.03 || fl > 0.03) {
        const bb = bearing(e.side, facing);
        beds.push({ key: `${e.side}:${e.to.x},${e.to.y}`, side: e.side, pan: bb === 'left' ? -0.85 : bb === 'right' ? 0.85 : bb === 'ahead' ? (midPos - 500) / 1500 : 0, lowpassHz: bb === 'behind' ? 1100 : bb === 'ahead' ? 2400 : 1800, sea, falls: fl });
      }
    }
    if (a.dark) continue;
    const tideKind = a.tide.kind === 'booming' || a.tide.kind === 'submerged' ? 'booming' : a.tide.kind === 'approach' ? 'approach' : 'none';
    const tideGain = tideKind === 'none' ? 0 : a.tide.gain * DOOR_ATTEN * (tideKind === 'booming' ? 1 : 0.8);
    const birdLoud = a.birds.perMinute > 0 ? a.birds.loudness * DOOR_ATTEN : 0;
    const falls = a.falls.gain * DOOR_ATTEN;
    const rain = a.rain.gain * DOOR_ATTEN;
    const loudness = Math.max(tideGain, birdLoud, falls * 1.4, rain * 1.4);
    if (loudness < 0.06) continue;
    const b = bearing(e.side, facing);
    const pan = b === 'left' ? -0.85 : b === 'right' ? 0.85 : b === 'ahead' ? (midPos - 500) / 1500 : 0;
    out.push({
      side: e.side, pos: midPos, toName: getName(world, e.to.x, e.to.y, h.level), bearing: b, pan,
      lowpassHz: b === 'behind' ? 1100 : b === 'ahead' ? 2400 : 1800,
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

  // --- weather ---
  const falls = !drowned && h.falls ? 0.3 : 0;
  const streams = s.here.streams && !h.falls ? 0.18 : 0;
  // The Drowned Halls are cut off: windows half-submerged or choked with rubble, so little weather reaches them.
  // How much of the rain outside is heard, by where you are: the upper halls have half a roof, so they hear all of it; a
  // vestibule is open to the courtyards and hears it all; an ordinary hall hears it on its windows; the lower halls hear
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

  const muffle = clamp((cloudy / 1000) * 0.35 + (tideKind === 'submerged' ? 0.9 : 0) + snowing * 0.25, 0, 0.95);
  const surface: Surface = depth >= 4 ? 'shallow' : depth > 0 ? 'wet' : h.regions.derelict >= 60 ? 'rubble' : 'marble';

  const through = opts.portals === false ? { portals: [] as Portal[], beds: [] as Bed[] } : portalsFor(world, s, opts.facing ?? null, seaGain);
  return {
    reverb,
    sea: { gain: seaGain, lowpassHz: seaLow, swellSec: h.level === 0 ? 7 : 11 },
    tide: { kind: tideKind, gain: tideGain, character: s.tide.character?.sound ?? null, strikeEverySec: strike },
    falls: { gain: falls + streams },
    rain: { gain: rain },
    wind: { gain: windGain * (1 - snowing * 0.4), whistle },
    thunder,
    birds,
    muffle,
    hush: drowned,
    dark,
    surface,
    space,
    portals: through.portals,
    beds: through.beds,
    outside: s.outside ? { kind: s.outside.event.kind, gain: s.outside.gain, id: s.outside.id, bearing: bearing(s.outside.event.wall, opts.facing ?? null) } : null,
  };
}
