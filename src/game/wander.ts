// Wandering: what to do next when nobody is steering. Pure apart from the random source it is given, so it can be tested.
// It prefers to keep going the way you were heading, rarely doubles back, and now and then stops to look at a statue,
// listen, or climb or descend a staircase.

import type { Game } from './game';
import { OPPOSITE } from '../world/layout';
import { getHall } from '../world/hall';

export type Rand = () => number;

/** Pick the next command to type. Call after the current hall has been described, so its exits are listed. */
export function chooseWander(g: Game, rand: Rand): string {
  const roll = rand();
  const hall = g.exitsListed;
  if (hall.length === 0) return 'look';
  if (roll < 0.08) return 'listen';
  if (roll < 0.2 && g.seenListed.length > 0) return `examine ${1 + Math.floor(rand() * g.seenListed.length)}`;
  if (roll < 0.28 && g.relicsListed.length > 0) return `examine ${g.seenListed.length + 1 + Math.floor(rand() * g.relicsListed.length)}`;
  if (roll < 0.36) {
    const dirs: ('up' | 'down')[] = [];
    // stairs exist only in vestibules; `look` lists them as links, so mirror its rule
    const vest = getHall(g.world, g.pos.x, g.pos.y, g.pos.level);
    if (vest?.kind === 'vestibule' && vest.stairs.length > 0) {
      if (g.pos.level < 2) dirs.push('up');
      if (g.pos.level > 0) dirs.push('down');
    }
    if (dirs.length) return dirs[Math.floor(rand() * dirs.length)] as string;
  }
  const back = OPPOSITE[g.facing];
  const weights = hall.map((e) => (e.side === g.facing ? 4 : e.side === back ? 0.4 : 1));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rand() * total;
  for (let i = 0; i < hall.length; i++) {
    r -= weights[i] as number;
    if (r <= 0) return `go ${(hall[i] as { index: number }).index}`;
  }
  return `go ${(hall[hall.length - 1] as { index: number }).index}`;
}

/** How long to stay and take a description in when nothing is being read aloud: about a slow reader's pace. */
export function dwellMs(characters: number): number {
  return Math.max(6000, Math.min(40000, 3000 + characters * 55));
}
