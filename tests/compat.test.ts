import { describe, expect, it } from 'vitest';
import { compatible, poseTraits, companionTraits, attributeTraits, POSE, COMP, ATTR } from '../src/data/compat';
import { POSES, POSES_DROWNED, ATTRIBUTES, COMPANIONS } from '../src/data/catalogue';
import { SUB_KINDS, listsFor } from '../src/data/sublists';
import { getHall } from '../src/world/hall';
import { generatedSlot } from '../src/world/statues';
import { createWorld } from '../src/world/world';
import { wallGrids } from '../src/world/hall';

describe('what can go with what on a statue', () => {
  it('knows the case that was reported: no lap for someone leaping, and no cat asleep in it', () => {
    expect(compatible('leaping from the plinth', 'with one sleeve rolled to the shoulder', 'a sleeping cat in the lap')).toBe(false);
    expect(compatible('seated on a heavy chair', 'with one sleeve rolled to the shoulder', 'a sleeping cat in the lap')).toBe(true);
    expect(compatible('standing at rest', 'with one sleeve rolled to the shoulder', 'a sleeping cat in the lap')).toBe(false);
    expect(poseTraits('seated with hands in the lap') & POSE.SEATED).toBeTruthy();
    expect(companionTraits('a sleeping cat in the lap') & COMP.LAP).toBeTruthy();
  });
  it('keeps full hands empty, free arms free, and the gentle out of a struggle', () => {
    expect(compatible('pulling against a rope', 'holding a pair of scales', 'alone')).toBe(false);
    expect(compatible('pulling against a rope', 'wearing a laurel crown', 'alone')).toBe(true);
    expect(compatible('standing at rest', 'holding an open book', 'alone')).toBe(true);
    expect(compatible('clapping hands overhead', 'carrying a lantern with no flame', 'alone')).toBe(false);
    expect(compatible('hauling a net', 'wearing a laurel crown', 'a hawk on the wrist')).toBe(false);
    expect(compatible('dragged away by the hair', 'wearing a laurel crown', 'a lamb at the side')).toBe(false);
    expect(compatible('leaping from the plinth', 'wearing a laurel crown', 'a small hound at the feet')).toBe(false);
    expect(attributeTraits('holding a mirror') & ATTR.HANDS).toBeTruthy();
    expect(attributeTraits('wearing a long hooded cloak')).toBe(0);
  });
  it('leaves plenty possible in every list, so a hall is never short', () => {
    const sets: (readonly [readonly string[], readonly string[], readonly string[]])[] = [[Object.values(POSES).flat(), [...ATTRIBUTES], [...COMPANIONS]], [[...POSES_DROWNED], [...ATTRIBUTES], [...COMPANIONS]]];
    for (const k of SUB_KINDS) { const l = listsFor(k); sets.push([l.poses, l.attributes, [...l.solitary, ...l.withs]]); }
    for (const [P, A, C] of sets) {
      let ok = 0, tot = 0;
      for (const p of P) for (const a of A) for (const c of C) { tot++; if (compatible(p, a, c)) ok++; }
      expect(ok / tot).toBeGreaterThan(0.4);
    }
  });
  it('is never broken by any statue the House makes', () => {
    const w = createWorld('the-house');
    let n = 0;
    for (let x = -6; x <= 6; x++) for (let y = -6; y <= 6; y++) for (const lvl of [0, 1, 2] as const) {
      const h = getHall(w, x, y, lvl);
      for (const g of wallGrids(h)) for (let tier = 0; tier < g.tiers; tier += 2) for (let slot = 0; slot < g.slots; slot += 5) {
        const s = generatedSlot(w, h, g.wall, tier, slot);
        if (s.kind !== 'statue') continue;
        n++;
        expect(compatible(s.statue.pose, s.statue.attribute, s.statue.companion), `${s.statue.figure}: ${s.statue.pose}, ${s.statue.attribute}, ${s.statue.companion}`).toBe(true);
      }
    }
    expect(n).toBeGreaterThan(5000);
  });
});

import { KIND_LISTS } from '../src/data/kindlists';
describe('the general animal list describes only what any animal has', () => {
  it('has no feathers, beaks, wings, scales, horns, manes, hooves or claws to hand out to every animal', () => {
    const words = /feather|beak|\bwings?\b|\bscales?\b|\bhorns?\b|\bmane\b|\bhoof\b|\bclaws?\b|single leg/i;
    for (const s of [...KIND_LISTS.animal.poses, ...KIND_LISTS.animal.attributes, ...KIND_LISTS.animal.solitary, ...KIND_LISTS.animal.withs]) expect(s, s).not.toMatch(words);
    expect(KIND_LISTS.animal.attributes.length).toBeGreaterThanOrEqual(24);
    expect(KIND_LISTS.animal.poses.length).toBeGreaterThanOrEqual(12);
  });
});
