// What the map shows. Pure data, separate from the drawing, so the fog-of-war rules can be tested exactly.
//
// You see: every hall you have been in; the halls your doors open onto (you know they are there, not what is in them);
// and the water lying in the halls you have visited, live. You do NOT see anything else, however near.

import { tideAt } from '../sim/tides';
import { getHall } from '../world/hall';
import { cellKey, exits, type Level, type Side } from '../world/layout';
import { exploredKey, worldNow, type Game } from './game';

export type MapState = 'here' | 'visited' | 'known';

export interface MapCell {
  x: number;
  y: number;
  kind: 'hall' | 'vestibule';
  state: MapState;
  name: string;
  /** Water on the floor right now, decimetres (visited cells only). */
  waterDm: number;
  /** A freshwater lake rather than floor (the Drowned Halls). */
  lake: boolean;
  ruined: boolean;
  stairs: boolean;
  /** Sides with an ordinary door to a neighbouring cell (visited cells only). */
  doors: Side[];
  /** Long passages to cells that are not neighbours. */
  links: { x: number; y: number }[];
}

export interface MapView {
  level: Level;
  cells: MapCell[];
  here: { x: number; y: number; level: Level; facing: Side };
  /** Where you are walking to, and how far along you are, if you are mid-walk. */
  walk: { x: number; y: number; fraction: number } | null;
  visited: number;
  known: number;
}

export function mapView(g: Game, level: Level, realNowMs: number, radius = 14): MapView {
  const t = worldNow(g, realNowMs);
  const cx = g.pos.x;
  const cy = g.pos.y;
  const within = (x: number, y: number): boolean => Math.abs(x - cx) <= radius && Math.abs(y - cy) <= radius;
  const cells = new Map<string, MapCell>();

  const visited: { x: number; y: number }[] = [];
  for (const key of g.explored) {
    const m = /^(\d):(-?\d+),(-?\d+)$/.exec(key);
    if (!m || Number(m[1]) !== level) continue;
    const x = Number(m[2]);
    const y = Number(m[3]);
    if (within(x, y)) visited.push({ x, y });
  }

  for (const { x, y } of visited) {
    const h = getHall(g.world, x, y, level);
    const here = g.pos.level === level && g.pos.x === x && g.pos.y === y;
    const ex = exits(g.world, x, y, level);
    cells.set(cellKey(x, y), {
      x, y, kind: h.kind, state: here ? 'here' : 'visited', name: h.name,
      waterDm: tideAt(g.world, h, t).depthDm,
      lake: h.regions.drowned && level === 1,
      ruined: h.regions.derelict >= 60,
      stairs: h.kind === 'vestibule' && h.stairs.length > 0,
      doors: [...new Set(ex.filter((e) => e.corridor === 0).map((e) => e.side))],
      links: ex.filter((e) => e.corridor > 0).map((e) => ({ x: e.to.x, y: e.to.y })),
    });
  }
  // the halls their doors open onto: seen, not entered
  for (const { x, y } of visited) {
    for (const e of exits(g.world, x, y, level)) {
      const k = cellKey(e.to.x, e.to.y);
      if (cells.has(k) || g.explored.has(exploredKey(level, e.to.x, e.to.y)) || !within(e.to.x, e.to.y)) continue;
      const h = getHall(g.world, e.to.x, e.to.y, level);
      cells.set(k, { x: e.to.x, y: e.to.y, kind: h.kind, state: 'known', name: h.name, waterDm: 0, lake: h.regions.drowned && level === 1, ruined: false, stairs: false, doors: [], links: [] });
    }
  }

  const list = [...cells.values()];
  let walk: MapView['walk'] = null;
  const w = g.walk;
  if (w && w.kind === 'door' && w.exit) {
    walk = { x: w.exit.to.x, y: w.exit.to.y, fraction: Math.max(0, Math.min(1, (realNowMs - w.startMs) / Math.max(1, w.endMs - w.startMs))) };
  }
  return {
    level, cells: list, here: { x: g.pos.x, y: g.pos.y, level: g.pos.level, facing: g.facing }, walk,
    visited: list.filter((c) => c.state !== 'known').length, known: list.filter((c) => c.state === 'known').length,
  };
}
