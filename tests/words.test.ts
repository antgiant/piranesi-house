import { describe, expect, it } from 'vitest';
import { hallsInWords, journeyNote } from '../src/web/words';

describe('saying how many halls', () => {
  it('uses words, not numbers, and grows with the journey', () => {
    const cases: [number, string][] = [[0, 'no halls yet'], [1, 'one hall'], [2, 'two halls'], [4, 'a few halls'], [9, 'some halls'], [20, 'a good many halls'],
      [50, 'many halls'], [150, 'very many halls'], [600, 'a great many halls'], [5000, 'uncountably many halls']];
    for (const [n, w] of cases) expect(hallsInWords(n)).toBe(w);
    for (let n = 0; n < 3000; n++) expect(hallsInWords(n)).not.toMatch(/\d/);
  });
  it('writes the title note as a person would', () => {
    expect(journeyNote(1, 0)).toBe('Your journey is here: you remember visiting one hall.');
    expect(journeyNote(4, 0)).toBe('Your journey is here: you remember visiting a few halls.');
    expect(journeyNote(40, 3)).toBe('Your journey is here: you remember visiting many halls, and you have 3 entries in your journal.');
    expect(journeyNote(12, 1)).toBe('Your journey is here: you remember visiting some halls, and you have one entry in your journal.');
    expect(journeyNote(0, 2)).toContain('2 entries');
  });
});
