import { describe, expect, it } from 'vitest';
import { Playlist, MAX_PASSAGES, RESTART_AFTER_MS } from '../src/web/playlist';
import { silentWav, isIOS } from '../src/web/background';

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

describe('the silent keep-alive sound', () => {
  it('is a well-formed WAV file of silence', () => {
    const w = silentWav(1, 8000);
    expect(String.fromCharCode(...w.slice(0, 4))).toBe('RIFF');
    expect(String.fromCharCode(...w.slice(8, 12))).toBe('WAVE');
    expect(w.length).toBe(44 + 8000);
    expect(new Set(w.slice(44))).toEqual(new Set([128]));
  });
});

describe('the keep-alive sound is not used on iPhones', () => {
  it('knows iPhones, iPads (including ones posing as Macs) and not other devices', () => {
    expect(isIOS('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', 'iPhone', 5)).toBe(true);
    expect(isIOS('Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X)', 'iPad', 5)).toBe(true);
    expect(isIOS('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'MacIntel', 5)).toBe(true);
    expect(isIOS('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'MacIntel', 0)).toBe(false);
    expect(isIOS('Mozilla/5.0 (Linux; Android 14)', 'Linux armv8l', 5)).toBe(false);
  });
});
