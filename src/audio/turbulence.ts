// How turbulent running water is, and what that does to the sound (design/turbulence.md).
//
// Small flows are smooth: single drops and bubbles come one at a time and each can be heard. As the water gets faster and deeper it breaks up: the surface
// folds over, air is dragged in at every riffle, and bubbles of every size form faster than the ear can separate them, so the single events merge into a
// continuous roar. Past a critical flow more water is hardly louder, only deeper (the 7 waterfalls measured by Galbrun et al. stopped getting louder
// past a critical discharge). So the control is not "amount" but a turbulence, which rises from nothing to one across a threshold, and which says how much of
// the sound is a roar and how much is still single events.

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
export const smooth = (x: number, lo: number, hi: number): number => { const u = clamp((x - lo) / (hi - lo), 0, 1); return u * u * (3 - 2 * u); };

/** Flow (1 = an ordinary day for this water) at which a stream's surface starts to break up, and at which it is fully white. */
export const STREAM_TURBULENCE: readonly [number, number] = [0.4, 2.0];
/** The same for a fall: its jet breaks up, and the plunge pool churns. */
export const FALL_TURBULENCE: readonly [number, number] = [0.45, 1.3];

export type Kind = 'stream' | 'fall';

/** 0 = smooth (every drop audible) .. 1 = fully turbulent (a continuous roar). */
export function turbulence(flow: number, kind: Kind): number {
  const [lo, hi] = kind === 'stream' ? STREAM_TURBULENCE : FALL_TURBULENCE;
  return smooth(flow, lo, hi);
}

/** The share of single drops, plops and bubbles still to be heard (the rest is buried in the roar). */
export function discreteShare(turb: number): number {
  return 1 - 0.97 * Math.pow(smooth(turb, 0.15, 0.65), 0.8);
}

/** Loudness grows with flow, then flattens: past the critical flow it is mostly deeper, not louder. */
export function loudness(flow: number): number {
  const f = Math.max(flow, 0.05), knee = 1.2;
  return f <= knee ? Math.pow(f, 0.8) : Math.pow(knee, 0.8) * Math.pow(f / knee, 0.25);
}

/** What makes a river and not just whitewater: depth and breadth. 0 below a flow of about 1.2, 1 from about 2.4 (a fast stream is broken water; a river is deep as well). */
export function depth(flow: number): number { return smooth(flow, 1.2, 2.4); }
