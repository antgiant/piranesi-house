// World time. The world clock is a pure function of real time and a time-scale, so every visitor who agrees on the
// two numbers sees the same tide, weather and sky. Integer maths throughout.

import { hashInts } from '../world/rng';
import type { World } from '../world/world';

export const MS = { sec: 1000, min: 60_000, hour: 3_600_000, day: 86_400_000 } as const;
export const YEAR_DAYS = 365;
export const YEAR_MS = YEAR_DAYS * MS.day;
/** The tides' grand cycle: the three-tide join recurs exactly once in this span (canon T-006). */
export const Y8_MS = 8 * YEAR_MS;
export const REAL_ZERO_MS = Date.UTC(2026, 0, 1);

export interface SimConfig {
  /** In-world seconds per real second. 1 = real time. */
  timeScale: number;
  /** The real instant that maps to world time zero. Part of the room's agreement in multiplayer. */
  realZeroMs: number;
}
export const defaultSimConfig: SimConfig = { timeScale: 1, realZeroMs: REAL_ZERO_MS };

/** World time in milliseconds since the world epoch. */
export const worldTime = (cfg: SimConfig, realMs: number): number => Math.floor((realMs - cfg.realZeroMs) * cfg.timeScale);

export const floorMod = (a: number, b: number): number => ((a % b) + b) % b;
export const floorDiv = (a: number, b: number): number => Math.floor(a / b);

const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;
export type Season = 'winter' | 'spring' | 'summer' | 'autumn';

export interface Clock {
  year: number;
  /** 1..12 */
  month: number;
  /** 1..31 */
  day: number;
  /** 0..364 */
  dayOfYear: number;
  hour: number;
  minute: number;
  minuteOfDay: number;
  season: Season;
}

export function clock(t: number): Clock {
  const days = floorDiv(t, MS.day);
  const msOfDay = floorMod(t, MS.day);
  const year = 2026 + floorDiv(days, YEAR_DAYS);
  const dayOfYear = floorMod(days, YEAR_DAYS);
  let month = 1;
  let left = dayOfYear;
  for (const len of MONTH_DAYS) {
    if (left < len) break;
    left -= len;
    month++;
  }
  const minuteOfDay = Math.floor(msOfDay / MS.min);
  const season: Season = month === 12 || month <= 2 ? 'winter' : month <= 5 ? 'spring' : month <= 8 ? 'summer' : 'autumn';
  return { year, month, day: left + 1, dayOfYear, hour: Math.floor(minuteOfDay / 60), minute: minuteOfDay % 60, minuteOfDay, season };
}

export function formatClock(c: Clock): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${c.year}-${p(c.month)}-${p(c.day)} ${p(c.hour)}:${p(c.minute)} (${c.season})`;
}

// ---------------------------------------------------------------------------------------------------------------
// Sun
// ---------------------------------------------------------------------------------------------------------------

const SUMMER_SOLSTICE = 172;

/** Days between today and the summer solstice, doubled, in 0..365. */
function solsticeDist2(dayOfYear: number): number {
  const d = Math.abs(dayOfYear - SUMMER_SOLSTICE);
  return 2 * Math.min(d, YEAR_DAYS - d);
}

/** Daylight in minutes: 16 hours at midsummer down to 8 at midwinter. */
export function dayLengthMin(dayOfYear: number): number {
  return 960 - Math.floor((480 * solsticeDist2(dayOfYear)) / YEAR_DAYS);
}

export function sunTimes(dayOfYear: number): { sunrise: number; sunset: number } {
  const len = dayLengthMin(dayOfYear);
  return { sunrise: 720 - Math.floor(len / 2), sunset: 720 + Math.floor(len / 2) };
}

export type SunPhase = 'night' | 'dawn' | 'day' | 'dusk';

/** Daylight 0..1000 with a short twilight each side of sunrise and sunset. */
export function daylightPermille(c: Clock): { level: number; phase: SunPhase } {
  const { sunrise, sunset } = sunTimes(c.dayOfYear);
  const m = c.minuteOfDay;
  if (m < sunrise - 40 || m > sunset + 40) return { level: 0, phase: 'night' };
  if (m < sunrise + 20) return { level: Math.floor(((m - (sunrise - 40)) * 1000) / 60), phase: 'dawn' };
  if (m <= sunset - 20) return { level: 1000, phase: 'day' };
  return { level: Math.floor(((sunset + 40 - m) * 1000) / 60), phase: 'dusk' };
}

/** Annual temperature baseline in tenths of a degree C: about -4 at midwinter, 18 at midsummer. */
export function seasonalTempTenths(dayOfYear: number): number {
  return 180 - Math.floor((220 * solsticeDist2(dayOfYear)) / YEAR_DAYS);
}

// ---------------------------------------------------------------------------------------------------------------
// Moon
// ---------------------------------------------------------------------------------------------------------------

export const SYNODIC_MS = 2_551_442_803; // 29.530588 days
export type MoonPhase =
  | 'new' | 'waxing crescent' | 'first quarter' | 'waxing gibbous'
  | 'full' | 'waning gibbous' | 'last quarter' | 'waning crescent';

export interface Moon {
  ageDays: number;
  phase: MoonPhase;
  /** 0..1000 */
  illumination: number;
  up: boolean;
  /** 0..1000, 0 at rise and set */
  height: number;
}

export function moonOffsetMs(world: World): number {
  return hashInts(world.seed, 0x300a) % SYNODIC_MS;
}

export function moon(world: World, t: number, c: Clock = clock(t)): Moon {
  const ageMs = floorMod(t + moonOffsetMs(world), SYNODIC_MS);
  const ageDays = ageMs / MS.day;
  const half = SYNODIC_MS / 2;
  const illumination = Math.floor((1000 * (ageMs < half ? ageMs : SYNODIC_MS - ageMs)) / half);
  let phase: MoonPhase;
  if (ageDays < 1 || ageDays >= 28.5) phase = 'new';
  else if (ageDays < 6.4) phase = 'waxing crescent';
  else if (ageDays < 8.4) phase = 'first quarter';
  else if (ageDays < 13.4) phase = 'waxing gibbous';
  else if (ageDays < 16.2) phase = 'full';
  else if (ageDays < 21.1) phase = 'waning gibbous';
  else if (ageDays < 23.1) phase = 'last quarter';
  else phase = 'waning crescent';
  // A new moon rises at 06:00, a full moon at 18:00, a last quarter at midnight; up for about 12.4 hours.
  const riseMin = floorMod(360 + Math.floor((ageMs * 1440) / SYNODIC_MS), 1440);
  const sinceRise = floorMod(c.minuteOfDay - riseMin, 1440);
  const UP = 745;
  const up = sinceRise < UP;
  const height = up ? Math.floor((1000 * (sinceRise < UP / 2 ? sinceRise : UP - sinceRise)) / (UP / 2)) : 0;
  return { ageDays, phase, illumination, up, height };
}

/**
 * The full moon stands centred in the single doorway of the 192nd Western Hall (canon LT-005). The door faces east, so
 * this happens shortly after moonrise on the night of the full moon.
 */
export function moonInDoorway(world: World, t: number): boolean {
  const c = clock(t);
  const m = moon(world, t, c);
  return m.up && m.ageDays >= 14.0 && m.ageDays <= 15.5 && c.minuteOfDay >= 19 * 60 + 30 && c.minuteOfDay < 22 * 60 + 30;
}
