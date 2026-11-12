import { describe, expect, it } from 'vitest';
import { REF_DISTANCE, SPEED_OF_SOUND, airCutoffHz, bearingPosition, distanceOf, dopplerRatio, flybyPath, perchPosition, polar, positionAt, stageCell, toPolar, velocityOf } from '../src/audio/spatial';

// A small deterministic random source, so the tests are repeatable.
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}

describe('placing sound around the listener (facing -Z, +X right, +Y up)', () => {
  it('puts ahead at -Z, right at +X, behind at +Z and overhead at +Y', () => {
    const near = (a: number, b: number): void => expect(a).toBeCloseTo(b, 6);
    const ahead = polar(0, 0, 4); near(ahead.x, 0); near(ahead.y, 0); near(ahead.z, -4);
    const right = polar(90, 0, 4); near(right.x, 4); near(right.z, 0);
    const behind = polar(180, 0, 4); near(behind.z, 4);
    const up = polar(0, 90, 4); near(up.y, 4);
  });

  it('round-trips through toPolar', () => {
    for (const [az, el, d] of [[0, 0, 4], [-120, 30, 9], [75, -40, 2], [170, 60, 15]] as const) {
      const p = toPolar(polar(az, el, d));
      expect(p.az).toBeCloseTo(az, 5);
      expect(p.el).toBeCloseTo(el, 5);
      expect(p.dist).toBeCloseTo(d, 5);
    }
  });

  it('places doorways by bearing, and a door behind really is behind', () => {
    expect(toPolar(bearingPosition('left', 0)).az).toBeCloseTo(-90, 5);
    expect(toPolar(bearingPosition('right', 0)).az).toBeCloseTo(90, 5);
    expect(bearingPosition('behind', 0).z).toBeGreaterThan(0);
    expect(bearingPosition('ahead', 0).z).toBeLessThan(0);
    // the same pan (0) is ahead for an opening ahead and behind for one behind: stereo could not tell them apart
    expect(bearingPosition('ahead', 0)).not.toEqual(bearingPosition('behind', 0));
  });

  it('nudges an opening ahead toward the side it is on', () => {
    expect(bearingPosition('ahead', 0.3).x).toBeGreaterThan(0);
    expect(bearingPosition('ahead', -0.3).x).toBeLessThan(0);
    expect(distanceOf(bearingPosition('ahead', 0.3))).toBeCloseTo(REF_DISTANCE, 6);
  });
});

describe('Doppler', () => {
  it('is higher while a source approaches, lower once it recedes, and 1 when it crosses sideways', () => {
    const v = { x: 0, y: 0, z: 20 }; // flying toward the listener along +Z
    expect(dopplerRatio({ x: 0, y: 0, z: -30 }, v)).toBeGreaterThan(1);
    expect(dopplerRatio({ x: 0, y: 0, z: 30 }, v)).toBeLessThan(1);
    expect(dopplerRatio({ x: 10, y: 0, z: 0 }, v)).toBeCloseTo(1, 6);
  });

  it('matches the textbook figure', () => {
    // 20 m/s straight at us: c / (c - 20)
    expect(dopplerRatio({ x: 0, y: 0, z: -50 }, { x: 0, y: 0, z: 20 })).toBeCloseTo(SPEED_OF_SOUND / (SPEED_OF_SOUND - 20), 6);
  });

  it('stays sane at the origin', () => {
    expect(dopplerRatio({ x: 0, y: 0, z: 0 }, { x: 1, y: 2, z: 3 })).toBe(1);
  });
});

describe('air absorption', () => {
  it('leaves nearby sound bright and dulls distant sound, never below a floor', () => {
    expect(airCutoffHz(1)).toBe(airCutoffHz(REF_DISTANCE));
    expect(airCutoffHz(30)).toBeLessThan(airCutoffHz(10));
    expect(airCutoffHz(10)).toBeLessThan(airCutoffHz(REF_DISTANCE));
    expect(airCutoffHz(100000)).toBeGreaterThanOrEqual(3500);
  });
});

describe('fly-pasts', () => {
  const opts = { dur: 2, speed: 15, closest: [3, 10] as [number, number], height: [6, 20] as [number, number] };

  it('is a straight constant-speed line of the right length', () => {
    const rand = seeded(7);
    for (let i = 0; i < 50; i++) {
      const f = flybyPath(rand, opts);
      const v = velocityOf(f);
      // climb adds a little to the horizontal speed: within a quarter of nominal
      expect(distanceOf(v)).toBeGreaterThan(opts.speed * 0.99);
      expect(distanceOf(v)).toBeLessThan(opts.speed * 1.25);
      const mid = positionAt(f, 0.5);
      expect(mid.x).toBeCloseTo((f.from.x + f.to.x) / 2, 9);
    }
  });

  it('passes the listener: it starts and ends far apart and comes closer in between', () => {
    const rand = seeded(11);
    for (let i = 0; i < 50; i++) {
      const f = flybyPath(rand, opts);
      let nearest = Infinity;
      for (let u = 0; u <= 1; u += 0.01) nearest = Math.min(nearest, distanceOf(positionAt(f, u)));
      expect(nearest).toBeLessThan(Math.min(distanceOf(f.from), distanceOf(f.to)));
      expect(nearest).toBeGreaterThanOrEqual(6); // never through the head: at least the lowest height
    }
  });

  it('sweeps across the listener: the sound crosses from one side to the other', () => {
    const rand = seeded(3);
    let crossed = 0;
    for (let i = 0; i < 100; i++) {
      const f = flybyPath(rand, opts);
      // the azimuth must change substantially between the ends of a call
      const a = toPolar(f.from).az, b = toPolar(f.to).az;
      const swing = Math.abs(((a - b + 540) % 360) - 180);
      if (swing > 30) crossed++;
    }
    expect(crossed).toBeGreaterThan(60);
  });

  it('is pitched up on the way in and down on the way out for the whole range of paths', () => {
    const rand = seeded(5);
    for (let i = 0; i < 50; i++) {
      const f = flybyPath(rand, opts);
      const v = velocityOf(f);
      const start = dopplerRatio(positionAt(f, 0), v), end = dopplerRatio(positionAt(f, 1), v);
      expect(start).toBeGreaterThan(end);
    }
  });

  it('puts perches around and above, never under the floor, and never closer than the reference distance', () => {
    const rand = seeded(9);
    for (let i = 0; i < 200; i++) {
      const p = perchPosition(rand);
      expect(p.y).toBeGreaterThan(0);
      expect(distanceOf(p)).toBeGreaterThanOrEqual(REF_DISTANCE - 1e-9);
    }
  });
});

describe('the shared ring for small sounds', () => {
  it('gives the same key for nearby directions and different keys for opposite ones', () => {
    expect(stageCell(polar(10, 0, 4)).key).toBe(stageCell(polar(14, 5, 9)).key);
    expect(stageCell(polar(90, 0, 4)).key).not.toBe(stageCell(polar(-90, 0, 4)).key);
    expect(stageCell(polar(0, 0, 4)).key).not.toBe(stageCell(polar(180, 0, 4)).key);
  });

  it('keeps front and behind apart (the thing a stereo pan cannot do)', () => {
    expect(stageCell(polar(20, 0, 4)).az).toBeLessThan(90);
    expect(Math.abs(stageCell(polar(160, 0, 4)).az)).toBeGreaterThan(90);
  });

  it('has a bounded number of cells, so the cost of the ring is bounded', () => {
    const keys = new Set<string>();
    const rand = seeded(1);
    for (let i = 0; i < 5000; i++) keys.add(stageCell(polar(rand() * 360 - 180, rand() * 180 - 90, 4)).key);
    // 12 directions around at each of 3 heights, plus one cell straight overhead
    expect(keys.size).toBe(12 * 3 + 1);
  });

  it('puts the underfoot sound below, in the lowest ring', () => {
    expect(stageCell({ x: 0, y: -1.5, z: -0.4 }).el).toBeLessThan(0);
  });
});
