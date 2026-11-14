import { describe, expect, it } from 'vitest';
import { speciesFor } from '../src/audio/engine';

describe('bird calls by situation', () => {
  it('gives each situation its own voices, not one chirp for everything', () => {
    const all = new Set<string>();
    for (const m of ['murmuration', 'roosting', 'sheltering', 'foraging', 'soaring', 'shore', 'nesting', 'noisy', 'chick'] as const) for (const s of speciesFor(m)) all.add(s);
    // only the book's birds: gulls, an albatross, rooks, sparrows, a blackbird after rain, a rare owl; no swifts, waders, geese, doves or starlings
    expect([...all].sort()).toEqual(['albatross', 'blackbird', 'gull', 'owl', 'rook', 'sparrow']);
    expect(speciesFor('soaring')).toEqual(['gull']);
    expect(speciesFor('shore')).toContain('gull');
    expect(speciesFor('foraging')).not.toContain('blackbird');
    expect(speciesFor('sheltering')).toContain('blackbird');
    expect(speciesFor('roosting')).toContain('owl');
    expect(speciesFor('nesting')).toEqual(['gull']);
    expect(speciesFor('noisy')).toEqual(['rook']);
    expect(speciesFor('silent')).toEqual([]);
  });
  it('has only the owl for the roosting birds (asleep; the engine lets it call one time in eight), and no synthetic rustle or flock noise anywhere', () => {
    expect(speciesFor('roosting')).toEqual(['owl']);
    for (const m of ['murmuration', 'roosting', 'sheltering', 'foraging', 'soaring', 'shore', 'nesting', 'noisy', 'chick', 'hunted'] as const) { expect(speciesFor(m)).not.toContain('rustle'); expect(speciesFor(m)).not.toContain('flock'); }
  });
});
