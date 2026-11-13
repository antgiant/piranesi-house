// The deep-bass setting. The House has real sound below 100 Hz (the sea, the tide's boom, thunder), and some below 20 Hz. Phone and laptop
// speakers and most earbuds cannot reproduce it; they drop it, but it is the loudest part of the signal, so it wastes headroom and can make a
// small speaker buzz. Headphones and subwoofers reproduce it, and that is where it is best. A web page cannot tell which it is playing
// through, so it is a setting. Pure, so it can be tested without any audio.

export type BassMode = 'small' | 'standard' | 'full';

export const BASS_MODES: readonly BassMode[] = ['small', 'standard', 'full'];

export interface BassShape {
  /** A high-pass for the whole mix: 70 Hz cuts what small speakers cannot play; 12 Hz only keeps inaudible, speaker-straining rumble out. */
  highpassHz: number;
  /** A low shelf (below about 60 Hz), in dB. */
  shelfDb: number;
  /** Overall gain after the shelf, so that boosting the bass does not also push the loudest peaks into clipping. */
  trim: number;
  /** How hard a wave's low thump is struck, relative to standard (0 = none). */
  thump: number;
}

const FULL_TRIM_DB = -1.5;

export function bassShape(mode: BassMode): BassShape {
  switch (mode) {
    case 'small': return { highpassHz: 70, shelfDb: 0, trim: 1, thump: 0 };
    case 'full': return { highpassHz: 12, shelfDb: 4, trim: Math.pow(10, FULL_TRIM_DB / 20), thump: 1.4 };
    default: return { highpassHz: 12, shelfDb: 0, trim: 1, thump: 1 };
  }
}

/** Anything that is not a known mode (an old or damaged saved setting) is Standard. */
export function parseBass(v: unknown): BassMode {
  return v === 'small' || v === 'full' ? v : 'standard';
}
