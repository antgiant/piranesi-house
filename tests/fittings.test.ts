import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// The House has doorways (frames and jambs, no leaves) and windows that are open apertures (no glass, panes, shutters or hinges): canon W-015, W-016,
// design/doors-and-windows.md. Nothing the game says or sounds may invent a fitting the book does not have. These words are not allowed in what is
// written for the player; the carved door-shapes of the "blind doors" flourish, which are stone and say so, are the one exception.

const FILES = ['src/world/architecture.ts', 'src/game/narrator.ts', 'src/game/nature.ts', 'src/game/mutter.ts', 'src/game/relics.ts', 'src/world/relics.ts'];
const BANNED = /\b(panes?|stained|glazed|shutters?|keyholes?|latch(es)?|doorknobs?|ajar|slam(s|med|ming)?|creak(s|ed|ing)?)\b|\b(doors?|windows?)\b[^.'"]{0,24}\brattl|\brattl[^.'"]{0,24}\b(doors?|windows?)\b|\bglass\b|\b(shut|closed|locked|bolted)\b[^.'"]{0,24}\bdoors?\b|\bdoors?\b[^.'"]{0,24}\b(shut|closed|locked|bolted|ajar)\b/i;

describe('no fittings the book does not have', () => {
  for (const f of FILES) {
    it(`${f} has no glass, panes, shutters, latches or closing doors`, () => {
      let src: string;
      try { src = readFileSync(f, 'utf8'); } catch { return; }
      const bad = src.split('\n').filter((l) => !/^\s*\/\//.test(l) && !/carved|in the solid stone/.test(l) && BANNED.test(l));
      expect(bad).toEqual([]);
    });
  }
});
