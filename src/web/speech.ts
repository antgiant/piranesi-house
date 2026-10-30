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

export class Narrator {
  enabled = false;
  rate = 1;
  voiceURI = '';
  private pending = 0;

  get supported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  }
  voices(): SpeechSynthesisVoice[] {
    return this.supported ? window.speechSynthesis.getVoices() : [];
  }
  /** True while anything is being read or waiting to be. */
  get busy(): boolean {
    return this.enabled && this.supported && (this.pending > 0 || window.speechSynthesis.speaking);
  }
  speak(text: string): void {
    if (!this.enabled || !this.supported) return;
    const voice = this.voices().find((v) => v.voiceURI === this.voiceURI) ?? this.voices().find((v) => v.lang.toLowerCase().startsWith('en'));
    // Sentence by sentence: some browsers stop in the middle of one long utterance.
    for (const s of speakable(text)) {
      const u = new SpeechSynthesisUtterance(s);
      u.rate = this.rate;
      if (voice) { u.voice = voice; u.lang = voice.lang; }
      this.pending++;
      const done = (): void => { this.pending = Math.max(0, this.pending - 1); };
      u.onend = done;
      u.onerror = done;
      window.speechSynthesis.speak(u);
    }
  }
  cancel(): void {
    if (!this.supported) return;
    this.pending = 0;
    window.speechSynthesis.cancel();
  }
}
