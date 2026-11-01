// Game state, commands and live events. Pure: all time comes in as an argument, so it is fully testable.

import { audioFor, type AudioScene } from '../audio/director';
import { sceneAtWorldTime, type SceneState } from '../sim/scene';
import { defaultSimConfig, worldTime, type SimConfig } from '../sim/time';
import { tideAt } from '../sim/tides';
import { getHall, wallGrids, type Hall } from '../world/hall';
import { OPPOSITE, SIDES, exits as hallExits, type Exit, type Level, type Side } from '../world/layout';
import { hallStatues } from '../world/slots';
import { describeStatue, type Statue } from '../world/statues';
import { createWorld, type World } from '../world/world';
import { relicsIn, type Relic } from '../world/relics';
import { flourishesFor } from '../world/flourishes';
import { strollBeats } from './stroll';
import { hashInts } from '../world/rng';
import { DOORWAY_M, CORRIDOR_HALL_M, STAIR_DOWN_S, STAIR_UP_S, describeDistance, describeDuration, distanceM, gait, terrainFactor, walkSeconds } from './walk';
import { parse, type Command } from './parser';
import { findRoute, nameOf, resolveName, straightRoute, vistaThrough, type Spot, type Step } from './travel';
import { Rng } from '../world/rng';
import { dice, opposite, pickIndex, slip, slipChance, type Instr, type TrailEntry } from './lost';
import {
  describeHall, directionProse, glanceHall, glanceRand, locationPhrase, outsideSentence, withArticle, sideWord, skyParagraph, soundParagraph, statueDetail, stylise, waterSentence,
  type NamedExit, type Seen, type Style,
} from './narrator';

export interface GameOptions {
  seed: string;
  timeScale: number;
  showDead: boolean;
  style: Style;
  /** Walking pace multiplier: 1 is the book's pace (about 1.5 m/s); 4 brisk; 20 fast; Infinity is instant. */
  walkPace: number;
  /** How many earlier-visitor relics lie about: 1 is the default rarity, 0 turns them off. */
  relicDensity: number;
  /** Rare hints of a world outside (a draught, muffled sounds). */
  outsideTraces: boolean;
  /**
   * The slower, narrated way of walking: no distances or times, and the walk is described as it goes, with silences between.
   * Off, a walk is a short note and a countdown.
   */
  walkNarration: boolean;
  /** As in the book, where nobody has a map and people get lost: you can only travel by name to places you have been to or marked. */
  knownOnly: boolean;
  /** If set, world time at start (ms). Otherwise world time follows the real clock. */
  startAtWorldMs?: number;
}

export interface Position {
  x: number;
  y: number;
  level: Level;
  /** Which wall of the hall the visitor stands at, or null for the middle of the floor. */
  wall: Side | null;
  /** 0..1000 along that wall, low end (west or south) to high end. */
  pos: number;
}

export interface Link {
  label: string;
  command: string;
}
export interface Line {
  kind: 'text' | 'event' | 'system';
  text: string;
  links?: Link[];
}

export interface Game {
  world: World;
  cfg: SimConfig;
  opts: GameOptions;
  pos: Position;
  exitsListed: NamedExit[];
  seenListed: Seen[];
  prev: SceneState | null;
  /** Events already announced, so each is said once. */
  said: Set<string>;
  /** Relics in view, numbered after the statues. */
  relicsListed: Relic[];
  /** What you have noticed that earlier visitors left behind: id to what and where. Private to you, never shared. */
  found: Map<string, { label: string; hall: string }>;
  /** Halls you have been in, as `level:x,y`. The map shows only these and what their doors reveal. Never persisted. */
  explored: Set<string>;
  /** The way you face: the way you last walked. Sounds through doorways are placed relative to it. */
  facing: Side;
  /** A walk in progress: the visitor is between here and there until the clock reaches `endMs`. */
  walk: Walk | null;
  /** A longer trip, a leg at a time, to a named place or straight along a line of halls. */
  journey: Journey | null;
  /** What has been said about each hall in a narrated glance, so that looking again brings new things. */
  told: Map<string, { keys: Set<string>; at: number }>;
  /** The hall last glanced at, and the last description given, for "repeat". */
  lastGlance: string | null;
  /** The sort of statues the last glance described. */
  lastChar: string;
  /** The keys of the last few things said in glances, anywhere. */
  recent: string[];
  lastLook: Line[] | null;
  /** The way you came from where you started, a hall at a time, and what you remember of each door. Kept only for finding the way back. */
  trail: TrailEntry[];
  trailOrigin: Spot;
  /** How many times each hall has been entered, `level:x,y`. */
  visits: Map<string, number>;
  /** How many times you have tried to find the way by memory (each try goes its own way). */
  recalls: number;
  /** Places the visitor has marked to find again: label to where. Private to the visitor and kept on their device. */
  marks: Map<string, { x: number; y: number; level: Level; hall: string }>;
}

export interface Journey {
  destName: string;
  /** The halls you expect to pass through, one per leg. */
  route: Step[];
  /** Index of the leg being walked. */
  idx: number;
  /** Going by memory, which may be wrong: the way as remembered, and whether you have already strayed from it. */
  recall?: { instr: Instr[]; dest: Spot; diverged: boolean; attempt: number };
}

export interface Walk {
  kind: 'door' | 'wall' | 'stairs';
  startMs: number;
  endMs: number;
  meters: number;
  exit?: NamedExit;
  wall?: Side;
  dir?: 'up' | 'down';
  /** Things to say on the way, each at its moment. Spent as they are said. */
  beats: { atMs: number; text: string }[];
  /** Where along the wall to stand at the end (0..1000), and a line to add on arrival (approaching a statue). */
  pos?: number;
  note?: string;
  /** What the destination is called, for the status line. */
  label: string;
}

export function newGame(opts: Partial<GameOptions>, realNowMs: number): Game {
  const o: GameOptions = { seed: 'the-house', timeScale: 1, showDead: true, style: 'plain', walkPace: 1, relicDensity: 1, outsideTraces: true, walkNarration: false, knownOnly: false, ...opts };
  const world = createWorld(o.seed, { showDead: o.showDead });
  const cfg: SimConfig = { ...defaultSimConfig, timeScale: o.timeScale };
  if (o.startAtWorldMs !== undefined) cfg.realZeroMs = realNowMs - Math.floor(o.startAtWorldMs / o.timeScale);
  return {
    world, cfg, opts: o, pos: { x: 0, y: 0, level: 1, wall: null, pos: 500 },
    exitsListed: [], seenListed: [], prev: null, said: new Set(), walk: null, facing: 'N', explored: new Set(), relicsListed: [], found: new Map(), journey: null, marks: new Map(), trail: [], trailOrigin: { x: 0, y: 0, level: 1 }, visits: new Map([['1:0,0', 1]]), recalls: 0, told: new Map(), lastGlance: null, lastChar: '', recent: [], lastLook: null,
  };
}

export const worldNow = (g: Game, realNowMs: number): number => worldTime(g.cfg, realNowMs);

export function sceneNow(g: Game, realNowMs: number): SceneState {
  return sceneAtWorldTime(g.world, g.pos.x, g.pos.y, g.pos.level, worldNow(g, realNowMs), { outside: g.opts.outsideTraces });
}

const text = (g: Game, s: string, links?: Link[]): Line => ({ kind: 'text', text: stylise(s, g.opts.style), links });
const system = (s: string): Line => ({ kind: 'system', text: s });

// ---------------------------------------------------------------------------------------------------------------
// Looking
// ---------------------------------------------------------------------------------------------------------------

const SIDE_ORDER: Record<Side, number> = { N: 0, E: 1, S: 2, W: 3 };

function listExits(g: Game, level: Level): NamedExit[] {
  const raw = hallExits(g.world, g.pos.x, g.pos.y, level).sort((a, b) => SIDE_ORDER[a.side] - SIDE_ORDER[b.side] || a.pos - b.pos);
  return raw.map((e, i) => ({ ...e, index: i + 1, toName: getHall(g.world, e.to.x, e.to.y, level).name }));
}

function wallLength(h: Hall, w: Side): number {
  return w === 'N' || w === 'S' ? h.xExtent : h.yExtent;
}

export function visibleStatues(g: Game, h: Hall): Seen[] {
  const all = hallStatues(g.world, h);
  const walls: Side[] = g.pos.wall ? [g.pos.wall] : SIDES.slice();
  const frac = g.pos.wall ? g.pos.pos / 1000 : 0.5;
  const sn = (s: Statue): Seen => ({ statue: s, hallLengthM: wallLength(h, s.wall) });
  const dist = (s: Statue): number => Math.abs(s.alongM - frac * wallLength(h, s.wall));

  const canon = all.filter((s) => s.canonId).sort((a, b) => Number(walls.includes(b.wall)) - Number(walls.includes(a.wall)) || dist(a) - dist(b));
  // one representative per canon group (the minotaurs and giants are many statues, one subject), nearest first
  const seenCanon = new Map<string, Statue>();
  for (const s of canon) if (!seenCanon.has(`${s.canonId}:${s.wall}`)) seenCanon.set(`${s.canonId}:${s.wall}`, s);
  const picked: Statue[] = [...seenCanon.values()].slice(0, 6);

  const perWall = g.pos.wall ? 4 : 1;
  for (const w of walls) {
    const low = all.filter((s) => s.wall === w && !s.canonId && s.tier <= 1).sort((a, b) => dist(a) - dist(b));
    picked.push(...low.slice(0, perWall));
  }
  return picked.slice(0, 9).map(sn);
}

export const exploredKey = (level: Level, x: number, y: number): string => `${level}:${x},${y}`;

/** The buttons for a hall: the ways to look out (the doors themselves appear once you look that way). */
function directionLinks(g: Game): Link[] {
  const sides = [...new Set(g.exitsListed.map((e) => e.side))];
  return sides.map((s) => {
    const w = sideWord(s).replace(' wall', '');
    const only = g.exitsListed.filter((e) => e.side === s);
    return only.length === 1 ? { label: `${w} door`, command: `go ${(only[0] as NamedExit).index}` } : { label: `look ${w}`, command: `look ${w}` };
  });
}

/** Look out in one direction: how many doors there are in that wall, and what lies through them. */
export function lookDirection(g: Game, side: Side, realNowMs: number): Line[] {
  const { scene } = prepareHall(g, realNowMs);
  g.facing = side;
  const doors = g.exitsListed.filter((e) => e.side === side).sort((a, b) => a.pos - b.pos);
  const mid = doors.slice().sort((a, b) => Math.abs(a.pos - 500) - Math.abs(b.pos - 500))[0];
  // the near door, or the nearest to where you stand if you are at that wall
  const v = mid ? vistaThrough(g.world, here(g), side, mid.pos) : { halls: [], passage: false };
  const route = v.halls;
  const next = route[0] ? nameOf(g.world, route[0]) : mid ? nameOf(g.world, { x: mid.to.x, y: mid.to.y, level: g.pos.level }) : null;
  const r = new Rng(hashInts(g.world.seed, Math.floor(scene.t / 2_700_000), g.pos.x, g.pos.y, SIDES.indexOf(side) + 0x1d));
  const rand = (): number => r.u32() / 4294967296;
  // what else is on that wall: one thing the building does, and one statue
  const extra: string[] = [];
  const fl = flourishesFor(g.world, scene.hall).filter((f) => f.wall === side)[0];
  if (fl) extra.push(fl.text);
  const st = g.seenListed.filter((sn) => sn.statue.wall === side)[0];
  if (st) extra.push(`Along it, ${withArticle(st.statue.canonId ? (st.statue.canonLabel as string) : describeStatue(scene.hall, st.statue, true))}, ${locationPhrase(st).replace(/^on the [a-z]+ wall, /, '')}.`);
  const paras = [directionProse(scene.hall, side, doors, { next, halls: route.length, passage: !!mid && mid.corridor > 0 }, extra, rand)];
  const links: Link[] = [
    ...doors.map((e) => ({ label: doors.length === 1 ? `go through the ${sideWord(side).replace(' wall', '')} door` : doorLabel(e, g.exitsListed), command: `go ${e.index}` })),
    { label: 'look around', command: 'look' },
  ];
  return paras.map((p, i) => text(g, p, i === paras.length - 1 ? links : undefined));
}

/** A button for a door: "north door", or "north door, west end" where a wall has several. */
function doorLabel(e: NamedExit, all: NamedExit[]): string {
  const side = sideWord(e.side).replace(' wall', '');
  const same = all.filter((x) => x.side === e.side);
  if (same.length === 1) return `${side} door`;
  const lo = e.side === 'N' || e.side === 'S' ? 'west' : 'south';
  const hi = e.side === 'N' || e.side === 'S' ? 'east' : 'north';
  const place = e.pos < 333 ? `${lo} end` : e.pos > 667 ? `${hi} end` : 'middle';
  const sameplace = same.filter((x) => (x.pos < 333 ? 'a' : x.pos > 667 ? 'c' : 'b') === (e.pos < 333 ? 'a' : e.pos > 667 ? 'c' : 'b'));
  return `${side} door, ${place}${sameplace.length > 1 ? ` (${sameplace.indexOf(e) + 1})` : ''}`;
}

/** Take in where you are without saying anything: what the exits, statues and relics are, and note the hall as explored. */
function prepareHall(g: Game, realNowMs: number): { scene: SceneState; audio: AudioScene } {
  g.explored.add(exploredKey(g.pos.level, g.pos.x, g.pos.y));
  const t = worldNow(g, realNowMs);
  const scene = sceneAtWorldTime(g.world, g.pos.x, g.pos.y, g.pos.level, t, { outside: g.opts.outsideTraces });
  const audio = audioFor(g.world, scene, { facing: g.facing });
  g.exitsListed = listExits(g, g.pos.level);
  g.seenListed = visibleStatues(g, scene.hall);
  g.relicsListed = g.walk ? [] : relicsIn(g.world, scene.hall, scene.clock.month, g.opts.relicDensity);
  g.prev = scene;
  return { scene, audio };
}

/** How many of the last things said are not said again at once, wherever you are. */
const RECENT_KEYS = 36;

/** After this long (in the world's time) away from a hall, a visitor notices things afresh. */
const FORGET_MS = 2 * 3_600_000;

/**
 * Look around. Narrated, a hall is glanced at as a person would, not surveyed: a few striking things, and a different few each
 * time you look again in the same place, since nobody describes the same room the same way twice. "look closely" gives
 * everything, and `repeat` says the last description again, word for word.
 */
export function look(g: Game, realNowMs: number, full = false, repeat = false, numbered = false): Line[] {
  if (repeat && g.lastLook) return g.lastLook;
  const { scene, audio } = prepareHall(g, realNowMs);
  // A description is prose, a few striking things at a time, however you are playing. `look closely` gives all of it, still as
  // prose; `list` gives the numbered reference (for "examine 3" and "go 2").
  const brief = !full && !numbered;
  const fl = flourishesFor(g.world, scene.hall);
  let paras: string[];
  if (brief) {
    const hid = scene.hall.id;
    let rec = g.told.get(hid);
    if (rec && scene.t - rec.at > FORGET_MS) { g.told.delete(hid); rec = undefined; }
    const mode = !rec ? 'first' : g.lastGlance === hid ? 'again' : 'return';
    const r = glanceHall(scene.hall, scene, audio, g.exitsListed, g.seenListed, g.relicsListed, fl, glanceRand(scene.hall, scene, rec?.keys.size ?? 0), {
      told: rec?.keys ?? new Set(), mode, lastChar: g.lastChar, recent: new Set(g.recent),
    });
    g.lastChar = r.char;
    paras = r.paras;
    const keys = rec?.keys ?? new Set<string>();
    for (const k of r.said) { keys.add(k); g.recent.push(k); }
    if (g.recent.length > RECENT_KEYS) g.recent.splice(0, g.recent.length - RECENT_KEYS);
    g.told.set(hid, { keys, at: scene.t });
    g.lastGlance = hid;
  } else {
    paras = describeHall(scene.hall, scene, audio, g.exitsListed, g.seenListed, g.relicsListed, fl, numbered);
    g.lastGlance = null;
  }
  const links: Link[] = [
    ...(numbered ? g.exitsListed.map((e) => ({ label: doorLabel(e, g.exitsListed), command: `go ${e.index}` })) : directionLinks(g)),
    ...(brief ? [{ label: 'look closely', command: 'look closely' }] : numbered ? [
      ...g.seenListed.map((_, i) => ({ label: `examine ${i + 1}`, command: `examine ${i + 1}` })),
      ...g.relicsListed.map((r, i) => ({ label: `examine ${g.seenListed.length + i + 1}`, command: `examine ${g.seenListed.length + i + 1}` })),
    ] : [{ label: 'look closely', command: 'look closely' }]),
    { label: 'listen', command: 'listen' },
  ];
  // keep going the way you were heading, if there is a door that way; and let the House carry you
  const ahead = g.exitsListed.some((e) => e.side === g.facing) ? sideWord(g.facing).replace(' wall', '') : null;
  if (ahead) links.unshift({ label: `go on ${ahead}`, command: `go ${ahead}` });
  links.push({ label: 'wander', command: 'wander' });
  if (scene.hall.kind === 'vestibule' && scene.hall.stairs.length > 0) {
    if (g.pos.level < 2) links.push({ label: 'go up', command: 'up' });
    if (g.pos.level > 0) links.push({ label: 'go down', command: 'down' });
  }
  const lines = paras.map((p, i) => text(g, p, i === paras.length - 1 ? links : undefined));
  g.lastLook = lines;
  return lines;
}

// ---------------------------------------------------------------------------------------------------------------
// Moving
// ---------------------------------------------------------------------------------------------------------------

function chooseExit(g: Game, side: Side | undefined, n: number | undefined): NamedExit | string {
  const all = g.exitsListed;
  if (all.length === 0) return 'Look around first, to see where the ways out are.';
  if (side === undefined && n !== undefined) return all.find((e) => e.index === n) ?? `There is no way out numbered ${n}.`;
  const onWall = all.filter((e) => e.side === side).sort((a, b) => a.pos - b.pos);
  if (onWall.length === 0) return `There is no door in the ${sideWord(side as Side)} wall.`;
  if (n !== undefined) return onWall[n - 1] ?? `The ${sideWord(side as Side)} wall has only ${onWall.length} ${onWall.length === 1 ? 'door' : 'doors'}.`;
  if (onWall.length === 1) return onWall[0] as NamedExit;
  // several doors: the one nearest where you stand along that wall (or the middle one)
  const target = g.pos.wall === side ? g.pos.pos : 500;
  return onWall.slice().sort((a, b) => Math.abs(a.pos - target) - Math.abs(b.pos - target))[0] as NamedExit;
}

function arrivalPosition(g: Game, from: Exit, level: Level): Position {
  const back = hallExits(g.world, from.to.x, from.to.y, level).filter((e) => e.to.x === g.pos.x && e.to.y === g.pos.y);
  const match = from.corridor > 0 ? back.find((e) => e.corridor > 0) : back.find((e) => e.corridor === 0 && Math.abs(e.pos - from.pos) < 2);
  const pick = match ?? back[0];
  if (pick) return { x: from.to.x, y: from.to.y, level, wall: pick.side, pos: pick.pos };
  return { x: from.to.x, y: from.to.y, level, wall: OPPOSITE[from.side], pos: from.pos };
}

// --- walking ----------------------------------------------------------------------------------------------------

/** Real milliseconds a walk of this many world-seconds takes, at this game's time scale and walking pace. */
function realMsFor(g: Game, worldSeconds: number): number {
  return (worldSeconds * 1000) / g.cfg.timeScale / g.opts.walkPace;
}

/** Walks shorter than this just happen: there is nothing to wait for. */
const INSTANT_MS = 1500;

export function walkStatus(g: Game, realNowMs: number): { label: string; remainingWorldS: number; fraction: number } | null {
  const w = g.walk;
  if (!w) return null;
  const total = Math.max(1, w.endMs - w.startMs);
  const left = Math.max(0, w.endMs - realNowMs);
  return { label: g.journey ? `${g.journey.destName} (leg ${g.journey.idx + 1} of ${g.journey.route.length}: ${w.label})` : w.label, remainingWorldS: (left / 1000) * g.cfg.timeScale, fraction: 1 - left / total };
}

/** "You set off for", "You break into a jog for", "You run for". */
function startVerb(g: Game): string {
  const m = gait(g.opts.walkPace);
  return m === 'walk' ? 'You set off for' : m === 'jog' ? 'You break into a jog for' : 'You run for';
}

function beatFor(g: Game, h: Hall, key: string): string {
  const all = hallStatues(g.world, h).filter((st) => st.tier <= 1 && !st.canonId);
  if (all.length === 0) return 'You walk on across the great floor.';
  const st = all[hashInts(g.world.seed, 0xbea7, h.x, h.y, h.level, key.length * 31 + key.charCodeAt(0)) % all.length] as Statue;
  const desc = describeStatue(h, st).replace(/\.$/, '');
  return `About halfway, you ${gait(g.opts.walkPace) === 'walk' ? 'pass' : 'sweep past'} ${desc.charAt(0).toLowerCase()}${desc.slice(1)}, on the ${sideWord(st.wall)} wall.`;
}

function startWalk(g: Game, w: Omit<Walk, 'startMs' | 'endMs' | 'beats'> & { seconds: number; beats: { frac: number; text: string }[] }, now: number): Walk | null {
  const ms = realMsFor(g, w.seconds);
  if (!Number.isFinite(ms) || ms < INSTANT_MS) return null;
  const { seconds, beats, ...rest } = w;
  void seconds;
  const walk: Walk = { ...rest, startMs: now, endMs: now + ms, beats: beats.map((b) => ({ atMs: now + b.frac * ms, text: b.text })).sort((a, b) => a.atMs - b.atMs) };
  g.walk = walk;
  return walk;
}

function blockedBy(g: Game, e: NamedExit, realNowMs: number): Line[] | null {
  const t = worldNow(g, realNowMs);
  const dest = getHall(g.world, e.to.x, e.to.y, g.pos.level);
  const there = sceneAtWorldTime(g.world, e.to.x, e.to.y, g.pos.level, t);
  if (dest.regions.drowned && g.pos.level === 1) {
    return [text(g, `You stand at the doorway to the ${dest.name}. Beyond it the floor is gone under dark, still water, with drowned statues and broken stone in the deep. There is no way across.`)];
  }
  if (there.tide.depthDm >= 16) {
    return [text(g, `You look through the ${sideWord(e.side)} door. ${waterSentence(dest, there)} You cannot cross it now; you wait where you are.`)];
  }
  return null;
}

export function go(g: Game, e: NamedExit, realNowMs: number): Line[] {
  const blocked = blockedBy(g, e, realNowMs);
  if (blocked) return blocked;
  const h = getHall(g.world, g.pos.x, g.pos.y, g.pos.level);
  const scene = sceneAtWorldTime(g.world, g.pos.x, g.pos.y, g.pos.level, worldNow(g, realNowMs), { outside: g.opts.outsideTraces });
  const meters = distanceM(h, { wall: g.pos.wall, pos: g.pos.pos }, { wall: e.side, pos: e.pos }) + DOORWAY_M + e.corridor * CORRIDOR_HALL_M;
  const seconds = walkSeconds(meters, terrainFactor(h, scene.tide.depthDm));
  const dest = getHall(g.world, e.to.x, e.to.y, g.pos.level);
  g.facing = e.side;
  const key = `${e.index}${e.side}`;
  const realS = seconds / g.opts.walkPace;
  const beats = g.opts.walkNarration
    ? strollBeats(g, h, scene, e.side, realS, key)
    : meters >= 80 ? [{ frac: 0.5, text: beatFor(g, h, key) }] : [];
  const walk = startWalk(g, { kind: 'door', meters, seconds, exit: e, beats, label: dest.name }, realNowMs);
  if (!walk) return finishDoor(g, e, realNowMs);
  const where = e.corridor > 0 ? 'a long passage' : `the ${sideWord(e.side)} door`;
  if (g.opts.walkNarration) return [text(g, `${startVerb(g)} ${where}.`)];
  return [text(g, `${startVerb(g)} ${where}, ${describeDistance(meters)} away. It will take ${describeDuration(seconds / g.opts.walkPace)}.`)];
}

function finishDoor(g: Game, e: NamedExit, realNowMs: number): Line[] {
  const blocked = blockedBy(g, e, realNowMs); // the water may have risen while you walked
  if (blocked) {
    g.pos = { ...g.pos, wall: e.side, pos: e.pos };
    return blocked;
  }
  const t = worldNow(g, realNowMs);
  const dest = getHall(g.world, e.to.x, e.to.y, g.pos.level);
  const there = sceneAtWorldTime(g.world, e.to.x, e.to.y, g.pos.level, t);
  const fromSpot = here(g);
  g.pos = arrivalPosition(g, e, g.pos.level);
  g.said.clear();
  recordMove(g, fromSpot, 'door', e);
  const quiet = passThrough(g, dest.name, there.tide.depthDm, realNowMs);
  if (quiet) return quiet;
  const how = e.corridor > 0
    ? `You take the ${sideWord(e.side)} door into a long passage of ${e.corridor === 1 ? 'a hall\'s length' : `${e.corridor} halls' length`}, and come out at last into the`
    : `You go through the ${sideWord(e.side)} door into the`;
  const caution = there.tide.depthDm >= 9 ? ' The water is waist-deep and hard to stand in.' : there.tide.depthDm > 0 ? ' Water runs over the floor.' : '';
  return [text(g, `${how} ${dest.name}.${caution}`), ...look(g, realNowMs)];
}

export function stairs(g: Game, dir: 'up' | 'down', realNowMs: number): Line[] {
  const h = getHall(g.world, g.pos.x, g.pos.y, g.pos.level);
  const stair = h.stairs[0];
  if (h.kind !== 'vestibule' || !stair) return [text(g, 'There is no staircase here. The great stairs are in the vestibules.')];
  const target = (g.pos.level + (dir === 'up' ? 1 : -1)) as Level;
  if (target < 0 || target > 2) return [text(g, dir === 'up' ? 'The stair ends in the upper halls. Above them there is only the cloud.' : 'The stair ends at the lower halls, where the sea is.')];
  const t = worldNow(g, realNowMs);
  if (target === 0) {
    const lower = tideAt(g.world, getHall(g.world, g.pos.x, g.pos.y, 0), t);
    if (lower.depthDm > 0) {
      return [text(g, 'You go down the great stair, step after enormous step, until black water laps the stone beneath your feet. You stop at the water\'s edge. The sea fills the halls below; you could not walk in them now. You climb back up.')];
    }
  }
  const approach = distanceM(h, { wall: g.pos.wall, pos: g.pos.pos }, { wall: stair.wall, pos: stair.pos });
  const seconds = walkSeconds(approach) + (dir === 'up' ? STAIR_UP_S : STAIR_DOWN_S);
  const label = `the ${(['lower', 'middle', 'upper'] as const)[target]} halls`;
  const sbeats = g.opts.walkNarration && Number.isFinite(g.opts.walkPace) && seconds / g.opts.walkPace > 12
    ? [{ frac: 0.35, text: dir === 'up' ? 'Step follows enormous step, each almost as high as your knee, and the hall falls away below.' : 'Step follows enormous step down, and the sounds of the sea grow nearer.' },
       { frac: 0.7, text: dir === 'up' ? 'The stair turns, and turns again; the air changes a little as you climb.' : 'The stair turns again, and the stone beneath your feet is damp.' }]
    : [];
  const walk = startWalk(g, { kind: 'stairs', meters: approach + 45, seconds, dir, beats: sbeats, label }, realNowMs);
  if (!walk) return finishStairs(g, dir, realNowMs);
  if (g.opts.walkNarration) return [text(g, `${startVerb(g)} the great stair, ${dir === 'up' ? 'climbing' : 'going down'}.`)];
  return [text(g, `${startVerb(g)} the great stair and the climb ${dir === 'up' ? 'up' : 'down'}, ${describeDuration(seconds / g.opts.walkPace)} in all.`)];
}

function finishStairs(g: Game, dir: 'up' | 'down', realNowMs: number): Line[] {
  const h = getHall(g.world, g.pos.x, g.pos.y, g.pos.level);
  const stair = h.stairs[0] as NonNullable<Hall['stairs'][number]>;
  const target = (g.pos.level + (dir === 'up' ? 1 : -1)) as Level;
  const fromSpot = here(g);
  g.pos = { x: g.pos.x, y: g.pos.y, level: target, wall: stair.wall, pos: stair.pos };
  g.said.clear();
  recordMove(g, fromSpot, 'stairs', undefined, dir);
  const quiet = passThrough(g, `the ${(['lower', 'middle', 'upper'] as const)[target]} halls`, 0, realNowMs);
  if (quiet) return quiet;
  const how = dir === 'up'
    ? 'You climb the great stair, twenty-five metres of steps each almost twice as high as is comfortable, and come out into'
    : 'You descend the great stair, step after enormous step, into';
  return [text(g, `${how} the ${(['lower', 'middle', 'upper'] as const)[target]} halls.`), ...look(g, realNowMs)];
}

export function walkTo(g: Game, wall: Side, realNowMs: number, pos = 500, note?: string, label?: string): Line[] {
  const h = getHall(g.world, g.pos.x, g.pos.y, g.pos.level);
  const meters = distanceM(h, { wall: g.pos.wall, pos: g.pos.pos }, { wall, pos });
  const seconds = walkSeconds(meters);
  g.facing = wall;
  const scene = sceneNow(g, realNowMs);
  const wbeats = g.opts.walkNarration ? strollBeats(g, h, scene, wall, seconds / g.opts.walkPace, `w${wall}${pos}`) : [];
  const walk = startWalk(g, { kind: 'wall', meters, seconds, wall, pos, note, beats: wbeats, label: label ?? `the ${sideWord(wall)} wall` }, realNowMs);
  if (!walk) return finishWall(g, wall, realNowMs, pos, note);
  if (g.opts.walkNarration) return [text(g, `${startVerb(g)} the ${sideWord(wall)} wall.`)];
  return [text(g, `${startVerb(g)} the ${sideWord(wall)} wall, ${describeDistance(meters)} away. It will take ${describeDuration(seconds / g.opts.walkPace)}.`)];
}

function finishWall(g: Game, wall: Side, realNowMs: number, pos = 500, note?: string): Line[] {
  g.pos = { ...g.pos, wall, pos };
  return [text(g, note ?? `You walk to the ${sideWord(wall)} wall.`), ...look(g, realNowMs)];
}

function finishWalk(g: Game, w: Walk, realNowMs: number): Line[] {
  g.walk = null;
  const before = g.journey?.idx ?? -1;
  const lines = w.kind === 'door' ? finishDoor(g, w.exit as NamedExit, realNowMs)
    : w.kind === 'stairs' ? finishStairs(g, w.dir as 'up' | 'down', realNowMs)
    : finishWall(g, w.wall as Side, realNowMs, w.pos, w.note);
  return g.journey ? [...lines, ...continueJourney(g, before, realNowMs)] : lines;
}

// --- journeys: a long way, one leg at a time ----------------------------------------------------------------------

// --- the way back, by memory -----------------------------------------------------------------------------------------

const HOME: Spot = { x: 0, y: 0, level: 1 };
const spotKey = (s: Spot): string => `${s.level}:${s.x},${s.y}`;
const sameSpot = (a: Spot, b: Spot): boolean => a.x === b.x && a.y === b.y && a.level === b.level;

/** The doors of a wall, from its low end (the west end of a north or south wall, the south end of an east or west one). */
function wallDoorsSorted(g: Game, s: Spot, side: Side): { to: Spot; pos: number; corridor: number; side: Side }[] {
  return hallExits(g.world, s.x, s.y, s.level).filter((e) => e.side === side).sort((a, b) => a.pos - b.pos)
    .map((e) => ({ to: { x: e.to.x, y: e.to.y, level: s.level }, pos: e.pos, corridor: e.corridor, side: e.side }));
}

/**
 * Note a move for the way back: which door of the new hall you came in by, counted from the low end of its wall. A move that does not
 * follow on from the last one (you were carried somewhere) forgets the way; coming back to a hall you have been in forgets the loop;
 * and arriving home forgets everything, since you are home.
 */
function recordMove(g: Game, from: Spot, via: 'door' | 'stairs', e?: NamedExit, dir?: 'up' | 'down'): void {
  const to = here(g);
  g.visits.set(spotKey(to), (g.visits.get(spotKey(to)) ?? 0) + 1);
  const last = g.trail[g.trail.length - 1];
  if (last ? !sameSpot(last.to, from) : false) { g.trail = []; g.trailOrigin = from; }
  else if (!last && g.trail.length === 0 && !sameSpot(g.trailOrigin, from) && !sameSpot(from, g.trailOrigin)) g.trailOrigin = from;
  if (sameSpot(to, HOME)) { g.trail = []; g.trailOrigin = HOME; return; }
  const loop = g.trail.findIndex((t) => sameSpot(t.from, to));
  if (loop >= 0 || sameSpot(to, g.trailOrigin)) { g.trail = g.trail.slice(0, Math.max(0, loop)); return; }
  if (via === 'stairs') { g.trail.push({ from, to, via, dir }); return; }
  const side = (g.pos.wall ?? opposite((e as NamedExit).side)) as Side;
  const doors = wallDoorsSorted(g, to, side);
  const toward = doors.map((d, i) => ({ d, i })).filter((x) => sameSpot(x.d.to, from));
  const near = toward.sort((a, b) => Math.abs(a.d.pos - g.pos.pos) - Math.abs(b.d.pos - g.pos.pos))[0];
  g.trail.push({ from, to, via, inSide: side, inOrd: (near?.i ?? 0) + 1, inOf: Math.max(1, doors.length) });
}

/** The conditions that make a memory worse, right now. */
function memoryConditions(g: Game, realNowMs: number): { dark: boolean; wet: boolean; hurried: boolean } {
  const s = sceneNow(g, realNowMs);
  return { dark: s.light.level < 120, wet: s.tide.depthDm >= 4 || s.weather.storm, hurried: Number.isFinite(g.opts.walkPace) && g.opts.walkPace >= 3 };
}

const isMarked = (g: Game, s: Spot): boolean => [...g.marks.values()].some((m) => sameSpot(m, s));

/** The way as it really was: each step's door, and the hall it leaves, and the hall it should reach. */
interface TrueStep { instr: Instr; leaves: Spot; reaches: Spot }

function trueFromTrail(g: Game): TrueStep[] {
  const out: TrueStep[] = [];
  for (let k = g.trail.length - 1; k >= 0; k--) {
    const t = g.trail[k] as TrailEntry;
    out.push({
      instr: t.via === 'stairs' ? { via: 'stairs', dir: opposite2(t.dir as 'up' | 'down') } : { via: 'door', side: t.inSide, ord: t.inOrd, of: t.inOf },
      leaves: t.to, reaches: t.from,
    });
  }
  return out;
}
const opposite2 = (d: 'up' | 'down'): 'up' | 'down' => (d === 'up' ? 'down' : 'up');

function trueFromRoute(g: Game, route: Step[]): TrueStep[] {
  const out: TrueStep[] = [];
  let cur = here(g);
  for (const step of route) {
    if (step.via === 'stairs') out.push({ instr: { via: 'stairs', dir: step.level > cur.level ? 'up' : 'down' }, leaves: cur, reaches: { x: step.x, y: step.y, level: step.level } });
    else {
      const all = hallExits(g.world, cur.x, cur.y, cur.level).filter((e) => e.to.x === step.x && e.to.y === step.y).sort((a, b) => a.corridor - b.corridor || Math.abs(a.pos - 500) - Math.abs(b.pos - 500));
      const e = all[0];
      const doors = e ? wallDoorsSorted(g, cur, e.side) : [];
      const idx = e ? doors.findIndex((d) => d.pos === e.pos) : 0;
      out.push({ instr: { via: 'door', side: e?.side, ord: idx + 1, of: Math.max(1, doors.length) }, leaves: cur, reaches: { x: step.x, y: step.y, level: step.level } });
    }
    cur = { x: step.x, y: step.y, level: step.level };
  }
  return out;
}

/** Remember the way, as a person does: mostly right, now and then a door counted out or a wall confused. */
function beginRecall(g: Game, steps: TrueStep[], destName: string, dest: Spot, intro: string, realNowMs: number): Line[] {
  if (g.walk || g.journey) return [text(g, 'You are already on your way; you would have to stop first.')];
  if (steps.length === 0) return [text(g, 'You are already there.')];
  const attempt = g.recalls++;
  const cond = memoryConditions(g, realNowMs);
  const instr: Instr[] = [];
  const route: Step[] = [];
  steps.forEach((s, j) => {
    const p = slipChance({ visits: g.visits.get(spotKey(s.leaves)) ?? 1, marked: isMarked(g, s.leaves), ...cond });
    let remembered: Instr | null = s.instr;
    if (dice(g.world.seed, attempt, steps.length, j, 1) < p) remembered = slip(s.instr, dice(g.world.seed, attempt, steps.length, j, 2));
    if (remembered) { instr.push(remembered); route.push({ ...s.reaches, via: s.instr.via }); }
  });
  if (instr.length === 0) return [text(g, 'You cannot call to mind any of the way.')];
  g.journey = { destName, route, idx: 0, recall: { instr, dest, diverged: false, attempt } };
  return [text(g, intro), ...runJourney(g, realNowMs)];
}

/** One leg of a way followed by memory: the door as remembered, if there is one. */
function recallLeg(g: Game, realNowMs: number): Line[] {
  const j = g.journey as Journey;
  const r = j.recall as NonNullable<Journey['recall']>;
  const ins = r.instr[j.idx] as Instr;
  g.exitsListed = listExits(g, g.pos.level);
  const lost = (why: string): Line[] => { g.journey = null; return [text(g, why), ...look(g, realNowMs)]; };
  if (ins.via === 'stairs') {
    const h = getHall(g.world, g.pos.x, g.pos.y, g.pos.level);
    if (h.kind !== 'vestibule' || h.stairs.length === 0) return lost('You look for the great stair you remember, and there is none here. You have gone wrong somewhere.');
    return stairs(g, ins.dir as 'up' | 'down', realNowMs);
  }
  const doors = g.exitsListed.filter((e) => e.side === ins.side).sort((a, b) => a.pos - b.pos);
  if (doors.length === 0) return lost(`You look for the door you remember, in the ${sideWord(ins.side as Side)}, and there is none. This is not the place you thought.`);
  return go(g, doors[pickIndex(doors.length, ins.ord ?? 1)] as NamedExit, realNowMs);
}

/** Go back the way you came, from memory. It may not go as remembered. */
export function wayBack(g: Game, realNowMs: number): Line[] {
  const here0 = here(g);
  if (sameSpot(here0, HOME)) return [text(g, 'You are already at the great stair, in the hall of the minotaurs. There is no further back.')];
  if (g.trail.length === 0) return [text(g, 'You came here in a moment, and you have no memory of the way. You will have to find it.')];
  const origin = g.trailOrigin;
  const name = sameSpot(origin, HOME) ? 'the First Vestibule' : nameOf(g.world, origin);
  const intro = sameSpot(origin, HOME) ? 'You try to call to mind the way you came.' : `You try to call to mind the way back to where you first found yourself, ${name}.`;
  return beginRecall(g, trueFromTrail(g), name, origin, intro, realNowMs);
}

const withThe = (name: string): string => (/^the /i.test(name) ? name : `the ${name}`);
const here = (g: Game): Spot => ({ x: g.pos.x, y: g.pos.y, level: g.pos.level });

/**
 * Arriving partway through a journey: say in a line where you are passing, and go on. Returns null when this is the end of the
 * journey (or there is none), so the full description is given.
 */
function passThrough(g: Game, name: string, depthDm: number, realNowMs: number): Line[] | null {
  const j = g.journey;
  if (!j) return null;
  j.idx++;
  const r = j.recall;
  if (r) {
    // Going by memory: is this the hall you expected? A wrong turn may be noticed at once, or not for a while.
    const expected = j.route[j.idx - 1];
    const now = here(g);
    const ok = !!expected && sameSpot(expected, now);
    if (!ok) r.diverged = true;
    if (j.idx >= j.route.length) {
      g.journey = null;
      if (sameSpot(r.dest, now)) return null;
      return [text(g, `You have come to the end of what you remember, and this is not ${withThe(j.destName)}. You have lost the way.`), ...look(g, realNowMs)];
    }
    if (!ok && dice(g.world.seed, r.attempt, j.route.length, j.idx, 7) < 0.45) {
      g.journey = null;
      return [text(g, pickLost(g, r.attempt, j.idx)), ...look(g, realNowMs)];
    }
    g.explored.add(exploredKey(g.pos.level, g.pos.x, g.pos.y));
    g.prev = sceneNow(g, realNowMs);
    const strange = (g.visits.get(spotKey(now)) ?? 0) <= 1 && r.diverged;
    return [{ kind: 'event', text: stylise(strange ? 'You go on, through a hall you do not know.' : `You pass through ${withThe(name)}.`, g.opts.style) }];
  }
  if (j.idx >= j.route.length) { g.journey = null; return null; }
  g.explored.add(exploredKey(g.pos.level, g.pos.x, g.pos.y));
  g.prev = sceneNow(g, realNowMs);
  const wet = depthDm >= 9 ? ', wading' : depthDm > 0 ? ', through shallow water' : '';
  return [{ kind: 'event', text: stylise(`You pass through ${withThe(name)}${wet}.`, g.opts.style) }];
}

const LOST_LINES = [
  'This does not look as you remember it. Somewhere you have gone wrong.',
  'You stop. The hall is not the one you were expecting; you must have turned wrongly a while back.',
  'Nothing here is familiar. The way you remember has led you somewhere else.',
  'You stand still and look about you. You do not know this place, and you cannot say where you went wrong.',
];
const pickLost = (g: Game, attempt: number, k: number): string => LOST_LINES[hashInts(g.world.seed, attempt, k, 0x10d) % LOST_LINES.length] as string;

function startLeg(g: Game, realNowMs: number): Line[] {
  const j = g.journey as Journey;
  if (j.recall) return recallLeg(g, realNowMs);
  const step = j.route[j.idx] as Step;
  g.exitsListed = listExits(g, g.pos.level);
  if (step.via === 'stairs') return stairs(g, step.level > g.pos.level ? 'up' : 'down', realNowMs);
  const doors = g.exitsListed.filter((e) => e.to.x === step.x && e.to.y === step.y);
  if (doors.length === 0) {
    // the way we planned is not where we are (the journey was interrupted, say): plan again from here
    const route = findRoute(g.world, here(g), { x: j.route[j.route.length - 1]!.x, y: j.route[j.route.length - 1]!.y, level: j.route[j.route.length - 1]!.level });
    if (!route || route.length === 0) { g.journey = null; return [text(g, 'You cannot find the way on from here.')]; }
    g.journey = { ...j, route, idx: 0 };
    return startLeg(g, realNowMs);
  }
  const e = doors.slice().sort((a, b) => a.corridor - b.corridor || Math.abs(a.pos - (g.pos.wall === a.side ? g.pos.pos : 500)) - Math.abs(b.pos - (g.pos.wall === b.side ? g.pos.pos : 500)))[0] as NamedExit;
  return go(g, e, realNowMs);
}

/** Take legs one after another until one needs real time (then the clock carries it on) or the journey ends or is blocked. */
function runJourney(g: Game, realNowMs: number): Line[] {
  const out: Line[] = [];
  for (let guard = 0; guard < 2000 && g.journey && !g.walk; guard++) {
    const before = g.journey.idx;
    out.push(...startLeg(g, realNowMs));
    if (g.walk || !g.journey) break;
    if (g.journey.idx === before) { g.journey = null; out.push(text(g, 'You break off your journey here.')); break; }
  }
  return squash(g, out);
}

function continueJourney(g: Game, before: number, realNowMs: number): Line[] {
  if (!g.journey) return [];
  if (g.journey.idx === before) { g.journey = null; return [text(g, 'You break off your journey here.')]; }
  return runJourney(g, realNowMs);
}

/** A fast journey would print a line for every hall: join runs of them into one. */
function squash(g: Game, lines: Line[]): Line[] {
  const out: Line[] = [];
  let names: string[] = [];
  const flush = (): void => {
    if (names.length === 0) return;
    const shown = names.length <= 4 ? names.join(', ') : `${names.slice(0, 2).join(', ')}, and ${names.length - 2} more halls, the last of them ${names[names.length - 1]}`;
    out.push({ kind: 'event', text: stylise(`You pass through ${shown}.`, g.opts.style) });
    names = [];
  };
  for (const l of lines) {
    const m = /^You pass through (.+?)(?:, wading|, through shallow water)?\.$/i.exec(l.text);
    if (l.kind === 'event' && m) names.push(m[1] as string);
    else { flush(); out.push(l); }
  }
  flush();
  return out;
}

function beginJourney(g: Game, route: Step[], destName: string, realNowMs: number): Line[] {
  if (g.walk || g.journey) return [text(g, 'You are already on your way; you would have to stop first.')];
  if (route.length === 0) return [text(g, 'You are already there.')];
  g.journey = { destName, route, idx: 0 };
  const rough = describeDuration(walkSeconds(route.length * 180) / g.opts.walkPace);
  const intro = g.opts.walkNarration
    ? text(g, `You set out for ${withThe(destName)}.`)
    : text(g, `You set out for ${withThe(destName)}, ${route.length === 1 ? 'one hall' : `${route.length} halls`} away; about ${rough} on foot at your pace.`);
  return [intro, ...runJourney(g, realNowMs)];
}

const LEVEL_NAME = ['lower', 'middle', 'upper'] as const;

/** A place by what the visitor called it: home, one of their marks, or a name in the House's own style. */
function placeFor(g: Game, said: string): Spot | null {
  const t = said.toLowerCase().trim().replace(/^(the|to|mark)\s+/, '');
  if (/^(home|start|the start|beginning|first vestibule|the first vestibule)$/.test(t)) return { x: 0, y: 0, level: 1 };
  for (const [label, m] of g.marks) if (label === t) return { x: m.x, y: m.y, level: m.level };
  const starts = [...g.marks].filter(([label]) => label.startsWith(t) || t.startsWith(label));
  if (starts.length === 1) { const m = (starts[0] as [string, { x: number; y: number; level: Level }])[1]; return { x: m.x, y: m.y, level: m.level }; }
  return resolveName(g.world, said, g.pos.level);
}

/** A place you could find the way to without a map: home, a place you have marked, or one you have been in. */
function isKnown(g: Game, s: Spot): boolean {
  if (s.x === 0 && s.y === 0 && s.level === 1) return true;
  if (g.explored.has(exploredKey(s.level, s.x, s.y))) return true;
  for (const m of g.marks.values()) if (m.x === s.x && m.y === s.y && m.level === s.level) return true;
  return false;
}

export function travelTo(g: Game, said: string, realNowMs: number): Line[] {
  const spot = placeFor(g, said);
  if (!spot) return [text(g, `You do not know of a place called "${said}". Try a name as the House gives them, such as the Ninth Vestibule or the Eighty-Eighth Western Hall, or one of your marks.`)];
  if (g.opts.knownOnly) {
    if (!isKnown(g, spot)) return [text(g, `You have never been to the ${nameOf(g.world, spot)}, and you would not know the way. You would have to find it.`)];
    if (sameSpot(spot, HOME) && !sameSpot(here(g), HOME)) return wayBack(g, realNowMs);
    // by what you remember: only through halls you have been in, and a memory may be wrong
    const known = findRoute(g.world, here(g), spot, 60000, (s) => sameSpot(s, spot) || g.explored.has(exploredKey(s.level, s.x, s.y)));
    if (!known) return [text(g, `You do not remember a way to the ${nameOf(g.world, spot)} through halls you know.`)];
    const nm = `${nameOf(g.world, spot)}${spot.level !== 1 ? `, on the ${LEVEL_NAME[spot.level]} level` : ''}`;
    return beginRecall(g, trueFromRoute(g, known), nm, spot, `You set out for ${withThe(nm)}, by what you remember of the way.`, realNowMs);
  }
  const route = findRoute(g.world, here(g), spot);
  if (!route) return [text(g, `You cannot find a way to ${nameOf(g.world, spot)} that is open to you: the water or the Drowned Halls are in the way.`)];
  return beginJourney(g, route, `${nameOf(g.world, spot)}${spot.level !== 1 ? `, on the ${LEVEL_NAME[spot.level]} level` : ''}`, realNowMs);
}

export function trek(g: Game, side: Side, n: number | undefined, realNowMs: number): Line[] {
  g.facing = side;
  const route = straightRoute(g.world, here(g), side, n ?? 500);
  if (route.length === 0) return [text(g, `There is no door in the ${sideWord(side)} wall to go on through.`)];
  const last = route[route.length - 1] as Step;
  return beginJourney(g, route, `${nameOf(g.world, last)}, straight ${sideWord(side).replace(' wall', '')}`, realNowMs);
}

export function approach(g: Game, n: number, realNowMs: number): Line[] {
  if (g.seenListed.length === 0) prepareHall(g, realNowMs);
  const s = g.seenListed[n - 1];
  if (!s) return [text(g, `There is no statue numbered ${n} in view. Look around to see the list.`)];
  const h = getHall(g.world, g.pos.x, g.pos.y, g.pos.level);
  const len = wallLength(h, s.statue.wall);
  const pos = Math.max(20, Math.min(980, Math.round((s.statue.alongM * 1000) / len)));
  const note = `You walk along the ${sideWord(s.statue.wall)} wall to stand before statue ${n}. ${describeStatue(h, s.statue)}`;
  return walkTo(g, s.statue.wall, realNowMs, pos, note, `statue ${n}`);
}

function stopWalk(g: Game, realNowMs: number): Line[] {
  if (!g.walk) return [text(g, 'You are not going anywhere.')];
  g.walk = null;
  g.journey = null;
  g.pos = { ...g.pos, wall: null, pos: 500 };
  return [text(g, 'You stop where you are, out in the open floor.'), ...look(g, realNowMs)];
}

function walkingLine(g: Game, realNowMs: number): Line {
  const st = walkStatus(g, realNowMs) as NonNullable<ReturnType<typeof walkStatus>>;
  if (g.opts.walkNarration) return text(g, `You are still on your way to ${g.journey ? g.journey.destName : st.label}.`);
  return text(g, `You are on your way to ${st.label}, ${Math.round(st.fraction * 100)}% of the way there, with ${describeDuration(st.remainingWorldS)} to go.`);
}

// ---------------------------------------------------------------------------------------------------------------
// Examining
// ---------------------------------------------------------------------------------------------------------------

/** Looking closely at something left behind: shows our description, and notes it in your private list. */
function noticeRelic(g: Game, r: Relic, h: Hall): string {
  const first = !g.found.has(r.id);
  g.found.set(r.id, { label: r.label, hall: h.name });
  void first;
  return r.detail;
}

const STOP = new Set(['the', 'and', 'with', 'statue', 'that', 'this']);

function examine(g: Game, what: string, realNowMs: number): Line[] {
  const scene = sceneNow(g, realNowMs);
  const h = scene.hall;
  const num = /(\d+)/.exec(what);
  if (num) {
    const n = Number(num[1]);
    const sn = g.seenListed[n - 1];
    if (sn) return [text(g, statueDetail(h, sn))];
    const r = g.relicsListed[n - g.seenListed.length - 1];
    if (r) return [text(g, noticeRelic(g, r, h))];
    return [text(g, g.seenListed.length ? `There is nothing numbered ${n} in view.` : 'Look around first, to see what is in view.')];
  }
  const words = what.split(' ');
  const rhit = g.relicsListed.find((r) => words.some((w) => w.length >= 3 && !STOP.has(w) && r.label.toLowerCase().includes(w)));
  if (rhit && !g.seenListed.some((sn) => words.some((w) => w.length >= 3 && !STOP.has(w) && (`${sn.statue.canonLabel ?? ''} ${sn.statue.figure}`).toLowerCase().includes(w)))) return [text(g, noticeRelic(g, rhit, h))];
  const hit = g.seenListed.find((sn) => words.some((w) => w.length >= 3 && !STOP.has(w) && (`${sn.statue.canonLabel ?? ''} ${sn.statue.figure}`).toLowerCase().includes(w)));
  if (hit) return [text(g, statueDetail(h, hit))];
  if (words.some((w) => ['water', 'sea', 'tide', 'tides', 'lake'].includes(w))) return [text(g, waterSentence(h, scene) || 'There is no water here to speak of.')];
  if (words.some((w) => ['sky', 'moon', 'sun', 'light'].includes(w))) return [text(g, skyParagraph(scene))];
  if (words.some((w) => ['window', 'windows', 'courtyard'].includes(w))) {
    const n = h.windows.N + h.windows.E + h.windows.S + h.windows.W;
    return [text(g, n === 0 ? 'There are no windows here.' : `There are ${n} tall windows in all. Through them you see an empty paved courtyard with ${h.courtyardSides} sides, and the sky above it.`)];
  }
  if (words.some((w) => ['walls', 'wall', 'statues'].includes(w))) return [text(g, `The walls are ranked with statues in ${wallGrids(h)[0]?.tiers ?? 1} tiers, ${h.slotCount} places in all.`)];
  return [text(g, 'You see nothing like that here. Try "examine" and a number from the list, or a word from its description.')];
}

// ---------------------------------------------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------------------------------------------

export const HELP = [
  'Looking:  look  ·  look closely (all of it)  ·  look again, or repeat (the same words again)  ·  listen  ·  time  ·  where  ·  list (numbered, for reference)',
  'Statues:  examine 2  ·  approach 2 (walk up to it)  ·  found (what you have noticed)',
  'Moving:  go north (or n)  ·  go 3 (way out number 3)  ·  go south 2 (the second south door)  ·  walk east (along a wall)  ·  up, down (in a vestibule)  ·  stop',
  'Far places:  travel to the Ninth Vestibule  ·  travel west 40  ·  mark the fountain, then travel to the fountain  ·  marks',
  'Finding your way:  way back (or home): you try to remember the way you came, and may remember wrongly. Marking a hall with chalk makes it sure.',
  'Keys (when you are not typing):  /  to type  ·  m map  ·  w wander  ·  r say it again  ·  s sound  ·  ?  help',
  'Let the House carry you:  wander (or the Wander button) walks on and on; type anything to stop it.',
  'The tides and the weather follow the real clock. Everything you read is also what you can hear.',
].join('\n');

const VERBS = ['look', 'listen', 'examine', 'approach', 'go', 'walk', 'travel', 'home', 'stop', 'wait', 'time', 'where', 'found', 'mark', 'marks', 'unmark', 'repeat', 'help', 'north', 'south', 'east', 'west', 'up', 'down'];

/** The command a mistyped first word most likely meant, if it is near enough to one. */
function closestVerb(input: string): string | null {
  const w = input.toLowerCase().trim().split(/\s+/)[0] ?? '';
  if (w.length < 3) return null;
  const dist = (a: string, b: string): number => {
    const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
    for (let j = 1; j <= b.length; j++) (d[0] as number[])[j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
      (d[i] as number[])[j] = Math.min((d[i - 1] as number[])[j]! + 1, (d[i] as number[])[j - 1]! + 1, (d[i - 1] as number[])[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    return (d[a.length] as number[])[b.length] as number;
  };
  let best: string | null = null;
  let bestD = 3;
  for (const v of VERBS) { const k = dist(w, v); if (k < bestD) { bestD = k; best = v; } }
  return best;
}

const MOVING: ReadonlySet<Command['t']> = new Set(['go', 'walk', 'stairs', 'travel', 'trek', 'approach', 'wayback']);

export function run(g: Game, cmd: Command, realNowMs: number): Line[] {
  if (g.walk && (cmd.t === 'empty' || (cmd.t === 'look' && !cmd.repeat) || cmd.t === 'where')) return [walkingLine(g, realNowMs)];
  if (g.walk && MOVING.has(cmd.t)) return [text(g, 'You are still on your way; you could stop, or wait until you arrive.'), walkingLine(g, realNowMs)];
  switch (cmd.t) {
    case 'stop': return stopWalk(g, realNowMs);
    case 'found': {
      if (g.found.size === 0) return [text(g, 'You have not noticed anything that earlier visitors left behind.')];
      const lines = [...g.found.values()].map((f, i) => `${i + 1}. ${f.label} (${f.hall})`);
      return [text(g, `What you have noticed that was left behind, in your own list (nobody else can see it):\n${lines.join('\n')}`)];
    }
    case 'empty': return look(g, realNowMs);
    case 'look': return look(g, realNowMs, cmd.full === true, cmd.repeat === true, cmd.numbered === true);
    case 'lookdir': return lookDirection(g, cmd.side, realNowMs);
    case 'listen': {
      const s = sceneNow(g, realNowMs);
      return [text(g, soundParagraph(audioFor(g.world, s, { facing: g.facing }), s))];
    }
    case 'go': {
      if (g.exitsListed.length === 0) prepareHall(g, realNowMs);
      const r = chooseExit(g, cmd.side, cmd.n);
      return typeof r === 'string' ? [text(g, r)] : go(g, r, realNowMs);
    }
    case 'walk': return walkTo(g, cmd.wall, realNowMs);
    case 'travel': return travelTo(g, cmd.place, realNowMs);
    case 'wayback': return g.opts.knownOnly ? wayBack(g, realNowMs) : travelTo(g, 'first vestibule', realNowMs);
    case 'trek': return trek(g, cmd.side, cmd.n, realNowMs);
    case 'approach': return approach(g, cmd.n, realNowMs);
    case 'mark': {
      const label = cmd.label.toLowerCase();
      const h = getHall(g.world, g.pos.x, g.pos.y, g.pos.level);
      g.marks.set(label, { x: g.pos.x, y: g.pos.y, level: g.pos.level, hall: h.name });
      return [text(g, `You will remember the ${h.name} as "${label}".`)];
    }
    case 'unmark': return g.marks.delete(cmd.label.toLowerCase()) ? [text(g, `You forget the mark "${cmd.label}".`)] : [text(g, `You have no mark called "${cmd.label}".`)];
    case 'marks': {
      if (g.marks.size === 0) return [text(g, 'You have not marked anywhere yet.')];
      return [text(g, `Your marks (private to you):\n${[...g.marks].map(([l, m]) => `${l}: ${m.hall}${m.level !== 1 ? `, ${LEVEL_NAME[m.level]} level` : ''}`).join('\n')}`)];
    }
    case 'stairs': return stairs(g, cmd.dir, realNowMs);
    case 'examine': return examine(g, cmd.what, realNowMs);
    case 'wait': return [text(g, 'You wait, and listen.'), ...tick(g, realNowMs, true)];
    case 'time': return [text(g, skyParagraph(sceneNow(g, realNowMs)))];
    case 'where': {
      const s = sceneNow(g, realNowMs);
      return [text(g, `You are in the ${s.hall.name}, on the ${(['lower', 'middle', 'upper'] as const)[g.pos.level]} level.`)];
    }
    case 'help': return [system(HELP)];
    case 'unknown': {
      const guess = closestVerb(cmd.input);
      return [text(g, guess ? `You are not sure what that means. Did you mean "${guess}"? Type "help" for the few things you can do.` : 'You are not sure what that means. Type "help" for the few things you can do.')];
    }
  }
}

export function step(g: Game, input: string, realNowMs: number): Line[] {
  return run(g, parse(input), realNowMs);
}

// ---------------------------------------------------------------------------------------------------------------
// Live events
// ---------------------------------------------------------------------------------------------------------------

/** Compare the scene now with the last one shown, and say what has changed. Each change is said once. */
export function diffScenes(prev: SceneState, next: SceneState, audio: AudioScene): string[] {
  const out: string[] = [];
  if (prev.light.sunPhase !== next.light.sunPhase) {
    out.push(next.light.sunPhase === 'dawn' ? 'The light is beginning to grow in the windows.'
      : next.light.sunPhase === 'day' ? 'Day has come fully.'
      : next.light.sunPhase === 'dusk' ? 'The windows are fading toward dusk.'
      : 'Night has fallen; the stars come out in the windows.');
  }
  const wasWet = prev.tide.depthDm > 0;
  const isWet = next.tide.depthDm > 0;
  if (!wasWet && isWet && !next.tide.lake) out.push(next.tide.joined >= 3 ? 'With a roar like the end of the world, three tides meet and fill the hall.' : 'Water comes through the doors and over the pavement, and begins to rise.');
  if (wasWet && !isWet && !prev.tide.lake) out.push('The water drains away down the stairs, leaving weed and a sheen on the stone.');
  if (!wasWet && !isWet && audio.tide.kind === 'approach' && prev.nextTide?.startMs !== undefined && prev.t < prev.nextTide.startMs - 6 * 60_000) {
    out.push('Somewhere far below there is a low thudding. A tide is coming.');
  }
  if (prev.here.rainHere === 0 && next.here.rainHere > 0) out.push('Rain begins to fall.');
  if (prev.here.rainHere > 0 && next.here.rainHere === 0) out.push('The rain stops.');
  if (!prev.weather.storm && next.weather.storm) out.push('A storm is rising out of the west.');
  if (!prev.light.moonInDoorway && next.light.moonInDoorway) out.push('The full moon rises into the single doorway and floods the hall with pale light.');
  if (next.outside && prev.outside?.id !== next.outside.id) out.push(outsideSentence(next.outside, next.hall));
  if (prev.birds.mode !== 'murmuration' && next.birds.mode === 'murmuration') out.push('The birds rise all at once and fill the air with a smoke of wings.');
  if (prev.birds.mode === 'murmuration' && next.birds.mode !== 'murmuration') out.push('The great flock settles and falls quiet.');
  return out;
}

export function tick(g: Game, realNowMs: number, force = false): Line[] {
  const out: Line[] = [];
  const w = g.walk;
  if (w) {
    if (realNowMs >= w.endMs) return finishWalk(g, w, realNowMs);
    while (w.beats.length > 0 && realNowMs >= (w.beats[0] as { atMs: number }).atMs) {
      const b = w.beats.shift() as { atMs: number; text: string };
      out.push({ kind: 'event', text: stylise(b.text, g.opts.style) });
    }
  }
  const scene = sceneNow(g, realNowMs);
  const audio = audioFor(g.world, scene, { facing: g.facing });
  if (!g.prev) {
    g.prev = scene;
    return out;
  }
  const said = diffScenes(g.prev, scene, audio);
  g.prev = scene;
  for (const s of said) out.push({ kind: 'event', text: stylise(s, g.opts.style) });
  if (force && out.length === 0) out.push({ kind: 'event', text: stylise('Nothing much changes.', g.opts.style) });
  return out;
}
