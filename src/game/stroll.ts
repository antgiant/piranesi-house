// What you notice while walking: with the slower, narrated way of walking, the walk is described as it goes, a little at a
// time, with silences between, instead of being a countdown. Beats are a pure function of the world, the hall and the walk,
// so the same walk is described the same way.

import { audioFor } from '../audio/director';
import type { SceneState } from '../sim/scene';
import type { Hall } from '../world/hall';
import { flourishesFor } from '../world/flourishes';
import type { Side } from '../world/layout';
import { Rng, hashInts } from '../world/rng';
import { hallStatues } from '../world/slots';
import { describeStatue, type Statue } from '../world/statues';
import { birdSentence, lightSentence, sideWord, soundParagraph, waterSentence, weatherSentences } from './narrator';
import { birdLines, seaLines, skyLines } from './nature';
import type { Game } from './game';

export interface Beat { frac: number; text: string }

const lower = (s: string): string => s.charAt(0).toLowerCase() + s.slice(1);
const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/** A few seconds of real time must pass before the first thing is said, and a little between things. */
const FIRST_S = 5;
const EVERY_S = 16;
const MAX_BEATS = 10;

/** What it is possible to say about this stretch of the hall, as lines in the order of a walk. */
function candidates(g: Game, h: Hall, s: SceneState, side: Side | null, r: Rng, gaitWord: string): string[] {
  const out: string[] = [];
  const statues = hallStatues(g.world, h).filter((st) => st.tier <= 2);
  const near = side ? statues.filter((st) => st.wall === side) : statues;
  const pool: Statue[] = (near.length >= 6 ? near : statues);
  const used = new Set<number>();
  const take = (): Statue | null => {
    if (pool.length === 0) return null;
    for (let tries = 0; tries < 8; tries++) {
      const i = r.int(pool.length);
      if (!used.has(i)) { used.add(i); return pool[i] as Statue; }
    }
    return null;
  };
  const statueLine = (st: Statue): string => {
    const d = lower(describeStatue(h, st).replace(/\.$/, ''));
    const w = sideWord(st.wall);
    const hi = st.tier >= 1;
    const t = r.int(6);
    if (t === 0) return `You ${gaitWord} ${d}, on the ${w} wall.`;
    if (t === 1) return `On the ${w} wall, ${d}.`;
    if (t === 2) return `Beside the way stands ${d}.`;
    if (t === 3) return `Your eye is caught by ${d}.`;
    if (t === 4 && hi) return `Above your head, ${d}.`;
    return `Then ${d}, on the ${w} wall.`;
  };
  for (let i = 0; i < 6; i++) { const st = take(); if (st) out.push(statueLine(st)); }
  for (const f of flourishesFor(g.world, h)) {
    const t = r.int(3);
    out.push(t === 0 ? `Overhead, ${f.pass}.` : t === 1 ? `You ${gaitWord} ${f.pass}.` : `Above you: ${f.pass}.`);
  }
  const a = h.architecture;
  out.push(`The ${a.columns} go by one after another, and between them the ${a.niches} niches open in the wall.`);
  if (a.apses > 0) out.push('An apse opens off to one side, deep and dim, and you go on past its mouth.');
  const audio = audioFor(g.world, s, { facing: g.facing, portals: true });
  for (const l of [lightSentence(h, s), waterSentence(h, s), ...weatherSentences(h, s), birdSentence(s)]) if (l) out.push(l);
  const heard = soundParagraph(audio, s).split(/(?<=[.!?])\s+/)[0];
  if (heard) out.push(heard);
  // the sky, the sea and its creatures, and above all the birds, who are most of what moves
  const rnd = (): number => r.u32() / 4294967296;
  out.push(...skyLines(h, s, rnd).slice(0, 3), ...seaLines(h, s, rnd).slice(0, 3));
  const birds = new Set<string>();
  for (let i = 0; i < 4; i++) for (const l of birdLines(h, s, rnd)) birds.add(l);
  out.push(...birds);
  return out;
}

/**
 * The beats of a walk through a hall that will take `realSeconds`. A long walk gets a good many things said; every so often a
 * beat is dropped to leave a silence. A walk of a few seconds gets nothing: it is over before there is time to say anything.
 */
export function strollBeats(g: Game, h: Hall, s: SceneState, side: Side | null, realSeconds: number, key: string): Beat[] {
  if (!Number.isFinite(realSeconds)) return [];
  const n = Math.min(MAX_BEATS, Math.floor((realSeconds - FIRST_S) / EVERY_S) + 1);
  if (n <= 0) return [];
  const r = new Rng(hashInts(g.world.seed, 0x57a0, h.x, h.y, h.level, key.length * 131 + key.charCodeAt(0)));
  const gaitWord = g.opts.walkPace >= 1.6 ? 'sweep past' : 'pass';
  const lines = r.shuffle(candidates(g, h, s, side, r, gaitWord));
  const beats: Beat[] = [];
  for (let i = 0; i < n && lines.length > 0; i++) {
    // an evenly spaced slot, nudged; some slots are left silent so the quiet can be heard
    if (i > 0 && r.chance(30, 100)) continue;
    const frac = Math.min(0.94, Math.max(FIRST_S / realSeconds, (i + 0.5 + (r.int(60) - 30) / 100) / n));
    beats.push({ frac, text: cap(lines.shift() as string) });
  }
  return beats;
}
