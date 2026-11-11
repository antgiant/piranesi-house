// The stars framed in the single doorway of the 192nd Western Hall. The door faces east, is about four metres wide and eleven high, and
// lines up with a window in the corridor beyond, so what it frames is a narrow patch of the eastern sky, low: from the horizon up to
// about thirty-five degrees, a few degrees either side of due east. Which constellations stand there depends on the hour and the day.
//
// Names are the ordinary names of the constellations. (The book's character has names of their own for the sky; they are theirs and
// are not used here.) The geometry is simple, not exact, and assumes a latitude of about forty-five degrees north.

export interface Constellation { name: string; ra: number; dec: number }

/** Right ascension in hours, declination in degrees: the middle of each figure. */
export const CONSTELLATIONS: readonly Constellation[] = [
  { name: 'the Hunter', ra: 5.6, dec: 0 }, { name: 'the Bull', ra: 4.5, dec: 16 }, { name: 'the Twins', ra: 7.0, dec: 22 },
  { name: 'the Lion', ra: 10.5, dec: 15 }, { name: 'the Maiden', ra: 13.2, dec: -3 }, { name: 'the Scales', ra: 15.2, dec: -15 },
  { name: 'the Scorpion', ra: 16.9, dec: -30 }, { name: 'the Archer', ra: 19.0, dec: -28 }, { name: 'the Eagle', ra: 19.7, dec: 5 },
  { name: 'the Swan', ra: 20.6, dec: 42 }, { name: 'the Lyre', ra: 18.8, dec: 36 }, { name: 'the Winged Horse', ra: 22.7, dec: 20 },
  { name: 'the Chained Woman', ra: 1.0, dec: 38 }, { name: 'the Queen in her Chair', ra: 1.0, dec: 58 }, { name: 'the Hero', ra: 3.2, dec: 45 },
  { name: 'the Charioteer', ra: 5.5, dec: 42 }, { name: 'the Great Dog', ra: 6.8, dec: -20 }, { name: 'the Herdsman', ra: 14.7, dec: 30 },
  { name: 'the Kneeling Strongman', ra: 17.3, dec: 30 }, { name: 'the Ram', ra: 2.6, dec: 20 }, { name: 'the Fishes', ra: 0.5, dec: 10 },
  { name: 'the Water-bearer', ra: 22.3, dec: -10 }, { name: 'the Sea-goat', ra: 21.0, dec: -18 }, { name: 'the Crab', ra: 8.6, dec: 20 },
  { name: 'the Dolphin', ra: 20.6, dec: 14 }, { name: 'the Little Horse', ra: 21.2, dec: 7 },
];

/** Local sidereal time in hours at a clock reading: the sun is at right ascension 0 around day 79, and gains a day's worth in a year. */
export function siderealHours(dayOfYear: number, minuteOfDay: number): number {
  const sunRa = (24 * (dayOfYear - 79)) / 365.25;
  return (((minuteOfDay / 60 - 12 + sunRa) % 24) + 24) % 24;
}

/** The distance in hours between two right ascensions, going the short way round. */
const raGap = (a: number, b: number): number => { const d = Math.abs(a - b) % 24; return Math.min(d, 24 - d); };

/**
 * The constellations framed in the doorway at this moment, the one nearest the middle of the frame first (at most three). The frame is the
 * eastern sky from the horizon to about thirty-five degrees, which at this latitude is about four and a half to six hours of right ascension
 * east of the meridian, and declinations from a few degrees to about twenty-five above the equator.
 */
export function framedInDoorway(dayOfYear: number, minuteOfDay: number): string[] {
  const centre = (siderealHours(dayOfYear, minuteOfDay) + 5.1) % 24;
  return CONSTELLATIONS
    .map((c) => ({ c, gap: raGap(c.ra, centre), decOk: c.dec > -12 && c.dec < 38 }))
    .filter((x) => x.decOk && x.gap <= 1.9)
    .sort((a, b) => a.gap - b.gap)
    .slice(0, 3)
    .map((x) => x.c.name);
}

/**
 * The sky above the open roofs on a clear night: what stands high overhead (the figures crossing the meridian, which at this latitude
 * are the ones with declinations from the equator up to about seventy north), and what is climbing in the east. At most one of each.
 */
export function skyAbove(dayOfYear: number, minuteOfDay: number): { overhead: string | null; rising: string | null } {
  const lst = siderealHours(dayOfYear, minuteOfDay);
  const high = CONSTELLATIONS.filter((c) => c.dec >= 5 && raGap(c.ra, lst) <= 2.2).sort((a, b) => raGap(a.ra, lst) - raGap(b.ra, lst))[0];
  const east = CONSTELLATIONS.filter((c) => c.dec > -15 && raGap(c.ra, (lst + 4.5) % 24) <= 1.5 && c !== high).sort((a, b) => raGap(a.ra, (lst + 4.5) % 24) - raGap(b.ra, (lst + 4.5) % 24))[0];
  return { overhead: high?.name ?? null, rising: east?.name ?? null };
}
