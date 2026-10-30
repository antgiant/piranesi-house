// Topology of the House: cells, naming, vestibule lattice, doors.
//
// Coordinates: x east, y north, the First Vestibule at (0,0). Every (x,y) is one cell, which is either a hall or a
// vestibule, and exists on three levels (0 lower, 1 middle, 2 upper). The book's own numbering is not fully
// self-consistent; DESIGN CHOICES made here are listed in canon/open_questions.yaml (Q-001, Q-002).

import { Rng, floorDiv, hashInts } from './rng';

export const floorDivExport = floorDiv;
import { ordinalWord, parseOrdinal } from './words';
import type { World } from './world';

export type Side = 'N' | 'E' | 'S' | 'W';
export const SIDES: readonly Side[] = ['N', 'E', 'S', 'W'];
export const DX: Record<Side, number> = { N: 0, E: 1, S: 0, W: -1 };
export const DY: Record<Side, number> = { N: 1, E: 0, S: -1, W: 0 };
export const OPPOSITE: Record<Side, Side> = { N: 'S', E: 'W', S: 'N', W: 'E' };

export type Level = 0 | 1 | 2;

export interface Cell {
  x: number;
  y: number;
}
export const cellKey = (x: number, y: number): string => `${x},${y}`;

// ---------------------------------------------------------------------------------------------------------------
// Rays: the eight named directions. Every non-origin cell belongs to its nearest ray.
// ---------------------------------------------------------------------------------------------------------------

export type Ray = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';
export const RAYS: readonly Ray[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
export const RAY_WORD: Record<Ray, string> = {
  N: 'Northern', NE: 'North-Eastern', E: 'Eastern', SE: 'South-Eastern',
  S: 'Southern', SW: 'South-Western', W: 'Western', NW: 'North-Western',
};

/** Nearest ray by angle, integer-only (the 22.5 degree boundary is tan = 0.41421 ~ 29/70). */
export function rayOf(x: number, y: number): Ray | null {
  if (x === 0 && y === 0) return null;
  const ax = Math.abs(x);
  const ay = Math.abs(y);
  const lo = Math.min(ax, ay);
  const hi = Math.max(ax, ay);
  if (70 * lo < 29 * hi) {
    if (ax > ay) return x > 0 ? 'E' : 'W';
    return y > 0 ? 'N' : 'S';
  }
  if (x > 0) return y > 0 ? 'NE' : 'SE';
  return y > 0 ? 'NW' : 'SW';
}

export const ringOf = (x: number, y: number): number => Math.max(Math.abs(x), Math.abs(y));

/** Signed offset from the ray centre line. See cellFromRay for the inverse. */
export function lateralOf(x: number, y: number): number {
  const r = rayOf(x, y);
  switch (r) {
    case null: return 0;
    case 'E': case 'W': return y;
    case 'N': case 'S': return x;
    default: return Math.abs(x) - Math.abs(y);
  }
}

export function cellFromRay(ray: Ray, ring: number, lateral: number): Cell | null {
  let c: Cell;
  switch (ray) {
    case 'E': c = { x: ring, y: lateral }; break;
    case 'W': c = { x: -ring, y: lateral }; break;
    case 'N': c = { x: lateral, y: ring }; break;
    case 'S': c = { x: lateral, y: -ring }; break;
    default: {
      let ax: number;
      let ay: number;
      if (lateral >= 0) { ax = ring; ay = ring - lateral; } else { ay = ring; ax = ring + lateral; }
      if (ay < 0 || ax < 0) return null;
      const sx = ray === 'NE' || ray === 'SE' ? 1 : -1;
      const sy = ray === 'NE' || ray === 'NW' ? 1 : -1;
      c = { x: sx * ax, y: sy * ay };
    }
  }
  return rayOf(c.x, c.y) === ray && ringOf(c.x, c.y) === ring ? c : null;
}

export const isOnRay = (x: number, y: number): boolean => x === 0 || y === 0 || Math.abs(x) === Math.abs(y);

// ---------------------------------------------------------------------------------------------------------------
// Vestibules: one per 3x3 block at a hashed position, never on a ray. The First Vestibule and the Ninth are pinned.
// ---------------------------------------------------------------------------------------------------------------

export type CellKind = 'hall' | 'vestibule';
const BLOCK = 3;

interface Pin { n: number; x: number; y: number }
/**
 * n is the vestibule's ordinal. The book's "N halls west and north" is read as N rings out (Chebyshev distance),
 * since a vestibule cannot sit on a ray. Rooms the book places relative to one another are pinned here.
 */
export const PINNED_VESTIBULES: readonly Pin[] = [
  { n: 1, x: 0, y: 0 },
  { n: 6, x: 1, y: -2 }, // its stair floods the Second Southern Hall (0,-2) within minutes of a tide
  { n: 9, x: -2, y: 1 }, // two halls west and north of the First
  { n: 10, x: 1, y: 8 }, // a northern tide rises here, flooding the Eighth Northern Hall (0,8)
  { n: 12, x: -1, y: 8 }, // an eastern tide rises here moments later, flooding the same hall
  { n: 22, x: -5, y: -4 }, // five halls south and west of the First
  { n: 24, x: -6, y: 8 }, // between the Sixth North-Western Hall (-6,7) and the Eighteenth (-6,9)
];

function pinnedAt(x: number, y: number): Pin | undefined {
  return PINNED_VESTIBULES.find((p) => p.x === x && p.y === y);
}

function vestibuleInBlock(world: World, bx: number, by: number): Cell | null {
  for (const p of PINNED_VESTIBULES) {
    if (floorDiv(p.x, BLOCK) === bx && floorDiv(p.y, BLOCK) === by) return { x: p.x, y: p.y };
  }
  for (let attempt = 0; attempt < 6; attempt++) {
    const h = hashInts(world.seed, 0x7e57, bx, by, attempt);
    const x = bx * BLOCK + (h % BLOCK);
    const y = by * BLOCK + (Math.floor(h / BLOCK) % BLOCK);
    if (!isOnRay(x, y)) return { x, y };
  }
  return null;
}

export function isVestibule(world: World, x: number, y: number): boolean {
  const v = vestibuleInBlock(world, floorDiv(x, BLOCK), floorDiv(y, BLOCK));
  return v !== null && v.x === x && v.y === y;
}

export const cellKind = (world: World, x: number, y: number): CellKind => (isVestibule(world, x, y) ? 'vestibule' : 'hall');

interface VTable {
  radius: number;
  cells: Cell[]; // index = ordinal - 1
  byKey: Map<string, number>;
}
const vcache = new WeakMap<World, VTable>();

function buildVestibules(world: World, radius: number): VTable {
  const r2 = radius * radius;
  const natural: Cell[] = [];
  const b0 = floorDiv(-radius - BLOCK, BLOCK);
  const b1 = floorDiv(radius + BLOCK, BLOCK);
  for (let by = b0; by <= b1; by++) {
    for (let bx = b0; bx <= b1; bx++) {
      const v = vestibuleInBlock(world, bx, by);
      if (v && v.x * v.x + v.y * v.y <= r2 && !pinnedAt(v.x, v.y)) natural.push(v);
    }
  }
  natural.sort((a, b) => a.x * a.x + a.y * a.y - (b.x * b.x + b.y * b.y) || a.y - b.y || a.x - b.x);
  const cells: Cell[] = [];
  let ni = 0;
  const maxPin = Math.max(...PINNED_VESTIBULES.map((p) => p.n));
  if (natural.length + PINNED_VESTIBULES.length < maxPin) throw new Error('vestibule table radius too small for the pins');
  for (let n = 1; n <= maxPin || ni < natural.length; n++) {
    const pin = PINNED_VESTIBULES.find((p) => p.n === n);
    if (pin) cells.push({ x: pin.x, y: pin.y });
    else if (ni < natural.length) cells.push(natural[ni++] as Cell);
    else break;
  }
  const byKey = new Map<string, number>();
  cells.forEach((c, i) => byKey.set(cellKey(c.x, c.y), i + 1));
  return { radius, cells, byKey };
}

function vtable(world: World, minRadius: number): VTable {
  let t = vcache.get(world);
  if (!t || t.radius < minRadius) {
    t = buildVestibules(world, Math.max(12, minRadius * 2));
    vcache.set(world, t);
  }
  return t;
}

/** Ordinal of the vestibule at (x,y), or null if that cell is a hall. */
export function vestibuleNumber(world: World, x: number, y: number): number | null {
  if (!isVestibule(world, x, y)) return null;
  const t = vtable(world, Math.ceil(Math.sqrt(x * x + y * y)) + 1);
  return t.byKey.get(cellKey(x, y)) ?? null;
}

export function vestibuleCell(world: World, n: number): Cell | null {
  if (n < 1) return null;
  let radius = 12;
  for (let i = 0; i < 12; i++) {
    const t = vtable(world, radius);
    if (n <= t.cells.length) return t.cells[n - 1] as Cell;
    radius *= 2;
  }
  return null;
}

// ---------------------------------------------------------------------------------------------------------------
// Names
// ---------------------------------------------------------------------------------------------------------------

function lateralWord(ray: Ray, lateral: number): string {
  const n = Math.abs(lateral);
  let dir: string;
  switch (ray) {
    case 'E': case 'W': dir = lateral > 0 ? 'north' : 'south'; break;
    case 'N': case 'S': dir = lateral > 0 ? 'east' : 'west'; break;
    case 'NE': dir = lateral > 0 ? 'east' : 'north'; break;
    case 'NW': dir = lateral > 0 ? 'west' : 'north'; break;
    case 'SE': dir = lateral > 0 ? 'east' : 'south'; break;
    case 'SW': dir = lateral > 0 ? 'west' : 'south'; break;
  }
  return `${n} ${n === 1 ? 'row' : 'rows'} ${dir}`;
}

/**
 * The book gives some halls relative positions that ring-based numbering cannot satisfy. Each pair below exchanges
 * the two halls' names, so names stay unique and every room the book locates ends up where it says.
 */
export const NAME_SWAPS: readonly (readonly [Cell, Cell])[] = [
  [{ x: -6, y: 6 }, { x: -6, y: 7 }], // the Sixth North-Western Hall is the thirteenth room from the First Vestibule
  [{ x: -18, y: 18 }, { x: -6, y: 9 }], // the Eighteenth lies beyond the Twenty-Fourth Vestibule from the Sixth
  [{ x: -4, y: 4 }, { x: -4, y: 5 }], // the Fourth North-Western Hall adjoins the Fifth (-5,5): the Faun's door
  [{ x: -3, y: 0 }, { x: -3, y: 1 }], // the Third Western Hall is seven halls from the Eighth Northern Hall
];

function swapped(x: number, y: number): Cell {
  for (const [a, b] of NAME_SWAPS) {
    if (a.x === x && a.y === y) return b;
    if (b.x === x && b.y === y) return a;
  }
  return { x, y };
}

export function cellName(world: World, x: number, y: number): string {
  const s = swapped(x, y);
  return naturalName(world, s.x, s.y);
}

function naturalName(world: World, x: number, y: number): string {
  if (x === 0 && y === 0) return 'First Vestibule';
  const vn = vestibuleNumber(world, x, y);
  if (vn !== null) return vn <= 9999 ? `${ordinalWord(vn)} Vestibule` : `Vestibule No. ${vn}`;
  const ray = rayOf(x, y) as Ray;
  const ring = ringOf(x, y);
  if (ring > 9999) return `Hall (${x}, ${y})`;
  const lat = lateralOf(x, y);
  const base = `${ordinalWord(ring)} ${RAY_WORD[ray]} Hall`;
  return lat === 0 ? base : `${base}, ${lateralWord(ray, lat)}`;
}

const RAY_BY_WORD = new Map<string, Ray>(RAYS.map((r) => [RAY_WORD[r], r]));
const HALL_RE = /^(.+?) (Northern|North-Eastern|Eastern|South-Eastern|Southern|South-Western|Western|North-Western) Hall(?:, (\d+) rows? (north|south|east|west))?$/;

export function parseCellName(world: World, name: string): Cell | null {
  const c = parseNaturalName(world, name);
  return c ? swapped(c.x, c.y) : null;
}

function parseNaturalName(world: World, name: string): Cell | null {
  const n = name.trim().replace(/\s+/g, ' ');
  const vm = /^(.+) Vestibule$/.exec(n);
  if (vm) {
    const k = parseOrdinal(vm[1] as string);
    return k === null ? null : vestibuleCell(world, k);
  }
  const m = HALL_RE.exec(n);
  if (!m) return null;
  const ring = parseOrdinal(m[1] as string);
  const ray = RAY_BY_WORD.get(m[2] as string);
  if (ring === null || !ray) return null;
  let lateral = 0;
  if (m[3] !== undefined) {
    const mag = Number(m[3]);
    const dir = m[4] as string;
    const positive = ray === 'E' || ray === 'W' ? dir === 'north'
      : ray === 'N' || ray === 'S' ? dir === 'east'
      : dir === 'east' || dir === 'west'; // diagonals: horizontal side is positive
    lateral = positive ? mag : -mag;
  }
  const c = cellFromRay(ray, ring, lateral);
  if (!c || cellKind(world, c.x, c.y) !== 'hall') return null;
  return naturalName(world, c.x, c.y) === n ? c : null;
}

// ---------------------------------------------------------------------------------------------------------------
// Doors
// ---------------------------------------------------------------------------------------------------------------

/** pos is 0..1000 along the wall, increasing with x on N/S walls and with y on E/W walls. */
export interface Door {
  pos: number;
  to: Cell;
  /** Number of halls' worth of corridor between this door and `to` (0 for an ordinary door to the neighbour). */
  corridor: number;
}

/** The single-door hall with no windows. Located at the 192nd Western Hall. */
export const DARK_HALL: Cell = { x: -192, y: 0 };

function edgeKeyFor(x: number, y: number, side: Side): { ex: number; ey: number; axis: 'E' | 'N' } {
  switch (side) {
    case 'E': return { ex: x, ey: y, axis: 'E' };
    case 'W': return { ex: x - 1, ey: y, axis: 'E' };
    case 'N': return { ex: x, ey: y, axis: 'N' };
    case 'S': return { ex: x, ey: y - 1, axis: 'N' };
  }
}

interface Extra { x: number; y: number; side: Side; door: Door }

/** Pinned edges (exact door positions) and one-sided corridor doors that reproduce the book's directions. */
const PINNED_EDGES: ReadonlyMap<string, readonly number[]> = new Map([
  ['E,-1,0', [500]], // First Vestibule <-> First Western Hall: "the Western Door"
  ['N,-1,0', [120, 180, 400, 640, 860]], // First Western Hall <-> First North-Western Hall (third door on the right from the east)
  ['E,-192,0', [500]], // the dark hall's one door
  ['E,-5,5', [500]], // a door on the Fifth North-Western Hall's east wall, beside the Faun
]);

const EXTRAS: readonly Extra[] = [
  // The third door west of the entry on the First North-Western Hall's south wall leads by corridor to the Fourth Western Hall.
  { x: -1, y: 1, side: 'S', door: { pos: 60, to: { x: -4, y: 0 }, corridor: 3 } },
  { x: -4, y: 0, side: 'E', door: { pos: 800, to: { x: -1, y: 1 }, corridor: 3 } },
  // A corridor from the First Vestibule's west wall to the First South-Western Hall.
  { x: 0, y: 0, side: 'W', door: { pos: 220, to: { x: -1, y: -1 }, corridor: 1 } },
  { x: -1, y: -1, side: 'E', door: { pos: 700, to: { x: 0, y: 0 }, corridor: 1 } },
];

/** A winding route of exactly thirteen rooms from the First Vestibule to the Sixth North-Western Hall at (-6,7). */
const ROUTE_13: readonly Cell[] = [
  { x: 0, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 1 }, { x: -1, y: 2 }, { x: -2, y: 2 }, { x: -2, y: 3 }, { x: -3, y: 3 },
  { x: -3, y: 4 }, { x: -4, y: 4 }, { x: -4, y: 5 }, { x: -5, y: 5 }, { x: -5, y: 6 }, { x: -6, y: 6 }, { x: -6, y: 7 },
];
const FORCED_EDGES: ReadonlySet<string> = new Set(
  ROUTE_13.slice(1).map((q, i) => {
    const p = ROUTE_13[i] as Cell;
    return q.x !== p.x ? `E,${Math.min(p.x, q.x)},${p.y}` : `N,${p.x},${Math.min(p.y, q.y)}`;
  }),
);

function edgeDoorPositions(world: World, ex: number, ey: number, axis: 'E' | 'N', level: Level): number[] {
  const out = edgeDoorPositionsRaw(world, ex, ey, axis, level);
  if (out.length === 0 && level === 1 && FORCED_EDGES.has(`${axis},${ex},${ey}`)) return [500];
  return out;
}

function edgeDoorPositionsRaw(world: World, ex: number, ey: number, axis: 'E' | 'N', level: Level): number[] {
  const pinned = level === 1 ? PINNED_EDGES.get(`${axis},${ex},${ey}`) : undefined;
  if (pinned) return pinned.slice();
  const ax = ex;
  const ay = ey;
  const bx = axis === 'E' ? ex + 1 : ex;
  const by = axis === 'N' ? ey + 1 : ey;
  const isDark = (x: number, y: number) => x === DARK_HALL.x && y === DARK_HALL.y;
  if (isDark(ax, ay) || isDark(bx, by)) return [];
  const involvesVestibule = isVestibule(world, ax, ay) || isVestibule(world, bx, by);
  const rng = new Rng(hashInts(world.seed, 0xd00a, ex, ey, axis === 'E' ? 0 : 1, level));
  const count = involvesVestibule
    ? rng.weighted([[1, 30], [2, 35], [3, 25], [4, 10]] as const)
    : rng.weighted([[0, 5], [1, 28], [2, 30], [3, 20], [4, 12], [5, 5]] as const);
  if (count === 0) return [];
  const band = Math.floor(880 / count);
  const out: number[] = [];
  for (let i = 0; i < count; i++) out.push(60 + i * band + rng.range(40, band - 40));
  return out;
}

export function wallDoors(world: World, x: number, y: number, side: Side, level: Level = 1): Door[] {
  const { ex, ey, axis } = edgeKeyFor(x, y, side);
  const to: Cell = { x: x + DX[side], y: y + DY[side] };
  const doors: Door[] = edgeDoorPositions(world, ex, ey, axis, level).map((pos) => ({ pos, to, corridor: 0 }));
  if (level === 1) {
    for (const e of EXTRAS) if (e.x === x && e.y === y && e.side === side) doors.push({ ...e.door });
  }
  return doors.sort((a, b) => a.pos - b.pos);
}

export interface Exit extends Door {
  side: Side;
  /** Index among this wall's doors, from the low end (west or south). */
  index: number;
}

export function exits(world: World, x: number, y: number, level: Level = 1): Exit[] {
  const out: Exit[] = [];
  for (const side of SIDES) wallDoors(world, x, y, side, level).forEach((d, index) => out.push({ ...d, side, index }));
  return out;
}
