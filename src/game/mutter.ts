// The visitor's own half-heard muttering: a few words under the breath, never quite sense. Generated from a small corpus
// of our own phrases by a word-pair chain, then roughened (repeats, wandering, trailing off). Nothing here is trained on,
// or copied from, any book; nothing a visitor types ever feeds it. Cosmetic and per-visitor: it never touches the world.

import type { AudioScene } from '../audio/director';

/** Our own phrases, in the voice of someone alone in a great building and rather used to it. */
export const CORPUS: readonly string[] = [
  'the water is late today',
  'north and then north again',
  'someone has been through this doorway',
  'I counted the halls and lost count',
  'the stairs are wet again',
  'the sea came up higher than before',
  'it was here a moment ago',
  'where did I put the shells',
  'a long way to the next one',
  'the same hall as before, or nearly',
  'listen, there it is again',
  'nobody is coming and that is fine',
  'the floor is cold under my feet',
  'a bird on the stone, quite still',
  'it is going to rain by evening',
  'these doors all look the same',
  'I will go this way and see',
  'the light is thin in here',
  'which wall was the door in',
  'it was louder in the last hall',
  'tomorrow the water will have moved',
  'a great many faces and none of them looking',
  'walk slowly, the stone is slippery',
  'down below it is darker and quieter',
  'once there was a sound like a bell',
  'the cloud has come in again',
  'I think I have been here before',
  'every hall is different and the same',
  'quiet now, quiet',
  'around the corner and then along the wall',
  'the tide knows the way better than I do',
  'something is dripping, somewhere',
  'the wind sings in the broken places',
  'high up the statues are cold and grey',
  'turn left at the one with the horns',
  'the weeds will want clearing',
  'one more door, then rest',
  'what a lot of stone',
  'a little further and the light will change',
  'the water remembers the shape of the room',
];

const END = '\u0000';

type Chain = Map<string, string[]>;
function buildChain(lines: readonly string[]): { chain: Chain; starts: string[]; words: string[] } {
  const chain: Chain = new Map();
  const starts: string[] = [];
  const all = new Set<string>();
  for (const line of lines) {
    const w = line.split(/\s+/).filter(Boolean);
    starts.push(w[0] as string);
    for (let i = 0; i < w.length; i++) {
      const key = (w[i] as string).toLowerCase();
      all.add(key);
      const next = i + 1 < w.length ? (w[i + 1] as string).toLowerCase() : END;
      (chain.get(key) ?? chain.set(key, []).get(key)!).push(next);
    }
  }
  return { chain, starts: starts.map((s) => s.toLowerCase()), words: [...all] };
}
const MODEL = buildChain(CORPUS);

export type Rand = () => number;
const pick = <T,>(xs: readonly T[], rand: Rand): T => xs[Math.min(xs.length - 1, Math.floor(rand() * xs.length))] as T;

/** A short stretch of mutter: 3 to 9 words that begin like a thought, wander, and often trail off. */
export function mutterLine(rand: Rand): string {
  const target = 3 + Math.floor(rand() * 7);
  let word = pick(MODEL.starts, rand);
  const out: string[] = [word];
  while (out.length < target) {
    const r = rand();
    if (r < 0.07) { out.push(word); continue; } // a word said twice
    if (r < 0.2) word = pick(MODEL.words, rand); // loses the thread
    else {
      const next = pick(MODEL.chain.get(word) ?? [END], rand);
      if (next === END) {
        if (out.length >= 3) break;
        word = pick(MODEL.words, rand);
      } else word = next;
    }
    out.push(word);
  }
  const text = out.join(' ');
  return (text.charAt(0).toUpperCase() + text.slice(1)) + (rand() < 0.55 ? '…' : '.');
}

/** Seconds until the next mutter: rare, and never regular. */
export function mutterDelayS(rand: Rand): number {
  return 75 + rand() * 225;
}

/** Quiet where the House asks for quiet: while a tide is arriving or striking, under water, in the dark hall. */
export function mutterAllowed(a: Pick<AudioScene, 'hush' | 'dark' | 'tide'>): boolean {
  return !a.hush && !a.dark && (a.tide.kind === 'none' || a.tide.kind === 'approach');
}
