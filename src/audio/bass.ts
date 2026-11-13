// Deep bass. The House has real sound below 100 Hz (the sea, the tide's boom, thunder), some of it below 20 Hz, and it is meant to be
// heard: on headphones and full-range systems it is the weight under everything. So the mix always has it, a little more of it than the
// raw levels give. (A setting that cut it for small speakers was tried and dropped: it did not give more headroom, because the loudest
// peaks of the sea are not sub-bass; its only use was keeping tiny drivers from buzzing, which could not be measured. Small speakers
// simply drop what they cannot play.) Pure data, so it can be tested without any audio.

export interface BassShape {
  /** A high-pass for the whole mix. At 12 Hz it only keeps inaudible, speaker-straining rumble out. */
  highpassHz: number;
  /** A low shelf (below about 60 Hz), in dB. */
  shelfDb: number;
  /** Overall gain after the shelf, so that boosting the bass does not also push the loudest peaks toward clipping. */
  trim: number;
  /** How hard a wave's low thump is struck (1 would be the plain level). */
  thump: number;
}

const TRIM_DB = -1.5;

/** Measured on the new sea: the bottom two octaves rise 1.5 to 2.4 dB, the mids fall 1.5 dB, and the peaks do not grow. */
export const DEEP_BASS: BassShape = { highpassHz: 12, shelfDb: 4, trim: Math.pow(10, TRIM_DB / 20), thump: 1.4 };
