// Weather: smooth value-noise in time, seeded, with seasonal bias. Integer maths only so every machine agrees.

import type { Hall } from '../world/hall';
import type { Ray } from '../world/layout';
import { hashInts } from '../world/rng';
import type { World } from '../world/world';
import { MS, clock, floorDiv, floorMod, seasonalTempTenths, type Season } from './time';

export interface Weather {
  /** Cloud cover of the upper level, 0..1000. */
  cloud: number;
  /** Rain in the vestibules, 0..1000. */
  rain: number;
  windDir: Ray;
  /** 0..1000 */
  windSpeed: number;
  /** A strong wind from the west: tides are disturbed and the fish are driven far out. */
  storm: boolean;
  /** Tenths of a degree C. */
  tempTenths: number;
  precip: 'none' | 'rain' | 'snow';
  lightning: boolean;
  /** Winter cold: statues wear snow, arms hold icicles. */
  frost: boolean;
}

const smooth = (x: number): number => Math.floor((x * x * (3000 - 2 * x)) / 1_000_000);

/** Smooth noise 0..1000 with a node every `nodeMs`. */
function noise(world: World, channel: number, t: number, nodeMs: number): number {
  const i = floorDiv(t, nodeMs);
  const frac = Math.floor((floorMod(t, nodeMs) * 1000) / nodeMs);
  const a = hashInts(world.seed, 0x3ea7, channel, i) % 1001;
  const b = hashInts(world.seed, 0x3ea7, channel, i + 1) % 1001;
  return a + Math.floor(((b - a) * smooth(frac)) / 1000);
}

const clamp = (v: number, lo = 0, hi = 1000): number => Math.max(lo, Math.min(hi, v));

const WIND_BY_SEASON: Record<Season, readonly (readonly [Ray, number])[]> = {
  winter: [['S', 22], ['SW', 14], ['W', 20], ['NW', 10], ['N', 12], ['NE', 6], ['E', 8], ['SE', 8]],
  spring: [['S', 12], ['SW', 14], ['W', 16], ['NW', 12], ['N', 12], ['NE', 12], ['E', 11], ['SE', 11]],
  summer: [['S', 12], ['SW', 16], ['W', 18], ['NW', 14], ['N', 10], ['NE', 10], ['E', 10], ['SE', 10]],
  autumn: [['S', 14], ['SW', 16], ['W', 18], ['NW', 12], ['N', 10], ['NE', 10], ['E', 10], ['SE', 10]],
};

function windDirAt(world: World, t: number): Ray {
  const i = floorDiv(t, 12 * MS.hour);
  const season = clock(i * 12 * MS.hour).season;
  const list = WIND_BY_SEASON[season];
  let total = 0;
  for (const [, w] of list) total += w;
  let r = hashInts(world.seed, 0x31d0, i) % total;
  for (const [d, w] of list) {
    if (r < w) return d;
    r -= w;
  }
  return 'W';
}

export function weatherAt(world: World, t: number): Weather {
  const c = clock(t);
  const winterness = Math.floor((250 * (seasonalDist2(c.dayOfYear))) / 365); // 0 midsummer .. 250 midwinter
  const cloud = clamp(noise(world, 1, t, 6 * MS.hour) - 100 + winterness);
  const rainRaw = noise(world, 2, t, 18 * MS.hour);
  // The climate of a temperate coast: wettest in autumn and winter, driest in summer, and wild weather coming in the cold months.
  const rainThreshold = c.season === 'winter' ? 560 : c.season === 'autumn' ? 540 : c.season === 'spring' ? 600 : 660;
  const rain = cloud >= 600 ? clamp((rainRaw - rainThreshold) * 3) : 0;
  const windDir = windDirAt(world, t);
  const n = noise(world, 3, t, 8 * MS.hour);
  const windSpeed = clamp(Math.floor((n * n) / 1000) + (c.season === 'winter' ? 60 : c.month >= 10 ? 40 : 0));
  const storm = windSpeed >= 750 && (windDir === 'W' || windDir === 'SW' || windDir === 'NW');
  const tempTenths = seasonalTempTenths(c.dayOfYear) + Math.floor(((noise(world, 4, t, 24 * MS.hour) - 500) * 40) / 500) + dailyTempSwing(c.minuteOfDay, c.season);
  const precip: Weather['precip'] = rain > 0 ? (tempTenths <= 10 ? 'snow' : 'rain') : 'none';
  const minute = floorDiv(t, MS.min);
  // thunderstorms belong to the warm months: common in summer, uncommon in spring and autumn, almost unknown in winter
  const lightningChance = c.season === 'summer' ? 30 : c.season === 'winter' ? 3 : 12;
  const lightning = rain >= 500 && cloud >= 800 && windSpeed >= 500 && hashInts(world.seed, 0x11a9, minute) % 1000 < lightningChance;
  const frost = c.season === 'winter' && tempTenths <= 20;
  return { cloud, rain, windDir, windSpeed, storm, tempTenths, precip, lightning, frost };
}

/**
 * The warming and cooling of the day, in tenths of a degree: coolest about 03:00, warmest about 15:00, a bigger swing in summer than winter.
 * Integer maths only (a smoothed triangle), so every machine agrees.
 */
export function dailyTempSwing(minuteOfDay: number, season: Season): number {
  const amp = season === 'summer' ? 55 : season === 'spring' ? 45 : season === 'autumn' ? 40 : 25;
  const x = floorMod(minuteOfDay - 900, 1440);
  const dist = Math.min(x, 1440 - x); // 0 at 15:00 .. 720 at 03:00
  return Math.floor((amp * (1000 - 2 * smooth(Math.floor((dist * 1000) / 720)))) / 1000);
}

function seasonalDist2(dayOfYear: number): number {
  const d = Math.abs(dayOfYear - 172);
  return 2 * Math.min(d, 365 - d);
}

/** How strongly the wind is from the south, 0..1000. Raises high tides and lowers lows (canon T-013). */
export function southness(w: Weather): number {
  if (w.windDir === 'S') return w.windSpeed;
  if (w.windDir === 'SE' || w.windDir === 'SW') return Math.floor((w.windSpeed * 7) / 10);
  return 0;
}

export interface LocalWeather {
  /** Cloud filling this hall, 0..1000. */
  cloudHere: number;
  /** Rain falling in this hall, 0..1000. */
  rainHere: number;
  /** Fresh water running down the walls here. */
  streams: boolean;
}

export function localWeather(hall: Hall, w: Weather): LocalWeather {
  let cloudHere = 0;
  if (hall.level === 2) cloudHere = w.cloud >= 500 ? w.cloud : Math.floor(w.cloud / 3);
  else if (hall.level === 1 && hall.regions.cloud) cloudHere = Math.max(300, Math.floor((w.cloud * 9) / 10));
  const dark = hall.tags.includes('dark-hall');
  let rainHere = 0;
  if (!dark && w.rain > 0) {
    if (hall.kind === 'vestibule' && hall.level !== 0) rainHere = w.rain;
    else if (hall.level === 2 && w.cloud >= 600) rainHere = Math.floor(w.rain / 2);
    else if (hall.falls) rainHere = Math.floor(w.rain / 4);
  }
  const streams = !dark && (hall.falls !== null || rainHere > 100);
  return { cloudHere, rainHere, streams };
}
