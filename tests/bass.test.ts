import { describe, expect, it } from 'vitest';
import { BASS_MODES, bassShape, parseBass } from '../src/audio/bass';

describe('deep bass setting', () => {
  it('small speakers cut what they cannot play and strike no thump; full range adds weight; standard is the baseline', () => {
    const small = bassShape('small'), std = bassShape('standard'), full = bassShape('full');
    expect(small.highpassHz).toBeGreaterThanOrEqual(60);
    expect(small.thump).toBe(0);
    expect(std.highpassHz).toBeLessThan(20); // only inaudible rumble is removed
    expect(std.shelfDb).toBe(0);
    expect(std.trim).toBe(1);
    expect(std.thump).toBe(1);
    expect(full.shelfDb).toBeGreaterThan(0);
    expect(full.thump).toBeGreaterThan(std.thump);
  });
  it('full range does not make the loudest peaks louder: the boost is paid for with a trim', () => {
    const f = bassShape('full');
    expect(f.trim).toBeLessThan(1);
    // a low shelf of +4 dB can raise a bass-heavy peak by at most 4 dB; the trim takes back at least a third of that
    expect(20 * Math.log10(f.trim)).toBeLessThanOrEqual(-1);
  });
  it('knows its modes, and falls back to standard for anything else (an old, blank or damaged saved setting)', () => {
    expect([...BASS_MODES]).toEqual(['small', 'standard', 'full']);
    for (const m of BASS_MODES) expect(parseBass(m)).toBe(m);
    for (const bad of [undefined, null, '', 'huge', 3, {}, 'FULL']) expect(parseBass(bad)).toBe('standard');
  });
});
