// Keeping the House going when the screen is locked or the page is in the background, and the lock-screen / headset controls.
// Browsers stop pages that make no sound, so while playing we hold a silent audio element open (the trick every web audio player
// uses), and register with the Media Session so play, pause, previous and next work from the lock screen, a headset or a car.
// Whether speech itself keeps going with the screen off depends on the device; the controls are offered either way.

/** One second of silence as a WAV file, built here so nothing has to be downloaded. */
export function silentWav(seconds = 1, rate = 8000): Uint8Array {
  const n = Math.floor(seconds * rate);
  const b = new Uint8Array(44 + n);
  const w = (o: number, s: string): void => { for (let i = 0; i < s.length; i++) b[o + i] = s.charCodeAt(i); };
  const u32 = (o: number, v: number): void => { b[o] = v & 255; b[o + 1] = (v >> 8) & 255; b[o + 2] = (v >> 16) & 255; b[o + 3] = (v >> 24) & 255; };
  const u16 = (o: number, v: number): void => { b[o] = v & 255; b[o + 1] = (v >> 8) & 255; };
  w(0, 'RIFF'); u32(4, 36 + n); w(8, 'WAVE'); w(12, 'fmt '); u32(16, 16); u16(20, 1); u16(22, 1); u32(24, rate); u32(28, rate); u16(32, 1); u16(34, 8);
  w(36, 'data'); u32(40, n);
  b.fill(128, 44); // 8-bit silence is the midpoint
  return b;
}

/**
 * iPhones and iPads. There, playing an audio element takes over the device's audio session and silences the browser's speech voice,
 * so the keep-alive sound does the opposite of its job: it must not be used. (iPadOS reports itself as a Mac with a touch screen.)
 */
export function isIOS(ua: string, platform: string, touchPoints: number): boolean {
  return /iPad|iPhone|iPod/.test(ua) || (platform === 'MacIntel' && touchPoints > 1);
}

export class BackgroundKeeper {
  private el: HTMLAudioElement | null = null;
  private url = '';

  /** Start (must be called from a click or key press). */
  start(): void {
    if (typeof Audio === 'undefined' || typeof navigator === 'undefined') return;
    if (isIOS(navigator.userAgent, navigator.platform, navigator.maxTouchPoints ?? 0)) return;
    try {
      if (!this.el) {
        this.url = URL.createObjectURL(new Blob([silentWav().buffer as ArrayBuffer], { type: 'audio/wav' }));
        this.el = new Audio(this.url);
        this.el.loop = true;
        this.el.volume = 0.01;
      }
      void this.el.play().catch(() => { /* not allowed yet: harmless */ });
    } catch { /* no audio element: nothing to keep alive */ }
  }
  stop(): void { try { this.el?.pause(); } catch { /* ignore */ } }
}

export interface Transport {
  play(): void;
  pause(): void;
  previous(): void;
  next(): void;
}

/** Register the lock-screen / headset controls. Safe where the Media Session API does not exist. */
export function bindMediaSession(t: Transport): void {
  const ms = (typeof navigator !== 'undefined' ? navigator.mediaSession : undefined) as MediaSession | undefined;
  if (!ms) return;
  const set = (a: MediaSessionAction, f: () => void): void => { try { ms.setActionHandler(a, f); } catch { /* an action this browser lacks */ } };
  set('play', t.play);
  set('pause', t.pause);
  set('previoustrack', t.previous);
  set('nexttrack', t.next);
  set('seekbackward', t.previous);
  set('seekforward', t.next);
}

export function describeSession(title: string, playing: boolean): void {
  const ms = (typeof navigator !== 'undefined' ? navigator.mediaSession : undefined) as MediaSession | undefined;
  if (!ms) return;
  try {
    ms.metadata = new MediaMetadata({ title, artist: 'Piranesi’s House', album: 'A wander' });
    ms.playbackState = playing ? 'playing' : 'paused';
  } catch { /* ignore */ }
}
