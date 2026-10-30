import { describe, expect, it } from 'vitest';
import { look, newGame, step } from '../src/game/game';
import { chooseWander, dwellMs } from '../src/game/wander';
import { Rng } from '../src/world/rng';

const NOW = Date.UTC(2026, 5, 10, 9, 0);

describe('wander', () => {
  it('only ever chooses commands the game accepts, for a long walk, and keeps moving', () => {
    const g = newGame({ walkPace: Infinity }, NOW);
    const rng = new Rng(7);
    const rand = (): number => rng.u32() / 4294967296;
    const visited = new Set<string>();
    for (let i = 0; i < 300; i++) {
      look(g, NOW);
      const cmd = chooseWander(g, rand);
      expect(cmd).toMatch(/^(look|listen|up|down|go \d+|examine \d+)$/);
      const out = step(g, cmd, NOW).map((l) => l.text).join(' ');
      expect(out).not.toMatch(/not sure what that means|There is no way out numbered|Look around first/);
      visited.add(`${g.pos.x},${g.pos.y},${g.pos.level}`);
    }
    expect(visited.size).toBeGreaterThan(40);
  });
  it('is the same walk for the same random source', () => {
    const run = (): string[] => {
      const g = newGame({ walkPace: Infinity }, NOW);
      const r = new Rng(3);
      const out: string[] = [];
      for (let i = 0; i < 40; i++) { look(g, NOW); const c = chooseWander(g, () => r.u32() / 4294967296); out.push(c); step(g, c, NOW); }
      return out;
    };
    expect(run()).toEqual(run());
  });
  it('stays longer on a longer description, within bounds', () => {
    expect(dwellMs(100)).toBeLessThan(dwellMs(900));
    expect(dwellMs(0)).toBeGreaterThanOrEqual(6000);
    expect(dwellMs(1e6)).toBeLessThanOrEqual(40000);
  });
});
