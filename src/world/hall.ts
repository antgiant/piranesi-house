// The Hall record: everything about one cell at one level, derived purely from (world, x, y, level).

import type { Mood, Theme } from '../data/catalogue';
import { THEMES } from '../data/catalogue';
import type { Cell, CellKind, Door, Level, Side } from './layout';
import {
  DARK_HALL, SIDES, cellKind, cellName, cellFromRay, floorDivExport, isVestibule, vestibuleNumber, wallDoors,
} from './layout';
import { Rng, hashInts } from './rng';
import type { Regions } from './regions';
import { regionsAt } from './regions';
import type { World } from './world';
import { HALL_OVERRIDES } from '../data/canonPlacement';

export type SizeClass = 'small' | 'life' | 'large' | 'huge' | 'colossal';
const SIZE_ORDER: readonly SizeClass[] = ['small', 'life', 'large', 'huge'];
/** Statue height in decimetres, [min, max] per size class. Small is about shoulder height; colossal only in the Drowned Halls. */
const SIZE_DM: Record<SizeClass, readonly [number, number]> = {
  small: [12, 15], life: [17, 19], large: [34, 56], huge: [60, 90], colossal: [150, 200],
};

export type HallTag =
  | 'first-vestibule' | 'ninth-vestibule' | 'dark-hall' | 'gull-colony' | 'rook-flock' | 'albatross-nest'
  | 'mussel-stair' | 'pebble-bank' | 'murmuration' | 'bird-shelter' | 'horned-giants' | 'minotaurs'
  | 'drowned' | 'coral' | 'cloud-zone' | 'ruinous';

export interface Stair { wall: Side; pos: number; name: string }

export interface Feature {
  id: string;
  kind: 'niche' | 'plinth' | 'alcove';
  wall: Side;
  /** What is there. The place itself exists whether or not showDead is on; only the occupant differs. */
  occupant: string | null;
  note: string;
}

export interface Hall {
  id: string;
  x: number;
  y: number;
  level: Level;
  kind: CellKind;
  name: string;
  orientation: 'EW' | 'NS';
  /** Interior size in metres. xExtent runs west-east, yExtent south-north. */
  xExtent: number;
  yExtent: number;
  heightM: number;
  courtyardSides: 3 | 4 | 6 | 8;
  windows: Record<Side, number>;
  architecture: { columns: string; pilasters: string; niches: string; apses: number; pediments: string };
  mood: Mood;
  theme: Theme;
  sizeClass: SizeClass;
  statueHeightDm: number;
  regions: Regions;
  /** Highest regular tide, in decimetres above the floor. 0 = never flooded. */
  tideReachDm: number;
  falls: { wall: Side; from: number; to: number } | null;
  birdPerches: boolean;
  doors: Record<Side, Door[]>;
  stairs: Stair[];
  features: Feature[];
  tags: HallTag[];
  /** Number of statues the walls can hold (before absences). */
  slotCount: number;
}

const ARCH_COLUMNS = ['plain', 'fluted', 'paired', 'spiral-carved', 'clustered', 'square piers'] as const;
const ARCH_PILASTERS = ['flat', 'fluted', 'banded', 'panelled'] as const;
const ARCH_NICHES = ['round-headed', 'square', 'shell-headed', 'pointed', 'stepped'] as const;
const ARCH_PEDIMENTS = ['triangular', 'segmental', 'broken', 'none'] as const;

const cache = new WeakMap<World, Map<string, Hall>>();

function district(world: World, x: number, y: number, size: number, salt: number): number {
  return hashInts(world.seed, salt, floorDivExport(x, size), floorDivExport(y, size));
}

const featureCells = new WeakMap<World, Cell[]>();
function deadCells(world: World): { biscuit: Cell; alcove: Cell; child: Cell; concealed: Cell } {
  let c = featureCells.get(world);
  if (!c) {
    c = [
      cellFromRay('NW', 3, 0) as Cell, // Third North-Western Hall
      cellFromRay('SW', 14, 0) as Cell, // Fourteenth South-Western Hall
      cellFromRay('SE', 6, 0) as Cell, // Sixth South-Eastern Hall
      cellFromRay('NE', 18, 0) as Cell, // above the Eighteenth North-Eastern Hall
    ];
    featureCells.set(world, c);
  }
  return { biscuit: c[0] as Cell, alcove: c[1] as Cell, child: c[2] as Cell, concealed: c[3] as Cell };
}

export function hallId(x: number, y: number, level: Level): string {
  return `h:${x},${y},${level}`;
}

export function getHall(world: World, x: number, y: number, level: Level = 1): Hall {
  let m = cache.get(world);
  if (!m) { m = new Map(); cache.set(world, m); }
  const id = hallId(x, y, level);
  const hit = m.get(id);
  if (hit) return hit;
  const h = buildHall(world, x, y, level, id);
  if (m.size > 4000) m.clear();
  m.set(id, h);
  return h;
}

function buildHall(world: World, x: number, y: number, level: Level, id: string): Hall {
  const kind = cellKind(world, x, y);
  const regions = regionsAt(world, x, y, level);
  const rng = new Rng(hashInts(world.seed, 0x4a11, x, y, level));
  const isDark = regions.dark && level === 1;

  // --- size and shape -------------------------------------------------------------------------------------------
  const dBase = district(world, x, y, 5, 0x51);
  const scale = 80 + (dBase % 46); // 80..125 percent: halls vary by where you are
  let orientation: 'EW' | 'NS' = (district(world, x, y, 5, 0x52) % 100) < 50 ? 'EW' : 'NS';
  if (rng.chance(15, 100)) orientation = orientation === 'EW' ? 'NS' : 'EW';
  const vest = kind === 'vestibule' ? 120 : 100;
  const longM = Math.round((200 * scale * vest) / 10000) + rng.range(-12, 12);
  const shortM = Math.round((120 * scale * vest) / 10000) + rng.range(-8, 8);
  const xExtent = orientation === 'EW' ? longM : shortM;
  const yExtent = orientation === 'EW' ? shortM : longM;
  const heightM = isDark ? 24 : kind === 'vestibule' ? rng.range(50, 90) : rng.range(24, 34);
  const courtyardSides = rng.weighted([[4, 88], [6, 5], [8, 4], [3, 3]] as const) as 3 | 4 | 6 | 8;
  const windows: Record<Side, number> = { N: 0, E: 0, S: 0, W: 0 };
  if (!isDark) {
    for (const s of SIDES) {
      const len = s === 'N' || s === 'S' ? xExtent : yExtent;
      windows[s] = Math.max(1, Math.round(len / 28) + rng.range(-1, 2));
    }
  }
  const architecture = {
    columns: rng.pick(ARCH_COLUMNS),
    pilasters: rng.pick(ARCH_PILASTERS),
    niches: rng.pick(ARCH_NICHES),
    apses: rng.weighted([[0, 55], [1, 25], [2, 15], [3, 5]] as const),
    pediments: rng.pick(ARCH_PEDIMENTS),
  };

  // --- character: mood, theme, size ----------------------------------------------------------------------------
  const dChar = district(world, x, y, 4, 0x61);
  const dRng = new Rng(dChar);
  let mood: Mood;
  const canonViolent = level === 2 && x >= 19 && x <= 21 && y >= -3 && y <= 3;
  if (canonViolent) mood = 'violent';
  else if (dChar % 1000 < 12) mood = 'violent';
  else mood = dRng.weighted([['serene', 40], ['joyful', 25], ['solemn', 25], ['effort', 10]] as const);
  if (mood !== 'violent' && rng.chance(20, 100)) {
    mood = rng.weighted([['serene', 40], ['joyful', 25], ['solemn', 25], ['effort', 10]] as const);
  }
  if (mood !== 'violent' && rng.chance(1, 150)) mood = 'crowd';
  if (isDark) mood = 'crowd';

  let theme: Theme = dRng.pick(THEMES);
  if (mood === 'violent') theme = dRng.pick(['mythic', 'martial', 'beasts'] as const);
  else if (rng.chance(20, 100)) theme = rng.pick(THEMES);

  let sizeClass: SizeClass = dRng.weighted([['small', 15], ['life', 30], ['large', 45], ['huge', 10]] as const);
  if (rng.chance(15, 100)) {
    const i = SIZE_ORDER.indexOf(sizeClass) + (rng.chance(1, 2) ? 1 : -1);
    sizeClass = SIZE_ORDER[Math.min(SIZE_ORDER.length - 1, Math.max(0, i))] as SizeClass;
  }
  const ov = HALL_OVERRIDES[`${x},${y},${level}`];
  if (ov?.sizeClass) sizeClass = ov.sizeClass;
  if (regions.drowned && level === 1) { sizeClass = 'colossal'; mood = 'effort'; theme = 'mythic'; }
  const [lo, hi] = SIZE_DM[sizeClass];
  const statueHeightDm = rng.range(lo, hi);

  // --- water ---------------------------------------------------------------------------------------------------
  let tideReachDm = 0;
  if (level === 0) tideReachDm = heightM * 10; // lower halls are submerged for part of every cycle
  else if (level === 1 && !regions.drowned && !isDark) {
    let d = 99;
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
      if (isVestibule(world, x + dx, y + dy)) d = Math.min(d, Math.abs(dx) + Math.abs(dy));
    }
    const base = 16 - 5 * d; // ordinary tides: about waist height on the first tier at a vestibule, fading over three halls
    tideReachDm = base > 0 ? base + rng.range(0, 4) : 0;
  }
  const falls = rng.chance(35, 100)
    ? { wall: rng.pick(SIDES), from: rng.range(100, 600), to: 0 }
    : null;
  if (falls) falls.to = falls.from + rng.range(40, 250);
  const birdPerches = rng.chance(30, 100);

  // --- doors, stairs --------------------------------------------------------------------------------------------
  const doors: Record<Side, Door[]> = { N: [], E: [], S: [], W: [] };
  for (const s of SIDES) doors[s] = wallDoors(world, x, y, s, level);
  const stairs: Stair[] = [];
  const vnum = kind === 'vestibule' ? vestibuleNumber(world, x, y) : null;
  if (kind === 'vestibule') {
    if (vnum === 9) {
      stairs.push({ wall: 'N', pos: 200, name: 'westernmost' }, { wall: 'N', pos: 500, name: 'middle' }, { wall: 'N', pos: 800, name: 'easternmost' });
    } else if (vnum === 1) {
      stairs.push({ wall: 'S', pos: 500, name: 'great' });
    } else {
      const n = rng.weighted([[1, 60], [2, 25], [3, 15]] as const);
      const wall = rng.pick(SIDES);
      for (let i = 0; i < n; i++) stairs.push({ wall, pos: Math.round(((i + 1) * 1000) / (n + 1)), name: n === 1 ? 'stair' : `stair-${i + 1}` });
    }
  }

  // --- features (the optional Dead): the place exists regardless; only the occupant is conditional ---------------
  const features: Feature[] = [];
  const dc = deadCells(world);
  const dead = world.showDead;
  if (level === 1 && x === dc.biscuit.x && y === dc.biscuit.y) {
    features.push({ id: 'niche-third-nw', kind: 'niche', wall: 'N', occupant: dead ? 'skeleton-with-tin' : null, note: 'an empty niche in a wall of statues' });
  }
  if (level === 1 && x === dc.alcove.x && y === dc.alcove.y) {
    features.push({ id: 'alcove-14-sw', kind: 'alcove', wall: 'N', occupant: dead ? 'ten-skeletons-and-a-monkey' : null, note: 'the northernmost alcove, with an empty plinth' });
  }
  if (level === 1 && x === dc.child.x && y === dc.child.y) {
    features.push({ id: 'plinth-6-se', kind: 'plinth', wall: 'S', occupant: dead ? 'child-skeleton' : null, note: 'an empty plinth' });
  }
  if (level === 2 && x === dc.concealed.x && y === dc.concealed.y) {
    features.push({ id: 'gap-above-18-ne', kind: 'niche', wall: 'W', occupant: dead ? 'wedged-skeleton' : null, note: 'a narrow space between a plinth and the wall' });
  }

  // --- tags (what the audio and text layers key off) -------------------------------------------------------------
  const tags: HallTag[] = [];
  if (kind === 'vestibule') {
    if (vnum === 1) tags.push('first-vestibule', 'minotaurs');
    if (vnum === 9) tags.push('ninth-vestibule');
    if (vnum === 24) tags.push('pebble-bank');
    if (vnum === 43) tags.push('albatross-nest');
    if (vnum === 45) tags.push('mussel-stair');
    if (vnum === 17) tags.push('murmuration');
  }
  if (x === -1 && y === 0) tags.push('horned-giants');
  if (isDark) tags.push('dark-hall');
  if (x === -88 && y === 0) tags.push('gull-colony');
  if (x === -6 && y === 6) tags.push('rook-flock');
  if (x === -6 && y === 0) tags.push('bird-shelter');
  if (regions.drowned && level === 1) tags.push('drowned');
  if (regions.coral) tags.push('coral');
  if (regions.cloud) tags.push('cloud-zone');
  if (regions.derelict >= 60) tags.push('ruinous');

  const hall: Hall = {
    id, x, y, level, kind, name: cellName(world, x, y), orientation, xExtent, yExtent, heightM, courtyardSides, windows,
    architecture, mood, theme, sizeClass, statueHeightDm, regions, tideReachDm, falls, birdPerches, doors, stairs,
    features, tags, slotCount: 0,
  };
  hall.slotCount = wallGrids(hall).reduce((n, g) => n + g.tiers * g.slots, 0);
  return hall;
}

export interface WallGrid {
  wall: Side;
  lengthM: number;
  tiers: number;
  slots: number;
  tierHeightDm: number;
  pitchDm: number;
  /** index of this wall's first slot in the hall's flat numbering */
  offset: number;
}

export const MAX_SLOTS = 4500;

export function wallGrids(hall: Hall): WallGrid[] {
  const h = hall.statueHeightDm;
  const tierHeightDm = Math.floor((h * 125) / 100) + 6;
  const pitchDm = Math.max(12, Math.floor((h * 16) / 10));
  const tiers = Math.max(1, Math.floor((hall.heightM * 10) / tierHeightDm));
  const raw = SIDES.map((wall) => {
    const lengthM = wall === 'N' || wall === 'S' ? hall.xExtent : hall.yExtent;
    return { wall, lengthM, slots: Math.max(1, Math.floor((lengthM * 10) / pitchDm)) };
  });
  const total = raw.reduce((n, r) => n + r.slots * tiers, 0);
  const squeeze = total > MAX_SLOTS ? MAX_SLOTS / total : 1;
  const out: WallGrid[] = [];
  let offset = 0;
  for (const r of raw) {
    const slots = Math.max(1, Math.floor(r.slots * squeeze));
    out.push({ wall: r.wall, lengthM: r.lengthM, tiers, slots, tierHeightDm, pitchDm: Math.floor((r.lengthM * 10) / slots), offset });
    offset += tiers * slots;
  }
  return out;
}

export { DARK_HALL };
