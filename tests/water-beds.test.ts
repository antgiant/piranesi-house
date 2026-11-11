import { describe, expect, it } from 'vitest';
import { audioFor } from '../src/audio/director';
import { sceneAtWorldTime } from '../src/sim/scene';
import { createWorld } from '../src/world/world';

const w = createWorld('the-house');
const T = Date.UTC(2026, 5, 10, 9, 0) - Date.UTC(2026, 0, 1);

describe('the sea and falling water heard through the walls', () => {
  it('is heard from a wetter hall next door, and not when the neighbours are no wetter', () => {
    let wetter = 0;
    let none = 0;
    for (let x = -6; x <= 6; x++) for (let y = -6; y <= 6; y++) {
      const a = audioFor(w, sceneAtWorldTime(w, x, y, 1, T));
      for (const b of a.beds) {
        expect(b.sea).toBeGreaterThanOrEqual(0);
        expect(b.sea).toBeLessThanOrEqual(1);
        expect(b.falls).toBeGreaterThanOrEqual(0);
        expect(b.lowpassHz).toBeLessThanOrEqual(2400);
        expect(b.sea > 0.03 || b.falls > 0.03).toBe(true);
      }
      expect(a.beds.length).toBeLessThanOrEqual(4);
      if (a.beds.some((b) => b.sea > 0.03)) wetter++; else none++;
    }
    expect(wetter).toBeGreaterThan(0); // near a vestibule's stairs, the hall beyond is wetter
    expect(none).toBeGreaterThan(0); // and elsewhere no neighbour is wetter
  });
  it('is not computed when asked only for the hall itself', () => {
    expect(audioFor(w, sceneAtWorldTime(w, 0, 0, 1, T), { portals: false }).beds).toEqual([]);
  });
  it('the drowned halls hear none, and make none', () => {
    for (let x = -30; x <= 30; x += 3) for (let y = -30; y <= 30; y += 3) {
      const s = sceneAtWorldTime(w, x, y, 1, T);
      if (!(s.hall.regions.drowned)) continue;
      expect(audioFor(w, s).sea.gain).toBe(0);
    }
  });
});
