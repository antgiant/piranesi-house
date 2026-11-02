# Listening controls and the audiobook (milestone 4k)

The bar has one clear row for listening and a few tools.

* **Play / Pause** (was "Wander"). Play starts the wander, and the button becomes Pause. Reading aloud follows the *Read aloud* setting:
  Never, **Only while playing** (the default), or Always. Pause holds still; if it paused in the middle of a reading, Play begins that passage again,
  as an audiobook does.
* **Back / Forward.** Every passage described or narrated is kept in order (`src/web/playlist.ts`, the newest 300). Back hears the last passage again
  (or starts this one over if it has been playing for more than 3 seconds); Forward goes on through passages already heard, and at the live end
  cuts the reading short and lets the House take its next step. While an earlier passage is replayed the House waits; when the replay reaches the
  live end the wander carries on. The passage being replayed is marked in the log. Keys: `w` play/pause, `,` back, `.` forward.
* **Mute** is one button for both the House's sounds and the reading aloud. Settings says which of the two it silences (both by default). Muted,
  a wander paces itself by reading time, as it does with no voice.
* **Settings** holds the rest, in labelled groups: Sound and reading aloud, Reading, Getting about, The House, Your journey (Share, carry,
  save what I have read, install, begin again), Help. On a phone it fills the screen with its Save and Cancel pinned at the foot.
* **Background and lock screen.** While playing, a silent audio element is held open (`src/web/background.ts`) and the Media Session API is
  registered, so play, pause, previous and next work from the lock screen, a headset or a car, and the screen is kept awake. Whether the browser's
  speech keeps going with the screen off is up to the device (iOS tends to stop it); the controls are offered either way. **Not on iPhone or iPad:** there an audio element takes over the audio session and silences the speech voice, so the silent keep-alive is skipped on iOS (`isIOS`) and only the Media Session and the screen wake lock are used.

Tests: `tests/playlist.test.ts`, and the "audiobook" block of the end-to-end test (Play/Pause, Back, Forward, mute, phone width, settings sheet).

## Speech and the sound engine on iPhone
On iOS, when the speech voice starts it takes over the audio session: the House's sounds drop out for a moment and Web Audio goes to an
"interrupted" state. Our engine used to call `resume()` at once, which took the session back and cut the voice off after half a syllable. So the
engine now **yields while speech is going** (`yieldToSpeech`, driven by the narrator's `onSpeaking` / `onSilent`) and resumes half a second after the
last sentence ends (or after a second with no speech, if a browser never reports the end). Also: Play takes the first step inside the tap, because iOS
only lets a page begin speaking from a tap; and no silent audio element and no Media Session on iOS.

Narration works on iPhone in the foreground. The ambience dropped out while the voice spoke, because iOS gives speech the whole audio session. To let the
two mix, the engine now asks for the "ambient" audio session type (`navigator.audioSession.type`, iOS 16.4 and later) when it starts; where that is
not offered, the engine still yields to the voice as before. With "ambient", iOS also follows the silent switch for the House's sounds.
