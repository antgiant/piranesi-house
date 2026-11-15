// What each bird says, and in what order: the plan of one calling episode, made of notes taken from the measured templates (birdcalls.ts). The shapes, lengths and gaps are the
// measured ones (design/birds.md); how often each is used, by place and season, is the behaviour (the scene). Pure, so it can be tested.

import { CALLS, type CallName } from './birdcalls';
import { LIB, type LibKind } from './birdlib';

export type Rng = () => number;
/** `voice` is, for a call that has a library of real birds (birdlib.ts), which bird's voice makes it. */
export interface PlannedNote { dt: number; call: CallName; pitch: number; gain: number; voice?: number }
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
/** One episode of calling by one bird: its notes, each made in the voice of one real bird of the library (the same bird for all its notes of a kind). */
export function plan(who: Voice, ctx: Context, r: Rng = Math.random): PlannedNote[] {
  const notes = planOf(who, ctx, r), mine: Partial<Record<string, number>> = {};
  for (const n of notes) if (n.call in LIB) { const k = n.call as LibKind; mine[k] ??= Math.floor(r() * LIB[k].length); n.voice = mine[k]; }
  return notes;
}

function planOf(who: Voice, ctx: Context, r: Rng): PlannedNote[] {
  const bird = between(r, 0.92, 1.08); // this bird's own pitch
  const mew: CallName = 'gullMew', chirp: CallName = 'sparrowChirp';
  switch (who) {
    case 'gull': {
      if (ctx === 'colony') {
        const kind = pick(r, ['alarm', 'mew', 'long'] as const, [0.4, 0.4, 0.2]);
        if (kind === 'alarm') return series(r, mew, 3 + Math.floor(r() * 4), (i) => 1 - i * 0.08, (i) => bird * (1 - i * 0.012));
        if (kind === 'mew') return [{ dt: 0, call: mew, pitch: bird, gain: 1 }];
        // the long call: a few slow notes, then the laugh: a run of short notes about a quarter of a second apart, dropping a little in pitch
        const n = 9 + Math.floor(r() * 6), notes: PlannedNote[] = [{ dt: 0, call: mew, pitch: bird * 0.82, gain: 0.8 }];
        let t = 0.7;
        for (let i = 0; i < n; i++) { notes.push({ dt: t, call: 'gullNote', pitch: bird * (1.04 - 0.03 * (i / n)), gain: 0.7 + 0.3 * Math.sin((Math.PI * (i + 1)) / (n + 1)) }); t += gapOf(r, 'gullNote') * (0.8 + 0.55 * (i / n)) * between(r, 0.9, 1.12); } // the laugh slows as it goes, and is never an even tick
        return notes;
      }
      if (ctx === 'flock') {
        // a flock over food: short runs of mews (two to five, quick), single mews, and now and then a bout of the short laughing notes; birds join in all the time
        const kind = pick(r, ['run', 'mew', 'laugh'] as const, [0.5, 0.35, 0.15]);
        if (kind === 'mew') return [{ dt: 0, call: mew, pitch: bird, gain: 1 }];
        if (kind === 'run') return series(r, mew, 2 + Math.floor(r() * 4), (i) => 1 - i * 0.07, (i) => bird * (1 + 0.01 * i)).map((n, i) => ({ ...n, dt: n.dt * 0.55 + i * 0.03 }));
        const n = 4 + Math.floor(r() * 5); const out: PlannedNote[] = []; let t = 0;
        for (let i = 0; i < n; i++) { out.push({ dt: t, call: 'gullNote', pitch: bird * (1.1 - 0.04 * (i / n)), gain: 0.8 }); t += gapOf(r, 'gullNote') * between(r, 0.7, 1.0); }
        return out;
      }
      return r() < 0.88 ? [{ dt: 0, call: mew, pitch: bird, gain: 1 }] : series(r, mew, 2, (i) => 1 - i * 0.2, () => bird);
    }
    case 'chick': return series(r, 'gullBeg', countOf(r, 'gullBeg', 2, 7), (i) => 0.8 - i * 0.04, () => between(r, 0.95, 1.05));
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
        const tick = false; // the modal-click 'tick' sounded like a water drop among the chirps, and is not used
        notes.push({ dt: t, call: tick ? 'sparrowTick' : chirp, pitch: bird * (tick ? 1 : between(r, 0.9, 1.1)), gain: tick ? 0.45 : 1 });
        t += gapOf(r, tick ? 'sparrowTick' : chirp);
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
      // the greeting: the bill clapped in a run, then (often) a whirr in the throat (the book's clacking and whirring). Measured on two recordings: single claps, 0.33 to 0.45 s apart
      // (a run of seven to eleven), a slightly longer gap now and then (0.6 s), a pause of two seconds or more between runs. What is said is never the same twice: the tempo of the
      // run, its length, where the longer gaps fall (they make the groups, a rhythm like code), the pauses between runs, and whether it ends in a whirr, all differ.
      const notes: PlannedNote[] = []; let t = 0;
      const runs = pick(r, [1, 2, 3] as const, [0.45, 0.4, 0.15]);
      for (let k = 0; k < runs; k++) {
        const tempo = between(r, 0.31, 0.5), n = Math.round(between(r, 3, 12));
        // cut the run into groups of two to five by lengthening some gaps
        let left = 0;
        for (let i = 0; i < n; i++) {
          notes.push({ dt: t, call: 'albatrossClap', pitch: between(r, 0.95, 1.05), gain: between(r, 0.6, 1) });
          left--;
          let gap = tempo * between(r, 0.85, 1.18);
          if (left <= 0) { left = Math.round(between(r, 2, 5)); if (i < n - 1) gap *= between(r, 1.3, 2.0); }
          if (r() < 0.07) gap = tempo * 0.35; // a quick pair
          t += gap;
        }
        t += k < runs - 1 ? between(r, 1.2, 3.0) : 0.3;
      }
      if (ctx === 'greeting' || r() < 0.5) notes.push({ dt: t, call: 'albatrossWhirr', pitch: bird, gain: 1 });
      return notes;
    }
  }
}
