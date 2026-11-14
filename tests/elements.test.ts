import { describe, expect, it } from 'vitest';
import { ELEMENTS, allOn, maskScene, parseElements } from '../src/audio/elements';
import { audioFor } from '../src/audio/director';
import { createWorld } from '../src/world/world';
import { sceneAtWorldTime } from '../src/sim/scene';
import { MS } from '../src/sim/time';

const world = createWorld('test-seed');
// a rich scene: a hall with falls in the open, in a storm
function richScene() {
  for (let d = 0; d < 400; d++) for (const [x, y, level] of [[-14, -6, 2], [0, 0, 0], [3, 2, 1]] as const) {
    const a = audioFor(world, sceneAtWorldTime(world, x, y, level, (d * 17 + 5) * MS.hour));
    if (a.falls.gain > 0.05 && a.wind.gain > 0.1 && a.rain.gain > 0.05) return a;
  }
  return audioFor(world, sceneAtWorldTime(world, 0, 0, 0, 0));
}

describe('choosing which sounds to hear', () => {
  it('leaves the scene untouched with everything on', () => {
    const a = richScene();
    expect(maskScene(a, allOn())).toBe(a);
  });
  it('takes out one kind at a time and no other', () => {
    const a = richScene();
    for (const e of ELEMENTS) {
      const on = { ...allOn(), [e]: false };
      const b = maskScene(a, on);
      if (e === 'sea') expect(b.sea.gain).toBe(0);
      if (e === 'falls') { expect(b.falls.gain).toBe(0); expect(b.stairs.flow).toBe(0); expect(b.stream).toBeUndefined(); }
      if (e === 'rain') expect(b.rain.gain).toBe(0);
      if (e === 'drips') expect(b.leaks).toEqual([]);
      if (e === 'wind') { expect(b.wind.gain).toBe(0); expect(b.wind.whistle).toBe(0); }
      if (e === 'thunder') expect(b.thunder).toBe(0);
      if (e === 'birds') expect(b.birds.perMinute).toBe(0);
      if (e === 'doorways') { expect(b.portals).toEqual([]); expect(b.beds).toEqual([]); }
      // the rest are as they were
      if (e !== 'wind') expect(b.wind).toEqual(a.wind);
      if (e !== 'rain') expect(b.rain).toEqual(a.rain);
      if (e !== 'falls') expect(b.falls).toEqual(a.falls);
      expect(b.reverb).toEqual(a.reverb);
    }
  });
  it('does not change the scene it was given (the narrator reads that one)', () => {
    const a = richScene(); const before = JSON.stringify(a);
    maskScene(a, { ...allOn(), sea: false, falls: false, birds: false, wind: false, rain: false, drips: false, thunder: false, doorways: false });
    expect(JSON.stringify(a)).toBe(before);
  });
  it('switches the kinds off in the halls next door as well when the doorways stay on', () => {
    const a = richScene();
    const b = maskScene(a, { ...allOn(), birds: false, falls: false });
    for (const p of b.portals) { expect(p.birds.perMinute).toBe(0); expect(p.falls).toBe(0); }
  });
  it('reads a stored setting, defaulting anything missing to on', () => {
    expect(parseElements(undefined)).toEqual(allOn());
    expect(parseElements({ birds: false, nonsense: 1, wind: 'no' })).toEqual({ ...allOn(), birds: false });
    expect(parseElements(42)).toEqual(allOn());
  });
});
