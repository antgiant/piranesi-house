// Things that grow, over weeks: which kind of plant a hall has, and how far along it is on a given day. A pure function of the hall
// and the date, so a hall changes as the weeks go by (new shoots in March, flowers in June, seed in September, straw in November)
// and is the same for everyone. Halls differ a little in when they start (a sunnier hall is earlier), by a few days.

import type { Hall } from '../world/hall';
import { hashInts } from '../world/rng';

export type Flora = 'meadow' | 'fern' | 'moss' | 'thistle';
export type Stage = 'bare' | 'shoots' | 'growing' | 'flowering' | 'seeding' | 'dying';

export interface PlantState {
  flora: Flora;
  stage: Stage;
  /** How far grown, 0..1000: the height of the thing, not the stage (it peaks in the flowering and seeding). */
  growth: number;
}

/** What grows in this hall: ferns where there is falling water, otherwise a mix by the hall's own luck. */
export function floraFor(hall: Hall): Flora {
  if (hall.falls) return 'fern';
  const h = hashInts(hall.x, hall.y, hall.level, 0x91a7) % 10;
  return h < 4 ? 'meadow' : h < 6 ? 'moss' : h < 8 ? 'thistle' : 'fern';
}

/** A hall's own few days of earliness or lateness, -12 to +12. */
export function growthOffset(hall: Hall): number {
  return (hashInts(hall.x, hall.y, hall.level, 0x17a3) % 25) - 12;
}

const lerp = (a: number, b: number, d0: number, d1: number, d: number): number => Math.round(a + ((b - a) * (d - d0)) / (d1 - d0));

/** Growth by day of the year (1..365): bare to about 55, then shoots, growing, flowering, seed, and dying back to about 320. */
export function growthOn(day: number): { stage: Stage; growth: number } {
  const d = ((Math.floor(day) - 1) % 365 + 365) % 365 + 1;
  if (d < 55) return { stage: 'bare', growth: 40 };
  if (d < 95) return { stage: 'shoots', growth: lerp(40, 250, 55, 95, d) };
  if (d < 150) return { stage: 'growing', growth: lerp(250, 800, 95, 150, d) };
  if (d < 215) return { stage: 'flowering', growth: lerp(800, 1000, 150, 215, d) };
  if (d < 275) return { stage: 'seeding', growth: lerp(1000, 850, 215, 275, d) };
  if (d < 320) return { stage: 'dying', growth: lerp(850, 150, 275, 320, d) };
  return { stage: 'bare', growth: 40 };
}

export function plantState(hall: Hall, dayOfYear: number): PlantState {
  const { stage, growth } = growthOn(dayOfYear - growthOffset(hall));
  return { flora: floraFor(hall), stage, growth };
}

/** How tall, in words, for a grass or thistle. */
export function heightWord(growth: number): string {
  return growth < 150 ? 'no taller than a fingernail' : growth < 350 ? 'a finger high' : growth < 600 ? 'hand-high' : growth < 850 ? 'knee-high' : 'as high as your thigh';
}
