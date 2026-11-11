// Previous visitors: very rare, anonymous leftovers already lying in the world when you arrive. A pure function of the
// seed, so everyone sees the same ones. All wording here is our own. Nothing is explained and nothing rewards you.
// (Picking them up waits for the inventory, which arrives with multiplayer.)

import type { Hall } from './hall';
import { OPPOSITE, type Side } from './layout';
import { Rng, hashInts } from './rng';
import { nearbyVestibules } from './tidegeo';
import type { World } from './world';

export type RelicKind = 'flotsam' | 'litter' | 'old-sleeping-bag' | 'crumpled-note' | 'torn-scraps' | 'door-mark' | 'small-stray';

export interface Relic {
  /** Stable for a given world: the same relic has the same id for everyone. */
  id: string;
  kind: RelicKind;
  /** A short phrase for lists. */
  label: string;
  /** The thing itself, as a noun phrase, and where it lies, for sentences ("a flattened cardboard box", "in the hollow under the stair"). */
  thing: string;
  where: string;
  /** What you see when you look closely. */
  detail: string;
  wall: Side | null;
  /** 0..1000 along the wall. */
  pos: number;
}

/** Written by us. Always damaged: only a few words ever show. No names, no outside places, no story. */
export const NOTE_FRAGMENTS: readonly string[] = [
  '...the sea was loud all night...',
  '...keep the small door on your left...',
  '...bring something warm...',
  '...I counted forty-one steps...',
  '...do not go east after the rain...',
  '...the birds were restless...',
  '...mark the doors as you go...',
  '...the water rose to my knees...',
  '...somewhere dry to rest...',
];

/** Halls within this many rings of the First Vestibule are where earlier visitors came and went. */
export const ORIGIN_ZONE = 5;
/** One relic per this many halls near the First Vestibule and far from it (before the density setting). */
const NEAR_ONE_IN = 25;
const FAR_ONE_IN = 400;
/** One run of door marks starts at roughly one hall in this many; each run covers 5 to 13 halls in a line. */
const RUN_ONE_IN = 500;

const DIR: Record<Side, readonly [number, number]> = { N: [0, 1], E: [1, 0], S: [0, -1], W: [-1, 0] };
const SIDES: readonly Side[] = ['N', 'E', 'S', 'W'];
const SIDE_WORD: Record<Side, string> = { N: 'north', E: 'east', S: 'south', W: 'west' };

const LITTER: readonly { label: string; detail: string }[] = [
  { label: 'an empty packet, faded to no colour', detail: 'A thin crinkled packet, long empty, its printing faded to ghosts. It was made for something small and salty, somewhere that is not here.' },
  { label: 'a flattened cardboard box', detail: 'Soft with damp and folded flat. The words that were on it have almost gone.' },
  { label: 'a scrap of waxy wrapper', detail: 'A twist of waxy paper that once held some kind of pastry. It still smells faintly of fat and flour.' },
];

const STRAYS: readonly { label: string; detail: string }[] = [
  { label: 'a ballpoint pen', detail: 'A cheap pen with its cap gone and its ink long dried. It leaves no mark on anything.' },
  { label: 'an empty tin', detail: 'A small round tin with a rusted lid. Whatever it held is gone, but something inside still rattles faintly.' },
  { label: 'a scrap of grey cloth', detail: 'A palm-sized rag of grey cloth, frayed at every edge, as if torn from something worn thin.' },
];

function pick<T>(arr: readonly T[], h: number): T {
  return arr[h % arr.length] as T;
}

function at(h: number, salt: number): number {
  return hashInts(h, salt) >>> 0;
}

function placeOn(h: number): { wall: Side; pos: number } {
  const r = new Rng(h);
  return { wall: r.pick(SIDES), pos: r.range(80, 920) };
}

/** Where on a wall's doorframes a mark goes: at the door nearest the middle, or null if the wall has no door. */
function doorPos(hall: Hall, wall: Side): number | null {
  const doors = hall.doors[wall].filter((d) => d.corridor === 0);
  if (doors.length === 0) return null;
  return doors.slice().sort((a, b) => Math.abs(a.pos - 500) - Math.abs(b.pos - 500))[0]!.pos;
}

function fragmentNote(h: number): string {
  return pick(NOTE_FRAGMENTS, h);
}

/** Door-mark runs: a run starts at an anchor hall, heads in one direction, covers 5 to 13 halls. */
function runAt(world: World, ax: number, ay: number): { dir: Side; length: number; style: 'arrow' | 'tally' | 'circle' } | null {
  const h = hashInts(world.seed, 0xd007, ax, ay);
  if (h % RUN_ONE_IN !== 0) return null;
  return { dir: pick(SIDES, at(h, 1)), length: 5 + (at(h, 2) % 9), style: pick(['arrow', 'tally', 'circle'] as const, at(h, 3)) };
}

function markFor(style: 'arrow' | 'tally' | 'circle', dir: Side, k: number, last: boolean): { label: string; detail: string } {
  const where = 'low on the doorframe, below the height of a tall person\'s eyes';
  const old = 'Almost washed out by damp and age. Someone long ago marked these doors, perhaps so as not to be lost.';
  const end = last ? ' The marks stop at this door.' : '';
  if (style === 'arrow') return { label: `a faded chalk arrow pointing ${SIDE_WORD[dir]}`, detail: `A chalk arrow ${where}, pointing ${SIDE_WORD[dir]}. ${old}${end}` };
  if (style === 'circle') return { label: 'a faded chalk circle on a doorframe', detail: `A chalk circle ${where}. ${old}${end}` };
  const n = k + 1;
  return { label: `a row of ${n} faded tally strokes`, detail: `${n} short chalk strokes in a row, ${where}. ${old}${end}` };
}

/**
 * The relics lying in one hall. `month` (1..12) matters only for the gull nests, whose scraps can be reached when the gulls
 * are not nesting. `density` scales how many there are; 0 turns them off.
 */
export function relicsIn(world: World, hall: Hall, month: number, density = 1, tideEpoch?: number): Relic[] {
  if (density <= 0 || hall.level !== 1 || hall.regions.drowned || hall.tags.includes('dark-hall')) return [];
  const out = relicsLying(world, hall, month, density);
  return tideEpoch === undefined ? out : washed(world, hall, out, tideEpoch, density);
}

/** One tide cycle (a lunar "tidal day"), the unit by which the water comes and goes. */
export const TIDAL_DAY_MS = 44_700_000;

/** How likely the water is to reach, and so move things, in a hall this many rooms from the nearest vestibule (percent per tide cycle). */
function reachPercent(world: World, hall: Hall): number {
  let rooms = 9;
  for (const v of nearbyVestibules(world, hall.x, hall.y)) rooms = Math.min(rooms, v.rooms);
  return rooms <= 1 ? 70 : rooms === 2 ? 40 : rooms === 3 ? 15 : 0;
}

const FLOTSAM: readonly { label: string; detail: string }[] = [
  { label: 'a ragged ribbon of dark weed', detail: 'Wet weed, slick with the sea and not yet dry, laid in a ribbon where the water stopped. It smells of salt and cold.' },
  { label: 'a bleached length of driftwood', detail: 'A pale branch worn smooth by a long time in the water, with no bark left on it. It is lighter than it looks.' },
  { label: 'a scatter of small grey shells', detail: 'Little ridged shells in a drift, most of them empty, a few cracked. The water carried them in and left them.' },
  { label: 'a pale cuttlebone', detail: 'A chalky oval, light as foam, with a faint ridged pattern. It crumbles a little if you press it.' },
  { label: 'a tangle of old rope, stiff with salt', detail: 'A knot of grey rope gone hard with salt. It was cut, not broken, a long time ago.' },
];

const MOVABLE = /:(litter|note|stray)$/;

/**
 * What the tide does to the loose things lying in a hall it reaches. Each cycle the water may lift an article and set it down against
 * another wall, or carry it off altogether; and it leaves its own flotsam along the foot of a wall for a cycle or two. A pure function
 * of the tide cycle, so everyone sees the same shore at the same time.
 */
function washed(world: World, hall: Hall, lying: Relic[], epoch: number, density: number): Relic[] {
  const p = reachPercent(world, hall);
  if (p === 0) return lying;
  const out: Relic[] = [];
  for (const r of lying) {
    if (!MOVABLE.test(r.id)) { out.push(r); continue; }
    const idh = hashInts(world.seed, 0x7d1e, hall.x, hall.y);
    let last = -1;
    for (let e = epoch; e > epoch - 40; e--) if (hashInts(idh, e) % 100 < p) { last = e; break; }
    if (last < 0) { out.push(r); continue; }
    const hh = hashInts(idh, last, 7) >>> 0;
    if (hh % 100 < 15) continue; // carried off
    const wall = SIDES[(hh >>> 3) % 4] as Side;
    const where = `against the ${SIDE_WORD[wall]} wall, where the water left it`;
    out.push({ ...r, wall, pos: 100 + ((hh >>> 7) % 800), where, label: `${r.thing}, lying ${where}` });
  }
  if (density > 0) {
    for (const back of [0, 1]) {
      const e = epoch - back;
      const h = hashInts(world.seed, 0xf107, hall.x, hall.y, e) >>> 0;
      if (h % 100 >= (back === 0 ? 55 : 25) * p / 70) continue;
      const f = pick(FLOTSAM, h >>> 4);
      const wall = SIDES[(h >>> 9) % 4] as Side;
      const where = `along the foot of the ${SIDE_WORD[wall]} wall, left by the tide`;
      out.push({ id: `r:${hall.x},${hall.y}:flot:${e}`, kind: 'flotsam', label: `${f.label}, ${where}`, thing: f.label, where, detail: f.detail, wall, pos: 100 + ((h >>> 12) % 800) });
    }
  }
  return out;
}

function relicsLying(world: World, hall: Hall, month: number, density: number): Relic[] {
  if (density <= 0 || hall.level !== 1 || hall.regions.drowned || hall.tags.includes('dark-hall')) return [];
  const out: Relic[] = [];
  const base = `r:${hall.x},${hall.y}`;

  // The First Vestibule: the one place where earlier visitors left the most.
  if (hall.x === 0 && hall.y === 0) {
    const stairWall = hall.stairs[0]?.wall ?? 'S';
    out.push({
      id: `${base}:sleeping-bag`, kind: 'old-sleeping-bag', label: 'a stiff old sleeping bag, rolled up', thing: 'a stiff old sleeping bag, rolled up', where: 'in the pale hollow beneath the great stair',
      detail: 'Abandoned in the pale hollow beneath the great stair. It is stiff with damp and salt and smells strongly of a long time ago. Someone slept here once and did not take it with them.',
      wall: stairWall, pos: hall.stairs[0]?.pos ?? 500,
    });
    const n = 1 + (hashInts(world.seed, 0x11d, 0) % 3);
    for (let i = 0; i < n; i++) {
      const l = pick(LITTER, hashInts(world.seed, 0x11e, i));
      out.push({ id: `${base}:litter:${i}`, kind: 'litter', label: `${l.label}, caught in the hollow under the stair`, thing: l.label, where: 'caught in the hollow under the stair', detail: l.detail, wall: stairWall, pos: (hall.stairs[0]?.pos ?? 500) + (i - 1) * 60 });
    }
  }

  // The gull colony: torn scraps of paper on the pavement, and more woven into the old nests.
  if (hall.tags.includes('gull-colony')) {
    const h = hashInts(world.seed, 0x5c4a, hall.x);
    const onFloor = 10 + (h % 11);
    out.push({
      id: `${base}:scraps-floor`, kind: 'torn-scraps', label: `about ${onFloor} torn scraps of paper scattered over the pavement`, thing: `${onFloor} or so torn scraps of paper`, where: 'scattered over the pavement',
      detail: `Torn scraps of paper, hasty and damp, lying thick on the pavement. Almost all are blank or smeared beyond reading. One shows a few words: "${fragmentNote(at(h, 1))}".`,
      wall: null, pos: 500,
    });
    const nesting = month >= 3 && month <= 8;
    if (!nesting) {
      const inNests = 5 + (at(h, 2) % 6);
      out.push({
        id: `${base}:scraps-nests`, kind: 'torn-scraps', label: `about ${inNests} more scraps woven into the empty nests`, thing: `${inNests} or so more scraps of paper`, where: 'woven into the empty nests',
        detail: `The gulls have gone, and their ramshackle nests of dry weed and fishbone are empty. Scraps of paper are woven through the weed. None of them can be read.`,
        wall: pick(SIDES, at(h, 3)), pos: 100 + (at(h, 4) % 800),
      });
    }
  }

  // One-off rarities scattered by distance from the First Vestibule.
  if (!(hall.x === 0 && hall.y === 0)) {
    const zone = Math.max(Math.abs(hall.x), Math.abs(hall.y)) <= ORIGIN_ZONE;
    const oneIn = zone ? NEAR_ONE_IN : FAR_ONE_IN;
    const roll = hashInts(world.seed, 0x4e11, hall.x, hall.y);
    if ((roll % 100_000) < (100_000 * density) / oneIn) {
      const k = pick(zone ? (['litter', 'litter', 'litter', 'litter', 'crumpled-note', 'small-stray', 'small-stray'] as const)
        : (['crumpled-note', 'small-stray', 'small-stray'] as const), at(roll, 1));
      const spot = placeOn(at(roll, 2));
      if (k === 'litter') {
        const l = pick(LITTER, at(roll, 3));
        out.push({ id: `${base}:litter`, kind: 'litter', label: l.label, thing: l.label, where: '', detail: l.detail, ...spot });
      } else if (k === 'crumpled-note') {
        out.push({
          id: `${base}:note`, kind: 'crumpled-note', label: 'a crumpled sheet of paper, ruined by damp', thing: 'a crumpled sheet of paper, ruined by damp', where: '',
          detail: `A crumpled sheet, softened to pulp by damp and nearly blank. You can make out only: "${fragmentNote(at(roll, 4))}".`, ...spot,
        });
      } else {
        const s = pick(STRAYS, at(roll, 5));
        out.push({ id: `${base}:stray`, kind: 'small-stray', label: s.label, thing: s.label, where: '', detail: s.detail, ...spot });
      }
    }
  }

  // Runs of old chalk marks on doorframes.
  for (const dir of SIDES) {
    const [dx, dy] = DIR[dir];
    for (let k = 0; k < 13; k++) {
      const run = runAt(world, hall.x - dx * k, hall.y - dy * k);
      if (!run || run.dir !== dir || k >= run.length) continue;
      const pos = doorPos(hall, dir);
      if (pos === null) continue;
      const m = markFor(run.style, dir, k, k === run.length - 1);
      out.push({ id: `${base}:mark:${dir}`, kind: 'door-mark', label: `${m.label}, on the ${SIDE_WORD[dir]} doorframe`, thing: m.label, where: `low on the ${SIDE_WORD[dir]} doorframe`, detail: m.detail, wall: dir, pos });
    }
  }
  void OPPOSITE;
  return out;
}
