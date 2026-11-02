// Slot lookup: the single entry point every view uses. Canon placements override generated statues.

import { PLACEMENTS, type Placement } from '../data/canonPlacement';
import canonStatues from '../generated/canon-statues.json';
import { getHall, hallId, wallGrids, type Hall, type WallGrid } from './hall';
import type { Level, Side } from './layout';
import { OPPOSITE, SIDES, cellFromRay, cellKind, parseCellName, vestibuleCell, RAYS } from './layout';
import { Rng, hashInts, strHash } from './rng';
import { CORAL } from './regions';
import { conditionFor, generatedSlot, type Slot, type Statue } from './statues';
import type { World } from './world';

const LABELS = new Map<string, string>((canonStatues as { id: string; label: string }[]).map((s) => [s.id, s.label]));

interface Anchor { placement: Placement; wall: Side; tier: number; slot: number; shadows: string[] }
interface HallPlan { anchors: Map<string, Anchor>; shadows: Map<string, string> }

const plans = new WeakMap<World, Map<string, HallPlan>>();

function resolve(world: World, p: Placement): { x: number; y: number; level: Level } | null {
  const w = p.where;
  if ('hall' in w) {
    const c = parseCellName(world, w.hall);
    return c ? { x: c.x, y: c.y, level: w.level ?? 1 } : null;
  }
  if ('aboveHall' in w) {
    const c = parseCellName(world, w.aboveHall);
    return c ? { x: c.x, y: c.y, level: 2 } : null;
  }
  if ('lowerOfVestibule' in w) {
    const c = vestibuleCell(world, w.lowerOfVestibule);
    return c ? { x: c.x, y: c.y, level: 0 } : null;
  }
  if ('upperOfVestibule' in w) {
    const c = vestibuleCell(world, w.upperOfVestibule);
    return c ? { x: c.x, y: c.y, level: 2 } : null;
  }
  if ('home' in w) {
    const rng = new Rng(hashInts(world.seed, 0x40e, strHash(p.id)));
    const c = cellFromRay(rng.pick(RAYS), rng.range(3, 14), 0);
    return c ? { x: c.x, y: c.y, level: 1 } : null;
  }
  const rng = new Rng(hashInts(world.seed, 0xc02a, strHash(p.id)));
  for (let i = 0; i < 80; i++) {
    const x = rng.range(CORAL.x0, CORAL.x1);
    const y = rng.range(CORAL.y0, CORAL.y1);
    if (cellKind(world, x, y) === 'hall') return { x, y, level: 1 };
  }
  return null;
}

function buildPlans(world: World): Map<string, HallPlan> {
  const out = new Map<string, HallPlan>();
  // the coral group shares one hall: resolve once
  let coralCell: { x: number; y: number; level: Level } | null | undefined;
  for (const p of PLACEMENTS) {
    let at: { x: number; y: number; level: Level } | null;
    if ('coral' in p.where) {
      coralCell = coralCell === undefined ? resolve(world, { ...p, id: 'ST-CORAL-GROUP' }) : coralCell;
      at = coralCell;
    } else at = resolve(world, p);
    if (!at) continue;
    const hall = getHall(world, at.x, at.y, at.level);
    const grids = wallGrids(hall);
    const wall: Side = p.wall === 'opposite-stairs' ? (hall.stairs[0] ? OPPOSITE[hall.stairs[0].wall] : 'N') : p.wall;
    const g = grids.find((x) => x.wall === wall) as WallGrid;
    const slot = Math.min(g.slots - 1, Math.max(0, Math.floor((p.along * g.slots) / 1000)));
    const tier = Math.min(g.tiers - 1, Math.max(0, Math.floor((p.baseM * 10) / g.tierHeightDm)));
    const tiersSpan = Math.max(1, Math.ceil((p.sizeM * 10) / g.tierHeightDm));
    const slotsSpan = Math.max(1, Math.ceil((p.sizeM * 6) / (g.pitchDm / 10)));
    const shadows: string[] = [];
    const s0 = slot - Math.floor((slotsSpan - 1) / 2);
    for (let t = tier; t < Math.min(g.tiers, tier + tiersSpan); t++) {
      for (let s = s0; s < s0 + slotsSpan; s++) {
        if (s < 0 || s >= g.slots || (t === tier && s === slot)) continue;
        shadows.push(`${hall.id}/${wall}/${t}/${s}`);
      }
    }
    let plan = out.get(hall.id);
    if (!plan) { plan = { anchors: new Map(), shadows: new Map() }; out.set(hall.id, plan); }
    const key = `${hall.id}/${wall}/${tier}/${slot}`;
    if (plan.anchors.has(key)) continue; // collision: first placement wins
    plan.anchors.set(key, { placement: p, wall, tier, slot, shadows });
    for (const s of shadows) plan.shadows.set(s, p.id);
  }
  return out;
}

function plansFor(world: World): Map<string, HallPlan> {
  let m = plans.get(world);
  if (!m) { m = buildPlans(world); plans.set(world, m); }
  return m;
}

function canonStatue(world: World, hall: Hall, a: Anchor): Statue {
  const g = wallGrids(hall).find((x) => x.wall === a.wall) as WallGrid;
  const alongM = ((a.slot + 0.5) * g.pitchDm) / 10;
  const baseDm = a.tier * g.tierHeightDm;
  const label = a.placement.label ?? LABELS.get(a.placement.id) ?? a.placement.id;
  return {
    id: `${hall.id}/${a.wall}/${a.tier}/${a.slot}`, hallId: hall.id, wall: a.wall, tier: a.tier, slot: a.slot,
    alongM, baseM: a.placement.baseM, heightM: a.placement.sizeM,
    figure: label, pose: '', attribute: '', companion: '', mood: hall.mood, mark: '',
    condition: conditionFor(world, hall, g, a.tier, a.slot, baseDm, alongM),
    canonId: a.placement.id, canonLabel: label,
  };
}

export function slotAt(world: World, hall: Hall, wall: Side, tier: number, slot: number): Slot {
  const plan = plansFor(world).get(hall.id);
  if (plan) {
    const key = `${hall.id}/${wall}/${tier}/${slot}`;
    const a = plan.anchors.get(key);
    if (a) return { kind: 'statue', statue: canonStatue(world, hall, a) };
    const sh = plan.shadows.get(key);
    if (sh) return { kind: 'empty', id: key, empty: 'blank', wall, tier, slot, shadowOf: sh };
  }
  return generatedSlot(world, hall, wall, tier, slot);
}

export function* hallSlots(world: World, hall: Hall): Generator<Slot> {
  for (const g of wallGrids(hall)) {
    for (let t = 0; t < g.tiers; t++) for (let s = 0; s < g.slots; s++) yield slotAt(world, hall, g.wall, t, s);
  }
}

export function hallStatues(world: World, hall: Hall): Statue[] {
  const out: Statue[] = [];
  for (const s of hallSlots(world, hall)) if (s.kind === 'statue') out.push(s.statue);
  return out;
}

/** The ids of the book's own statues that stand in this hall. */
export function canonIn(world: World, hall: Hall): string[] {
  const plan = plansFor(world).get(hall.id);
  if (!plan) return [];
  return [...new Set([...plan.anchors.values()].map((a) => a.placement.id))];
}

/** Where a canon statue id stands in this world (first placement), or null if generic/unplaced. */
export function canonLocations(world: World, id: string): { hallId: string; statueId: string }[] {
  const out: { hallId: string; statueId: string }[] = [];
  for (const [hid, plan] of plansFor(world)) {
    for (const [key, a] of plan.anchors) if (a.placement.id === id) out.push({ hallId: hid, statueId: key });
  }
  return out;
}

export { SIDES, hallId };
