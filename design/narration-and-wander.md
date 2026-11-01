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

## It reads like a novel, not a menu (milestone 10)
A description is prose however you play. There are no numbered lists, no "[1]" and no "Ways out:" in what you read:
* **What earlier visitors left** is told as something you notice ("In the pale hollow beneath the great stair lies a stiff old
  sleeping bag, rolled up, left behind long ago ..."), in a sentence or two, with a few ways of saying it. You look closer by
  naming it: "examine the sleeping bag".
* **The doors** are a sentence ("There are three doors in the north wall, four in the east ..."; "Doors lead north, east and
  south"; "The ways on are ..."), and the great staircase says which wall it leaves. The buttons are named ("north door",
  "north door, west end"), not numbered.
* **The statues near you** are what the eye falls on ("Among the statues you notice a massive minotaur ... against the south
  wall, near the middle"), one of the book's own statues at a time. Height is said only when the statue is up the wall.
* **Time** is said as a person says it ("about a quarter past nine in the morning, in summer"), not as a timestamp.
* **Small replies** do not teach commands inside the story ("You will remember the First Vestibule as 'here'."); commands are in
  `help` and the introduction.
* `look closely` is the whole description, still prose. `list` (or `reference`) is the numbered reference, for typing
  "examine 3" and "go 2" when that is wanted.

## Doors the way the book speaks of them
The book never counts the doors of a hall as a list. It speaks of standing in a doorway and looking ahead down a long run of
receding halls, of "the western door", and it gives numbers only as directions to someone ("through the western door; in the
next hall, the third door on the right"), and in a person's chalk marks and written notes for finding the way back. So:
* **Arriving in a hall** says only that there are doors, and roughly where: "Doors open in every direction, more than you could
  easily count." / "Doors open to the north and east." / "The only way on is a door in the west wall." Exact counts appear
  only when a hall has very few (one to three).
* **Looking out in a direction** (`look north`, `look to the west`) is where the count belongs: "Three doors open along the
  north wall: near the west end, in the middle and near the east end", then what can be seen through the one nearest the middle
  (the next hall, and beyond it a hall or two, several, or "a great vista of halls, doorway beyond doorway, receding until the eye
  gives up", but only where the doors truly line up), then something else on that wall. The buttons are "look north", "look east"
  and so on; the doors themselves (named by position) appear once you have looked that way, and a wall with a single door
  has a "north door" button at once.
* `list` is still the numbered reference.

## Getting lost (setting "Keep a map of where I have been")
The book is explicit: there is no map, and people easily get lost; its people mark doorways with chalk, write directions back
to where they came from, or carry the House in their memory. The map is therefore a setting, off by default. On: the
Map button, "Travel here", and travelling by name to any named place. Off: no Map button, "map" answers that there is no map,
and going anywhere by name is by memory, which may be wrong (see `design/lost.md`). Marks are the in-world memory aid.
Straight runs (`travel west 40`) always work. `where` no longer shows coordinates.
