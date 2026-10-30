import { describe, expect, it } from 'vitest';
import { outsideAt, outsideEventForDay, type OutsideKind } from '../src/sim/outside';
import { sceneAtWorldTime } from '../src/sim/scene';
import { MS } from '../src/sim/time';
import { getHall } from '../src/world/hall';
import { createWorld } from '../src/world/world';

const w = createWorld('test-seed');
const days = (n: number) => Array.from({ length: n }, (_, i) => i);

describe('outside traces are rare and fixed in time', () => {
  it('is deterministic', () => {
    for (const d of days(50)) expect(outsideEventForDay(w, d)).toEqual(outsideEventForDay(createWorld('test-seed'), d));
  });
  it('about two days in five have one, at most one a day, most days none', () => {
    const ev = days(600).map((d) => outsideEventForDay(w, d)).filter((e) => e !== null);
    expect(ev.length / 600).toBeGreaterThan(0.33);
    expect(ev.length / 600).toBeLessThan(0.47);
    expect(ev.length / 600).toBeLessThan(0.5);
  });
  it('mostly in the First Vestibule\'s south-east corner, between the two minotaurs', () => {
    const ev = days(800).map((d) => outsideEventForDay(w, d)).filter((e) => e !== null);
    const origin = ev.filter((e) => e.x === 0 && e.y === 0);
    expect(origin.length / ev.length).toBeGreaterThan(0.78);
    expect(origin.length / ev.length).toBeLessThan(0.92);
    for (const e of origin) { expect(e.corner).toBe(true); expect(e.wall).toBe('S'); expect(e.pos).toBe(930); }
    for (const e of ev.filter((x) => !(x.x === 0 && x.y === 0))) { expect(Math.abs(e.x)).toBeLessThanOrEqual(12); expect(Math.abs(e.y)).toBeLessThanOrEqual(12); }
  });
  it('each event fits inside its own day and is brief', () => {
    for (const d of days(300)) {
      const e = outsideEventForDay(w, d);
      if (!e) continue;
      expect(e.startMs).toBeGreaterThanOrEqual(d * MS.day);
      expect(e.endMs).toBeLessThan((d + 1) * MS.day);
      expect(e.endMs - e.startMs).toBeLessThanOrEqual(2 * MS.min);
    }
  });
  it('the kinds follow their weights: draught, voices, traffic, wrapper', () => {
    const n: Record<OutsideKind, number> = { draught: 0, voices: 0, traffic: 0, wrapper: 0 };
    for (const d of days(2000)) { const e = outsideEventForDay(w, d); if (e) n[e.kind]++; }
    const total = Object.values(n).reduce((a, b) => a + b, 0);
    expect(n.draught / total).toBeGreaterThan(0.33);
    expect(n.draught / total).toBeLessThan(0.47);
    expect(n.traffic / total).toBeLessThan(n.voices / total);
    expect(n.voices / total).toBeLessThan(n.draught / total);
  });
});

describe('perceiving one', () => {
  const day = days(60).find((d) => { const e = outsideEventForDay(w, d); return e && e.x === 0 && e.y === 0 && e.kind === 'draught'; })!;
  const e = outsideEventForDay(w, day)!;
  const hall = getHall(w, 0, 0, 1);

  it('happens only inside its window, only in its hall, only on the middle level', () => {
    const mid = (e.startMs + e.endMs) / 2;
    expect(outsideAt(w, hall, mid)).not.toBeNull();
    expect(outsideAt(w, hall, e.startMs - 1)).toBeNull();
    expect(outsideAt(w, hall, e.endMs)).toBeNull();
    expect(outsideAt(w, getHall(w, 1, 0, 1), mid)).toBeNull();
    expect(outsideAt(w, getHall(w, 0, 0, 2), mid)).toBeNull();
    expect(outsideAt(w, getHall(w, 0, 0, 0), mid)).toBeNull();
  });
  it('rises gently, holds, and fades', () => {
    const g = (p: number) => outsideAt(w, hall, e.startMs + p * (e.endMs - e.startMs))!.gain;
    expect(g(0.02)).toBeLessThan(g(0.1));
    expect(g(0.1)).toBeLessThan(g(0.3));
    expect(g(0.3)).toBe(1);
    expect(g(0.6)).toBe(1);
    expect(g(0.85)).toBeLessThan(1);
    expect(g(0.98)).toBeLessThan(g(0.85));
    for (let p = 0.01; p < 1; p += 0.05) { expect(g(p)).toBeGreaterThanOrEqual(0); expect(g(p)).toBeLessThanOrEqual(1); }
  });
  it('is part of the scene, and can be switched off', () => {
    const mid = Math.floor((e.startMs + e.endMs) / 2);
    expect(sceneAtWorldTime(w, 0, 0, 1, mid).outside?.event.kind).toBe('draught');
    expect(sceneAtWorldTime(w, 0, 0, 1, mid, { outside: false }).outside).toBeNull();
  });
  it('never touches a Drowned Hall or the dark hall', () => {
    for (let d = 0; d < 400; d++) {
      const ev = outsideEventForDay(w, d);
      if (!ev) continue;
      const mid = Math.floor((ev.startMs + ev.endMs) / 2);
      expect(outsideAt(w, getHall(w, 6, 0, 1), mid)).toBeNull();
      expect(outsideAt(w, getHall(w, -192, 0, 1), mid)).toBeNull();
    }
  });
});
