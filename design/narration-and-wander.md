# Narration and wander (milestone 4c)

## Narration (`src/web/speech.ts`)
* Setting **Read descriptions aloud**, off until chosen (speech starting by itself would be a surprise), with a voice
  picker and a speed slider. Uses the browser's built-in speech voices; we send nothing anywhere. If the browser has none,
  the setting is disabled and says so.
* Reads every description, live event and reply (not the echo of your command, not the help text), sentence by
  sentence because some browsers cut long utterances. Door numbers are read as "Number 1," instead of "[1]".
* A new command from you cuts off the speech so it never lags behind.
* The sound of the House is untouched: narration is separate from the audio engine, so it does not duck it yet
  (polish may add ducking).

## Wander (`src/game/wander.ts`, wiring in `src/web/main.ts`)
* Header **Wander** button, or type `wander`. Goes on for ever until you type anything, press the button again, or type
  `wander off`.
* Each step it waits until narration has finished (plus a short breath), or, with narration off, a reading-time pause
  that grows with the length of the description (6 to 40 seconds). It never interrupts a walk in progress.
* The choice is random but shaped: 8% listen, 12% look at a statue, 8% look at something left behind, 8% climb or
  descend where there are stairs; otherwise it takes a door, preferring to keep heading the way it was going (4:1) and
  rarely doubling back (0.4:1).
* It uses your walking speed setting, so a slow walker takes real time between halls.
* The random source is passed in (`Math.random` in the page), so the chooser is tested with a seeded generator
  (`tests/wander.test.ts`). The browser test checks narration with a stubbed speech engine and that wander moves on and stops.
