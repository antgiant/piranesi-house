import { describe, expect, it } from 'vitest';
import { speciesFor } from '../src/audio/engine';

describe('bird calls by situation', () => {
  it('gives each situation its own voices, not one chirp for everything', () => {
    const all = new Set<string>();
    for (const m of ['murmuration', 'roosting', 'sheltering', 'foraging', 'soaring', 'shore', 'nesting', 'noisy', 'chick'] as const) for (const s of speciesFor(m)) all.add(s);
    expect(all.size).toBeGreaterThanOrEqual(11);
    expect(speciesFor('soaring')).toContain('swift');
    expect(speciesFor('soaring')).toContain('gull');
    expect(speciesFor('shore')).toContain('wader');
    expect(speciesFor('foraging')).toContain('blackbird');
    expect(speciesFor('foraging')).toContain('dove');
    expect(speciesFor('roosting')).toContain('owl');
    expect(speciesFor('murmuration')).toContain('starling');
    expect(speciesFor('nesting')).toEqual(['gull']);
    expect(speciesFor('noisy')).toEqual(['rook']);
    expect(speciesFor('silent')).toEqual([]);
  });
  it('keeps the owl rare: one call in eight at most when roosting', () => {
    const r = speciesFor('roosting');
    expect(r.filter((s) => s === 'owl').length / r.length).toBeLessThanOrEqual(0.125);
  });
});
