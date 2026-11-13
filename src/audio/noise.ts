// The raw material for the water sounds: looping noise buffers made once at start-up. Pure (a random source can be passed in), so they
// can be measured in tests and in the audition tools without any audio device.

export type Rng = () => number;

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
export const randn = (rng: Rng = Math.random): number => Math.sqrt(-2 * Math.log(rng() + 1e-12)) * Math.cos(2 * Math.PI * rng());

/** Scale a buffer to a given RMS, so every source has a known level whatever it was made from. */
export function normalise(d: Float32Array, rms: number): void {
  let s = 0;
  for (let i = 0; i < d.length; i++) s += d[i]! * d[i]!;
  const g = rms / Math.sqrt(s / d.length + 1e-20);
  for (let i = 0; i < d.length; i++) d[i]! *= g;
}

/** Make a looping buffer of `secs` seconds from a filler, at a known level. */
export function makeBuffer(ctx: BaseAudioContext, secs: number, fill: (d: Float32Array, sr: number) => void, rms = 0.25): AudioBuffer {
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * secs), ctx.sampleRate);
  const d = buf.getChannelData(0);
  fill(d, ctx.sampleRate);
  normalise(d, rms);
  return buf;
}

export function fillWhite(d: Float32Array, _sr: number, rng: Rng = Math.random): void {
  for (let i = 0; i < d.length; i++) d[i] = rng() * 2 - 1;
}

/** Paul Kellet's economical pink filter. */
export function fillPink(d: Float32Array, _sr: number, rng: Rng = Math.random): void {
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < d.length; i++) {
    const w = rng() * 2 - 1;
    b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
    b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
    d[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362; b6 = w * 0.115926;
  }
}

export function fillBrown(d: Float32Array, _sr: number, rng: Rng = Math.random): void {
  let last = 0;
  for (let i = 0; i < d.length; i++) { last = (last + 0.02 * (rng() * 2 - 1)) / 1.02; d[i] = last; }
}

/** Slow random wobble (about 2 Hz, unit spread, clipped at about 2.2 sigma so a modulation of up to 0.45 never reverses the sign). */
export function fillControl(d: Float32Array, sr: number, rng: Rng = Math.random): void {
  const a = 1 - Math.exp((-2 * Math.PI * 2) / sr);
  let y = 0;
  for (let i = 0; i < d.length; i++) { y += a * ((rng() * 2 - 1) - y); d[i] = y; }
  let s = 0;
  for (let i = 0; i < d.length; i++) s += d[i]! * d[i]!;
  const g = 1 / Math.sqrt(s / d.length + 1e-20);
  for (let i = 0; i < d.length; i++) d[i] = clamp(d[i]! * g, -2.2, 2.2);
}

/** A scatter of tiny ringing pops: how many a second, how high they ring, how long, and how loud (and how uneven in loudness) they are. */
export interface PopSpec {
  perSec: number;
  /** Ring pitch, log-uniform between these (Hz). */
  fLo: number; fHi: number;
  /** Ring length in ms at `fRef`; shorter for higher pitches, with a random spread of x0.6..x1.5. A very short ring is a click, not a note. */
  tauMs: number; fRef: number;
  /** Loudness: uniform^power x (base + |gaussian| x spread), tilted toward the low pops by (fRef/f)^tilt, and capped. */
  power: number; base: number; spread: number; tilt: number; cap: number;
}

export function fillPops(d: Float32Array, sr: number, spec: PopSpec, rng: Rng = Math.random): void {
  const n = Math.floor(spec.perSec * (d.length / sr));
  const lo = Math.log(spec.fLo), hi = Math.log(spec.fHi);
  for (let e = 0; e < n; e++) {
    const at = Math.floor(rng() * d.length);
    const f = Math.exp(lo + rng() * (hi - lo));
    const tau = sr * (spec.tauMs / 1000) * Math.sqrt(spec.fRef / f) * (0.6 + 0.9 * rng());
    const amp = Math.min(spec.cap, Math.pow(rng(), spec.power) * (spec.base + Math.abs(randn(rng)) * spec.spread) * Math.pow(spec.fRef / f, spec.tilt));
    const len = Math.min(d.length - at, Math.floor(tau * 5));
    const w = (2 * Math.PI * f) / sr;
    const sign = rng() < 0.5 ? -1 : 1;
    for (let k = 0; k < len; k++) d[at + k]! += sign * amp * Math.exp(-k / tau) * Math.sin(w * k);
  }
}

/**
 * Surf foam: not a note but a fizz. Many, very short, high, fairly even pops: each is a click, so together they make a dense sizzle that
 * follows the wave, with no single pop to pick out (measured: 0.1 audible clinks a second, against 10 for the first version and 0 to 2 in
 * real surf recordings; as unpitched as plain noise). (The first version rang for longer and varied more in loudness; it sounded like
 * pebbles or ice clinking, which is a fine sound for something else: see PATTER.)
 */
export const FOAM: PopSpec = { perSec: 3500, fLo: 2500, fHi: 11000, tauMs: 0.2, fRef: 4000, power: 1, base: 0.55, spread: 0.6, tilt: 0.2, cap: 3.0 };

/**
 * Rain on water: the original, longer-ringing pops, softened a little (no very loud ones). Each reads as a small drop landing; a lot of
 * them together is the patter of rain on a pool, a flooded floor, or the sea.
 */
export const PATTER: PopSpec = { perSec: 2200, fLo: 1700, fHi: 9500, tauMs: 0.8, fRef: 3000, power: 2.0, base: 0.3, spread: 0.8, tilt: 0.5, cap: 1.25 };

export const fillFoam = (d: Float32Array, sr: number, rng: Rng = Math.random): void => fillPops(d, sr, FOAM, rng);
export const fillPatter = (d: Float32Array, sr: number, rng: Rng = Math.random): void => fillPops(d, sr, PATTER, rng);
