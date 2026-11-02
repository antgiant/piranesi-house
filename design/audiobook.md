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
  speech keeps going with the screen off is up to the device (iOS tends to stop it); the controls are offered either way.

Tests: `tests/playlist.test.ts`, and the "audiobook" block of the end-to-end test (Play/Pause, Back, Forward, mute, phone width, settings sheet).
