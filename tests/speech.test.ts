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

describe('narrator busy state', () => {
  it('stays busy until every sentence has ended, then records when it was last busy', async () => {
    const { Narrator } = await import('../src/web/speech');
    const queue: { onend?: () => void }[] = [];
    const g = globalThis as Record<string, unknown>;
    g.window = g;
    g.SpeechSynthesisUtterance = function (this: { text: string }, t: string) { this.text = t; };
    g.speechSynthesis = { speaking: false, getVoices: () => [], cancel() { queue.length = 0; }, speak(u: { onend?: () => void }) { queue.push(u); } };
    const n = new Narrator();
    n.enabled = true;
    n.speak('One sentence. Two sentences. Three.');
    expect(queue.length).toBe(3);
    expect(n.busy).toBe(true);
    queue.shift()?.onend?.();
    queue.shift()?.onend?.();
    expect(n.busy).toBe(true);
    queue.shift()?.onend?.();
    expect(n.busy).toBe(false);
    expect(n.lastBusyMs).toBeGreaterThan(0);
    n.speak('Again.');
    n.cancel();
    expect(n.busy).toBe(false);
  });
});
