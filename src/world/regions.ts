import type { Level } from './layout';
import { rayOf, ringOf } from './layout';
import { hashInts } from './rng';
import type { World } from './world';

export interface Regions {
  /** 0..100: how ruined this cell is (collapsed floors/walls, fallen statues). */
  derelict: number;
  /** Cut off from the tides; rain-fed freshwater lake at the middle level. */
  drowned: boolean;
  /** Long-flooded and now dry; coral grows on statues. */
  coral: boolean;
  /** North-Eastern ceiling collapse: cloud drifts down into the middle halls. */
  cloud: boolean;
  /** Eastern half of the House (the ruined side). */
  east: boolean;
  /** The 192nd Western Hall. */
  dark: boolean;
}

/** About 45 cells east of the First Vestibule that tides cannot reach. */
export const DROWNED = { x0: 3, x1: 11, y0: -2, y1: 2 } as const;
/** "Extending south and west from the Thirty-Eighth Southern Hall." */
export const CORAL = { x0: -40, x1: 0, y0: -80, y1: -38 } as const;

export function regionsAt(world: World, x: number, y: number, level: Level): Regions {
  const east = x >= 1;
  const drowned = x >= DROWNED.x0 && x <= DROWNED.x1 && y >= DROWNED.y0 && y <= DROWNED.y1;
  const coral = x >= CORAL.x0 && x <= CORAL.x1 && y >= CORAL.y0 && y <= CORAL.y1 && level !== 2;
  // The 20th and 21st North-Eastern halls collapsed; a few cells around them admit cloud into the middle level.
  const ne = rayOf(x, y) === 'NE';
  const ring = ringOf(x, y);
  const cloud = level === 1 && ne && ring >= 17 && ring <= 24;
  let derelict = 0;
  if (east) {
    const h = hashInts(world.seed, 0xde7e, x, y);
    derelict = drowned ? 100 : 30 + (h % 71);
  }
  if (cloud) derelict = Math.max(derelict, 55);
  const dark = x === -192 && y === 0;
  return { derelict, drowned, coral, cloud, east, dark };
}
