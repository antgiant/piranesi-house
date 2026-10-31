// Architectural flourishes: the strange, enormous and beautiful things a great imagined building does above the statues,
// in the manner of the eighteenth-century etchers of impossible halls and ruined Rome: arches opening behind arches,
// staircases that climb to nowhere, bridges without parapets, galleries hung on chains, great wheels, ropes and pulley-blocks
// that nobody tends, light falling in single shafts. All peaceful: no instruments of any kind, only stone, timber and iron
// that have stood a very long time. Wording is ours.
//
// Each hall has its own few, a pure function of the seed, the hall and its level, so every view agrees. They sit above the
// statues and do not take up statue slots.

import type { Hall } from './hall';
import type { Side } from './layout';
import { SIDES } from './layout';
import { Rng, hashInts } from './rng';
import type { World } from './world';

export interface Flourish {
  id: string;
  kind: string;
  wall: Side;
  /** 0..1000 along the wall, low end (west or south) to high end. */
  along: number;
  /** Height above the floor, metres. */
  heightM: number;
  /** A sentence for looking around. */
  text: string;
  /** A phrase for something seen in passing, to follow "You pass" or "Overhead". */
  pass: string;
}

const WALL: Record<Side, string> = { N: 'north', E: 'east', S: 'south', W: 'west' };

interface Make { text: string; pass: string }
interface Kind {
  id: string;
  weight: number;
  /** Needs a hall at least this tall (metres) to look right. */
  minH?: number;
  /** Where it lives: on a wall at a fraction of the height, or across the hall. */
  at: number;
  make(r: Rng, w: string, h: number): Make;
}

const pick = <T,>(r: Rng, xs: readonly T[]): T => xs[r.int(xs.length)] as T;
const m = (v: number): string => `${Math.max(2, Math.round(v))} metres`;

const KINDS: Kind[] = [
  { id: 'arches-receding', weight: 10, at: 0.35, make: (r, w) => {
    const n = 4 + r.int(5);
    return {
      text: pick(r, [
        `In the ${w} wall one great arch opens behind another, ${n} of them, each smaller than the last, until the farthest is a dark point you cannot judge the distance to.`,
        `An arch in the ${w} wall frames a second arch, and that a third; you count ${n} before the light gives out.`,
      ]),
      pass: pick(r, [`the arches in the ${w} wall, opening one behind another until they are lost`, `a ${w}-wall arch that frames arch after arch into the dark`]),
    };
  } },
  { id: 'stair-nowhere', weight: 10, at: 0.5, make: (r, w, h) => {
    const top = m(h * 0.6);
    return {
      text: pick(r, [
        `A flight of stone steps climbs the ${w} wall without a rail, rising ${top}, and stops against blank masonry.`,
        `Steps without a rail climb the ${w} wall in a long diagonal, turn once, and end at a plain wall ${top} above the floor.`,
      ]),
      pass: pick(r, [`a stair on the ${w} wall that climbs without a rail and ends in the stone`, `steps going up the ${w} wall to nowhere`]),
    };
  } },
  { id: 'bridge', weight: 12, at: 0.55, make: (r, w, h) => ({
    text: pick(r, [
      `A stone bridge with no parapet crosses the hall from one gallery to the other, ${m(h * 0.55)} above the floor, so slender that it seems to hang in the air.`,
      `High over the floor a bridge of cut stone spans the hall, flat and railless, joining two galleries in the ${w} and opposite walls.`,
    ]),
    pass: pick(r, ['a railless stone bridge crossing high overhead', 'a long stone bridge thrown across the hall, far above']),
  }) },
  { id: 'catwalk', weight: 8, at: 0.6, minH: 28, make: (r, w, h) => ({
    text: pick(r, [
      `A timber walkway hangs by iron chains from the vault, swaying very slightly in no wind, ${m(h * 0.6)} up along the ${w} wall.`,
      `Along the ${w} wall, a plank walkway is slung from chains thick as a man's arm; the boards are black with age.`,
    ]),
    pass: pick(r, [`a plank walkway slung from chains along the ${w} wall`, 'a hanging gallery of black planks, chained to the vault']),
  }) },
  { id: 'gallery', weight: 12, at: 0.7, make: (r, w, h) => ({
    text: pick(r, [
      `A gallery of round arches runs the whole length of the ${w} wall at ${m(h * 0.7)}, its balustrade broken in places.`,
      `Above the statues a long arcaded gallery runs along the ${w} wall; the arches are as tall as houses and the light behind them is different.`,
    ]),
    pass: pick(r, [`a long arcaded gallery on the ${w} wall`, 'an arcade running high along the wall, with a different light behind it']),
  }) },
  { id: 'drawbridge', weight: 5, at: 0.45, make: (r, w, h) => ({
    text: `On the ${w} wall, ${m(h * 0.45)} up, a timber drawbridge stands raised in front of a doorway, held by two great chains that run up and through the stone.`,
    pass: `a drawbridge raised against a high doorway on the ${w} wall`,
  }) },
  { id: 'ropes-pulleys', weight: 8, at: 0.5, make: (r, w) => ({
    text: pick(r, [
      `Ropes as thick as a thigh run up the ${w} wall through iron-bound pulley blocks and vanish into the vault; they are stiff with age and nothing pulls on them.`,
      `Heavy pulley blocks hang from the ${w} wall on chains, their ropes looped over great wooden beams and left, long ago, exactly as they were.`,
    ]),
    pass: pick(r, ['ropes and pulley blocks, stiff and unmoving, running up into the vault', 'great iron-bound blocks hanging on chains from a beam']),
  }) },
  { id: 'great-wheel', weight: 4, minH: 30, at: 0.5, make: (r, w, h) => ({
    text: `Half hidden in the shadow of the ${w} wall stands a wooden wheel taller than a house, its spokes as stout as pillars and its rim furred with dust. It has plainly not turned in centuries.`,
    pass: `a huge wooden wheel in the shadow of the ${w} wall, still for centuries`,
  }) },
  { id: 'spiral-stair', weight: 7, at: 0.5, make: (r, w, h) => ({
    text: pick(r, [
      `A spiral stair winds round a great pier near the ${w} wall, up past ${Math.max(3, Math.round(h / 7))} landings, each with its own arched door.`,
      `Round one pier a stone stair coils upward, landing after landing, each landing leading to a door of its own.`,
    ]),
    pass: pick(r, ['a spiral stair coiling up round a pier, door after door', 'a stone stair winding round a great pier']),
  }) },
  { id: 'colossal-pier', weight: 8, at: 0.3, make: (r, w) => ({
    text: pick(r, [
      `A pier in the ${w} wall is as wide as a farmhouse, and carries on its face a smaller arch with a smaller pier within it, and so on inward.`,
      `The ${w} wall is carried on piers so massive that each one has a stair and a room cut inside it.`,
    ]),
    pass: pick(r, ['a pier as big as a house', 'one of the colossal piers, with an arch and a smaller pier inside it']),
  }) },
  { id: 'coffered-vault', weight: 8, at: 1, make: (r) => ({
    text: pick(r, [
      'The vault overhead is coffered in deep square panels, each with a rosette, every rosette different, and a single round opening at the crown lets in a shaft of light.',
      'The ceiling is a field of sunken square panels, shrinking toward a round eye in the middle through which a column of paler air descends.',
    ]),
    pass: pick(r, ['the coffered vault with its round opening of light', 'the sunken panels of the ceiling, each rosette different']),
  }) },
  { id: 'iron-rings', weight: 6, at: 0.3, make: (r, w) => ({
    text: `Iron rings the size of cartwheels are set in the ${w} wall at intervals, high up, rust-streaked down the stone beneath them.`,
    pass: `great rusted iron rings set high in the ${w} wall`,
  }) },
  { id: 'balconies', weight: 6, at: 0.6, make: (r, w, h) => ({
    text: `Small balconies on carved corbels project from the ${w} wall at ${m(h * 0.6)}, each with a balustrade and a narrow door; none has a stair to it.`,
    pass: `small balconies on carved brackets, each with a door and no stair`,
  }) },
  { id: 'obelisk', weight: 4, at: 0.6, make: (r, w, h) => ({
    text: `An obelisk of grey stone rises from a stepped base against the ${w} wall, ${m(h * 0.75)} tall, its four faces cut with small neat figures in rows.`,
    pass: `an obelisk against the ${w} wall, cut with rows of tiny figures`,
  }) },
  { id: 'rostral-column', weight: 4, at: 0.6, make: (r, w, h) => ({
    text: `A column stands apart from the ${w} wall with the bronze-green prows of ships jutting from it in rows, one above another, as though a whole fleet had been driven into the stone.`,
    pass: `a column bristling with the prows of stone ships`,
  }) },
  { id: 'inscription', weight: 8, at: 0.8, make: (r, w, h) => ({
    text: pick(r, [
      `A band of tall capital letters runs along the ${w} wall above the tiers; the stone is so worn that the letters are shallow furrows, and the line goes on beyond reading.`,
      `Lettering as tall as a person is cut into a long panel high on the ${w} wall; wind and damp have taken it, so that only the shape of the words is left.`,
    ]),
    pass: pick(r, ['a long band of lettering worn past reading', 'tall letters on the wall, worn to furrows']),
  }) },
  { id: 'fallen-entablature', weight: 7, at: 0, make: (r, w) => ({
    text: `Blocks of a fallen cornice lie at the foot of the ${w} wall, carved with leaves and egg-and-dart, with grass and small ferns growing in the joints.`,
    pass: `a heap of fallen cornice blocks with ferns in the joints`,
  }) },
  { id: 'colonnade', weight: 8, at: 0.2, make: (r, w) => {
    const n = 12 + r.int(30);
    return {
      text: `A colonnade of ${n} columns marches along the ${w} wall in front of the statues and out of sight, each shaft a little different in its fluting.`,
      pass: `a long colonnade, column after column`,
    };
  } },
  { id: 'light-shaft', weight: 9, at: 1, make: (r, w) => ({
    text: pick(r, [
      'A single slot of an opening high in the vault lets down a narrow shaft of light that lies on the floor like a fallen plank.',
      'Through a break in the vault, a shaft of light as straight as a pillar comes down onto one square of the floor and leaves the rest in shadow.',
    ]),
    pass: pick(r, ['a straight shaft of light standing on the floor', 'a column of light from a break in the vault']),
  }) },
  { id: 'cantilever', weight: 5, at: 0.55, make: (r, w, h) => ({
    text: `A stone landing juts from the ${w} wall ${m(h * 0.55)} up, carried on nothing you can see, with a door in the wall behind it.`,
    pass: `a landing jutting from the wall on no visible support`,
  }) },
  { id: 'door-too-high', weight: 6, at: 0.65, make: (r, w, h) => ({
    text: pick(r, [
      `A handsome doorway with a carved lintel opens in the ${w} wall ${m(h * 0.65)} above the floor, with no stair, ledge or ladder to it.`,
      `High in the ${w} wall is a pair of tall doors, closed, with worn steps beneath them that stop ten metres short of the floor.`,
    ]),
    pass: pick(r, ['a doorway high in the wall with no way up to it', 'tall doors far above the floor, with steps that stop short']),
  }) },
  { id: 'flying-arches', weight: 6, at: 0.7, make: (r, w, h) => ({
    text: `Bare arches leap across the hall like ribs, from the ${w} wall to the opposite one, bracing the building; birds go in and out between them.`,
    pass: pick(r, ['bare arches leaping across the hall overhead like ribs', 'flying arches crossing the hall, with birds in and out between them']),
  }) },
  { id: 'crossing-stairs', weight: 6, at: 0.5, make: (r, w, h) => ({
    text: `Two flights of stairs cross the ${w} wall at different slants, each reaching the other's landing, and neither, so far as you can tell, reaching the floor.`,
    pass: pick(r, ['two stairs crossing, each leading to the other\'s landing', 'a pair of stairs that cross and cross again on the wall']),
  }) },
  { id: 'trophies', weight: 6, at: 0.5, make: (r, w) => ({
    text: pick(r, [
      `Over the doors on the ${w} wall, stone trophies are carved in relief: helmets, shields, standards and bundles of spears, heaped as if after a triumph, and weathered smooth.`,
      `Carved in the stone above the ${w} doors are heaps of arms and banners, crowns and laurel, rubbed soft by time.`,
    ]),
    pass: 'carved heaps of helmets and banners in stone above a doorway',
  }) },
  { id: 'fig-tree', weight: 5, at: 0.8, make: (r, w, h) => ({
    text: `A fig tree has taken root in the ${w} wall ${m(h * 0.8)} up and thrown a great pale root down the stone toward the floor; its leaves move in a draught from somewhere.`,
    pass: 'a tree rooted high in the wall, its roots clasping the stone',
  }) },
  { id: 'basin', weight: 5, at: 0, make: (r, w) => ({
    text: pick(r, [
      `A great stone basin on a carved pedestal stands against the ${w} wall, wide enough to float a boat; it is full of still, clear water that no one can have filled.`,
      `A fountain stands against the ${w} wall: a basin on the backs of stone sea-horses, dry now, with a green stain where the water ran.`,
    ]),
    pass: 'a great stone basin on a carved pedestal',
  }) },
  { id: 'urns', weight: 6, at: 0.4, make: (r, w) => ({
    text: `A row of urns taller than a person stands in arched niches along the ${w} wall, each with its own lid and a different carved band round the belly.`,
    pass: 'a row of tall urns in arched niches',
  }) },
  { id: 'chained-gate', weight: 5, at: 0.1, make: (r, w) => ({
    text: `A gate of iron bars, taller than three people, stands in an arch on the ${w} wall, bound with a chain whose links are as big as a hand and rusted into one piece.`,
    pass: 'a great iron gate bound with a rusted chain',
  }) },
  { id: 'stepped-pyramid', weight: 3, at: 0.1, make: (r, w) => ({
    text: `A stepped platform of rough blocks stands in the middle of the floor, with a stair up each side, bare at the top.`,
    pass: 'a stepped stone platform with a stair on each side',
  }) },
  { id: 'rolling-stairs', weight: 5, minH: 40, at: 0.7, make: (r, w, h) => ({
    text: `On the ${w} wall a staircase climbs ${m(h * 0.7)} in one unbroken flight, so steep and so long that the top is a dark slit in the distance.`,
    pass: 'one very long stair climbing into the dark',
  }) },
  { id: 'vaulted-passage', weight: 6, at: 0.2, make: (r, w) => ({
    text: `A vaulted passage opens in the ${w} wall, and in it a smaller vaulted passage, and in that a smaller; the floor of each is a few steps higher than the last.`,
    pass: 'passages within passages, each a few steps higher than the last',
  }) },
];

const cache = new WeakMap<World, Map<string, readonly Flourish[]>>();

/** The flourishes of a hall: two to four (three to five in a vestibule), none in the dark hall or the Drowned Halls. */
export function flourishesFor(world: World, hall: Hall): readonly Flourish[] {
  let m2 = cache.get(world);
  if (!m2) { m2 = new Map(); cache.set(world, m2); }
  const hit = m2.get(hall.id);
  if (hit) return hit;
  const out: Flourish[] = [];
  const dark = hall.tags.includes('dark-hall');
  const drowned = hall.tags.includes('drowned');
  if (!dark && !drowned) {
    const r = new Rng(hashInts(world.seed, 0xf10a, hall.x, hall.y, hall.level));
    const n = (hall.kind === 'vestibule' ? 3 : 2) + r.int(hall.kind === 'vestibule' ? 3 : 3);
    const pool = KINDS.filter((k) => (k.minH ?? 0) <= hall.heightM);
    const used = new Set<string>();
    let walls = r.shuffle([...SIDES]);
    for (let i = 0; i < n; i++) {
      const avail = pool.filter((k) => !used.has(k.id));
      if (avail.length === 0) break;
      let t = r.int(avail.reduce((s, k) => s + k.weight, 0));
      const kind = avail.find((k) => (t -= k.weight) < 0) ?? (avail[0] as Kind);
      used.add(kind.id);
      if (walls.length === 0) walls = r.shuffle([...SIDES]);
      const wall = walls.pop() as Side;
      const made = kind.make(r, WALL[wall], hall.heightM);
      out.push({
        id: `${hall.id}/f/${i}`, kind: kind.id, wall, along: 80 + r.int(840), heightM: Math.round(hall.heightM * kind.at), text: made.text, pass: made.pass,
      });
    }
  }
  if (m2.size > 4000) m2.clear();
  m2.set(hall.id, out);
  return out;
}
