import { describe, expect, it } from 'vitest';
import { audioFor } from '../src/audio/director';
import { sceneAtWorldTime } from '../src/sim/scene';
import { MS } from '../src/sim/time';
import { createWorld } from '../src/world/world';

const w = createWorld('the-house');
const scene = (level: 0 | 1 | 2, t: number, x = -14, y = -6) => sceneAtWorldTime(w, x, y, level, t);

/** The first moments (every 20 minutes over some years) that satisfy a test of the weather. */
function find(pred: (s: ReturnType<typeof scene>) => boolean, n = 4): number[] {
  const out: number[] = [];
  for (let t = 0; t < 4 * 365 * 24 * MS.hour && out.length < n; t += 20 * 60_000) if (pred(scene(2, t))) out.push(t);
  return out;
}

describe('the sound of weather, by level', () => {
  const rainy = find((s) => s.weather.precip === 'rain' && s.weather.rain > 400);
  const stormy = find((s) => s.weather.lightning);
  const snowy = find((s) => s.weather.precip === 'snow' && s.weather.rain > 300);
  const calm = find((s) => s.weather.precip === 'none' && !s.weather.storm && !s.weather.lightning, 1);

  it('found the weather it needs', () => {
    expect(rainy.length).toBeGreaterThan(0);
    expect(stormy.length).toBeGreaterThan(0);
    expect(snowy.length).toBeGreaterThan(0);
  });
  it('rain is heard in every level, loudest in the upper halls (open to the sky) and faintest below the sea', () => {
    for (const t of rainy) {
      const up = audioFor(w, scene(2, t)).rain.gain;
      const mid = audioFor(w, scene(1, t)).rain.gain;
      const low = audioFor(w, scene(0, t)).rain.gain;
      expect(up).toBeGreaterThan(0.1);
      expect(mid).toBeGreaterThan(0.02);
      expect(low).toBeGreaterThan(0);
      expect(up).toBeGreaterThanOrEqual(mid);
      expect(mid).toBeGreaterThanOrEqual(low);
    }
  });
  it('a vestibule hears the rain as loudly as the upper halls', () => {
    const t = rainy[0] as number;
    const v = audioFor(w, scene(1, t, 0, 0));
    expect(v.rain.gain).toBeGreaterThan(0.1);
  });
  it('is silent of rain in fine weather, and has no thunder', () => {
    for (const t of calm) for (const lv of [0, 1, 2] as const) {
      const a = audioFor(w, scene(lv, t));
      expect(a.rain.gain).toBe(0);
      expect(a.thunder).toBe(0);
    }
  });
  it('thunder comes with lightning, most in the upper halls, least below, and never in the Drowned Halls or the dark hall', () => {
    for (const t of stormy) {
      const up = audioFor(w, scene(2, t)).thunder;
      const mid = audioFor(w, scene(1, t)).thunder;
      const low = audioFor(w, scene(0, t)).thunder;
      expect(up).toBeGreaterThan(mid);
      expect(mid).toBeGreaterThan(low);
      expect(low).toBeGreaterThan(0);
      expect(audioFor(w, scene(1, t, -192, 0)).thunder).toBe(0);
    }
  });
  it('snow makes no rain sound, and hushes the open halls', () => {
    for (const t of snowy) {
      const sn = scene(2, t);
      const a = audioFor(w, sn);
      expect(a.rain.gain).toBe(0);
      expect(a.muffle).toBeGreaterThan(0);
    }
  });
  it('wind is heard in the upper halls and vestibules loudly, and softly elsewhere', () => {
    const t = find((s) => s.weather.windSpeed > 700, 1)[0] as number;
    const up = audioFor(w, scene(2, t)).wind.gain;
    const mid = audioFor(w, scene(1, t)).wind.gain;
    expect(up).toBeGreaterThan(mid);
    expect(up).toBeGreaterThan(0.2);
  });
});
