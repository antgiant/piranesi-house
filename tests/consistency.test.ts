import { describe, expect, it } from 'vitest';
import { createWorld } from '../src/world/world';
import { getHall } from '../src/world/hall';
import { sceneAtWorldTime } from '../src/sim/scene';
import { MS } from '../src/sim/time';
import { audioFor } from '../src/audio/director';
import { bearingFromAz } from '../src/audio/pose';
import { soundParagraph } from '../src/game/narrator';

// One world, two ways of reading it. What the sound engine is told is audible and what the text says you can hear must agree, at every place and time.
// These walk the world and check that whatever the audio scene holds, the description holds too, and from the same direction.

const w = createWorld('the-house');
const PHRASE = { ahead: 'ahead of you', right: 'to your right', left: 'to your left', behind: 'behind you' } as const;

describe('what you hear and what you read agree', () => {
  it('every water sound that is loud enough to notice is described, and a leak is described where it is', () => {
    const seen = { falls: 0, stairs: 0, leak: 0, wetLeak: 0, stoneLeak: 0 };
    let n = 0;
    for (let x = -7; x < 7; x++) for (let y = -7; y < 7; y++) {
      const h = getHall(w, x, y, 1);
      for (const t of [3 * MS.hour, 9 * MS.day + 14 * MS.hour, 41 * MS.day + 6 * MS.hour, 120 * MS.day + 20 * MS.hour]) {
        const pose = { x: ((x * 37 + y * 11 + 5) % 100) / 100 * h.xExtent, y: ((x * 13 + y * 29 + 7) % 100) / 100 * h.yExtent, heading: ((x * 90 + y * 45) % 360 + 360) % 360 };
        const sc = sceneAtWorldTime(w, x, y, 1, t, { forecast: false });
        const a = audioFor(w, sc, { pose, portals: false });
        const text = soundParagraph(a, sc);
        n++;
        if (a.falls.gain > 0.1) { expect(text).toMatch(/fresh water|water runs|falling|falls|thread/i); seen.falls++; }
        if (a.stairs.flow > 0.2) { expect(text).toMatch(/stair/i); seen.stairs++; }
        const leak = a.leaks.filter((l) => l.gain > 0.4).sort((p, q) => q.gain - p.gain)[0];
        if (leak) {
          expect(text).toMatch(/a drop falls/);
          expect(text).toContain(PHRASE[bearingFromAz(leak.az)]);                 // the same direction the sound comes from
          expect(text).toMatch(leak.wet ? /into water/ : /ticks on the stone/);   // the same thing happening
          if (leak.el > 25) expect(text).toContain('from high above');
          seen.leak++; if (leak.wet) seen.wetLeak++; else seen.stoneLeak++;
        } else {
          expect(text).not.toMatch(/a drop falls/);                                // and nothing is said that cannot be heard
        }
        if (a.thunder > 0.2) expect(text).toMatch(/thunder/i);
      }
    }
    expect(n).toBeGreaterThan(700);
    expect(seen.falls).toBeGreaterThan(5);
    expect(seen.stairs).toBeGreaterThan(0);
    expect(seen.leak).toBeGreaterThan(20);
    expect(seen.wetLeak).toBeGreaterThan(0);
    expect(seen.stoneLeak).toBeGreaterThan(0);
  });

  it('turning round changes where the leak is said to be, and the same turn changes where it is heard', () => {
    const h = getHall(w, 0, 0, 1);
    const sc = sceneAtWorldTime(w, 0, 0, 1, 5 * MS.hour, { forecast: false });
    const base = { x: h.xExtent * 0.4, y: h.yExtent * 0.5 };
    const phrases = new Set<string>();
    for (const heading of [0, 90, 180, 270]) {
      const a = audioFor(w, sc, { pose: { ...base, heading }, portals: false });
      const leak = a.leaks.filter((l) => l.gain > 0.4).sort((p, q) => q.gain - p.gain)[0];
      if (!leak) continue;
      expect(soundParagraph(a, sc)).toContain(PHRASE[bearingFromAz(leak.az)]);
      phrases.add(PHRASE[bearingFromAz(leak.az)]);
    }
    expect(phrases.size).toBeGreaterThan(1);
  });
});
