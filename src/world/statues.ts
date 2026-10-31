// Statues: each is a pure function of (world, hall, wall, tier, slot).
//
// Uniqueness (canon S-R08): within a hall every statue gets a distinct index in a large mixed-radix space via an
// affine permutation (a*n+b mod D, a coprime to D), so no two statues in a hall share figure+pose+attribute+companion.
// Across halls, a per-hall "workshop mark" is unique for any two halls within a 64x64-cell window. The visible
// signature (mark + components) is therefore unique across at least a 64x64 window of halls: far further than the 5 km
// the design requires. Beyond that, repeats are allowed ("only at vast distances").

import type { Figure, Kind, Mood } from '../data/catalogue';
import {
  ATTRIBUTES, COMPANIONS_SOLITARY, COMPANIONS_WITH, FIGURES, MARK_BASES, MARK_EDGES, MARK_MOTIFS, POSES, POSES_DROWNED, SIZE_WORD,
} from '../data/catalogue';
import { KIND_LISTS } from '../data/kindlists';
import type { Hall, WallGrid } from './hall';
import { wallGrids } from './hall';
import type { Side } from './layout';
import { SIDES } from './layout';
import { Rng, gcd, hashInts, mod } from './rng';
import type { World } from './world';

export interface Condition {
  /** Hung with seaweed rags (below the regular tide line). */
  seaweed: boolean;
  /** Crusted with shellfish (well below the tide line). */
  shellfish: boolean;
  /** Worn by falling fresh water. */
  waterWorn: boolean;
  /** Bird droppings. */
  droppings: boolean;
  /** Fallen or shattered (derelict regions). */
  broken: boolean;
  /** Overgrown with coral (the Coral Halls). */
  coral: boolean;
}

export interface Statue {
  id: string;
  hallId: string;
  wall: Side;
  tier: number;
  slot: number;
  /** Distance along the wall from its low end (west or south), metres. */
  alongM: number;
  /** Height of the plinth above the floor, metres. */
  baseM: number;
  heightM: number;
  figure: string;
  pose: string;
  attribute: string;
  companion: string;
  mood: Mood;
  mark: string;
  condition: Condition;
  /** Set when this slot is overridden by a canon statue. */
  canonId: string | null;
  /** Canon statues carry their own wording. */
  canonLabel: string | null;
}

export type EmptyKind = 'plinth' | 'niche' | 'apse' | 'blank';
export type Slot =
  | { kind: 'statue'; statue: Statue }
  | { kind: 'empty'; id: string; empty: EmptyKind; wall: Side; tier: number; slot: number; shadowOf?: string };

/** What one kind of figure draws on: its own poses, attributes and companions, all the same lengths as every other kind's. */
interface KindPalette {
  poses: string[];
  attributes: string[];
  companions: string[];
}

interface Palette {
  figures: Figure[];
  /** Per kind of figure. Lengths are P, A and C for every kind, so a statue's four choices never collide. */
  kinds: Record<Kind, KindPalette>;
  P: number;
  A: number;
  C: number;
  D: number;
  a: number;
  b: number;
}

const palettes = new WeakMap<Hall, Palette>();

/** A hall shows at most this many different figures: most from its theme, and a few from anywhere in the catalogue. */
const MAX_FIGURES = 64;
const THEMED = 44;
const ATTRS = 32;
const COMPANIONS_PER_HALL = 12;
const MAX_POSES = 12;

function palette(world: World, hall: Hall): Palette {
  const hit = palettes.get(hall);
  if (hit) return hit;
  const rng = new Rng(hashInts(world.seed, 0xca7a, hall.x, hall.y, hall.level));
  let figures: Figure[];
  const drowned = hall.regions.drowned && hall.level === 1;
  if (drowned) {
    figures = rng.shuffle(FIGURES.filter((f) => ['giant', 'river-god', 'cyclops', 'triton', 'north-wind'].includes(f.id)));
  } else if (hall.mood === 'violent') {
    figures = rng.shuffle(FIGURES.filter((f) => f.themes.some((t) => t === 'mythic' || t === 'martial' || t === 'beasts'))).slice(0, MAX_FIGURES);
  } else if (hall.mood === 'crowd') {
    figures = rng.shuffle(FIGURES.filter((f) => f.kind === 'human')).slice(0, MAX_FIGURES);
  } else {
    const themed = rng.shuffle(FIGURES.filter((f) => f.themes.includes(hall.theme))).slice(0, THEMED);
    // a sculptor's hall is never only one subject: the rest are drawn from the whole catalogue
    const rest = rng.shuffle(FIGURES.filter((f) => !themed.includes(f)));
    figures = themed.concat(rest.slice(0, Math.max(MAX_FIGURES - themed.length, 12 - themed.length)));
  }
  const P = drowned ? POSES_DROWNED.length : Math.min(MAX_POSES, POSES[hall.mood].length);
  const kinds = {} as Record<Kind, KindPalette>;
  const humanSolitary = COMPANIONS_SOLITARY;
  kinds.human = {
    poses: drowned ? [...POSES_DROWNED] : rng.shuffle(POSES[hall.mood]).slice(0, P),
    attributes: rng.shuffle(ATTRIBUTES).slice(0, ATTRS),
    companions: [...humanSolitary, ...rng.shuffle(COMPANIONS_WITH).slice(0, COMPANIONS_PER_HALL - humanSolitary.length)],
  };
  for (const k of ['animal', 'mythic', 'object'] as const) {
    const l = KIND_LISTS[k];
    kinds[k] = {
      poses: drowned ? [...POSES_DROWNED] : rng.shuffle(l.poses).slice(0, P),
      attributes: rng.shuffle(l.attributes).slice(0, ATTRS),
      companions: [...l.solitary, ...rng.shuffle(l.withs).slice(0, COMPANIONS_PER_HALL - l.solitary.length)],
    };
  }
  const D = figures.length * P * ATTRS * COMPANIONS_PER_HALL;
  if (D < hall.slotCount * 4) throw new Error(`palette too small: ${D} for ${hall.slotCount} slots`);
  let a = 1 + rng.int(D - 1);
  while (gcd(a, D) !== 1) a++;
  const p: Palette = { figures, kinds, P, A: ATTRS, C: COMPANIONS_PER_HALL, D, a, b: rng.int(D) };
  palettes.set(hall, p);
  return p;
}

/** Plinth mark. Injective over (x mod 64, y mod 64, level): 12 motifs x 32 counts x (8 edges x 4 bases) = 12288. */
export function workshopMark(x: number, y: number, level: number): string {
  const w = (mod(x, 64) * 64 + mod(y, 64)) * 3 + level;
  const motif = MARK_MOTIFS[w % 12] as string;
  const count = 1 + (Math.floor(w / 12) % 32);
  const variant = Math.floor(w / 384) % 32;
  const edge = MARK_EDGES[variant % 8] as string;
  const base = MARK_BASES[Math.floor(variant / 8) % 4] as string;
  return `${count} ${motif} on a ${base} plinth with ${edge} edging`;
}

export function slotRng(world: World, hall: Hall, wall: Side, tier: number, slot: number, salt: number): number {
  return hashInts(world.seed, salt, hall.x, hall.y, hall.level, SIDES.indexOf(wall), tier, slot);
}

function emptyKind(world: World, hall: Hall, wall: Side, tier: number, slot: number): EmptyKind {
  const r = slotRng(world, hall, wall, tier, slot, 0xe3e3) % 100;
  if (hall.architecture.apses > 0 && r < 30) return 'apse';
  return r < 65 ? 'plinth' : 'niche';
}

/** Is this slot a deliberate absence? About 1.5% single gaps, plus an occasional blank patch on a wall. */
function absence(world: World, hall: Hall, g: WallGrid, tier: number, slot: number): EmptyKind | null {
  if (slotRng(world, hall, g.wall, tier, slot, 0xab5e) % 1000 < 15) return emptyKind(world, hall, g.wall, tier, slot);
  const pr = new Rng(hashInts(world.seed, 0xb1a9, hall.x, hall.y, hall.level, SIDES.indexOf(g.wall)));
  if (pr.chance(1, 10)) {
    const t0 = pr.int(Math.max(1, g.tiers));
    const s0 = pr.int(Math.max(1, g.slots));
    if (tier >= t0 && tier <= t0 + 1 && slot >= s0 && slot <= s0 + 2) return 'blank';
  }
  return null;
}

export function conditionFor(world: World, hall: Hall, g: WallGrid, tier: number, slot: number, baseDm: number, alongM: number): Condition {
  const j = (slotRng(world, hall, g.wall, tier, slot, 0xc0d1) % 7) - 3; // +-3 dm of jitter, bounded
  const reach = hall.tideReachDm;
  const seaweed = reach > 0 && baseDm < reach + j;
  const shellfish = reach > 0 && baseDm < (hall.level === 0 ? (reach * 7) / 10 : reach - 8) + j;
  const f = hall.falls;
  const waterWorn = !!f && f.wall === g.wall && (alongM * 1000) / g.lengthM >= f.from && (alongM * 1000) / g.lengthM <= f.to;
  const droppings = hall.birdPerches && baseDm >= 20 && slotRng(world, hall, g.wall, tier, slot, 0xd209) % 100 < 25;
  const broken = slotRng(world, hall, g.wall, tier, slot, 0xb20c) % 10000 < hall.regions.derelict * 8;
  const coral = hall.regions.coral && slotRng(world, hall, g.wall, tier, slot, 0xc02a) % 100 < 60;
  return { seaweed, shellfish, waterWorn, droppings, broken, coral };
}

/** Generated (non-canon) content of a slot. Canon overrides are applied in canon.ts's slotAt wrapper. */
export function generatedSlot(world: World, hall: Hall, wall: Side, tier: number, slot: number): Slot {
  const grids = wallGrids(hall);
  const g = grids.find((x) => x.wall === wall) as WallGrid;
  const id = `${hall.id}/${wall}/${tier}/${slot}`;
  if (tier < 0 || tier >= g.tiers || slot < 0 || slot >= g.slots) throw new RangeError(`no such slot ${id}`);
  const gap = absence(world, hall, g, tier, slot);
  if (gap) return { kind: 'empty', id, empty: gap, wall, tier, slot };

  const pal = palette(world, hall);
  const n = g.offset + tier * g.slots + slot;
  let i = (pal.a * n + pal.b) % pal.D;
  const c = i % pal.C; i = Math.floor(i / pal.C);
  const at = i % pal.A; i = Math.floor(i / pal.A);
  const po = i % pal.P; i = Math.floor(i / pal.P);
  const fi = i % pal.figures.length;
  const fig = pal.figures[fi] as Figure;
  const kp = pal.kinds[fig.kind];

  const alongM = ((slot + 0.5) * g.pitchDm) / 10;
  const baseDm = tier * g.tierHeightDm;
  const heightDm = Math.max(10, Math.round((hall.statueHeightDm * (92 + (slotRng(world, hall, wall, tier, slot, 0x5124) % 17))) / 100));
  const statue: Statue = {
    id, hallId: hall.id, wall, tier, slot, alongM, baseM: baseDm / 10, heightM: heightDm / 10,
    figure: fig.label,
    pose: kp.poses[po] as string,
    attribute: kp.attributes[at] as string,
    companion: kp.companions[c] as string,
    mood: hall.mood,
    mark: workshopMark(hall.x, hall.y, hall.level),
    condition: conditionFor(world, hall, g, tier, slot, baseDm, alongM),
    canonId: null,
    canonLabel: null,
  };
  return { kind: 'statue', statue };
}

export function signature(s: Statue): string {
  return `${s.mark}|${s.figure}|${s.pose}|${s.attribute}|${s.companion}`;
}

export function sizeWord(hall: Hall): string {
  return SIZE_WORD[hall.sizeClass];
}

/**
 * One statue in words. By default the size is part of it ("A larger-than-life ..."). Narrating a hall, size is said once for the
 * hall and left out of each statue (`omitSize`): all the statues in a hall are alike in size, and nobody says "life-sized" of
 * what is ordinary.
 */
export function describeStatue(hall: Hall, s: Statue, omitSize = false): string {
  if (s.canonLabel) return s.canonLabel;
  const size = omitSize ? '' : `${sizeWord(hall)} `;
  const article = /^[aeiou]/i.test(omitSize ? s.figure : sizeWord(hall)) ? 'An' : 'A';
  const withBit = `, ${s.companion}`;
  const cond: string[] = [];
  if (s.condition.broken) cond.push('cracked and partly fallen');
  if (s.condition.coral) cond.push('furred over with coral');
  if (s.condition.shellfish) cond.push('crusted with shellfish');
  else if (s.condition.seaweed) cond.push('hung with seaweed');
  if (s.condition.waterWorn) cond.push('worn by falling water');
  if (s.condition.droppings) cond.push('streaked with bird droppings');
  const tail = `, ${s.pose}, ${s.attribute}${withBit}${cond.length ? `; ${cond.join(', ')}` : ''}.`;
  // a subject written as a scene or an idea ("the fox and the crow") reads as a carving of it
  const the = /^the /i.test(s.figure);
  const subject = the ? `carving of ${s.figure}` : s.figure;
  // a group of figures has no article: "Children in a ring dance"
  const plural = /^(children|siblings|lovers|actors|mermaids|sailors|girls|boys|two |pair of|the (card|dice|chess|gamblers|orphans|pilgrims|founders|builders|planets|three|four|five|twin|seven|poor|four))/i.test(s.figure);
  if (plural && !the) return `${(size + s.figure).charAt(0).toUpperCase()}${(size + s.figure).slice(1)}${tail}`;
  return `${article} ${size}${subject}${tail}`;
}
