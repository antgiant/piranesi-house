// A bare footstep on each kind of floor (design/steps.md).
//
// What a footstep is, from research and from recordings. The physical models of walking sound (Cook's physically informed stochastic models; Nordahl, Serafin, Turchet
// and Fontana's) treat a step as an exciter (the ground reaction force of the foot) driving the floor: a short impact as the heel lands, then a rolling contact of the
// foot, rough skin on rough stone, which makes a quiet continuous noise while the force lasts, and a push-off. The ground reaction force of a walking step has two humps
// (the heel strike and the push-off) over a stance phase of about 0.6 s, but only the first is a sound: the rest is a soft friction. Measured on ten recordings of
// bare feet (design/steps.md, scripts/audition/stepspec.py averages every step in a recording): there is ONE impact, a click of a few milliseconds across all
// frequencies up to 10 kHz, then a low body (under about 500 Hz) that falls 15 dB in 40 ms and lasts a hundred milliseconds more, the mid and high frequencies fall 20 dB
// within 20 ms, and nothing like a second tap a tenth of a second later. (An earlier version made a heel and a toe, two clacks: that is what a heeled shoe sounds like.)
// A pure plan, so it can be tested without a browser; the engine plays it.

import type { Surface } from './director';

export type Rng = () => number;

/** One sound within a step: a damped note, a burst of noise through a filter (band, low or high pass), or a small bubble. */
export interface Hit {
  /** Seconds after the step begins. */
  dt: number;
  kind: 'thud' | 'noise' | 'bubble';
  /** Hz: the note's pitch, the noise filter's centre or cut-off, or the bubble's pitch. */
  f: number;
  /** Seconds for it to fall away (a thud falls 20 dB in about 2.3 of them). */
  tau: number;
  gain: number;
  /** Filter Q for noise; ignored otherwise. */
  q?: number;
  /** Which filter shapes the noise (default a band-pass). */
  type?: 'bandpass' | 'lowpass' | 'highpass';
  /** Seconds to rise to full level (default almost at once: an impact). */
  attack?: number;
}

/** The level of a foot on a hard floor, so that a step on stone is as present as one in water or on gravel (their sounds are spread over more time, so carry more energy for the same peak). */
const LOUD = 0.9;
const between = (r: Rng, lo: number, hi: number): number => lo + r() * (hi - lo);
const logBetween = (r: Rng, lo: number, hi: number): number => lo * Math.pow(hi / lo, r());
/** A level that varies from step to step: about ±spread/2 dB, as a gain. */
const wobble = (r: Rng, spreadDb: number): number => Math.pow(10, (r() - 0.5) * spreadDb / 20);

/**
 * One footfall on a hard floor: the impact click (broad, a few milliseconds), the low body of the heel and the floor under it, a mid slap of the sole, and the foot
 * rolling over the stone, a faint noise that swells and fades over a tenth of a second or two. No toe tap.
 */
function foot(r: Rng, o: { click: number; clickHz: [number, number]; body: number; bodyHz: [number, number]; bodyTau: [number, number]; thud: number; slap: number; slapHz: [number, number]; slapTau: number; roll: number }): Hit[] {
  const w = wobble(r, 8) * LOUD;
  const hits: Hit[] = [
    { dt: 0, kind: 'noise', type: 'bandpass', f: logBetween(r, o.clickHz[0], o.clickHz[1]), q: 0.3, tau: between(r, 0.0018, 0.003), gain: o.click * w },
    { dt: 0, kind: 'noise', type: 'lowpass', f: logBetween(r, o.bodyHz[0], o.bodyHz[1]), q: 0.5, tau: between(r, o.bodyTau[0], o.bodyTau[1]), gain: o.body * w, attack: 0.002 },
    { dt: 0, kind: 'thud', f: logBetween(r, 70, 130), tau: between(r, 0.015, 0.025), gain: o.thud * w },
    { dt: 0, kind: 'noise', type: 'bandpass', f: logBetween(r, o.slapHz[0], o.slapHz[1]), q: 0.5, tau: o.slapTau, gain: o.slap * w },
  ];
  if (o.roll > 0) hits.push({ dt: between(r, 0.015, 0.05), kind: 'noise', type: 'bandpass', f: logBetween(r, 500, 1500), q: 0.4, tau: between(r, 0.05, 0.1), gain: o.roll * w * wobble(r, 10), attack: between(r, 0.03, 0.06) });
  return hits;
}

/** `side` is -1 for the left foot and 1 for the right: the two are never quite alike (the pitch of the body of the step differs by a few per cent, and one lands a little harder). */
export function stepPlan(surface: Surface, r: Rng = Math.random, side: -1 | 1 = 1): Hit[] {
  const hits = plan(surface, r);
  for (const h of hits) { if (h.type === 'lowpass' || h.kind === 'thud') h.f *= 1 + 0.07 * side; h.gain *= side > 0 ? 1.06 : 0.94; }
  return hits;
}

function plan(surface: Surface, r: Rng): Hit[] {
  switch (surface) {
    case 'marble': // dry stone: no give, so a sharp click, a low body and a quick slap; the room does the rest
      return foot(r, { click: 0.8, clickHz: [3000, 8000], body: 0.5, bodyHz: [350, 600], bodyTau: [0.02, 0.032], thud: 0.025, slap: 0.12, slapHz: [900, 2300], slapTau: 0.005, roll: 0.03 });
    case 'wet': { // a film of water: the click is smothered, the slap dull, the body the same; and the foot leaves a small wet sound and a bubble or two
      const hits = foot(r, { click: 0.07, clickHz: [2500, 5000], body: 0.5, bodyHz: [300, 500], bodyTau: [0.022, 0.034], thud: 0.02, slap: 0.12, slapHz: [700, 1800], slapTau: 0.01, roll: 0.05 });
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
