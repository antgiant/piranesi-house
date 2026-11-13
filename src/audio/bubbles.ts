// Falling water, from the physics of one drop. Every splash, trickle and fall is a crowd of tiny air bubbles, each ringing at the pitch
// its size gives it (a small bubble rings high, a large one low), the pitch creeping up a little as it fades, and fading faster the higher
// it rings (the model of van den Doel, "Physically based models for liquid sounds"). The character of the water is only how many, how
// big, and how often: a fine fall is hundreds of small ones a second; a trickle is a few large ones; a drip is a single drop's bubble.
// Pure, with a seedable random source, so it can be measured in tests without any audio device.

export type Rng = () => number;

const randn = (rng: Rng): number => Math.sqrt(-2 * Math.log(rng() + 1e-12)) * Math.cos(2 * Math.PI * rng());

/** How fast a bubble ringing at f0 Hz dies away (1/s): damping by the water, plus radiation of sound. Higher bubbles die much faster. */
export function bubbleDamping(f0: number): number {
  return 0.043 * f0 + 0.0014 * Math.pow(f0, 1.5);
}

/** The pitch a bubble starts at rises by this fraction of (damping x time) as it fades. */
export const CHIRP = 0.1;

/** The frequency of a bubble t seconds in. */
export function bubbleFrequency(f0: number, t: number): number {
  return f0 * (1 + CHIRP * bubbleDamping(f0) * t);
}

/** How long to keep a bubble's ring: until it has fallen by about 54 dB. */
export function bubbleLength(f0: number): number {
  return 6.2 / bubbleDamping(f0);
}

/** Add one bubble into a buffer at sample `at`. Bigger (lower) bubbles are louder: amplitude `amp` is for a bubble of `ref` Hz. */
export function addBubble(d: Float32Array, sr: number, at: number, f0: number, amp: number): void {
  const damp = bubbleDamping(f0);
  const len = Math.min(d.length - at, Math.floor(sr * bubbleLength(f0)));
  const w = 2 * Math.PI * f0;
  for (let k = 0; k < len; k++) {
    const t = k / sr;
    d[at + k]! += amp * Math.exp(-damp * t) * Math.sin(w * (t + 0.5 * CHIRP * damp * t * t));
  }
}

/** A crowd of bubbles: how many a second, how big (log-normal around a median pitch), how uneven in loudness. */
export interface SwarmSpec {
  perSec: number;
  /** Median ring pitch (Hz), and the spread in natural-log units: 0.5 is a factor of about 1.65 either way. */
  fMed: number; sigma: number;
  /** Loudness: (fRef / f0) ^ power (bigger is louder) x a log-normal scatter of `scatter`, capped. */
  power: number; scatter: number; cap: number;
}

export function fillSwarm(d: Float32Array, sr: number, spec: SwarmSpec, rng: Rng = Math.random): void {
  const n = Math.floor(spec.perSec * (d.length / sr));
  for (let e = 0; e < n; e++) {
    const f0 = Math.min(9000, Math.max(250, spec.fMed * Math.exp(randn(rng) * spec.sigma)));
    const amp = Math.min(spec.cap, Math.pow(spec.fMed / f0, spec.power) * Math.exp(randn(rng) * spec.scatter));
    addBubble(d, sr, Math.floor(rng() * d.length), f0, amp);
  }
}

/**
 * The fine fall: the dense, small bubbles of water landing in water: a sparkle that is many things at once and nothing in particular.
 * The plops: now and then a large one, an event you can pick out. A trickle is mostly these, and a few small ones.
 * (Both are measured against real recordings in tests/bubbles.test.ts and in design/falls-model.md.)
 */
export const FINE: SwarmSpec = { perSec: 650, fMed: 3200, sigma: 0.55, power: 0.7, scatter: 0.45, cap: 4 };
export const PLOPS: SwarmSpec = { perSec: 9, fMed: 2000, sigma: 0.5, power: 1.1, scatter: 0.35, cap: 6 };
/** The deep gurgle of water running into a dark chamber: big, slow bubbles, low and sparse (the sinkhole recording). */
export const GURGLE: SwarmSpec = { perSec: 14, fMed: 420, sigma: 0.55, power: 1.0, scatter: 0.5, cap: 5 };
export const TRICKLE: SwarmSpec = { perSec: 40, fMed: 1500, sigma: 0.5, power: 1.0, scatter: 0.5, cap: 5 };

/** The pitch of one falling drop's bubble, for a live drip: mostly 1 to 2 kHz, sometimes up to 4 (cave and drain recordings: 1.0-1.5 and 1.0-4.7 kHz). */
export function dripPitch(rng: Rng = Math.random): number {
  return Math.min(4800, Math.max(700, 1450 * Math.exp(randn(rng) * 0.42)));
}
