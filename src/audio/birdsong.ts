// What each bird says, and in what order: the plan of one calling episode, made of notes taken from the measured templates (birdcalls.ts). The shapes, lengths and gaps are the
// measured ones (design/birds.md); how often each is used, by place and season, is the behaviour (the scene). Pure, so it can be tested.

import { CALLS, type CallName } from './birdcalls';

export type Rng = () => number;
export interface PlannedNote { dt: number; call: CallName; pitch: number; gain: number }
export type Voice = 'gull' | 'rook' | 'sparrow' | 'blackbird' | 'buzzard' | 'owl' | 'albatross' | 'chick';
export type Context = 'colony' | 'air' | 'roost' | 'rain' | 'flock' | 'greeting' | 'nest';

const between = (r: Rng, lo: number, hi: number): number => lo + r() * (hi - lo);
const pick = <T>(r: Rng, items: readonly T[], weights: readonly number[]): T => { let x = r() * weights.reduce((a, b) => a + b, 0); for (let i = 0; i < items.length; i++) { x -= weights[i] ?? 0; if (x <= 0) return items[i] as T; } return items[items.length - 1] as T; };
/** A gap drawn from the measured 10th, 50th and 90th percentiles (a skewed spread through all three). */
function gapOf(r: Rng, name: CallName, fallback: [number, number, number] = [0.3, 0.6, 1.2]): number {
  const g = CALLS[name].gap ?? fallback;
  const u = r();
  return u < 0.5 ? g[0] + (g[1] - g[0]) * (u / 0.5) : g[1] + (g[2] - g[1]) * ((u - 0.5) / 0.5);
}
const countOf = (r: Rng, name: CallName, lo: number, hi: number): number => {
  const b = CALLS[name].bout ?? [lo, Math.round((lo + hi) / 2), hi];
  const u = r(); const v = u < 0.5 ? b[0] + (b[1] - b[0]) * (u / 0.5) : b[1] + (b[2] - b[1]) * ((u - 0.5) / 0.5);
  return Math.max(lo, Math.min(hi, Math.round(v)));
};

function series(r: Rng, call: CallName, n: number, level: (i: number) => number, pitch: (i: number) => number): PlannedNote[] {
  const out: PlannedNote[] = []; let t = 0;
  for (let i = 0; i < n; i++) { out.push({ dt: t, call, pitch: pitch(i), gain: level(i) }); t += gapOf(r, call); }
  return out;
}

/** One episode of calling by a bird of this kind, in this situation. */
export function plan(who: Voice, ctx: Context, r: Rng = Math.random): PlannedNote[] {
  const bird = between(r, 0.92, 1.08); // this bird's own pitch
  switch (who) {
    case 'gull': {
      if (ctx === 'colony') {
        const kind = pick(r, ['alarm', 'mew', 'long'] as const, [0.4, 0.4, 0.2]);
        if (kind === 'alarm') return series(r, 'gullMew', 3 + Math.floor(r() * 4), (i) => 1 - i * 0.08, (i) => bird * (1 - i * 0.012));
        if (kind === 'mew') return [{ dt: 0, call: 'gullMew', pitch: bird, gain: 1 }];
        // the long call: a few slow notes, then the laugh: a run of short notes about a quarter of a second apart, dropping a little in pitch
        const n = 9 + Math.floor(r() * 6), notes: PlannedNote[] = [{ dt: 0, call: 'gullMew', pitch: bird * 0.82, gain: 0.8 }];
        let t = 0.7;
        for (let i = 0; i < n; i++) { notes.push({ dt: t, call: 'gullNote', pitch: bird * (1.04 - 0.03 * (i / n)), gain: 0.7 + 0.3 * Math.sin((Math.PI * (i + 1)) / (n + 1)) }); t += gapOf(r, 'gullNote') * (0.8 + 0.55 * (i / n)) * between(r, 0.9, 1.12); } // the laugh slows as it goes, and is never an even tick
        return notes;
      }
      return r() < 0.88 ? [{ dt: 0, call: 'gullMew', pitch: bird, gain: 1 }] : series(r, 'gullMew', 2, (i) => 1 - i * 0.2, () => bird);
    }
    case 'chick': return series(r, 'gullBeg', 3 + Math.floor(r() * 6), (i) => 1 - i * 0.04, () => between(r, 0.95, 1.05));
    case 'rook': {
      const n = pick(r, [1, 2, 3, 4] as const, [0.45, 0.28, 0.17, 0.1]);
      const notes: PlannedNote[] = []; let t = 0;
      for (let i = 0; i < n; i++) { notes.push({ dt: t, call: 'rookCaw', pitch: bird, gain: 1 - i * 0.08 }); t += between(r, 0.55, 1.0); }
      return notes;
    }
    case 'sparrow': {
      // chirps with ticks among them, in a bout of about five (one to sixteen)
      const n = Math.max(3, Math.min(14, Math.round(countOf(r, 'sparrowChirp', 1, 16) * between(r, 0.6, 1.2)))); // a sparrow chatters: never one call alone
      const notes: PlannedNote[] = []; let t = 0;
      for (let i = 0; i < n; i++) {
        const tick = r() < 0.35;
        notes.push({ dt: t, call: tick ? 'sparrowTick' : 'sparrowChirp', pitch: bird * (tick ? 1 : between(r, 0.9, 1.1)), gain: tick ? 0.45 : 1 });
        t += gapOf(r, tick ? 'sparrowTick' : 'sparrowChirp');
      }
      return notes;
    }
    case 'blackbird': {
      const n = countOf(r, 'blackbirdTink', 3, 12);
      return series(r, 'blackbirdTink', n, (i) => 1 - 0.04 * i, () => bird * between(r, 0.97, 1.03));
    }
    case 'buzzard': return series(r, 'buzzardMew', r() < 0.55 ? 1 : 2, (i) => 1 - i * 0.2, () => bird);
    case 'owl': return [{ dt: 0, call: 'owlScreech', pitch: bird, gain: 1 }];
    case 'albatross': {
      // the greeting: the bill clapped in groups, then a whirr in the throat (the book's clacking and whirring). Measured on two recordings of clapping:
      // two ways of clapping, mixed. Slow, a clap or two with a quarter of a second between; and a roll of ten to fifty claps about 25 ms apart. Pauses between
      // groups run from 0.07 to 0.4 s and now and then a second or so: a rhythm that is never even, more like a message in code than a tick.
      const notes: PlannedNote[] = []; let t = 0;
      const groups = Math.round(between(r, 4, 9));
      for (let g = 0; g < groups; g++) {
        const roll = r() < 0.22, size = roll ? Math.round(between(r, 9, 36)) : pick(r, [1, 2, 3, 4, 6] as const, [0.4, 0.3, 0.1, 0.12, 0.08]);
        for (let i = 0; i < size; i++) {
          notes.push({ dt: t, call: 'albatrossClap', pitch: between(r, 0.95, 1.05), gain: roll ? between(r, 0.5, 0.9) * (1 - 0.2 * (i / size)) : between(r, 0.8, 1) });
          t += roll ? between(r, 0.02, 0.034) : between(r, 0.026, 0.045) * (size > 1 ? 1 : 0);
        }
        t += r() < 0.12 ? between(r, 0.5, 1.1) : between(r, 0.07, 0.41);
      }
      if (ctx === 'greeting' || r() < 0.6) notes.push({ dt: t + 0.15, call: 'albatrossWhirr', pitch: bird, gain: 1 });
      return notes;
    }
  }
}
