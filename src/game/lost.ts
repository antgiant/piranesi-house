// Getting lost, and finding the way by memory. The House has no map, and the people in the book lose their way easily; they mark
// doorways in chalk and write down directions. When you go back by what you remember, the memory may be wrong: a door counted
// one out, a turn mixed up. A wrong turn is followed faithfully until something does not look right, or there is no door where
// one was remembered.
//
// Pure functions of the world seed and what has happened, so the same attempt goes the same way. Asking again is another
// attempt, with another throw of the dice.

import { OPPOSITE, SIDES, type Side } from '../world/layout';
import { hashInts } from '../world/rng';
import type { Spot } from './travel';

/** One hall entered, and the door it was entered by (so that the same door is the way back). */
export interface TrailEntry {
  from: Spot;
  to: Spot;
  via: 'door' | 'stairs';
  /** The wall of `to` that the way back leaves by, and which door in it counting from the low (west or south) end. */
  inSide?: Side;
  inOrd?: number;
  inOf?: number;
  /** For stairs: the way you went (the way back is the opposite). */
  dir?: 'up' | 'down';
}

/** One step of a remembered way: which wall, and which door in it (counting from the west or south end). */
export interface Instr {
  via: 'door' | 'stairs';
  side?: Side;
  ord?: number;
  of?: number;
  dir?: 'up' | 'down';
}

export interface SlipFactors {
  /** How many times you have taken this very way (this door, between these two halls), in either direction. Zero: never. */
  passes: number;
  /** You marked the hall you are leaving with chalk. */
  marked: boolean;
  /** This step goes on in the same direction as the one before: easy to keep straight. */
  straight: boolean;
  dark: boolean;
  wet: boolean;
  /** You are hurrying. */
  hurried: boolean;
}

/** The chance of going wrong on a way you have never taken, going by the names of the halls alone. */
export const GUESSING = 0.15;
/** The chance on a way you have taken once. Each further time makes you surer: P / (1 + 1.5 x further times). */
export const TAKEN_ONCE = 0.03;

/**
 * The chance of misremembering one step. A way you have never taken is a guess from the names (about one in seven); a way you have
 * taken once, three in a hundred; and every further time you take it you are surer, as in life: by the tenth time it is a few in a
 * thousand. A chalk mark all but removes it; going straight on is easier; darkness, water and haste make it worse.
 */
export function slipChance(f: SlipFactors): number {
  let p = f.passes <= 0 ? GUESSING : TAKEN_ONCE / (1 + (f.passes - 1) * 1.5);
  if (f.marked) p *= 0.1;
  if (f.straight) p *= 0.6;
  if (f.dark) p *= 1.6;
  if (f.wet) p *= 1.5;
  if (f.hurried) p *= 1.5;
  return Math.min(0.4, p);
}

/**
 * The way you remember a step that you took, which is sometimes not the way you took. A slip is most often a door counted one out,
 * then a wall confused with its neighbour, and rarely a whole hall forgotten (returns null).
 */
export function slip(i: Instr, roll: number): Instr | null {
  if (i.via === 'stairs') return roll < 0.5 ? { via: 'stairs', dir: i.dir === 'up' ? 'down' : 'up' } : null;
  const side = i.side as Side;
  // (Doors in one wall of this House lead to the same neighbouring hall, so a door counted one out matters little; a wall mistaken for
  // another, or a hall forgotten, is what takes a person astray.)
  if (roll < 0.25 && (i.of ?? 1) > 1) {
    const ord = i.ord as number;
    const up = ord < (i.of as number) && (ord === 1 || roll < 0.125);
    return { ...i, ord: up ? ord + 1 : ord - 1 };
  }
  if (roll < 0.85) {
    // confused with the next wall round, one way or the other
    const k = SIDES.indexOf(side);
    const n = SIDES[(k + (roll < 0.55 ? 1 : 3)) % 4] as Side;
    return { via: 'door', side: n, ord: 1, of: i.of };
  }
  return null;
}

/** Which door of a wall (sorted from the low end) an instruction means, allowing that fewer doors may be there than were remembered. */
export function pickIndex(count: number, ord: number): number {
  return Math.max(0, Math.min(count - 1, ord - 1));
}

/** A throw of the dice for one step of one attempt, between 0 and 1. */
export function dice(seed: number, attempt: number, steps: number, j: number, salt: number): number {
  return (hashInts(seed, 0x1057, attempt, steps, j, salt) % 100_000) / 100_000;
}

export const opposite = (s: Side): Side => OPPOSITE[s];

/**
 * What you believe about where you are, as a difference from the truth. Null: you know. Wrong: you are sure you are somewhere you are
 * not (you think you are `dx, dy` halls from where you are, and `dl` levels up or down). Lost: you know that you do not know.
 */
export type Belief = { kind: 'wrong'; dx: number; dy: number; dl: number } | { kind: 'lost' } | null;
