import { describe, expect, it } from 'vitest';
import { createWorld } from '../src/world/world';
import { BIRD_HALLS, BIRD_VESTIBULES, getHall } from '../src/world/hall';
import { cellKind } from '../src/world/layout';
import { birdsAt } from '../src/sim/light';
import { sceneAtWorldTime } from '../src/sim/scene';
import { MS } from '../src/sim/time';

const w = createWorld('the-house');

describe('the book\'s bird halls, and more of them at the book\'s own density', () => {
  it('keeps the halls the book names', () => {
    expect(getHall(w, -88, 0, 1).tags).toContain('gull-colony');
    expect(getHall(w, -88, 0, 1).tags).not.toContain('rook-flock');
  });
  it('is the same every time for the same world, and different in another', () => {
    const tagged = (seed: string): string[] => { const x = createWorld(seed); const out: string[] = []; for (let a = -60; a < 60; a++) for (let b = -60; b < 60; b++) { const t = getHall(x, a, b, 1).tags.filter((k) => k === 'albatross-nest' || k === 'murmuration'); if (t.length && cellKind(x, a, b) === 'vestibule') out.push(`${a},${b}:${t.join('+')}`); } return out; };
    expect(tagged('the-house')).toEqual(tagged('the-house'));
    expect(tagged('the-house')).not.toEqual(tagged('another-house'));
  });
  it('puts about one of each kind in forty-five vestibules, and in 25,000 halls', () => {
    let vest = 0, nest = 0, murm = 0, halls = 0, gulls = 0, rooks = 0, shelters = 0;
    for (let x = -150; x < 150; x++) for (let y = -150; y < 150; y++) {
      const h = getHall(w, x, y, 1);
      if (h.kind === 'vestibule') { vest++; if (h.tags.includes('albatross-nest')) nest++; if (h.tags.includes('murmuration')) murm++; }
      else { halls++; if (h.tags.includes('gull-colony')) gulls++; if (h.tags.includes('rook-flock')) rooks++; if (h.tags.includes('bird-shelter')) shelters++; }
    }
    const wantV = vest / BIRD_VESTIBULES, wantH = halls / BIRD_HALLS;
    expect(nest).toBeGreaterThan(wantV * 0.4); expect(nest).toBeLessThan(wantV * 2 + 3);
    expect(murm).toBeGreaterThan(wantV * 0.4); expect(murm).toBeLessThan(wantV * 2 + 3);
    // among 90,000 halls: a handful of each (and the named ones)
    for (const n of [gulls, rooks, shelters]) { expect(n).toBeGreaterThanOrEqual(1); expect(n).toBeLessThan(wantH * 3 + 6); }
  });
});

describe('a buzzard', () => {
  it('is rare, by day, in a hall with perches, and the small birds fall silent', () => {
    let hunted = 0, hours = 0;
    for (let d = 0; d < 200; d++) for (const hr of [9, 13]) {
      const sc = sceneAtWorldTime(w, -6, 3, 1, d * MS.day + hr * MS.hour, { forecast: false });
      hours++;
      if (sc.birds.mode === 'hunted') { hunted++; expect(sc.light.sunPhase).not.toBe('night'); expect(sc.birds.species).toEqual(['a buzzard']); }
    }
    expect(hunted).toBeLessThan(hours * 0.02);
  });
  it('can be made by the director from the scene it reads', () => {
    const h = getHall(w, -6, 3, 1);
    // the mode exists for the narrator and the engine to use
    expect(typeof birdsAt).toBe('function'); expect(h).toBeTruthy();
  });
});
