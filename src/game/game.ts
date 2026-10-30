// Game state, commands and live events. Pure: all time comes in as an argument, so it is fully testable.

import { audioFor, type AudioScene } from '../audio/director';
import { sceneAtWorldTime, type SceneState } from '../sim/scene';
import { defaultSimConfig, worldTime, type SimConfig } from '../sim/time';
import { tideAt } from '../sim/tides';
import { getHall, wallGrids, type Hall } from '../world/hall';
import { OPPOSITE, SIDES, exits as hallExits, type Exit, type Level, type Side } from '../world/layout';
import { hallStatues } from '../world/slots';
import type { Statue } from '../world/statues';
import { createWorld, type World } from '../world/world';
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
}

export function newGame(opts: Partial<GameOptions>, realNowMs: number): Game {
  const o: GameOptions = { seed: 'the-house', timeScale: 1, showDead: true, style: 'plain', ...opts };
  const world = createWorld(o.seed, { showDead: o.showDead });
  const cfg: SimConfig = { ...defaultSimConfig, timeScale: o.timeScale };
  if (o.startAtWorldMs !== undefined) cfg.realZeroMs = realNowMs - Math.floor(o.startAtWorldMs / o.timeScale);
  return {
    world, cfg, opts: o, pos: { x: 0, y: 0, level: 1, wall: null, pos: 500 },
    exitsListed: [], seenListed: [], prev: null, said: new Set(),
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
  const audio = audioFor(g.world, scene);
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

export function go(g: Game, e: NamedExit, realNowMs: number): Line[] {
  const t = worldNow(g, realNowMs);
  const dest = getHall(g.world, e.to.x, e.to.y, g.pos.level);
  const there = sceneAtWorldTime(g.world, e.to.x, e.to.y, g.pos.level, t);
  if (dest.regions.drowned && g.pos.level === 1) {
    return [text(g, `You stand at the doorway to ${dest.name}. Beyond it the floor is gone under dark, still water, with drowned statues and broken stone in the deep. There is no way across.`)];
  }
  if (there.tide.depthDm >= 16) {
    return [text(g, `You look through the ${sideWord(e.side)} door. ${waterSentence(dest, there)} You cannot cross it now; you wait where you are.`)];
  }
  const from = g.pos;
  g.pos = arrivalPosition(g, e, g.pos.level);
  g.said.clear();
  const lines: Line[] = [];
  const how = e.corridor > 0
    ? `You take the ${sideWord(e.side)} door into a long passage of ${e.corridor === 1 ? 'a hall\'s length' : `${e.corridor} halls' length`}, and come out at last into`
    : `You go through the ${sideWord(e.side)} door into`;
  const caution = there.tide.depthDm >= 9 ? ' The water is waist-deep and hard to stand in.' : there.tide.depthDm > 0 ? ' Water runs over the floor.' : '';
  void from;
  lines.push(text(g, `${how} ${dest.name}.${caution}`));
  lines.push(...look(g, realNowMs));
  return lines;
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
  g.pos = { x: g.pos.x, y: g.pos.y, level: target, wall: stair.wall, pos: stair.pos };
  g.said.clear();
  const how = dir === 'up'
    ? 'You climb the great stair, twenty-five metres of steps each almost twice as high as is comfortable, and come out into'
    : 'You descend the great stair, step after enormous step, into';
  return [text(g, `${how} the ${(['lower', 'middle', 'upper'] as const)[target]} halls.`), ...look(g, realNowMs)];
}

export function walkTo(g: Game, wall: Side, realNowMs: number): Line[] {
  g.pos = { ...g.pos, wall, pos: 500 };
  return [text(g, `You walk to the ${sideWord(wall)} wall.`), ...look(g, realNowMs)];
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

export function run(g: Game, cmd: Command, realNowMs: number): Line[] {
  switch (cmd.t) {
    case 'empty': return look(g, realNowMs);
    case 'look': return look(g, realNowMs);
    case 'listen': {
      const s = sceneNow(g, realNowMs);
      return [text(g, soundParagraph(audioFor(g.world, s), s))];
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
  const scene = sceneNow(g, realNowMs);
  const audio = audioFor(g.world, scene);
  if (!g.prev) {
    g.prev = scene;
    return [];
  }
  const said = diffScenes(g.prev, scene, audio);
  g.prev = scene;
  const lines: Line[] = said.map((s) => ({ kind: 'event' as const, text: stylise(s, g.opts.style) }));
  if (force && lines.length === 0) lines.push({ kind: 'event', text: stylise('Nothing much changes.', g.opts.style) });
  return lines;
}
