import { describe, expect, it } from 'vitest';
import { isIos } from '../src/audio/background';

describe('background listening: when the sound goes through an audio element', () => {
  it('is for iPhones and iPads, which stop a web page\'s sound when the screen locks', () => {
    expect(isIos('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15', 'iPhone', 5)).toBe(true);
    expect(isIos('Mozilla/5.0 (iPad; CPU OS 16_6 like Mac OS X) AppleWebKit/605.1.15', 'iPad', 5)).toBe(true);
  });
  it('catches an iPad that says it is a Mac (it has a touch screen; a Mac does not)', () => {
    expect(isIos('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15', 'MacIntel', 5)).toBe(true);
    expect(isIos('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15', 'MacIntel', 0)).toBe(false);
  });
  it('leaves everything else alone (a background tab elsewhere keeps its sound)', () => {
    expect(isIos('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0', 'Win32', 0)).toBe(false);
    expect(isIos('Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/120.0 Mobile', 'Linux armv8l', 5)).toBe(false);
  });
});
