import { hashInts, strHash } from './rng';

/** Bump when generator behaviour changes. Golden snapshot tests will fail until you do it on purpose. */
export const WORLD_VERSION = 1;

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
  return { seedText, seed: hashInts(strHash(seedText), version), version, showDead: opts.showDead ?? true };
}
