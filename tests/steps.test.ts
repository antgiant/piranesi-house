import { describe, expect, it } from 'vitest';
import { stepPlan } from '../src/audio/steps';
import type { Surface } from '../src/audio/director';

function seeded(seed: number): () => number { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
const SURFACES: Surface[] = ['marble', 'wet', 'shallow', 'rubble', 'snow'];

describe('a bare footstep', () => {
  it('is made of a few sounds, none late, none silent, none out of the audible range', () => {
    for (const sf of SURFACES) for (let i = 0; i < 100; i++) {
      const plan = stepPlan(sf, seeded(i + 1));
      expect(plan.length).toBeGreaterThan(2);
      for (const h of plan) {
        expect(h.dt).toBeGreaterThanOrEqual(0); expect(h.dt).toBeLessThan(0.4);
        expect(h.gain).toBeGreaterThan(0); expect(h.gain).toBeLessThan(3.5);
        expect(h.f).toBeGreaterThan(60); expect(h.f).toBeLessThan(10000);
        expect(h.tau).toBeGreaterThan(0.001); expect(h.tau).toBeLessThan(0.3);
      }
    }
  });
  it('is one impact and then a quiet roll of the foot: no second tap, as a heeled shoe would give', () => {
    for (const sf of ['marble', 'wet'] as Surface[]) for (let i = 0; i < 100; i++) {
      const plan = stepPlan(sf, seeded(i + 7));
      const impact = Math.max(...plan.filter((h) => h.dt === 0).map((h) => h.gain));
      for (const h of plan.filter((x) => x.dt >= 0.06)) expect(h.gain).toBeLessThan(impact * 0.4); // later sounds are far quieter than the impact
      // and the impact is a broad click (high), a low body and a thud, all at the same moment
      expect(plan.filter((h) => h.dt === 0 && h.kind === 'noise' && h.type === 'lowpass')).toHaveLength(1);
    }
  });
  it('has the left foot and the right a little unlike', () => {
    const l = stepPlan('marble', seeded(4), -1), r = stepPlan('marble', seeded(4), 1);
    const body = (p: ReturnType<typeof stepPlan>): number => p.find((h) => h.type === 'lowpass')!.f;
    expect(body(r) / body(l)).toBeGreaterThan(1.05); expect(body(r) / body(l)).toBeLessThan(1.25);
  });
  it('is a crowd of grains on rubble, spread over a good part of a second, and mostly bright', () => {
    const grains = stepPlan('rubble', seeded(3)).filter((h) => h.kind === 'noise');
    expect(grains.length).toBeGreaterThan(14);
    expect(Math.max(...grains.map((h) => h.dt))).toBeGreaterThan(0.1);
    const mean = grains.reduce((x, h) => x + h.f, 0) / grains.length;
    expect(mean).toBeGreaterThan(1500); expect(mean).toBeLessThan(6000);
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
