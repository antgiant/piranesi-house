import { describe, expect, it } from 'vitest';
import { look, newGame, step } from '../src/game/game';
import { chooseWander } from '../src/game/wander';
import { Rng } from '../src/world/rng';

const NOW = Date.UTC(2026, 5, 10, 9, 0);

describe('a long wander does not say the same things over and over', () => {
  it('rarely repeats a sentence from one glance to the next, and uses many different sentences', () => {
    const g = newGame({ walkPace: Infinity, walkNarration: true, relicDensity: 1 }, NOW);
    const r = new Rng(5);
    const rand = (): number => r.u32() / 4294967296;
    let t = NOW;
    let prev = new Set<string>();
    let glances = 0, consecutive = 0;
    const freq = new Map<string, number>();
    const take = (text: string): void => {
      const cur = new Set<string>();
      for (const s of text.split(/(?<=[.!?])\s+/)) {
        const k = s.trim();
        if (k.length < 25 || /^Doors lead|^A great staircase/.test(k)) continue;
        cur.add(k);
        freq.set(k, (freq.get(k) ?? 0) + 1);
        if (prev.has(k)) consecutive++;
      }
      prev = cur;
    };
    take(look(g, t).map((l) => l.text).join('\n'));
    for (let i = 0; i < 600; i++) {
      t += 20 * 60_000;
      take(step(g, chooseWander(g, rand), t).map((l) => l.text).join('\n'));
      glances++;
    }
    // before this was tuned, about three in four glances repeated something from the one before
    expect(consecutive / glances).toBeLessThan(0.3);
    expect(freq.size).toBeGreaterThan(1500);
    const worst = Math.max(...[...freq.values()]);
    expect(worst).toBeLessThan(glances * 0.2);
  });
});
