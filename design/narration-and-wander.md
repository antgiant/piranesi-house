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
* With narration on, each step waits until the whole reading has finished (every queued sentence), plus a 1.8 s breath; a
  safety timeout covers browsers that never report the end. With narration off it waits a reading-time pause
  that grows with the length of the description (6 to 40 seconds). It never interrupts a walk in progress.
* The choice is random but shaped: 8% listen, 12% look at a statue, 8% look at something left behind, 8% climb or
  descend where there are stairs; otherwise it takes a door, preferring to keep heading the way it was going (4:1) and
  rarely doubling back (0.4:1).
* It uses your walking speed setting, so a slow walker takes real time between halls.
* The random source is passed in (`Math.random` in the page), so the chooser is tested with a seeded generator
  (`tests/wander.test.ts`). The browser test checks narration with a stubbed speech engine and that wander moves on and stops.

## Choosing the voice
The aim is a peaceful, unhurried, thoughtful reading with a British accent, like a good audiobook. We cannot copy any
real person's voice (there is no server, and it would not be right to), so the page ranks the voices your device offers
(`voiceScore` in `src/web/speech.ts`): British English first, then other English; "natural/neural/premium" voices up;
warm male-sounding names up; robotic or novelty voices down. The default speed is 0.9× with a slightly lower pitch, and
speech goes sentence by sentence so each gets a natural pause. You can still pick any voice by hand in Settings.
Quality varies by device: Chrome and Edge offer online "natural" voices, Safari and macOS offer good "Daniel" and
"Enhanced" voices, and a bare Linux machine may only have a robotic one.

## Keeping the screen on (`src/web/wakelock.ts`)
While Wander is on, or while anything is being read aloud, the page asks the browser to keep the screen awake (the Screen
Wake Lock API) so a phone does not lock and silence the House. It is let go a second after both stop, and taken again
if you switch away and come back. Browsers without the API, or that refuse (low battery), are simply left alone.
Not requested merely for playing the soundscape or for a plain walk.

## Saying things the way a person would (milestone 4g, further)
* **Size is said once, and only if it is unusual.** Statues in a hall are alike in size, so a narrated description never puts
  a size on each statue ("a ferryman at a river crossing", not "a larger-than-life ferryman"), and never says "life-sized" at
  all. If the hall's statues are small, very large, huge or colossal, that is said once, for the hall.
* **Looking again shows something new.** Each hall remembers what has already been said about it. `look` in the same place
  says other things (no name, size or door list again, and a short lead-in such as "Looking about you again, ..."); when
  nothing new stands out it says so. Coming back to a hall greets you ("You are back in the First Vestibule.") with something
  new. After two hours of the world's time, the hall is seen afresh. `repeat` (or `again`, `look again`) says the last
  description again exactly; `look closely` gives the whole.
* Unnarrated play is unchanged: `look` is a reference description and gives the same full text each time.
