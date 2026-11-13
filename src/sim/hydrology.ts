// Where the water comes from. The halls' falls and streams are fed by rain on the roofs and courtyards, caught in cisterns and soaked into
// the stone, so they follow the weather but not at once: rain runs off in hours, fills the stores in days, and the stores drain over a week.
// After a long wet spell the stores are over their brims and the falls roar and the stairs run; after a dry one the falls thin to threads
// (but do not stop: the book's fresh water is always there). A pure, deterministic function of the weather history, so every machine and
// every visit agrees, and it can be tested. Snow is not rain: it stores nothing here (a thaw is not modelled).

import type { World } from '../world/world';
import { MS } from './time';
import { weatherAt } from './weather';

export interface Hydrology {
  /** Rain running off the roofs and walls now: rises within hours of rain starting, gone within about a day of it stopping. 0..1. */
  runoff: number;
  /** How full the stores are: 0 (dry) to 1 (full) and a little beyond when they overflow. Fills over days, drains over about a week. */
  fill: number;
  /** Over the brim: 0 (not) to 1 (running over everywhere). */
  overflow: number;
  /** How much water a fall carries compared with an ordinary day: about 0.45 in a dry spell, 1 in ordinary weather, 1.8 and more in overflow. */
  flow: number;
  /** How often water drips from the stone, compared with an ordinary day: a few drips in a dry spell, many while the stone drains. */
  dripping: number;
  /** Water running down the stairs and walls from the courtyards, 0..1.2: the rain streams. */
  streams: number;
}

/** Time constants, in hours: roofs and walls shed in half a day; cisterns and stone hold for days. */
const RUNOFF_TAU_H = 10;
const STORE_TAU_H = 84;
/** Steady rain at this strength (0..1) for a couple of weeks fills the stores: this world rains about a tenth of the time, so a wet fortnight is full. */
const FULL_AT = 0.07;
/** How far back the history is taken, and how often it is sampled. */
const HISTORY_H = 14 * 24;
const STEP_H = 3;
/** The answer is kept for this much world time: rain does not change in a quarter of an hour. */
const QUANT_MS = 15 * MS.min;

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

const cache = new WeakMap<World, Map<number, Hydrology>>();

export function hydrologyAt(world: World, t: number): Hydrology {
  const key = Math.floor(t / QUANT_MS);
  let m = cache.get(world);
  if (!m) { m = new Map(); cache.set(world, m); }
  const hit = m.get(key);
  if (hit) return hit;
  const tq = key * QUANT_MS;
  const aRun = 1 - Math.exp(-STEP_H / RUNOFF_TAU_H), aStore = 1 - Math.exp(-STEP_H / STORE_TAU_H);
  let runoff = 0, store = 0;
  // run the two stores forward over the history, oldest first (an exponential moving average of the rain)
  for (let h = HISTORY_H; h >= 0; h -= STEP_H) {
    const w = weatherAt(world, tq - h * MS.hour);
    const rain = w.precip === 'rain' ? w.rain / 1000 : 0;
    runoff += aRun * (rain - runoff);
    store += aStore * (rain - store);
  }
  const fill = store / FULL_AT;
  const overflow = clamp((fill - 1.25) / 0.6, 0, 1); // over the brim only after a really wet spell
  const out: Hydrology = {
    runoff: clamp(runoff, 0, 1),
    fill: clamp(fill, 0, 1.6),
    overflow,
    flow: 0.45 + 0.75 * clamp(fill, 0, 1) + 0.6 * overflow + 0.5 * clamp(runoff, 0, 1),
    dripping: 0.25 + 1.1 * clamp(fill, 0, 1.2) + 2 * clamp(runoff, 0, 1),
    streams: clamp(runoff * 1.4 + 0.5 * overflow, 0, 1.2),
  };
  if (m.size > 2000) m.clear();
  m.set(key, out);
  return out;
}
