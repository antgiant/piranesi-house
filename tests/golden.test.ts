// Golden snapshot: if this fails you changed the world. If that was deliberate, bump WORLD_VERSION in
// src/world/world.ts and update the snapshot (vitest -u). If it was not deliberate, you broke determinism.
import { describe, expect, it } from 'vitest';
import { WORLD_VERSION, createWorld } from '../src/world/world';
import { getHall } from '../src/world/hall';
import type { Level } from '../src/world/layout';
import { hallStatues } from '../src/world/slots';
import { describeStatue } from '../src/world/statues';
import { strHash } from '../src/world/rng';

const CELLS: [number, number, Level][] = [
  [0, 0, 1], [-1, 0, 1], [-2, 1, 1], [0, 5, 1], [2, 2, 1], [-4, 0, 1], [6, 0, 1], [-192, 0, 1],
  [-10, -50, 1], [19, 0, 2], [12, -7, 1], [-33, 41, 0], [-6, 6, 1], [-88, 0, 1],
  [-6, 7, 1], [-6, 8, 1], [-5, -4, 1], [1, -2, 1],
];

describe('golden snapshot', () => {
  const w = createWorld('the-house');
  it('world version', () => expect(WORLD_VERSION).toBe(7));
  it.each(CELLS)('hall %i,%i level %i', (x, y, l) => {
    const h = getHall(w, x, y, l);
    const st = hallStatues(w, h);
    const digest = strHash(st.map((s) => `${s.id}=${describeStatue(h, s)}`).join('\n'));
    expect({
      name: h.name, kind: h.kind, size: [h.xExtent, h.yExtent, h.heightM], orientation: h.orientation,
      mood: h.mood, theme: h.theme, sizeClass: h.sizeClass, slots: h.slotCount, statues: st.length,
      doors: [h.doors.N.length, h.doors.E.length, h.doors.S.length, h.doors.W.length], tags: h.tags, digest,
      sample: st.filter((s) => !s.canonId).slice(0, 2).map((s) => describeStatue(h, s)),
    }).toMatchSnapshot();
  });
});
