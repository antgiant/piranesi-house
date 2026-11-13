import { describe, expect, it } from 'vitest';
import { azimuthTo, bearingFromAz, distanceTo, headingOfMove, nearestOnWall, proximity, sideOfHeading, standingPoint, wallPoint } from '../src/audio/pose';

const H = { xExtent: 200, yExtent: 100 };

describe('where things are from where you stand', () => {
  it('puts walls on their sides of the hall (west-east is x, south-north is y)', () => {
    expect(wallPoint(H, 'W', 500)).toEqual({ x: 0, y: 50 });
    expect(wallPoint(H, 'E', 0)).toEqual({ x: 200, y: 0 });
    expect(wallPoint(H, 'N', 1000)).toEqual({ x: 200, y: 100 });
    expect(wallPoint(H, 'S', 250)).toEqual({ x: 50, y: 0 });
    expect(standingPoint(H, null, 500)).toEqual({ x: 100, y: 50 });
  });
  it('azimuth is 0 ahead, +90 right, 180 behind, -90 left, whichever way you face', () => {
    const north = { x: 100, y: 50, heading: 0 };
    expect(azimuthTo(north, { x: 100, y: 90 })).toBeCloseTo(0, 6);
    expect(azimuthTo(north, { x: 150, y: 50 })).toBeCloseTo(90, 6);
    expect(Math.abs(azimuthTo(north, { x: 100, y: 10 }))).toBeCloseTo(180, 6);
    expect(azimuthTo(north, { x: 50, y: 50 })).toBeCloseTo(-90, 6);
    const east = { ...north, heading: 90 };
    expect(azimuthTo(east, { x: 150, y: 50 })).toBeCloseTo(0, 6);   // the east door is ahead now
    expect(azimuthTo(east, { x: 100, y: 10 })).toBeCloseTo(90, 6);  // the south wall is on the right
  });
  it('turns smoothly as you walk past a door: it swings from ahead, to beside you, to behind', () => {
    const door = { x: 100, y: 60 };
    let last = 0;
    for (let y = 0; y <= 100; y += 5) {
      const az = azimuthTo({ x: 90, y, heading: 0 }, door); // walking north along x = 90, door off to the right
      if (y > 0) expect(Math.abs(az - last)).toBeLessThan(40);
      last = az;
    }
    expect(azimuthTo({ x: 90, y: 5, heading: 0 }, door)).toBeLessThan(20);   // ahead, a little right
    expect(azimuthTo({ x: 90, y: 60, heading: 0 }, door)).toBeCloseTo(90, 6); // abreast: hard right
    expect(azimuthTo({ x: 90, y: 100, heading: 0 }, door)).toBeGreaterThan(100); // behind you
  });
  it('the four directions the narrator speaks in follow the azimuth', () => {
    expect(bearingFromAz(0)).toBe('ahead'); expect(bearingFromAz(44)).toBe('ahead');
    expect(bearingFromAz(90)).toBe('right'); expect(bearingFromAz(-90)).toBe('left');
    expect(bearingFromAz(180)).toBe('behind'); expect(bearingFromAz(-170)).toBe('behind');
  });
  it('finds the nearest point of a stretch of wall (a fall) and the distance to it', () => {
    const p = nearestOnWall(H, 'N', 600, 800, { x: 40, y: 20 });
    expect(p).toEqual({ x: 120, y: 100 });            // the near end of the stretch
    expect(nearestOnWall(H, 'N', 600, 800, { x: 150, y: 20 })).toEqual({ x: 150, y: 100 }); // straight across from you
    expect(distanceTo({ x: 150, y: 20, heading: 0 }, { x: 150, y: 100 })).toBe(80);
  });
  it('knows the heading of a move and of a side', () => {
    expect(headingOfMove({ x: 0, y: 0 }, { x: 0, y: 50 }, 123)).toBeCloseTo(0, 6);
    expect(headingOfMove({ x: 0, y: 0 }, { x: 50, y: 0 }, 123)).toBeCloseTo(90, 6);
    expect(headingOfMove({ x: 0, y: 0 }, { x: -50, y: -50 }, 123)).toBeCloseTo(225, 6);
    expect(headingOfMove({ x: 5, y: 5 }, { x: 5.2, y: 5.2 }, 123)).toBe(123); // hardly a move: keep facing
    expect(sideOfHeading(10)).toBe('N'); expect(sideOfHeading(100)).toBe('E'); expect(sideOfHeading(200)).toBe('S'); expect(sideOfHeading(-80)).toBe('W');
  });
});

describe('how loud for how far', () => {
  it('falls steadily with distance, to a floor, and never above the peak', () => {
    let last = Infinity;
    for (const d of [0, 5, 20, 50, 100, 200, 400]) {
      const v = proximity(d, 40, 1.9, 0.25);
      expect(v).toBeLessThanOrEqual(last + 1e-12);
      expect(v).toBeLessThanOrEqual(1.9);
      expect(v).toBeGreaterThanOrEqual(0.25);
      last = v;
    }
    expect(proximity(0, 40, 1.9, 0.25)).toBe(1.9);
    expect(proximity(40, 40, 1.9, 0.25)).toBeCloseTo(0.95, 6); // half the peak at the reach
    expect(proximity(100000, 40, 1.9, 0.25)).toBe(0.25);
  });
});
