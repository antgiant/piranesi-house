import { describe, expect, it } from 'vitest';
import { CORPUS, mutterAllowed, mutterDelayS, mutterLine } from '../src/game/mutter';
import { babbleLength, babblePlan } from '../src/audio/babble';
import { Rng } from '../src/world/rng';

const rng = (seed: number) => { const r = new Rng(seed); return (): number => r.u32() / 4294967296; };

describe('mutter text', () => {
  it('is short, uses only words from our own corpus, and is never empty', () => {
    const vocab = new Set(CORPUS.flatMap((l) => l.toLowerCase().split(/\s+/)));
    const r = rng(1);
    for (let i = 0; i < 2000; i++) {
      const line = mutterLine(r);
      const words = line.toLowerCase().replace(/[….]/g, '').split(/\s+/).filter(Boolean);
      expect(words.length).toBeGreaterThanOrEqual(3);
      expect(words.length).toBeLessThanOrEqual(9);
      for (const w of words) expect(vocab.has(w)).toBe(true);
    }
  });
  it('is varied and mostly not whole corpus lines', () => {
    const r = rng(2);
    const lines = new Set<string>();
    for (let i = 0; i < 500; i++) lines.add(mutterLine(r));
    expect(lines.size).toBeGreaterThan(300);
    const whole = [...lines].filter((l) => CORPUS.some((c) => c.toLowerCase() === l.toLowerCase().replace(/[….]$/, '')));
    expect(whole.length).toBeLessThan(lines.size * 0.3);
  });
  it('is rare', () => {
    const r = rng(3);
    for (let i = 0; i < 200; i++) { const d = mutterDelayS(r); expect(d).toBeGreaterThanOrEqual(75); expect(d).toBeLessThanOrEqual(300); }
  });
  it('keeps quiet during a tide, under water and in the dark', () => {
    const base = { hush: false, dark: false, tide: { kind: 'none' as const, gain: 0, character: null, strikeEverySec: 0 } };
    expect(mutterAllowed(base)).toBe(true);
    expect(mutterAllowed({ ...base, hush: true })).toBe(false);
    expect(mutterAllowed({ ...base, dark: true })).toBe(false);
    expect(mutterAllowed({ ...base, tide: { ...base.tide, kind: 'booming' } })).toBe(false);
    expect(mutterAllowed({ ...base, tide: { ...base.tide, kind: 'submerged' } })).toBe(false);
  });
});

describe('mutter sound plan', () => {
  it('is deterministic, follows the length of the words, and stays in a sensible range', () => {
    const a = babblePlan('The water is late today.');
    expect(babblePlan('The water is late today.')).toEqual(a);
    expect(babbleLength(babblePlan('one two three four five six seven eight'))).toBeGreaterThan(babbleLength(a));
    expect(babbleLength(a)).toBeGreaterThan(0.5);
    expect(babbleLength(a)).toBeLessThan(4);
    for (const e of a) { expect(e.t).toBeGreaterThanOrEqual(0); expect(e.level).toBeLessThanOrEqual(1); if (e.kind === 'vowel') expect(e.f0).toBeGreaterThan(70); }
    expect(babblePlan('')).toEqual([]);
  });
});
