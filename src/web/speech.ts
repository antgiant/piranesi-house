// Reading the House aloud with the browser's own speech voices (the Web Speech API). Nothing is sent anywhere by us;
// which voice you get, and whether it works offline, depends on your device.

/** Make a description comfortable to hear: door numbers read as numbers, no bracket marks. */
export function speakable(text: string): string[] {
  return text
    .replace(/\[(\d+)\]/g, 'Number $1,')
    .replace(/\n+/g, '. ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * How well a voice suits a calm, unhurried, British reading. Higher is better; negative is a poor fit.
 * Judged only from the voice's name, language and quality words, since browsers describe voices that way.
 */
export function voiceScore(v: { name: string; lang: string }): number {
  const lang = v.lang.replace('_', '-').toLowerCase();
  const name = v.name.toLowerCase();
  if (!lang.startsWith('en')) return -100;
  let s = 0;
  if (lang === 'en-gb') s += 40;
  else if (['en-ie', 'en-au', 'en-za', 'en-nz', 'en-in'].includes(lang)) s += 15;
  else if (lang === 'en-us') s += 5;
  // Quality tiers browsers and systems use for their better voices.
  if (/natural|neural|premium|enhanced|online/.test(name)) s += 25;
  // A warm, lower, male-sounding voice is the closest to a quiet, thoughtful reader.
  if (/\b(daniel|arthur|oliver|ryan|george|thomas|james|male|rishi|hamish|alfie|gordon)\b/.test(name)) s += 20;
  if (/\b(female|samantha|karen|kate|serena|libby|sonia|susan|moira|fiona)\b/.test(name)) s -= 10;
  // Novelty and robotic system voices.
  if (/espeak|compact|fred|zarvox|bad news|bells|whisper|jester|organ|trinoids|albert|boing/.test(name)) s -= 60;
  return s;
}

/** The best-suited voice, or undefined if there are none. */
export function bestVoice<T extends { name: string; lang: string }>(voices: T[]): T | undefined {
  return voices.slice().sort((a, b) => voiceScore(b) - voiceScore(a))[0];
}

export class Narrator {
  enabled = false;
  /** Silenced by the mute button: nothing is spoken, and nothing counts as being read. */
  muted = false;
  /** Slightly slower than ordinary speech: a peaceful pace. */
  rate = 0.9;
  pitch = 0.92;
  voiceURI = '';
  /** Called as each sentence starts and ends: the page uses it to make sure the sound is still running. */
  onActivity: (() => void) | null = null;
  private pending = 0;
  /** When it was last reading (or about to), in ms; used to leave a breath after the end of a reading. */
  lastBusyMs = 0;
  /** Latest moment the queue is expected to finish by, as a safety net if a browser never reports the end. */
  private giveUpAtMs = 0;

  get supported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  }
  voices(): SpeechSynthesisVoice[] {
    return this.supported ? window.speechSynthesis.getVoices() : [];
  }
  /** Reading aloud now: switched on, and not muted. */
  get active(): boolean { return this.enabled && !this.muted && this.supported; }
  /** True while anything is being read or waiting to be. */
  get busy(): boolean {
    if (!this.active) return false;
    const reading = (this.pending > 0 || window.speechSynthesis.speaking) && Date.now() < this.giveUpAtMs;
    if (reading) this.lastBusyMs = Date.now();
    return reading;
  }
  speak(text: string): void {
    if (!this.active) return;
    const voice = this.voices().find((v) => v.voiceURI === this.voiceURI) ?? bestVoice(this.voices());
    // Sentence by sentence: some browsers stop in the middle of one long utterance.
    // About 100 ms a character at the slowest speed, plus slack: after this we stop trusting the browser's 'ended' events.
    this.giveUpAtMs = Math.max(this.giveUpAtMs, Date.now()) + (text.length * 100) / this.rate + 5000;
    this.lastBusyMs = Date.now();
    for (const s of speakable(text)) {
      const u = new SpeechSynthesisUtterance(s);
      u.rate = this.rate;
      u.pitch = this.pitch;
      if (voice) { u.voice = voice; u.lang = voice.lang; }
      this.pending++;
      const done = (): void => { this.pending = Math.max(0, this.pending - 1); this.onActivity?.(); };
      u.onstart = () => this.onActivity?.();
      u.onend = done;
      u.onerror = done;
      window.speechSynthesis.speak(u);
    }
  }
  cancel(): void {
    if (!this.supported) return;
    this.pending = 0;
    this.giveUpAtMs = 0;
    window.speechSynthesis.cancel();
  }
}
