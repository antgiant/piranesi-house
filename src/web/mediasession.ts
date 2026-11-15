// The lock screen and Control Centre (iOS), the notification shade (Android) and media keys: what is playing, and play and pause.
// Only has an effect while a media element is playing (see src/audio/background.ts), which on iOS is how the House keeps going in the background.

export interface MediaHandlers { play: () => void; pause: () => void }

export function installMediaSession(h: MediaHandlers): { state: (playing: boolean) => void } {
  const ms = typeof navigator !== 'undefined' ? navigator.mediaSession : undefined;
  if (!ms) return { state: () => undefined };
  try {
    const icon = (f: string): string => new URL(f, document.baseURI).href;
    ms.metadata = new MediaMetadata({
      title: 'The House',
      artist: 'Piranesi’s House',
      album: 'Halls, tides and weather',
      artwork: [
        { src: icon('icon-192.png'), sizes: '192x192', type: 'image/png' },
        { src: icon('icon-512.png'), sizes: '512x512', type: 'image/png' },
      ],
    });
    ms.setActionHandler('play', h.play);
    ms.setActionHandler('pause', h.pause);
    ms.setActionHandler('stop', h.pause);
  } catch { /* an older browser: no lock-screen controls, the sound still plays */ }
  return { state: (playing) => { try { ms.playbackState = playing ? 'playing' : 'paused'; } catch { /* not offered */ } } };
}
