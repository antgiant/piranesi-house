// The planets and the moon in the sky. A simple model, good for describing, not for navigating: the planets move on circular orbits in
// one plane at their mean speeds (so Venus is an evening or morning star, Mars comes round every two years or so, Jupiter takes twelve
// years, Saturn thirty), seen from an observer at forty-five degrees north. The sky's calendar is the House's own (years of 365 days).
//
// Names are the ordinary names. (The book's character has names of their own for the sky; they are theirs and are not used.)

import type { Moon } from './time';
import { siderealHours } from './stars';

const DEG = Math.PI / 180;
const OBLIQUITY = 23.44 * DEG;
const LAT = 45 * DEG;
/** 2026-01-01 00:00 UTC, the House's day zero, in days after the year 2000's first noon. */
const DAYS_AT_EPOCH = 9497.5;
const MS_DAY = 86_400_000;

interface Orbit { name: string; l0: number; rate: number; a: number; look: string; rank: number; minElongation: number; darkness: number }

/** Mean longitude at 2000 (degrees), degrees a day, distance from the sun (earth = 1), how it looks, and how dark the sky must be for it to show. */
const PLANETS: readonly Orbit[] = [
  { name: 'Venus', l0: 181.98, rate: 1.6021, a: 0.723, look: 'a brilliant white light', rank: 0, minElongation: 15, darkness: -3 },
  { name: 'Jupiter', l0: 34.35, rate: 0.08309, a: 5.203, look: 'a steady, bright cream-white point', rank: 1, minElongation: 25, darkness: -3 },
  { name: 'Mars', l0: 355.43, rate: 0.5240, a: 1.524, look: 'a steady, hard red point', rank: 2, minElongation: 30, darkness: -8 },
  { name: 'Saturn', l0: 50.08, rate: 0.03346, a: 9.537, look: 'a steady, pale gold point', rank: 3, minElongation: 30, darkness: -8 },
];
const EARTH_L0 = 100.46;
const EARTH_RATE = 0.98560;

const norm360 = (x: number): number => ((x % 360) + 360) % 360;

function daysSince2000(t: number): number { return DAYS_AT_EPOCH + t / MS_DAY; }

/** The sun's ecliptic longitude in degrees (it is opposite the earth's own). */
export function sunLongitude(t: number): number {
  return norm360(EARTH_L0 + EARTH_RATE * daysSince2000(t) + 180);
}

/** Right ascension (hours) and declination (degrees) of a point on the ecliptic at a longitude in degrees. */
function equatorial(lonDeg: number): { ra: number; dec: number } {
  const l = lonDeg * DEG;
  const ra = Math.atan2(Math.sin(l) * Math.cos(OBLIQUITY), Math.cos(l));
  const dec = Math.asin(Math.sin(OBLIQUITY) * Math.sin(l));
  return { ra: norm360(ra / DEG) / 15, dec: dec / DEG };
}

/** Altitude and azimuth (degrees; azimuth from north through east) of a point, at the House's clock time. */
function altAz(raH: number, decDeg: number, lst: number): { alt: number; az: number } {
  const h = (lst - raH) * 15 * DEG;
  const dec = decDeg * DEG;
  const sinAlt = Math.sin(LAT) * Math.sin(dec) + Math.cos(LAT) * Math.cos(dec) * Math.cos(h);
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
  const az = Math.atan2(Math.sin(h), Math.cos(h) * Math.sin(LAT) - Math.tan(dec) * Math.cos(LAT)) + Math.PI;
  return { alt: alt / DEG, az: norm360(az / DEG) };
}

export function sunAltitude(t: number, dayOfYear: number, minuteOfDay: number): number {
  const { ra, dec } = equatorial(sunLongitude(t));
  return altAz(ra, dec, siderealHours(dayOfYear, minuteOfDay)).alt;
}

export interface Sighting { name: string; look: string; alt: number; az: number; elongation: number }

/** The planets that can be seen now, brightest first: above the horizon, clear of the sun's glare, and with the sky dark enough. */
export function planetsVisible(t: number, dayOfYear: number, minuteOfDay: number): Sighting[] {
  const d = daysSince2000(t);
  const lst = siderealHours(dayOfYear, minuteOfDay);
  const le = norm360(EARTH_L0 + EARTH_RATE * d) * DEG;
  const sunLon = sunLongitude(t);
  const sunAlt = sunAltitude(t, dayOfYear, minuteOfDay);
  const out: Sighting[] = [];
  for (const p of PLANETS) {
    const lp = norm360(p.l0 + p.rate * d) * DEG;
    const x = p.a * Math.cos(lp) - Math.cos(le);
    const y = p.a * Math.sin(lp) - Math.sin(le);
    const lon = norm360(Math.atan2(y, x) / DEG);
    const elong = Math.abs(((lon - sunLon + 540) % 360) - 180);
    const { ra, dec } = equatorial(lon);
    const { alt, az } = altAz(ra, dec, lst);
    if (sunAlt > p.darkness || alt < 6 || elong < p.minElongation) continue;
    out.push({ name: p.name, look: p.look, alt, az, elongation: elong });
  }
  return out.sort((a, b) => (PLANETS.find((p) => p.name === a.name)?.rank ?? 9) - (PLANETS.find((p) => p.name === b.name)?.rank ?? 9));
}

const POINTS = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'] as const;
export const compassWord = (az: number): string => POINTS[Math.round(norm360(az) / 45) % 8] as string;
export const heightPhrase = (alt: number): string => (alt < 10 ? 'low' : alt < 30 ? 'part-way up the sky' : alt < 55 ? 'high' : 'almost overhead');

/** Where the planets and the moon stand among the figures of the zodiac: the ecliptic longitude at which each figure begins. */
const ZODIAC: readonly [number, string][] = [
  [0, 'the Fishes'], [29, 'the Ram'], [53, 'the Bull'], [90, 'the Twins'], [118, 'the Crab'], [138, 'the Lion'], [174, 'the Maiden'],
  [218, 'the Scales'], [241, 'the Scorpion'], [266, 'the Archer'], [300, 'the Sea-goat'], [328, 'the Water-bearer'], [352, 'the Fishes'],
];
export function zodiacAt(lonDeg: number): string {
  const l = norm360(lonDeg);
  let name = 'the Fishes';
  for (const [start, n] of ZODIAC) if (l >= start) name = n;
  return name;
}

export interface MoonSky {
  /** Where it stands, in words ("low in the east", "high in the south"). */
  where: string;
  /** The figure of the zodiac it is passing through. */
  in: string;
  /** Visible in a daylight sky (not a thin crescent, not a nearly full glare). */
  paleByDay: boolean;
}

/** The moon's place: it rises in the east, stands highest in the south, and sets in the west, 12.4 hours later; its longitude is the sun's plus its phase. */
export function moonSky(m: Moon, t: number, minuteOfDay: number): MoonSky | null {
  if (!m.up) return null;
  const riseMin = (360 + Math.floor((m.ageDays * 1440) / 29.530588)) % 1440;
  const f = (((minuteOfDay - riseMin) % 1440) + 1440) % 1440 / 745;
  const dir = f < 0.2 ? 'east' : f < 0.35 ? 'south-east' : f < 0.65 ? 'south' : f < 0.8 ? 'south-west' : 'west';
  const where = `${heightPhrase(Math.max(1, (m.height / 1000) * 62))} in the ${dir}`;
  const lon = sunLongitude(t) + 12.19 * m.ageDays;
  return { where, in: zodiacAt(lon), paleByDay: m.illumination >= 80 && m.illumination <= 950 };
}
