import { describe, expect, it } from 'vitest';
import { audioFor } from '../src/audio/director';
import { diffScenes, look, newGame, run, sceneNow, step, tick, type Game, type Line } from '../src/game/game';
import { describeHall } from '../src/game/narrator';
import { parse } from '../src/game/parser';
import { nextJoin, tideAt } from '../src/sim/tides';
import { sceneAtWorldTime } from '../src/sim/scene';
import { MS } from '../src/sim/time';
import { getHall } from '../src/world/hall';
import { exits, parseCellName, vestibuleCell, type Level } from '../src/world/layout';
import { createWorld } from '../src/world/world';

const NOW = Date.UTC(2026, 5, 10, 9, 0);
/** Most of these tests are about where doors lead, not how long it takes to walk there. */
const FAST = { walkPace: Infinity };
const all = (lines: Line[]): string => lines.map((l) => l.text).join('\n');
const at = (g: Game, name: string, level: Level = 1) => {
  const c = parseCellName(g.world, name)!;
  g.pos = { x: c.x, y: c.y, level, wall: null, pos: 500 };
  return c;
};

describe('arrival', () => {
  it('starts in the First Vestibule with the minotaurs in view', () => {
    const g = newGame({}, NOW);
    const out = all(look(g, NOW));
    expect(out).toContain('First Vestibule');
    expect(out).toMatch(/massive minotaur/i);
    expect(out).toMatch(/great staircase/i);
    expect(out).not.toMatch(/Ways out|\[\d+\]/); // prose, not a menu
    expect(all(look(g, NOW, false, false, true))).toContain('Ways out');
    expect(g.exitsListed.length).toBeGreaterThanOrEqual(5);
  });
  it('offers clickable ways out and statues', () => {
    const g = newGame({}, NOW);
    const lines = look(g, NOW);
    const links = lines.flatMap((l) => l.links ?? []);
    expect(links.some((l) => l.command === 'go 1')).toBe(true);
    expect(links.some((l) => /door/.test(l.label))).toBe(true);
    expect(links.some((l) => /^\d/.test(l.label))).toBe(false); // buttons are named, not numbered
    const ref = look(g, NOW, false, false, true).flatMap((l) => l.links ?? []);
    expect(ref.some((l) => l.command.startsWith('examine'))).toBe(true);
    expect(links.map((l) => l.command)).toContain('listen');
    expect(links.map((l) => l.command)).toContain('down');
  });
});

describe('the dog-fox route, played with commands (ROUTE-DOGFOX)', () => {
  it('leads from the First Vestibule to the Fourth Western Hall and its fox', () => {
    const g = newGame(FAST, NOW);
    look(g, NOW);
    expect(all(step(g, 'go west', NOW))).toContain('First Western Hall');
    expect(all(step(g, 'list', NOW))).toMatch(/horned figure/i);
    expect(all(step(g, 'go north 3', NOW))).toContain('First North-Western Hall');
    const out = all(step(g, 'go south 1', NOW));
    expect(out).toContain('Fourth Western Hall');
    expect(out).toContain('long passage');
    expect(out).toMatch(/dog-fox/i);
    expect(all(step(g, 'examine fox', NOW))).toMatch(/dog-fox/i);
  });
});

describe('rules of movement', () => {
  it('will not cross into a Drowned Hall', () => {
    const g = newGame({}, NOW);
    let tried = false;
    for (let y = -2; y <= 2 && !tried; y++) {
      const e = exits(g.world, 2, y, 1).find((d) => d.to.x === 3 && d.to.y === y && d.corridor === 0);
      if (!e) continue;
      g.pos = { x: 2, y, level: 1, wall: null, pos: 500 };
      look(g, NOW);
      const out = all(step(g, `go ${e.side === 'E' ? 'east' : 'east'}`, NOW));
      expect(out).toMatch(/still water|no way across/);
      expect(g.pos.x).toBe(2);
      tried = true;
    }
    expect(tried).toBe(true);
  });
  it('will not wade into the great join', () => {
    const w = createWorld('the-house');
    const j = nextJoin(w, 0);
    const g = newGame({ startAtWorldMs: j }, NOW);
    const ninth = vestibuleCell(g.world, 9)!;
    const e = exits(g.world, ninth.x, ninth.y + 1, 1).find((d) => d.to.x === ninth.x && d.to.y === ninth.y)!;
    g.pos = { x: ninth.x, y: ninth.y + 1, level: 1, wall: null, pos: 500 };
    look(g, NOW);
    const out = all(step(g, `go ${e.side === 'N' ? 'north' : e.side === 'S' ? 'south' : e.side === 'E' ? 'east' : 'west'}`, NOW));
    expect(out).toMatch(/cannot cross it now/);
    expect(g.pos).toMatchObject({ x: ninth.x, y: ninth.y + 1 });
  });
  it('climbs and descends the great stair in vestibules only', () => {
    const g = newGame(FAST, NOW);
    expect(all(step(g, 'up', NOW))).toContain('upper halls');
    expect(g.pos.level).toBe(2);
    expect(all(step(g, 'up', NOW))).toMatch(/ends in the upper halls/);
    step(g, 'down', NOW);
    expect(g.pos.level).toBe(1);
    at(g, 'First Western Hall');
    expect(all(step(g, 'up', NOW))).toMatch(/no staircase/i);
  });
  it('stops at the water\'s edge on the stair to the sea', () => {
    const g = newGame(FAST, NOW);
    const out = all(step(g, 'down', NOW));
    expect(out).toMatch(/water/i);
    expect(g.pos.level === 1 || g.pos.level === 0).toBe(true);
  });
  it('walks along a wall and then sees that wall\'s statues', () => {
    const g = newGame(FAST, NOW);
    expect(all(step(g, 'walk east', NOW))).toContain('You walk to the east wall');
    expect(g.pos.wall).toBe('E');
    expect(g.seenListed.every((s) => s.statue.wall === 'E' || s.statue.canonId)).toBe(true);
  });
});

describe('the prose agrees with the simulation', () => {
  it('describes water exactly when the hall is wet, and weed exactly where the tide reaches', () => {
    const g = newGame({}, NOW);
    let wet = 0;
    for (let t = 0; t < 6 * MS.day; t += 7 * MS.hour) {
      for (const [name, level] of [['Second Southern Hall', 1], ['Fourth Western Hall', 1], ['Ninth Vestibule', 1]] as const) {
        const c = at(g, name, level);
        const s = sceneAtWorldTime(g.world, c.x, c.y, level, t);
        g.cfg.realZeroMs = NOW - t;
        const out = all(look(g, NOW, true));
        const hasDepthWords = /ankle-deep|knee-deep|waist-deep|heaving mass of water/.test(out);
        expect(hasDepthWords, `${name} @${t}`).toBe(s.tide.depthDm > 0);
        if (s.tide.depthDm > 0) wet++;
        expect(/hung with weed and crusted with shells/.test(out)).toBe(s.hall.tideReachDm > 0);
      }
    }
    expect(wet).toBeGreaterThan(0);
  });
  it('lists exactly the doors the hall has', () => {
    const g = newGame({}, NOW);
    for (const name of ['First Western Hall', 'Ninth Vestibule', 'Fifth North-Western Hall', 'Third North-Western Hall']) {
      const c = at(g, name);
      look(g, NOW);
      const h = getHall(g.world, c.x, c.y, 1);
      const total = h.doors.N.length + h.doors.E.length + h.doors.S.length + h.doors.W.length;
      expect(g.exitsListed).toHaveLength(total);
    }
  });
  it('mentions windows only if there are some, and courtyard sides when there are', () => {
    const g = newGame({}, NOW);
    at(g, 'One-Hundred-and-Ninety-Second Western Hall');
    expect(all(look(g, NOW, true))).toMatch(/no windows at all/);
    at(g, 'Fourth Western Hall');
    const out = all(look(g, NOW, true));
    expect(out).toMatch(/courtyard with (three|four|six|eight) sides/);
    expect(out).not.toMatch(/no windows at all/);
  });
  it('shows the Dead only when asked, and the empty place either way', () => {
    const on = newGame({ showDead: true }, NOW);
    const off = newGame({ showDead: false }, NOW);
    at(on, 'Third North-Western Hall');
    at(off, 'Third North-Western Hall');
    expect(all(look(on, NOW))).toMatch(/skeleton/);
    const o = all(look(off, NOW));
    expect(o).not.toMatch(/skeleton|bones/);
    expect(o).toMatch(/empty niche/);
  });
  it('describes the dark hall as dark, and a violent hall as violent', () => {
    const g = newGame({}, NOW);
    at(g, 'One-Hundred-and-Ninety-Second Western Hall');
    expect(all(look(g, NOW))).toMatch(/dark|no light/i);
    const c = parseCellName(g.world, 'Nineteenth Eastern Hall')!;
    g.pos = { x: c.x, y: c.y, level: 2, wall: null, pos: 500 };
    expect(all(look(g, NOW))).toMatch(/violen|rage and terror|cry/i);
  });
  it('is deterministic', () => {
    const a = newGame({}, NOW);
    const b = newGame({}, NOW);
    expect(all(look(a, NOW))).toBe(all(look(b, NOW)));
  });
  it('the diary style capitalises the House\'s nouns, and plain does not', () => {
    const plain = all(look(newGame({ style: 'plain' }, NOW), NOW));
    const diary = all(look(newGame({ style: 'diary' }, NOW), NOW));
    expect(diary).toMatch(/Statues/);
    expect(plain).not.toMatch(/\bStatues cover/);
  });
  it('contains nothing from the excluded story material', () => {
    const g = newGame({}, NOW);
    const text = [all(look(g, NOW))];
    for (const n of ['Second Southern Hall', 'Ninth Vestibule', 'Fourth Western Hall', 'First Western Hall']) { at(g, n); text.push(all(look(g, NOW))); }
    expect(text.join(' ')).not.toMatch(/\b(Other|Prophet|Piranesi|Ketterley|Sixteenth Person|ritual|Knowledge)\b/);
  });
});

describe('live events', () => {
  it('announces the tide arriving and leaving exactly when the hall gets wet or dry', () => {
    const g = newGame({}, NOW);
    const c = at(g, 'Second Southern Hall');
    const h = getHall(g.world, c.x, c.y, 1);
    let sawArrive = false;
    let sawLeave = false;
    for (let t = 0; t < 4 * MS.day && !(sawArrive && sawLeave); t += MS.min) {
      const a = sceneAtWorldTime(g.world, c.x, c.y, 1, t);
      const b = sceneAtWorldTime(g.world, c.x, c.y, 1, t + MS.min);
      const ev = diffScenes(a, b, audioFor(g.world, b)).join(' ');
      const wasWet = tideAt(g.world, h, t).depthDm > 0;
      const isWet = tideAt(g.world, h, t + MS.min).depthDm > 0;
      if (!wasWet && isWet) { sawArrive = true; expect(ev).toMatch(/Water comes|roar/); }
      if (wasWet && !isWet) { sawLeave = true; expect(ev).toMatch(/drains away/); }
      if (wasWet === isWet) expect(ev).not.toMatch(/Water comes|drains away/);
    }
    expect(sawArrive && sawLeave).toBe(true);
  });
  it('tick says nothing until something changes, and says "nothing changes" on a wait', () => {
    const g = newGame({}, NOW);
    look(g, NOW);
    expect(tick(g, NOW)).toEqual([]);
    expect(run(g, parse('wait'), NOW).map((l) => l.text).join(' ')).toMatch(/You wait/);
  });
});

describe('describeHall is a pure function of its inputs', () => {
  it('gives the same text twice', () => {
    const g = newGame({}, NOW);
    const s = sceneNow(g, NOW);
    const a = audioFor(g.world, s);
    expect(describeHall(s.hall, s, a, [], [])).toEqual(describeHall(s.hall, s, a, [], []));
  });
});
