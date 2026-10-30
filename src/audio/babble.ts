// Turn a line of text into a plan for a murmur: a run of vowel-like sounds with breathy consonants between them. It is
// not speech and is not meant to be understood; it only keeps the rhythm of the words, so it can be heard as a person
// talking quietly to themselves. Pure, so it can be tested without any audio.

export interface BabbleEvent {
  /** Seconds from the start. */
  t: number;
  dur: number;
  kind: 'vowel' | 'breath' | 'stop';
  /** Pitch in Hz (vowels). */
  f0: number;
  /** Two formant centre frequencies in Hz (vowels), or noise band (breath/stop). */
  f1: number;
  f2: number;
  /** 0..1 relative loudness. */
  level: number;
}

// rough first and second formants of English-like vowels
const VOWELS: Record<string, [number, number]> = {
  a: [730, 1090], e: [530, 1840], i: [270, 2290], o: [570, 840], u: [300, 870], y: [270, 2290],
};
const STOPS = new Set('pbtdkgc'.split(''));
const BREATHS = new Set('fvszhxjsh'.split(''));

/** FNV-1a: a stable small number from a string, to vary pitch per word without any random source. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

export function babblePlan(text: string, baseHz = 118): BabbleEvent[] {
  const words = text.toLowerCase().replace(/[^a-z\s']/g, ' ').split(/\s+/).filter(Boolean);
  const plan: BabbleEvent[] = [];
  let t = 0;
  const total = Math.max(1, words.length);
  words.forEach((w, wi) => {
    // a gentle fall across the phrase, as the voice tires at the end of a thought
    const fall = 1 - 0.12 * (wi / total);
    const lift = 0.94 + (hash(w) % 13) / 100;
    let i = 0;
    while (i < w.length) {
      const c = w[i] as string;
      if (c in VOWELS) {
        // a run of vowels is one syllable
        let j = i;
        while (j < w.length && (w[j] as string) in VOWELS) j++;
        const [f1, f2] = VOWELS[w[i] as string] as [number, number];
        const dur = 0.11 + 0.03 * (j - i) + (hash(w + i) % 5) / 100;
        plan.push({ t, dur, kind: 'vowel', f0: baseHz * fall * lift, f1, f2, level: 0.8 });
        t += dur * 0.9;
        i = j;
      } else if (STOPS.has(c)) {
        plan.push({ t, dur: 0.03, kind: 'stop', f0: 0, f1: 1200 + (hash(c) % 800), f2: 0, level: 0.5 });
        t += 0.04;
        i++;
      } else if (BREATHS.has(c)) {
        plan.push({ t, dur: 0.07, kind: 'breath', f0: 0, f1: 3000 + (hash(c) % 2500), f2: 0, level: 0.35 });
        t += 0.06;
        i++;
      } else {
        t += 0.025; // l, m, n, r, w: a small hum between sounds
        i++;
      }
    }
    t += 0.09; // between words
  });
  return plan;
}

/** Total length of a plan in seconds. */
export function babbleLength(plan: BabbleEvent[]): number {
  const last = plan[plan.length - 1];
  return last ? last.t + last.dur : 0;
}
