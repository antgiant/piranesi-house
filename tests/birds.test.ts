import { describe, expect, it } from 'vitest';
import { speciesFor } from '../src/audio/engine';

describe('bird calls by situation', () => {
  it('gives each situation its own voices, not one chirp for everything', () => {
    const all = new Set<string>();
    for (const m of ['murmuration', 'roosting', 'sheltering', 'foraging', 'soaring', 'shore', 'nesting', 'noisy', 'chick'] as const) for (const s of speciesFor(m)) all.add(s);
    // only the book's birds: gulls, an albatross, rooks, sparrows, a blackbird after rain, a rare owl; no swifts, waders, geese, doves or starlings
    expect([...all].sort()).toEqual(['albatross', 'blackbird', 'flock', 'gull', 'owl', 'rook', 'rustle', 'sparrow']);
    expect(speciesFor('soaring')).toEqual(['gull']);
    expect(speciesFor('shore')).toContain('gull');
    expect(speciesFor('foraging')).not.toContain('blackbird');
    expect(speciesFor('sheltering')).toContain('blackbird');
    expect(speciesFor('roosting')).toContain('owl');
    expect(speciesFor('nesting')).toEqual(['gull']);
    expect(speciesFor('noisy')).toEqual(['rook']);
    expect(speciesFor('silent')).toEqual([]);
  });
  it('keeps the owl rare: one call in eight at most when roosting', () => {
    const r = speciesFor('roosting');
    expect(r.filter((s) => s === 'owl').length / r.length).toBeLessThanOrEqual(0.125);
  });
});
