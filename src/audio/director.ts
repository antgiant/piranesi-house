// The audio director: a pure function from SceneState to a description of the soundscape. The Web Audio engine realises
// it, and the narrator reads it back as prose ("listen"), so what you hear and what you read cannot disagree.

import type { SceneState } from '../sim/scene';
import type { BirdMode } from '../sim/light';
import { nearbyVestibules } from '../world/tidegeo';
import type { World } from '../world/world';

export type Surface = 'marble' | 'wet' | 'shallow' | 'rubble';
export type TideSound = 'none' | 'approach' | 'booming' | 'submerged';

export interface AudioScene {
  reverb: { decaySec: number; wet: number; dampHz: number };
  /** The sea heard through the floor. */
  sea: { gain: number; lowpassHz: number; swellSec: number };
  tide: { kind: TideSound; gain: number; character: string | null; strikeEverySec: number };
  falls: { gain: number };
  rain: { gain: number };
  wind: { gain: number; whistle: number };
  birds: { mode: BirdMode; perMinute: number; loudness: number; species: string[] };
  /** 0..1: how much high frequency is taken away (cloud, water over the head). */
  muffle: number;
  /** The Drowned Halls are unusually silent. */
  hush: boolean;
  /** No light at all (the dark hall). */
  dark: boolean;
  surface: Surface;
  /** Rough size of the space for the narrator. */
  space: 'small' | 'large' | 'vast';
}

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

export function audioFor(world: World, s: SceneState): AudioScene {
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
  const rain = clamp((s.here.rainHere / 1000) * 0.75, 0, 0.75);
  const exposed = h.kind === 'vestibule' || h.regions.cloud || h.level === 2 || h.regions.derelict >= 60;
  const windGain = exposed ? clamp(0.04 + (s.weather.windSpeed / 1000) * 0.5, 0, 0.55) : clamp((s.weather.windSpeed / 1000) * 0.08, 0, 0.1);
  const whistle = exposed && s.weather.windSpeed > 400 ? clamp((s.weather.windSpeed - 400) / 1000, 0, 0.5) : 0;

  // --- birds ---
  const b = s.birds;
  const birds = { mode: b.mode, perMinute: b.mode === 'silent' || b.mode === 'none' ? 0 : Math.round((b.loudness / 1000) * 24), loudness: b.loudness / 1000, species: b.species };

  const muffle = clamp((cloudy / 1000) * 0.35 + (tideKind === 'submerged' ? 0.9 : 0), 0, 0.95);
  const surface: Surface = depth >= 4 ? 'shallow' : depth > 0 ? 'wet' : h.regions.derelict >= 60 ? 'rubble' : 'marble';

  return {
    reverb,
    sea: { gain: seaGain, lowpassHz: seaLow, swellSec: h.level === 0 ? 7 : 11 },
    tide: { kind: tideKind, gain: tideGain, character: s.tide.character?.sound ?? null, strikeEverySec: strike },
    falls: { gain: falls + streams },
    rain: { gain: rain },
    wind: { gain: windGain, whistle },
    birds,
    muffle,
    hush: drowned,
    dark,
    surface,
    space,
  };
}
