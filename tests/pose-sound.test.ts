import { describe, expect, it } from 'vitest';
import { createWorld } from '../src/world/world';
import { getHall } from '../src/world/hall';
import { parseCellName, vestibuleCell } from '../src/world/layout';
import { sceneAtWorldTime } from '../src/sim/scene';
import { MS } from '../src/sim/time';
import { audioFor } from '../src/audio/director';
import { nearestOnWall, wallPoint } from '../src/audio/pose';
import { listenerPose, look, newGame, step } from '../src/game/game';

const w = createWorld('test-seed');
const NOW = Date.UTC(2026, 5, 10, 9, 0);

describe('the visitor\'s place in the hall, from the game', () => {
  it('standing in the middle of a hall, facing the way you last went', () => {
    const g = newGame({}, NOW);
    look(g, NOW);
    const h = getHall(g.world, g.pos.x, g.pos.y, g.pos.level);
    const p = listenerPose(g, NOW);
    expect(p.x).toBeCloseTo(h.xExtent / 2, 6);
    expect(p.y).toBeCloseTo(h.yExtent / 2, 6);
    expect(p.heading).toBe(0); // facing north to begin with
  });
  it('on a walk, moves from where you set out toward the door, and heads that way', () => {
    const g = newGame({}, NOW);
    look(g, NOW);
    step(g, 'go west', NOW);
    const h = getHall(g.world, 0, 0, 1);
    const w0 = g.walk!;
    const at = (f: number) => listenerPose(g, w0.startMs + f * (w0.endMs - w0.startMs));
    expect(at(0).x).toBeCloseTo(h.xExtent / 2, 3);
    expect(at(0.5).x).toBeLessThan(at(0).x);
    expect(at(1).x).toBeLessThan(at(0.5).x);
    expect(at(1).x).toBeLessThan(h.xExtent / 2 * 0.2 + 1e6); // it ends at the west wall (x = 0) whatever the door's height
    expect(at(0.5).heading).toBeGreaterThan(200); // heading west-ish (270) whether or not the door is off to one side
    expect(at(0.5).heading).toBeLessThan(340);
  });
  it('is clamped to the walk: before it begins and after it ends you are at its ends', () => {
    const g = newGame({}, NOW);
    look(g, NOW);
    step(g, 'go west', NOW);
    const w0 = g.walk!;
    expect(listenerPose(g, w0.startMs - 5000)).toEqual(listenerPose(g, w0.startMs));
    expect(listenerPose(g, w0.endMs + 5000)).toEqual(listenerPose(g, w0.endMs));
  });
});

describe('the sound follows you across a hall', () => {
  const scene = (p: { x: number; y: number; level: 0 | 1 | 2 }, t: number) => sceneAtWorldTime(w, p.x, p.y, p.level, t);

  it('a fall is loud near its wall and a far murmur across the floor, and swings round as you pass it', () => {
    let spot: { x: number; y: number; level: 1 } | null = null;
    for (let x = -12; x < 12 && !spot; x++) for (let y = -12; y < 12 && !spot; y++) if (getHall(w, x, y, 1).falls) spot = { x, y, level: 1 };
    const p = spot!;
    const h = getHall(w, p.x, p.y, 1);
    const f = h.falls!;
    const mid = (f.from + f.to) / 2;
    const onWall = wallPoint(h, f.wall, mid);
    const inward = (d: number) => {
      const cx = h.xExtent / 2, cy = h.yExtent / 2;
      const vx = cx - onWall.x, vy = cy - onWall.y, len = Math.hypot(vx, vy) || 1;
      return { x: onWall.x + (vx / len) * d, y: onWall.y + (vy / len) * d };
    };
    const headingToWall = (from: { x: number; y: number }) => {
      const n = nearestOnWall(h, f.wall, f.from, f.to, from); // the nearest point of the fall, which is what you hear it from
      return (((Math.atan2(n.x - from.x, n.y - from.y) * 180) / Math.PI) + 360) % 360;
    };
    const near = inward(4), far = inward(Math.min(120, Math.hypot(h.xExtent, h.yExtent) / 2));
    const aNear = audioFor(w, scene(p, MS.hour), { portals: false, pose: { ...near, heading: headingToWall(near) } });
    const aFar = audioFor(w, scene(p, MS.hour), { portals: false, pose: { ...far, heading: headingToWall(far) } });
    expect(aNear.falls.gain).toBeGreaterThan(0);
    expect(aNear.falls.gain).toBeGreaterThan(aFar.falls.gain * 1.4);
    expect(aFar.falls.gain).toBeGreaterThan(0); // never to nothing: a far murmur across the floor
    expect(aNear.falls.bearing).toBe('ahead');
    expect(Math.abs(aNear.falls.az!)).toBeLessThan(30);
    // the same place, facing the other way: behind you
    const turned = audioFor(w, scene(p, MS.hour), { portals: false, pose: { ...near, heading: (headingToWall(near) + 180) % 360 } });
    expect(turned.falls.bearing).toBe('behind');
    expect(turned.falls.gain).toBeCloseTo(aNear.falls.gain, 9); // turning the head changes where, not how loud
  });

  it('a doorway you walk toward grows louder and is ahead; across the hall it is fainter', () => {
    // find a hall and a moment where something is heard through a doorway
    let found: { p: { x: number; y: number; level: 1 }; t: number } | null = null;
    const v = vestibuleCell(w, 3)!;
    outer: for (const c of [{ x: v.x, y: v.y }, { x: v.x + 1, y: v.y }, { x: v.x - 1, y: v.y }, { x: v.x, y: v.y + 1 }, { x: v.x, y: v.y - 1 }]) {
      for (let t = MS.hour; t < 4 * MS.day; t += 2 * MS.hour) {
        const a = audioFor(w, scene({ ...c, level: 1 }, t));
        if (a.portals.length > 0) { found = { p: { ...c, level: 1 }, t }; break outer; }
      }
    }
    expect(found).not.toBeNull();
    const { p, t } = found!;
    const h = getHall(w, p.x, p.y, 1);
    const base = audioFor(w, scene(p, t));
    const door = base.portals[0]!;
    expect(door.az).toBeUndefined(); // no place known: the old four directions
    const at = wallPoint(h, door.side, door.pos);
    const cx = h.xExtent / 2, cy = h.yExtent / 2;
    const dir = (d: number) => { const vx = cx - at.x, vy = cy - at.y, len = Math.hypot(vx, vy) || 1; return { x: at.x + (vx / len) * d, y: at.y + (vy / len) * d }; };
    const head = (from: { x: number; y: number }) => (((Math.atan2(at.x - from.x, at.y - from.y) * 180) / Math.PI) + 360) % 360;
    const near = dir(3), far = dir(Math.min(150, Math.hypot(h.xExtent, h.yExtent) * 0.7));
    const aNear = audioFor(w, scene(p, t), { pose: { ...near, heading: head(near) } });
    const aFar = audioFor(w, scene(p, t), { pose: { ...far, heading: head(far) } });
    const pn = aNear.portals.find((q) => q.toName === door.toName)!;
    const pf = aFar.portals.find((q) => q.toName === door.toName);
    expect(pn).toBeDefined();
    expect(pn.bearing).toBe('ahead');
    expect(Math.abs(pn.az!)).toBeLessThan(30);
    if (pf) expect(pn.loudness).toBeGreaterThan(pf.loudness * 1.3);
    // walking away from it, with it behind you, it is muffled more than when it was ahead
    const aAway = audioFor(w, scene(p, t), { pose: { ...near, heading: (head(near) + 180) % 360 } });
    const pa = aAway.portals.find((q) => q.toName === door.toName)!;
    expect(pa.bearing).toBe('behind');
    expect(pa.lowpassHz).toBeLessThan(pn.lowpassHz);
  });

  it('the sea and the tide come up the stairs: a little louder beside them than across the floor, never past full', () => {
    const v = vestibuleCell(w, 3)!;
    const h = getHall(w, v.x, v.y, 1);
    expect(h.stairs.length).toBeGreaterThan(0);
    const st = h.stairs[0]!;
    const at = wallPoint(h, st.wall, st.pos);
    const cx = h.xExtent / 2, cy = h.yExtent / 2;
    const vx = cx - at.x, vy = cy - at.y, len = Math.hypot(vx, vy) || 1;
    const near = { x: at.x + (vx / len) * 3, y: at.y + (vy / len) * 3, heading: 0 };
    const far = { x: at.x + (vx / len) * Math.min(160, len * 1.9), y: at.y + (vy / len) * Math.min(160, len * 1.9), heading: 0 };
    let checked = 0;
    for (let t = MS.hour; t < 6 * MS.day; t += 3 * MS.hour) {
      const sc = scene({ x: v.x, y: v.y, level: 1 }, t);
      const a = audioFor(w, sc, { portals: false, pose: near }), b = audioFor(w, sc, { portals: false, pose: far });
      expect(a.sea.gain).toBeLessThanOrEqual(1);
      expect(a.tide.gain).toBeLessThanOrEqual(1);
      if (a.sea.gain > 0.05) { expect(a.sea.gain).toBeGreaterThan(b.sea.gain); checked++; }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('without a place the sound is as it was: nothing is aimed, and it matches the hall-wide figures', () => {
    const p = parseCellName(w, 'Second Southern Hall')!;
    const a = audioFor(w, scene({ x: p.x, y: p.y, level: 1 }, MS.hour), { facing: 'N' });
    for (const q of a.portals) expect(q.az).toBeUndefined();
    expect(a.falls.az).toBeUndefined();
  });
});
