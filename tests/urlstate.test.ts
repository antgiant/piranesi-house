import { describe, expect, it } from 'vitest';
import { parseRoom, withRoom, withoutRoom } from '../src/web/urlstate';
import { cellName } from '../src/world/layout';
import { createWorld } from '../src/world/world';

const w = createWorld('the-house');

describe('the address and the room', () => {
  it('names the hall, and names it back to the same hall, for every hall near home and on every level', () => {
    for (let x = -8; x <= 8; x++) for (let y = -8; y <= 8; y++) for (const level of [0, 1, 2] as const) {
      const hash = withRoom('', w, { x, y, level }, 'the-house', 'the-house');
      expect(parseRoom(w, hash), hash).toEqual({ x, y, level });
    }
  });
  it('reads like words: the hall\'s own name, level only when not the middle one, seed only when not the usual world', () => {
    expect(withRoom('', w, { x: -5, y: 0, level: 1 }, 'the-house', 'the-house')).toBe(`#room=${encodeURIComponent(cellName(w, -5, 0)).replace(/%20/g, '+')}`);
    expect(withRoom('', w, { x: 0, y: 0, level: 2 }, 'the-house', 'the-house')).toContain('level=upper');
    expect(withRoom('', w, { x: 0, y: 0, level: 0 }, 'the-house', 'the-house')).toContain('level=lower');
    expect(withRoom('', w, { x: 0, y: 0, level: 1 }, 'the-house', 'the-house')).not.toContain('level');
    expect(withRoom('', w, { x: 0, y: 0, level: 1 }, 'my-seed', 'the-house')).toContain('seed=my-seed');
    expect(withRoom('#seed=my-seed', w, { x: 0, y: 0, level: 1 }, 'the-house', 'the-house')).not.toContain('seed');
  });
  it('keeps other parts of the fragment as they are, and replaces the room', () => {
    const h = withRoom('#debug&pace=instant&room=Old+Place&level=upper', w, { x: -1, y: 0, level: 1 }, 'the-house', 'the-house');
    const q = new URLSearchParams(h.slice(1));
    expect(q.get('pace')).toBe('instant');
    expect(q.has('debug')).toBe(true);
    expect(q.get('room')).toBe('First Western Hall');
    expect(q.has('level')).toBe(false);
  });
  it('understands a hand-written address, and ignores nonsense', () => {
    expect(parseRoom(w, '#room=first+western+hall')).toEqual({ x: -1, y: 0, level: 1 });
    expect(parseRoom(w, '#room=Ninth%20Vestibule&level=lower')?.level).toBe(0);
    expect(parseRoom(w, '#room=Eighty-Eighth%20Western%20Hall')).toEqual({ x: -88, y: 0, level: 1 });
    expect(parseRoom(w, '#room=nowhere')).toBeNull();
    expect(parseRoom(w, '#level=upper')).toBeNull();
    expect(parseRoom(w, '')).toBeNull();
    expect(parseRoom(w, '#room=First+Western+Hall&level=sideways')).toEqual({ x: -1, y: 0, level: 1 });
  });
  it('can drop the room to start afresh', () => {
    expect(withoutRoom('#room=X&level=upper&pace=instant')).toBe('#pace=instant');
    expect(withoutRoom('#room=X')).toBe('');
  });
});
