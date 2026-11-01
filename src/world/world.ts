import { hashInts, strHash } from './rng';

/**
 * Bump when generator behaviour changes. Golden snapshot tests will fail until you do it on purpose. Peers in a shared world
 * must agree on it. Version 2: a far wider catalogue of statue subjects. Version 3: architectural flourishes in every hall. Version 4: about 140 kinds of them, birds in the upper and lower halls, and group statues without an article. Version 5: wording that fits each sort of subject (birds, fish, ships, weapons and so on). (Layout, tides and weather are unchanged by both.)
 */
export const WORLD_VERSION = 5;

/**
 * What the seed is mixed with. It is NOT the world version: bumping the version for a change to one part of the world (such as
 * the statues) must not re-roll every hall, tide and door. Change this only if you mean to make a different House.
 */
const SEED_EPOCH = 1;

export interface WorldOptions {
  version?: number;
  /** Show the optional skeletal Dead. Defaults to true. Never changes layout or statue ids. */
  showDead?: boolean;
}

export interface World {
  readonly seedText: string;
  readonly seed: number;
  readonly version: number;
  readonly showDead: boolean;
}

export function createWorld(seedText = 'the-house', opts: WorldOptions = {}): World {
  const version = opts.version ?? WORLD_VERSION;
  return { seedText, seed: hashInts(strHash(seedText), SEED_EPOCH), version, showDead: opts.showDead ?? true };
}
