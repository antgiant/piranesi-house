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

/** The level of a foot on a hard floor, so that a step on stone is as present as one in water or on gravel (their sounds are spread over more time, so carry more energy for the same peak). */
const LOUD = 3;
const between = (r: Rng, lo: number, hi: number): number => lo + r() * (hi - lo);
const logBetween = (r: Rng, lo: number, hi: number): number => lo * Math.pow(hi / lo, r());
/** A level that varies from step to step: about ±spread/2 dB, as a gain. */
const wobble = (r: Rng, spreadDb: number): number => Math.pow(10, (r() - 0.5) * spreadDb / 20);

/**
 * A heel and then a toe, as a person walks: the heel lands harder and lower, the toe lighter and brighter, about a tenth of a second behind. Each is a low thud
 * (the foot itself), a mid slap (the sole) and a brief bright patter of skin; on the hard floors measured (tile, ceramic, concrete, paving) one footfall is
 * about 6-8 dB up at 62-125 Hz, flat through the middle, and 3-5 dB up at 4-8 kHz.
 */
function foot(r: Rng, o: { thud: [number, number]; thudGain: number; slapHz: [number, number]; slapGain: number; slapTau: number; skinGain: number; toeAfter: [number, number] }): Hit[] {
  const heel = wobble(r, 8) * LOUD, toe = wobble(r, 8) * 0.55 * LOUD;
  const f = logBetween(r, o.thud[0], o.thud[1]);
  const d = between(r, o.toeAfter[0], o.toeAfter[1]);
  const one = (dt: number, k: number, fk: number): Hit[] => [
    { dt, kind: 'thud', f: f * fk, tau: between(r, 0.008, 0.013), gain: o.thudGain * k },
    { dt, kind: 'noise', f: logBetween(r, o.slapHz[0], o.slapHz[1]) * fk, tau: o.slapTau, gain: o.slapGain * k, q: 0.6 },
    { dt, kind: 'noise', f: logBetween(r, 4500, 9000), tau: 0.004, gain: o.skinGain * k, q: 0.5 },
    { dt, kind: 'noise', f: logBetween(r, 220, 560), tau: 0.012, gain: o.slapGain * 0.7 * k, q: 0.5 }, // the body of the foot, below the slap
  ];
  return [...one(0, heel, 1), ...one(d, toe, 1.15)];
}

export function stepPlan(surface: Surface, r: Rng = Math.random): Hit[] {
  switch (surface) {
    case 'marble': // dry stone: no give, so a firm low thud, a clear slap and a brief patter of skin; the room does the rest
      return foot(r, { thud: [60, 120], thudGain: 0.02, slapHz: [350, 3200], slapGain: 0.17, slapTau: 0.006, skinGain: 0.26, toeAfter: [0.07, 0.12] });
    case 'wet': { // a film of water: the slap is damped and dull and lasts longer, the skin patter is gone, and the foot leaves a small wet sound and a bubble or two
      const hits = foot(r, { thud: [90, 190], thudGain: 0.016, slapHz: [900, 2200], slapGain: 0.16, slapTau: 0.012, skinGain: 0.04, toeAfter: [0.07, 0.12] });
      hits.push({ dt: between(r, 0.01, 0.03), kind: 'noise', f: logBetween(r, 2200, 4200), tau: between(r, 0.03, 0.06), gain: 0.07 * wobble(r, 10), q: 0.6 });
      for (let i = 0, n = r() < 0.55 ? 1 + Math.floor(r() * 2) : 0; i < n; i++) hits.push({ dt: between(r, 0.02, 0.14), kind: 'bubble', f: logBetween(r, 900, 3200), tau: 0.012, gain: 0.05 * wobble(r, 10) });
      return hits;
    }
    case 'shallow': { // water over the foot (measured wading through puddles and creeks): no thud to speak of, a broad splash that peaks near 1 kHz and falls for a fifth of a second or more, and bubbles
      const hits: Hit[] = [
        { dt: 0, kind: 'noise', f: logBetween(r, 600, 1300), tau: between(r, 0.11, 0.19), gain: 0.3 * wobble(r, 10), q: 0.5 },
        { dt: 0, kind: 'noise', f: logBetween(r, 1800, 4200), tau: between(r, 0.07, 0.14), gain: 0.17 * wobble(r, 12), q: 0.5 },
        { dt: between(r, 0.03, 0.09), kind: 'noise', f: logBetween(r, 500, 1000), tau: between(r, 0.08, 0.14), gain: 0.14 * wobble(r, 12), q: 0.5 }, // the water falling back
      ];
      hits.push({ dt: 0.005, kind: 'noise', f: logBetween(r, 180, 420), tau: between(r, 0.06, 0.11), gain: 0.14 * wobble(r, 10), q: 0.5 }); // the low slosh of the water moving aside
      for (let i = 0, n = 3 + Math.floor(r() * 5); i < n; i++) hits.push({ dt: between(r, 0.01, 0.3), kind: 'bubble', f: logBetween(r, 500, 3400), tau: between(r, 0.01, 0.025), gain: 0.07 * wobble(r, 12) });
      return hits;
    }
    case 'snow': { // snow underfoot (measured in boots, so only the snow is taken): muffled, mostly below 500 Hz, nothing above 2 kHz to speak of, a soft crunch of small grains, no ring
      const hits: Hit[] = [
        { dt: 0, kind: 'thud', f: logBetween(r, 60, 150), tau: between(r, 0.009, 0.014), gain: 0.3 * wobble(r, 8) * LOUD * 0.27 },
        { dt: 0, kind: 'noise', f: logBetween(r, 130, 480), tau: between(r, 0.012, 0.02), gain: 0.6 * wobble(r, 8) * LOUD * 0.27, q: 0.5 },
        { dt: 0.06, kind: 'noise', f: logBetween(r, 150, 500), tau: 0.012, gain: 0.25 * wobble(r, 8) * LOUD * 0.27, q: 0.5 },
      ];
      for (let i = 0, n = 8 + Math.floor(r() * 8); i < n; i++) hits.push({ dt: Math.pow(r(), 1.4) * 0.16, kind: 'noise', f: logBetween(r, 300, 1100), tau: between(r, 0.006, 0.016), gain: 0.12 * wobble(r, 14) * LOUD * 0.27, q: between(r, 0.8, 1.6) });
      return hits;
    }
    case 'rubble': { // loose stones: a soft thud (the stones give), and a crowd of grains over about a fifth of a second, from sharp to dull
      const hits: Hit[] = [{ dt: 0, kind: 'thud', f: between(r, 220, 380), tau: 0.009, gain: 0.012 * wobble(r, 8) }];
      for (let i = 0, n = 16 + Math.floor(r() * 14); i < n; i++) {
        const u = Math.pow(r(), 1.5); // grains crowd at the start and thin out
        hits.push({ dt: u * 0.34, kind: 'noise', f: logBetween(r, 900, 5000), tau: between(r, 0.008, 0.024), gain: 0.28 * wobble(r, 19) * (1 - 0.5 * u), q: between(r, 0.9, 2) });
      }
      return hits;
    }
  }
}
