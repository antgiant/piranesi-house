import { describe, expect, it } from 'vitest';
import { bestVoice, speakable } from '../src/web/speech';

describe('narration', () => {
  it('prefers a calm British voice, and a natural one, and avoids novelty voices', () => {
    const voices = [
      { name: 'Samantha', lang: 'en-US' },
      { name: 'Zarvox', lang: 'en-US' },
      { name: 'Google UK English Male', lang: 'en-GB' },
      { name: 'Microsoft Ryan Online (Natural) - English (United Kingdom)', lang: 'en-GB' },
      { name: 'Amélie', lang: 'fr-FR' },
    ];
    expect(bestVoice(voices)?.name).toContain('Ryan');
    expect(bestVoice(voices.slice(0, 3))?.name).toBe('Google UK English Male');
    expect(bestVoice([{ name: 'Amélie', lang: 'fr-FR' }, { name: 'Samantha', lang: 'en-US' }])?.name).toBe('Samantha');
    expect(bestVoice([])).toBeUndefined();
  });
  it('reads door numbers as words and splits into sentences', () => {
    const s = speakable('Ways out:\n[1] North wall: A Hall\n[2] East wall: B Hall');
    expect(s.join(' ')).toContain('Number 1,');
    expect(s.join(' ')).not.toContain('[');
  });
});
