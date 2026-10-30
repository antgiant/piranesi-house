// Tides. Eight sea sources, one per compass direction, each with its own cycle length. The E, W and N cycles are chosen
// so that their peaks coincide at the Ninth Vestibule exactly once every eight in-world years: the great join
// (canon T-006). A source's wave reaches a vestibule, climbs its stair, and spills into the surrounding halls, shrinking
// with each room it crosses. All timing is exact integer arithmetic (BigInt where products exceed 2^53).

import type { Hall } from '../world/hall';
import type { Cell, Ray } from '../world/layout';
import { RAYS, rayOf, vestibuleCell } from '../world/layout';
import { hashInts } from '../world/rng';
import { FALLOFF_PCT, MAX_ROOMS, REACH_MAX_DM, nearbyVestibules, type NearVestibule } from '../world/tidegeo';
import type { World } from '../world/world';
import { MS, Y8_MS, floorMod } from './time';
import { southness, weatherAt, type Weather } from './weather';

export type TideSource = Ray;

/** Cycles per eight years. Distinct primes: pairwise coprime, so peaks of different sources coincide only rarely. */
export const TIDE_COUNT: Readonly<Record<TideSource, number>> = {
  E: 5273, W: 5209, N: 5431, NE: 5309, SE: 5333, S: 5381, SW: 5399, NW: 5419,
};

/** Strength of a typical event at a vestibule, in decimetres. Single events reach at most 1.5x this. */
const BASE_DM: Readonly<Record<TideSource, number>> = { E: 3, W: 11, N: 9, S: 7, SW: 8, SE: 7, NW: 6, NE: 5 };

export interface TideCharacter {
  colour: string;
  foam: string;
  sound: string;
  /** What the water brings: empty tides are clean and bright; rich ones carry fish and sea vegetation. */
  richness: 'empty' | 'lean' | 'fair' | 'rich';
}

// E, W, N follow the book's descriptions of the three tides that join; the rest are our own design (confidence: guess).
export const TIDE_CHARACTER: Readonly<Record<TideSource, TideCharacter>> = {
  E: { colour: 'almost colourless', foam: 'streaked milky over a grey mirror of water', sound: 'a quiet hush', richness: 'empty' },
  W: { colour: 'pewter', foam: 'white as old fishbones', sound: 'a thunder and a great clap against the far wall', richness: 'fair' },
  N: { colour: 'ice-white', foam: 'glittering and explosive', sound: 'a rush like struck glass', richness: 'fair' },
  S: { colour: 'blue-green', foam: 'pale and lacy', sound: 'a long, even surge', richness: 'rich' },
  NE: { colour: 'slate-green', foam: 'grey and sparse', sound: 'a low, steady pour', richness: 'lean' },
  SE: { colour: 'amber-brown', foam: 'yellowish and thick with weed', sound: 'a slow wash', richness: 'rich' },
  SW: { colour: 'deep blue', foam: 'bright and quick', sound: 'a bright, rattling rush', richness: 'rich' },
  NW: { colour: 'silver-grey', foam: 'fine as sleet', sound: 'a sibilant hiss', richness: 'lean' },
};

const DIR: Readonly<Record<Ray, readonly [number, number]>> = {
  N: [0, 1], NE: [1, 1], E: [1, 0], SE: [1, -1], S: [0, -1], SW: [-1, -1], W: [-1, 0], NW: [-1, 1],
};

const RISE_MS = 25 * MS.min;
const FALL_MS = 70 * MS.min;
/** A wave arrives this much earlier per cell toward its source. */
const WAVE_DELAY_PER_CELL_MS = 144_000;
/** A spill reaches each room this much later than the room before it. */
const ROOM_DELAY_MS = 2 * MS.min;
const INTRA_JOIN_MS: Partial<Record<TideSource, number>> = { E: -4 * MS.min, W: 0, N: 3 * MS.min };

export const joinOffsetMs = (world: World): number => hashInts(world.seed, 0x301e) % Y8_MS;

function phaseMs(world: World, s: TideSource): number {
  const intra = INTRA_JOIN_MS[s];
  if (intra !== undefined) return floorMod(joinOffsetMs(world) + intra, Y8_MS);
  return hashInts(world.seed, 0x3a5e, RAYS.indexOf(s)) % Y8_MS;
}

/** The next time the great join happens at or after t (the E, W and N tides all peak at the Ninth Vestibule). */
export function nextJoin(world: World, t: number): number {
  return t + floorMod(joinOffsetMs(world) - t, Y8_MS);
}

/** Signed distance from t to the nearest great join, in ms. */
function joinDistanceMs(world: World, t: number): number {
  return floorMod(t - joinOffsetMs(world) + Y8_MS / 2, Y8_MS) - Y8_MS / 2;
}

/** How far t is from the nearest peak of source s (exposed for tests and for tide tables). */
export function nearestPeakMs(world: World, s: TideSource, t: number): number {
  const c = cycle(world, s, t);
  return Math.min(c.sinceMs, c.untilMs);
}

/** The instant of the k-th peak of source s, counting from its phase (exposed for tests). */
export function peakTimeMs(world: World, s: TideSource, k: number): number {
  return phaseMs(world, s) + Math.floor((k * Y8_MS) / TIDE_COUNT[s]);
}

const Y8 = BigInt(Y8_MS);

function cycle(world: World, s: TideSource, t: number): { sinceMs: number; untilMs: number; index: bigint } {
  const n = BigInt(TIDE_COUNT[s]);
  const x = (BigInt(Math.floor(t)) - BigInt(phaseMs(world, s))) * n;
  const pos = ((x % Y8) + Y8) % Y8;
  const index = (x - pos) / Y8;
  return { sinceMs: Number(pos / n), untilMs: Number((Y8 - pos) / n), index };
}

const smooth = (x: number): number => Math.floor((x * x * (3000 - 2 * x)) / 1_000_000);

/** Fixed-point 0..1000 shape of one tide event, given the time since / until its peak. */
function shape(sinceMs: number, untilMs: number): number {
  if (sinceMs < FALL_MS) return 1000 - smooth(Math.floor((sinceMs * 1000) / FALL_MS));
  if (untilMs < RISE_MS) return smooth(Math.floor(((RISE_MS - untilMs) * 1000) / RISE_MS));
  return 0;
}

export function sourcesFor(world: World, n: number, cell: Cell): TideSource[] {
  if (n === 9) return ['E', 'W', 'N'];
  if (n === 10) return ['N', 'NE'];
  if (n === 12) return ['E', 'N'];
  const ray = rayOf(cell.x, cell.y);
  if (!ray) return ['NW', 'SE'];
  const i = RAYS.indexOf(ray);
  const other = RAYS[(i + (hashInts(world.seed, 0x5011, n) % 2 === 0 ? 1 : 7)) % 8] as Ray;
  return [ray, other];
}

function ninth(world: World): Cell {
  return vestibuleCell(world, 9) as Cell;
}

function waveShiftMs(world: World, cell: Cell, s: TideSource): number {
  const o = ninth(world);
  const [dx, dy] = DIR[s];
  const proj = (cell.x - o.x) * dx + (cell.y - o.y) * dy;
  return proj * WAVE_DELAY_PER_CELL_MS;
}

export interface SourcePulse {
  source: TideSource;
  /** Depth this source contributes at the vestibule right now, decimetres. */
  pulseDm: number;
  /** Strength of the event this pulse belongs to, decimetres. */
  eventDm: number;
  /** Which event (peak number) it is. */
  event: string;
  /** Where on its curve the pulse is, 0..1000. */
  shape: number;
  phase: 'rising' | 'falling';
}

function southBoostPct(w: Weather): number {
  return 100 + Math.floor((35 * southness(w)) / 1000);
}

function eventStrengthDm(world: World, s: TideSource, k: bigint, vestibule: number, w: Weather, t: number): number {
  // The great join is always the greatest of tides (canon T-006): its three events run at full strength.
  if (vestibule === 9 && (s === 'E' || s === 'W' || s === 'N') && Math.abs(joinDistanceMs(world, t)) < 3 * MS.hour) {
    return Math.floor((BASE_DM[s] * 3) / 2);
  }
  const r = hashInts(world.seed, 0x71de, RAYS.indexOf(s), Number(k % 1_000_003n)) % 1000;
  const pct = 15 + Math.floor((135 * r * r) / 1_000_000);
  const local = 85 + (hashInts(world.seed, 0x71df, vestibule, RAYS.indexOf(s)) % 31);
  const dm = Math.floor((BASE_DM[s] * pct * local * southBoostPct(w)) / 1_000_000);
  return Math.min(dm, Math.floor((BASE_DM[s] * 3) / 2));
}

export interface VestibuleTide {
  n: number;
  /** Total depth at the vestibule, decimetres, including the join amplification. */
  depthDm: number;
  pulses: SourcePulse[];
  /** How many tides are running together; 3 at the great join. */
  active: number;
}

export function vestibuleTide(world: World, n: number, cell: Cell, t: number, w: Weather = weatherAt(world, t)): VestibuleTide {
  const pulses: SourcePulse[] = [];
  let sum = 0;
  for (const s of sourcesFor(world, n, cell)) {
    const c = cycle(world, s, t + waveShiftMs(world, cell, s));
    const shapeNow = shape(c.sinceMs, c.untilMs);
    if (shapeNow <= 0) continue;
    const falling = c.sinceMs < FALL_MS;
    const k = falling ? c.index : c.index + 1n;
    const eventDm = eventStrengthDm(world, s, k, n, w, t);
    const pulseDm = Math.floor((eventDm * shapeNow) / 1000);
    if (pulseDm <= 0) continue;
    pulses.push({ source: s, pulseDm, eventDm, event: `${s}#${k}`, phase: falling ? 'falling' : 'rising', shape: shapeNow });
    sum += pulseDm;
  }
  const running = pulses.filter((p) => p.pulseDm >= 2);
  const active = running.length;
  // Tides that run together reinforce one another, but only when their peaks truly coincide: the amplification falls
  // off steeply with the least-aligned pulse. Two together are a bad day; all three at their peaks tower over the walls.
  let factor = 100;
  if (active >= 2) {
    const c = Math.min(...running.map((p) => p.shape)) / 1000;
    factor = 100 + Math.floor(210 * (active - 1) * c * c * c * c);
  }
  return { n, depthDm: Math.floor((sum * factor) / 100), pulses, active };
}

export interface HallTide {
  /** Standing or running water on the floor, decimetres. For the lower level this is depth above the floor. */
  depthDm: number;
  trend: 'dry' | 'rising' | 'falling' | 'steady';
  /** The tides responsible, strongest first. */
  sources: TideSource[];
  character: TideCharacter | null;
  /** Tides running together at the nearest vestibule. */
  joined: number;
  /** A freshwater lake rather than a sea tide. */
  lake: boolean;
}

const DRY: HallTide = { depthDm: 0, trend: 'dry', sources: [], character: null, joined: 0, lake: false };

function middleDepth(world: World, hall: Hall, t: number, w: Weather): HallTide {
  let best: { depth: number; vt: VestibuleTide } | null = null;
  for (const v of nearbyVestibules(world, hall.x, hall.y)) {
    const vt = vestibuleTide(world, v.n, v.cell, t - v.rooms * ROOM_DELAY_MS, w);
    const depth = Math.floor((vt.depthDm * (FALLOFF_PCT[v.rooms] as number)) / 100);
    if (!best || depth > best.depth) best = { depth, vt };
  }
  if (!best || best.depth < 1) return DRY;
  const sources = best.vt.pulses.slice().sort((a, b) => b.pulseDm - a.pulseDm).map((p) => p.source);
  const lead = best.vt.pulses.reduce((a, b) => (b.pulseDm > a.pulseDm ? b : a));
  const later = middleDepthAt(world, hall, t + MS.min, w);
  const trend = later > best.depth ? 'rising' : later < best.depth ? 'falling' : 'steady';
  return { depthDm: best.depth, trend, sources, character: TIDE_CHARACTER[lead.source], joined: best.vt.active, lake: false };
}

function middleDepthAt(world: World, hall: Hall, t: number, w: Weather): number {
  let best = 0;
  for (const v of nearbyVestibules(world, hall.x, hall.y)) {
    const vt = vestibuleTide(world, v.n, v.cell, t - v.rooms * ROOM_DELAY_MS, w);
    best = Math.max(best, Math.floor((vt.depthDm * (FALLOFF_PCT[v.rooms] as number)) / 100));
  }
  return best;
}

/** Percentage of a lower hall's height that is under water: a resting sea level, plus swell, minus a south wind's pull. */
function lowerFill(world: World, hall: Hall, t: number, w: Weather): { fillPct: number; swelling: boolean } {
  let swell = 0;
  for (const v of nearbyVestibules(world, hall.x, hall.y)) {
    const vt = vestibuleTide(world, v.n, v.cell, t, w);
    swell = Math.max(swell, vt.depthDm);
  }
  const south = southness(w);
  const base = 45 + Math.min(45, Math.floor((swell * 45) / REACH_MAX_DM));
  // A strong south wind raises the highs and drags the lows: with no swell the hall can empty completely.
  const lowered = swell === 0 && south >= 800 ? 0 : swell === 0 ? base - Math.floor((south * 25) / 1000) : base;
  return { fillPct: Math.max(0, Math.min(100, lowered)), swelling: swell > 0 };
}

export function tideAt(world: World, hall: Hall, t: number, w: Weather = weatherAt(world, t)): HallTide {
  if (hall.level === 2) return DRY;
  if (hall.regions.drowned && hall.level === 1) return { ...DRY, lake: true };
  if (hall.tags.includes('dark-hall')) return DRY;
  if (hall.level === 0) {
    const f = lowerFill(world, hall, t, w);
    const depthDm = Math.floor((hall.heightM * 10 * f.fillPct) / 100);
    return { depthDm, trend: depthDm === 0 ? 'dry' : f.swelling ? 'rising' : 'steady', sources: [], character: null, joined: 0, lake: false };
  }
  return middleDepth(world, hall, t, w);
}

export interface TideEvent {
  startMs: number;
  endMs: number;
  peakDm: number;
  sources: TideSource[];
  joined: number;
}

/** Sample forward and report when water will lie on a hall's floor. A 'table of tides' for the hall. */
export function forecast(world: World, hall: Hall, from: number, horizonMs: number, stepMs = 5 * MS.min): TideEvent[] {
  const out: TideEvent[] = [];
  let cur: TideEvent | null = null;
  for (let t = from; t <= from + horizonMs; t += stepMs) {
    const h = tideAt(world, hall, t);
    if (h.depthDm > 0) {
      if (!cur) cur = { startMs: t, endMs: t, peakDm: h.depthDm, sources: h.sources.slice(), joined: h.joined };
      cur.endMs = t;
      if (h.depthDm > cur.peakDm) cur.peakDm = h.depthDm;
      for (const s of h.sources) if (!cur.sources.includes(s)) cur.sources.push(s);
      cur.joined = Math.max(cur.joined, h.joined);
    } else if (cur) {
      out.push(cur);
      cur = null;
    }
  }
  if (cur) out.push(cur);
  return out;
}

export { MAX_ROOMS, type NearVestibule };
