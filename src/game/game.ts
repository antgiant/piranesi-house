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
import { hashInts } from '../world/rng';
import { DOORWAY_M, CORRIDOR_HALL_M, STAIR_DOWN_S, STAIR_UP_S, describeDistance, describeDuration, distanceM, gait, terrainFactor, walkSeconds } from './walk';
import { parse, type Command } from './parser';
import {
  describeHall, sideWord, skyParagraph, soundParagraph, statueDetail, stylise, waterSentence,
  type NamedExit, type Seen, type Style,
} from './narrator';

export interface GameOptions {
  seed: string;
  timeScale: number;
  showDead: boolean;
  style: Style;
  /** Walking pace multiplier: 1 is the book's pace (about 1.5 m/s); 4 brisk; 20 fast; Infinity is instant. */
  walkPace: number;
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
  /** The way you face: the way you last walked. Sounds through doorways are placed relative to it. */
  facing: Side;
  /** A walk in progress: the visitor is between here and there until the clock reaches `endMs`. */
  walk: Walk | null;
}

export interface Walk {
  kind: 'door' | 'wall' | 'stairs';
  startMs: number;
  endMs: number;
  meters: number;
  exit?: NamedExit;
  wall?: Side;
  dir?: 'up' | 'down';
  beatMs: number | null;
  beatText: string;
  /** What the destination is called, for the status line. */
  label: string;
}

export function newGame(opts: Partial<GameOptions>, realNowMs: number): Game {
  const o: GameOptions = { seed: 'the-house', timeScale: 1, showDead: true, style: 'plain', walkPace: 1, ...opts };
  const world = createWorld(o.seed, { showDead: o.showDead });
  const cfg: SimConfig = { ...defaultSimConfig, timeScale: o.timeScale };
  if (o.startAtWorldMs !== undefined) cfg.realZeroMs = realNowMs - Math.floor(o.startAtWorldMs / o.timeScale);
  return {
    world, cfg, opts: o, pos: { x: 0, y: 0, level: 1, wall: null, pos: 500 },
    exitsListed: [], seenListed: [], prev: null, said: new Set(), walk: null, facing: 'N',
  };
}

export const worldNow = (g: Game, realNowMs: number): number => worldTime(g.cfg, realNowMs);

export function sceneNow(g: Game, realNowMs: number): SceneState {
  return sceneAtWorldTime(g.world, g.pos.x, g.pos.y, g.pos.level, worldNow(g, realNowMs));
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

export function look(g: Game, realNowMs: number): Line[] {
  const t = worldNow(g, realNowMs);
  const scene = sceneAtWorldTime(g.world, g.pos.x, g.pos.y, g.pos.level, t);
  const audio = audioFor(g.world, scene, { facing: g.facing });
  g.exitsListed = listExits(g, g.pos.level);
  g.seenListed = visibleStatues(g, scene.hall);
  g.prev = scene;
  const paras = describeHall(scene.hall, scene, audio, g.exitsListed, g.seenListed);
  const links: Link[] = [
    ...g.exitsListed.map((e) => ({ label: `${e.index} ${sideWord(e.side)}`, command: `go ${e.index}` })),
    ...g.seenListed.map((_, i) => ({ label: `examine ${i + 1}`, command: `examine ${i + 1}` })),
    { label: 'listen', command: 'listen' },
  ];
  if (scene.hall.kind === 'vestibule' && scene.hall.stairs.length > 0) {
    if (g.pos.level < 2) links.push({ label: 'go up', command: 'up' });
    if (g.pos.level > 0) links.push({ label: 'go down', command: 'down' });
  }
  return paras.map((p, i) => text(g, p, i === paras.length - 1 ? links : undefined));
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
  return { label: w.label, remainingWorldS: (left / 1000) * g.cfg.timeScale, fraction: 1 - left / total };
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

function startWalk(g: Game, w: Omit<Walk, 'startMs' | 'endMs' | 'beatMs'> & { seconds: number }, now: number): Walk | null {
  const ms = realMsFor(g, w.seconds);
  if (!Number.isFinite(ms) || ms < INSTANT_MS) return null;
  const { seconds, ...rest } = w;
  void seconds;
  const walk: Walk = { ...rest, startMs: now, endMs: now + ms, beatMs: w.meters >= 80 ? now + ms / 2 : null };
  g.walk = walk;
  return walk;
}

function blockedBy(g: Game, e: NamedExit, realNowMs: number): Line[] | null {
  const t = worldNow(g, realNowMs);
  const dest = getHall(g.world, e.to.x, e.to.y, g.pos.level);
  const there = sceneAtWorldTime(g.world, e.to.x, e.to.y, g.pos.level, t);
  if (dest.regions.drowned && g.pos.level === 1) {
    return [text(g, `You stand at the doorway to ${dest.name}. Beyond it the floor is gone under dark, still water, with drowned statues and broken stone in the deep. There is no way across.`)];
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
  const scene = sceneAtWorldTime(g.world, g.pos.x, g.pos.y, g.pos.level, worldNow(g, realNowMs));
  const meters = distanceM(h, { wall: g.pos.wall, pos: g.pos.pos }, { wall: e.side, pos: e.pos }) + DOORWAY_M + e.corridor * CORRIDOR_HALL_M;
  const seconds = walkSeconds(meters, terrainFactor(h, scene.tide.depthDm));
  const dest = getHall(g.world, e.to.x, e.to.y, g.pos.level);
  g.facing = e.side;
  const walk = startWalk(g, { kind: 'door', meters, seconds, exit: e, beatText: beatFor(g, h, `${e.index}${e.side}`), label: dest.name }, realNowMs);
  if (!walk) return finishDoor(g, e, realNowMs);
  const where = e.corridor > 0 ? 'a long passage' : `the ${sideWord(e.side)} door`;
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
  g.pos = arrivalPosition(g, e, g.pos.level);
  g.said.clear();
  const how = e.corridor > 0
    ? `You take the ${sideWord(e.side)} door into a long passage of ${e.corridor === 1 ? 'a hall\'s length' : `${e.corridor} halls' length`}, and come out at last into`
    : `You go through the ${sideWord(e.side)} door into`;
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
  const walk = startWalk(g, { kind: 'stairs', meters: approach + 45, seconds, dir, beatText: '', label }, realNowMs);
  if (!walk) return finishStairs(g, dir, realNowMs);
  return [text(g, `${startVerb(g)} the great stair and the climb ${dir === 'up' ? 'up' : 'down'}, ${describeDuration(seconds / g.opts.walkPace)} in all.`)];
}

function finishStairs(g: Game, dir: 'up' | 'down', realNowMs: number): Line[] {
  const h = getHall(g.world, g.pos.x, g.pos.y, g.pos.level);
  const stair = h.stairs[0] as NonNullable<Hall['stairs'][number]>;
  const target = (g.pos.level + (dir === 'up' ? 1 : -1)) as Level;
  g.pos = { x: g.pos.x, y: g.pos.y, level: target, wall: stair.wall, pos: stair.pos };
  g.said.clear();
  const how = dir === 'up'
    ? 'You climb the great stair, twenty-five metres of steps each almost twice as high as is comfortable, and come out into'
    : 'You descend the great stair, step after enormous step, into';
  return [text(g, `${how} the ${(['lower', 'middle', 'upper'] as const)[target]} halls.`), ...look(g, realNowMs)];
}

export function walkTo(g: Game, wall: Side, realNowMs: number): Line[] {
  const h = getHall(g.world, g.pos.x, g.pos.y, g.pos.level);
  const meters = distanceM(h, { wall: g.pos.wall, pos: g.pos.pos }, { wall, pos: 500 });
  const seconds = walkSeconds(meters);
  g.facing = wall;
  const walk = startWalk(g, { kind: 'wall', meters, seconds, wall, beatText: '', label: `the ${sideWord(wall)} wall` }, realNowMs);
  if (!walk) return finishWall(g, wall, realNowMs);
  return [text(g, `${startVerb(g)} the ${sideWord(wall)} wall, ${describeDistance(meters)} away. It will take ${describeDuration(seconds / g.opts.walkPace)}.`)];
}

function finishWall(g: Game, wall: Side, realNowMs: number): Line[] {
  g.pos = { ...g.pos, wall, pos: 500 };
  return [text(g, `You walk to the ${sideWord(wall)} wall.`), ...look(g, realNowMs)];
}

function finishWalk(g: Game, w: Walk, realNowMs: number): Line[] {
  g.walk = null;
  if (w.kind === 'door') return finishDoor(g, w.exit as NamedExit, realNowMs);
  if (w.kind === 'stairs') return finishStairs(g, w.dir as 'up' | 'down', realNowMs);
  return finishWall(g, w.wall as Side, realNowMs);
}

function stopWalk(g: Game, realNowMs: number): Line[] {
  if (!g.walk) return [text(g, 'You are not going anywhere.')];
  g.walk = null;
  g.pos = { ...g.pos, wall: null, pos: 500 };
  return [text(g, 'You stop where you are, out in the open floor.'), ...look(g, realNowMs)];
}

function walkingLine(g: Game, realNowMs: number): Line {
  const st = walkStatus(g, realNowMs) as NonNullable<ReturnType<typeof walkStatus>>;
  return text(g, `You are on your way to ${st.label}, ${Math.round(st.fraction * 100)}% of the way there, with ${describeDuration(st.remainingWorldS)} to go. Type "stop" to stop.`);
}

// ---------------------------------------------------------------------------------------------------------------
// Examining
// ---------------------------------------------------------------------------------------------------------------

const STOP = new Set(['the', 'and', 'with', 'statue', 'that', 'this']);

function examine(g: Game, what: string, realNowMs: number): Line[] {
  const scene = sceneNow(g, realNowMs);
  const h = scene.hall;
  const num = /(\d+)/.exec(what);
  if (num) {
    const n = Number(num[1]);
    const sn = g.seenListed[n - 1];
    if (sn) return [text(g, statueDetail(h, sn))];
    return [text(g, g.seenListed.length ? `There is no statue numbered ${n} in view.` : 'Look around first, to see what is in view.')];
  }
  const words = what.split(' ');
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
  'Look around: look (or l). Listen: listen. The time and sky: time.',
  'Move: go north (or n), go south 2 (the second door in the south wall, counting from the west or south end), go 3 (way out number 3 in the list).',
  'Stairs in vestibules: up, down. Walk along a wall: walk east.',
  'Examine a statue from the list: examine 2, or examine weaver.',
  'Wait for the world: wait. The tides and weather follow the real clock. Everything you read is also what you can hear.',
].join('\n');

const MOVING: ReadonlySet<Command['t']> = new Set(['go', 'walk', 'stairs']);

export function run(g: Game, cmd: Command, realNowMs: number): Line[] {
  if (g.walk && (cmd.t === 'empty' || cmd.t === 'look' || cmd.t === 'where')) return [walkingLine(g, realNowMs)];
  if (g.walk && MOVING.has(cmd.t)) return [text(g, 'You are already on your way. Type "stop" to stop, or wait until you arrive.'), walkingLine(g, realNowMs)];
  switch (cmd.t) {
    case 'stop': return stopWalk(g, realNowMs);
    case 'empty': return look(g, realNowMs);
    case 'look': return look(g, realNowMs);
    case 'listen': {
      const s = sceneNow(g, realNowMs);
      return [text(g, soundParagraph(audioFor(g.world, s, { facing: g.facing }), s))];
    }
    case 'go': {
      if (g.exitsListed.length === 0) look(g, realNowMs);
      const r = chooseExit(g, cmd.side, cmd.n);
      return typeof r === 'string' ? [text(g, r)] : go(g, r, realNowMs);
    }
    case 'walk': return walkTo(g, cmd.wall, realNowMs);
    case 'stairs': return stairs(g, cmd.dir, realNowMs);
    case 'examine': return examine(g, cmd.what, realNowMs);
    case 'wait': return [text(g, 'You wait, and listen.'), ...tick(g, realNowMs, true)];
    case 'time': return [text(g, skyParagraph(sceneNow(g, realNowMs)))];
    case 'where': {
      const s = sceneNow(g, realNowMs);
      return [text(g, `${s.hall.name}, on the ${(['lower', 'middle', 'upper'] as const)[g.pos.level]} level. (Cell ${g.pos.x}, ${g.pos.y}.)`)];
    }
    case 'help': return [system(HELP)];
    case 'unknown': return [text(g, 'You are not sure what that means. Type "help" for the few things you can do.')];
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
  if (prev.birds.mode !== 'murmuration' && next.birds.mode === 'murmuration') out.push('The birds rise all at once and fill the air with a smoke of wings.');
  if (prev.birds.mode === 'murmuration' && next.birds.mode !== 'murmuration') out.push('The great flock settles and falls quiet.');
  return out;
}

export function tick(g: Game, realNowMs: number, force = false): Line[] {
  const out: Line[] = [];
  const w = g.walk;
  if (w) {
    if (realNowMs >= w.endMs) return finishWalk(g, w, realNowMs);
    if (w.beatMs !== null && realNowMs >= w.beatMs && w.beatText) {
      w.beatMs = null;
      out.push({ kind: 'event', text: stylise(w.beatText, g.opts.style) });
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
