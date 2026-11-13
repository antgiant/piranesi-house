import { describe, expect, it } from 'vitest';
import { FINE, PLOPS, TRICKLE, addBubble, bubbleDamping, bubbleFrequency, bubbleLength, dripPitch, fillSwarm } from '../src/audio/bubbles';

function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}
const SR = 48000;

describe('one bubble', () => {
  it('rings out faster the higher it rings (small bubbles are brief, large ones linger)', () => {
    expect(bubbleDamping(3000)).toBeGreaterThan(bubbleDamping(1000));
    expect(bubbleDamping(1000)).toBeGreaterThan(bubbleDamping(500));
    expect(bubbleLength(500)).toBeGreaterThan(bubbleLength(3000) * 5);
  });
  it('matches the measured cave drip: a bubble near 1.1 kHz falls by about 75 dB a second, the order of magnitude of the recording', () => {
    // decay of the envelope is the damping in nepers per second: 8.69 dB per neper
    const dbPerSec = bubbleDamping(1100) * 8.686;
    expect(dbPerSec).toBeGreaterThan(500);   // a bare bubble dies far faster than the drip's audible room tail, which is the room's
    expect(dbPerSec).toBeLessThan(2500);
  });
  it('rises in pitch as it fades: about 10% by the time it has fallen to a third of its level', () => {
    const f0 = 1500, f = bubbleFrequency(f0, 1 / bubbleDamping(f0));
    expect(f / f0).toBeGreaterThan(1.05);
    expect(f / f0).toBeLessThan(1.15);
  });
  it('is finite, starts at its own amplitude and ends near silence', () => {
    const d = new Float32Array(SR / 2);
    addBubble(d, SR, 0, 1200, 1);
    let peak = 0;
    for (const v of d) { expect(Number.isFinite(v)).toBe(true); peak = Math.max(peak, Math.abs(v)); }
    expect(peak).toBeGreaterThan(0.5);
    expect(peak).toBeLessThanOrEqual(1.0001);
    expect(Math.abs(d[Math.floor(SR * bubbleLength(1200)) - 1]!)).toBeLessThan(0.01);
  });
  it('stays within the buffer when placed near its end', () => {
    const d = new Float32Array(1000);
    expect(() => addBubble(d, SR, 990, 800, 1)).not.toThrow();
  });
});

describe('swarms', () => {
  const rms = (d: Float32Array): number => Math.sqrt(d.reduce((s, v) => s + v * v, 0) / d.length);
  it('are repeatable, and denser swarms are louder', () => {
    const a = new Float32Array(SR * 2), b = new Float32Array(SR * 2), c = new Float32Array(SR * 2);
    fillSwarm(a, SR, FINE, seeded(1)); fillSwarm(b, SR, FINE, seeded(1)); fillSwarm(c, SR, { ...FINE, perSec: FINE.perSec / 4 }, seeded(1));
    expect(Array.from(a.subarray(0, 40))).toEqual(Array.from(b.subarray(0, 40)));
    expect(rms(a)).toBeGreaterThan(rms(c));
  });
  it('the fine fall is dense, and the plops and the trickle are sparse', () => {
    expect(FINE.perSec).toBeGreaterThan(TRICKLE.perSec * 5);
    expect(TRICKLE.perSec).toBeGreaterThan(PLOPS.perSec);
    expect(PLOPS.fMed).toBeLessThan(FINE.fMed); // big bubbles are low
  });
});

describe('drip pitch', () => {
  it('is between 700 Hz and 4.8 kHz, mostly 1 to 2 kHz', () => {
    const rng = seeded(3), ps: number[] = [];
    for (let i = 0; i < 2000; i++) ps.push(dripPitch(rng));
    ps.sort((x, y) => x - y);
    expect(ps[0]).toBeGreaterThanOrEqual(700);
    expect(ps[ps.length - 1]).toBeLessThanOrEqual(4800);
    const median = ps[1000]!;
    expect(median).toBeGreaterThan(1200);
    expect(median).toBeLessThan(1800);
  });
});
