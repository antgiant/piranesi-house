import { describe, expect, it } from 'vitest';
import { discreteShare, loudness, turbulence } from '../src/audio/turbulence';

describe('turbulence', () => {
  it('is smooth for a small flow, fully turbulent for a large one, and rises between', () => {
    for (const kind of ['stream', 'fall'] as const) {
      expect(turbulence(0.3, kind)).toBe(0);
      expect(turbulence(3, kind)).toBe(1);
      let last = -1;
      for (let f = 0; f <= 3; f += 0.1) { const t = turbulence(f, kind); expect(t).toBeGreaterThanOrEqual(last); last = t; }
    }
  });
  it('a fall breaks up at a smaller flow than a stream', () => {
    expect(turbulence(1, 'fall')).toBeGreaterThan(turbulence(1, 'stream'));
  });
  it('keeps every single drop when smooth and buries nearly all of them when turbulent', () => {
    expect(discreteShare(0)).toBe(1);
    expect(discreteShare(1)).toBeLessThan(0.05);
  });
  it('gets louder with flow, then flattens past the critical flow', () => {
    expect(loudness(1)).toBeGreaterThan(loudness(0.5));
    expect(loudness(1.2) - loudness(1)).toBeGreaterThan(loudness(2.2) - loudness(2));
  });
});
