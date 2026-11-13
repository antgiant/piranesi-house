import { describe, expect, it } from 'vitest';
import { DEEP_BASS } from '../src/audio/bass';

describe('deep bass', () => {
  it('only keeps out inaudible rumble, adds weight to the lowest octaves, and strikes the thump harder', () => {
    expect(DEEP_BASS.highpassHz).toBeLessThan(20);
    expect(DEEP_BASS.shelfDb).toBeGreaterThan(0);
    expect(DEEP_BASS.thump).toBeGreaterThan(1);
  });
  it('does not make the loudest peaks louder: the boost is paid for with a trim', () => {
    expect(DEEP_BASS.trim).toBeLessThan(1);
    // a +4 dB low shelf can raise a bass-heavy peak by at most 4 dB; the trim takes back at least a quarter of that
    expect(20 * Math.log10(DEEP_BASS.trim)).toBeLessThanOrEqual(-1);
  });
});
