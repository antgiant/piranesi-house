import { describe, expect, it } from 'vitest';
import { Playlist, MAX_PASSAGES, RESTART_AFTER_MS } from '../src/web/playlist';

const make = (n: number): Playlist<number> => { const p = new Playlist<number>(); for (let i = 0; i < n; i++) p.record(`passage ${i}`, i); return p; };

describe('the playlist of a wander', () => {
  it('follows the live end as passages arrive', () => {
    const p = make(3);
    expect(p.cursor).toBe(2);
    expect(p.replaying).toBe(false);
    expect(p.current()?.text).toBe('passage 2');
  });
  it('skips back to the previous passage, or restarts this one if it has been playing a while', () => {
    const p = make(4);
    expect(p.back(RESTART_AFTER_MS + 1)?.text).toBe('passage 3');
    expect(p.back(100)?.text).toBe('passage 2');
    expect(p.replaying).toBe(true);
    expect(p.back(100)?.text).toBe('passage 1');
    expect(p.back(100)?.text).toBe('passage 0');
    expect(p.back(100)?.text).toBe('passage 0');
  });
  it('skips forward to the live end, where the House must move on instead', () => {
    const p = make(3);
    p.back(0); p.back(0);
    expect(p.forward()?.text).toBe('passage 1');
    expect(p.forward()?.text).toBe('passage 2');
    expect(p.forward()).toBeNull();
    expect(p.replaying).toBe(false);
  });
  it('plays on through the passages after a replay, then returns to live', () => {
    const p = make(3);
    p.back(0); p.back(0);
    expect(p.finished()?.text).toBe('passage 1');
    expect(p.finished()?.text).toBe('passage 2');
    expect(p.finished()).toBeNull();
  });
  it('does not drag the cursor to new passages while an old one is being heard', () => {
    const p = make(3);
    p.back(0);
    p.record('new', 9);
    expect(p.cursor).toBe(1);
    expect(p.replaying).toBe(true);
  });
  it('lets the oldest go past its limit, keeping the cursor on the same passage', () => {
    const p = make(MAX_PASSAGES);
    p.back(0);
    const was = p.current()?.text;
    p.record('x', 0);
    expect(p.length).toBe(MAX_PASSAGES);
    expect(p.current()?.text).toBe(was);
  });
  it('has nothing to go back to when empty', () => {
    expect(new Playlist().back(0)).toBeNull();
    expect(new Playlist().forward()).toBeNull();
  });
});
