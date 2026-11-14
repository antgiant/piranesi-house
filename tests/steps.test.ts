import { describe, expect, it } from 'vitest';
import { stepPlan } from '../src/audio/steps';
import type { Surface } from '../src/audio/director';

function seeded(seed: number): () => number { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
const SURFACES: Surface[] = ['marble', 'wet', 'shallow', 'rubble'];

describe('a bare footstep', () => {
  it('is made of a few sounds, none late, none silent, none out of the audible range', () => {
    for (const sf of SURFACES) for (let i = 0; i < 100; i++) {
      const plan = stepPlan(sf, seeded(i + 1));
      expect(plan.length).toBeGreaterThan(2);
      for (const h of plan) {
        expect(h.dt).toBeGreaterThanOrEqual(0); expect(h.dt).toBeLessThan(0.4);
        expect(h.gain).toBeGreaterThan(0); expect(h.gain).toBeLessThan(0.9);
        expect(h.f).toBeGreaterThan(60); expect(h.f).toBeLessThan(10000);
        expect(h.tau).toBeGreaterThan(0.002); expect(h.tau).toBeLessThan(0.3);
      }
    }
  });
  it('is a heel and then a toe on a hard floor, about a tenth of a second apart', () => {
    for (let i = 0; i < 50; i++) {
      const thuds = stepPlan('marble', seeded(i + 7)).filter((h) => h.kind === 'thud');
      expect(thuds).toHaveLength(2);
      expect(thuds[1]!.dt - thuds[0]!.dt).toBeGreaterThan(0.06); expect(thuds[1]!.dt - thuds[0]!.dt).toBeLessThan(0.13);
      expect(thuds[0]!.gain).toBeGreaterThan(thuds[1]!.gain); // the heel lands harder
    }
  });
  it('is a crowd of grains on rubble, brighter and more spread than on stone', () => {
    const r = seeded(3);
    const grains = stepPlan('rubble', r).filter((h) => h.kind === 'noise');
    expect(grains.length).toBeGreaterThan(14);
    const span = Math.max(...grains.map((h) => h.dt));
    expect(span).toBeGreaterThan(0.1);
    const mean = (a: number[]): number => a.reduce((x, y) => x + y, 0) / a.length;
    expect(mean(grains.map((h) => h.f))).toBeGreaterThan(mean(stepPlan('marble', seeded(3)).filter((h) => h.kind === 'noise').map((h) => h.f)));
  });
  it('is wetter on wet floor and in shallow water: damped slaps, bubbles, a longer fall', () => {
    let bubbles = 0;
    for (let i = 0; i < 100; i++) bubbles += stepPlan('shallow', seeded(i + 1)).filter((h) => h.kind === 'bubble').length;
    expect(bubbles).toBeGreaterThan(200);
    expect(Math.max(...stepPlan('shallow', seeded(5)).map((h) => h.tau))).toBeGreaterThan(Math.max(...stepPlan('marble', seeded(5)).map((h) => h.tau)));
  });
  it('differs from step to step (no machine-gun)', () => {
    const a = stepPlan('marble', seeded(1)), b = stepPlan('marble', seeded(2));
    expect(a[0]!.f).not.toBe(b[0]!.f);
  });
});
