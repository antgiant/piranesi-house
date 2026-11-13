import { describe, expect, it } from 'vitest';
import { createWorld } from '../src/world/world';
import { getHall } from '../src/world/hall';
import { vestibuleCell } from '../src/world/layout';
import { sceneAtWorldTime } from '../src/sim/scene';
import { hydrologyAt } from '../src/sim/hydrology';
import { MS } from '../src/sim/time';
import { audioFor } from '../src/audio/director';
import { wallPoint } from '../src/audio/pose';
import { soundParagraph } from '../src/game/narrator';

const w = createWorld('test-seed');
const v = vestibuleCell(w, 3)!;
const hall = getHall(w, v.x, v.y, 1);
const scene = (t: number) => sceneAtWorldTime(w, v.x, v.y, 1, t, { forecast: false });

describe('water on the great stair', () => {
  it('a vestibule has stairs; an ordinary hall does not', () => {
    expect(hall.stairs.length).toBeGreaterThan(0);
    let plain = false;
    for (let x = -8; x < 8 && !plain; x++) for (let y = -8; y < 8 && !plain; y++) { const h = getHall(w, x, y, 1); if (h.stairs.length === 0) { plain = true; expect(audioFor(w, sceneAtWorldTime(w, x, y, 1, 5 * MS.hour), { portals: false }).stairs.flow).toBe(0); } }
    expect(plain).toBe(true);
  });

  it('runs while a tide drains back down it, and not while the tide is rising or the floor is dry and no rain runs off', () => {
    let drain = 0, quiet = 0;
    for (let t = MS.hour; t < 40 * MS.day; t += 20 * MS.min) {
      const sc = scene(t);
      const a = audioFor(w, sc, { portals: false });
      expect(a.stairs.flow).toBeGreaterThanOrEqual(0);
      expect(a.stairs.flow).toBeLessThanOrEqual(2.3);
      if (sc.tide.depthDm > 0 && sc.tide.trend === 'falling') {
        expect(a.stairs.flow).toBeGreaterThan(0.3);
        expect(a.stairs.cause).toBe('drain');
        drain++;
      } else if (sc.tide.depthDm === 0 && hydrologyAt(w, t).streams < 0.04) {
        expect(a.stairs.flow).toBe(0);
        expect(a.stairs.cause).toBeNull();
        quiet++;
      }
    }
    expect(drain).toBeGreaterThan(0);
    expect(quiet).toBeGreaterThan(0);
  });

  it('runs with the rain too: rain streams down the stair of an open hall while it runs off, and for a while after', () => {
    let rainy = 0;
    for (let t = MS.hour; t < 200 * MS.day; t += 3 * MS.hour) {
      const sc = scene(t);
      if (sc.tide.depthDm > 0) continue;
      const a = audioFor(w, sc, { portals: false });
      if (hydrologyAt(w, t).streams > 0.3) { expect(a.stairs.flow).toBeGreaterThan(0.1); expect(a.stairs.cause).toBe('rain'); rainy++; }
    }
    expect(rainy).toBeGreaterThan(0);
  });

  it('is loud at the foot of the stair and far away across a huge floor, and the stair is where it is: ahead as you walk to it', () => {
    let t = 0;
    for (let k = MS.hour; k < 40 * MS.day; k += 20 * MS.min) { const sc = scene(k); if (sc.tide.depthDm > 0 && sc.tide.trend === 'falling') { t = k; break; } }
    expect(t).toBeGreaterThan(0);
    const st = hall.stairs[0]!;
    const at = wallPoint(hall, st.wall, st.pos);
    const cx = hall.xExtent / 2, cy = hall.yExtent / 2;
    const vx = cx - at.x, vy = cy - at.y, len = Math.hypot(vx, vy) || 1;
    const head = (p: { x: number; y: number }) => (((Math.atan2(at.x - p.x, at.y - p.y) * 180) / Math.PI) + 360) % 360;
    const near = { x: at.x + (vx / len) * 4, y: at.y + (vy / len) * 4 };
    const far = { x: at.x + (vx / len) * Math.min(150, len * 1.8), y: at.y + (vy / len) * Math.min(150, len * 1.8) };
    const aNear = audioFor(w, scene(t), { portals: false, pose: { ...near, heading: head(near) } });
    const aFar = audioFor(w, scene(t), { portals: false, pose: { ...far, heading: head(far) } });
    expect(aNear.stairs.flow).toBeGreaterThan(aFar.stairs.flow * 1.5);
    expect(aFar.stairs.flow).toBeGreaterThan(0);
    expect(aNear.stairs.bearing).toBe('ahead');
    expect(Math.abs(aNear.stairs.az!)).toBeLessThan(35);
    expect(soundParagraph(aNear, scene(t))).toMatch(/great stair|the tide drains/);
  });
});
