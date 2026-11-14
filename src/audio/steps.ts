// A bare footstep on each kind of floor (design/steps.md). The visitor is barefoot (the book gives a ragged castaway in coverings of cloth for his cold
// feet, shoes only later and from another's hand), so a step is the foot itself: a heel that lands with a soft low thud, a toe that follows a tenth of a second
// after with a small slap, and what the floor adds. Measured on bare feet on a wood floor (the thud is a damped note near 140-280 Hz that has fallen 20 dB in about
// 15 ms, with the skin's slap above it) and on bare feet on gravel (a spread of sharp grains, 3.4 kHz at the centre, over a fifth of a second, 19 dB louder
// and quieter from grain to grain). A pure plan, so it can be tested without a browser; the engine plays it.

import type { Surface } from './director';

export type Rng = () => number;

/** One sound within a step: a damped thud (a note falling away), a burst of filtered noise, or a small bubble. */
export interface Hit {
  /** Seconds after the step begins. */
  dt: number;
  kind: 'thud' | 'noise' | 'bubble';
  /** Hz: the note's pitch, the noise's centre, or the bubble's pitch. */
  f: number;
  /** Seconds for it to fall away (a thud falls 20 dB in about 2.3 of them). */
  tau: number;
  gain: number;
  /** Filter Q for noise; ignored otherwise. */
  q?: number;
}

const between = (r: Rng, lo: number, hi: number): number => lo + r() * (hi - lo);
const logBetween = (r: Rng, lo: number, hi: number): number => lo * Math.pow(hi / lo, r());
/** A level that varies from step to step: about ±spread/2 dB, as a gain. */
const wobble = (r: Rng, spreadDb: number): number => Math.pow(10, (r() - 0.5) * spreadDb / 20);

/** A heel and then a toe, as a person walks: the heel lands harder and lower, the toe lighter and brighter, about a tenth of a second behind. */
function foot(r: Rng, o: { thud: [number, number]; thudGain: number; slapHz: [number, number]; slapGain: number; slapTau: number; toeAfter: [number, number] }): Hit[] {
  const heel = wobble(r, 8), toe = wobble(r, 8) * 0.55;
  const f = logBetween(r, o.thud[0], o.thud[1]);
  return [
    { dt: 0, kind: 'thud', f, tau: between(r, 0.007, 0.012), gain: o.thudGain * heel },
    { dt: 0, kind: 'noise', f: logBetween(r, o.slapHz[0], o.slapHz[1]), tau: o.slapTau, gain: o.slapGain * heel, q: 0.8 },
    ...(() => { const d = between(r, o.toeAfter[0], o.toeAfter[1]); return [
      { dt: d, kind: 'thud' as const, f: f * 1.25, tau: between(r, 0.005, 0.009), gain: o.thudGain * toe * 0.7 },
      { dt: d, kind: 'noise' as const, f: logBetween(r, o.slapHz[0], o.slapHz[1]) * 1.15, tau: o.slapTau * 0.8, gain: o.slapGain * toe, q: 0.8 },
    ]; })(),
  ];
}

export function stepPlan(surface: Surface, r: Rng = Math.random): Hit[] {
  switch (surface) {
    case 'marble': // dry stone: no give, so a firm thud and a clear slap; the room does the rest
      return foot(r, { thud: [230, 460], thudGain: 0.1, slapHz: [1300, 3600], slapGain: 0.24, slapTau: 0.006, toeAfter: [0.07, 0.12] });
    case 'wet': { // a film of water: the slap is damped and duller, and the skin leaves a small wet sound and a bubble or two
      const hits = foot(r, { thud: [170, 340], thudGain: 0.13, slapHz: [800, 2300], slapGain: 0.22, slapTau: 0.011, toeAfter: [0.07, 0.12] });
      hits.push({ dt: between(r, 0.01, 0.03), kind: 'noise', f: logBetween(r, 2200, 4200), tau: between(r, 0.03, 0.06), gain: 0.07 * wobble(r, 10), q: 0.6 });
      for (let i = 0, n = r() < 0.55 ? 1 + Math.floor(r() * 2) : 0; i < n; i++) hits.push({ dt: between(r, 0.02, 0.14), kind: 'bubble', f: logBetween(r, 900, 3200), tau: 0.012, gain: 0.05 * wobble(r, 10) });
      return hits;
    }
    case 'shallow': { // water over the foot: a splash, longer and wetter, and bubbles
      const hits: Hit[] = [
        { dt: 0, kind: 'thud', f: between(r, 100, 200), tau: between(r, 0.02, 0.035), gain: 0.2 * wobble(r, 8) },
        { dt: 0, kind: 'noise', f: logBetween(r, 500, 1000), tau: between(r, 0.06, 0.1), gain: 0.28 * wobble(r, 8), q: 0.5 },
        { dt: 0.01, kind: 'noise', f: logBetween(r, 2000, 4200), tau: between(r, 0.08, 0.16), gain: 0.14 * wobble(r, 10), q: 0.5 },
      ];
      for (let i = 0, n = 2 + Math.floor(r() * 4); i < n; i++) hits.push({ dt: between(r, 0.01, 0.22), kind: 'bubble', f: logBetween(r, 700, 3400), tau: between(r, 0.01, 0.02), gain: 0.07 * wobble(r, 12) });
      return hits;
    }
    case 'rubble': { // loose stones: a soft thud (the stones give), and a crowd of grains over about a fifth of a second, from sharp to dull
      const hits: Hit[] = [{ dt: 0, kind: 'thud', f: between(r, 220, 380), tau: 0.009, gain: 0.012 * wobble(r, 8) }];
      for (let i = 0, n = 16 + Math.floor(r() * 14); i < n; i++) {
        const u = Math.pow(r(), 1.5); // grains crowd at the start and thin out
        hits.push({ dt: u * 0.34, kind: 'noise', f: logBetween(r, 1600, 6000), tau: between(r, 0.008, 0.024), gain: 0.28 * wobble(r, 19) * (1 - 0.5 * u), q: between(r, 1.2, 3) });
      }
      return hits;
    }
  }
}
