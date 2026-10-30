# Map and doorway sound (milestone 4)

## The map
* **Fog of war.** You see every hall you have been in; the halls your doors open onto (you know they exist, and their
  names from the signs, but not what is in them); and the water lying in the halls you have visited, live. Nothing else,
  however close. Each level (lower, middle, upper) has its own map.
* **Memory is only this visit.** The explored set lives in memory and is never stored, matching the House's rule that
  memory is ephemeral. Reloading forgets.
* **What is drawn.** Halls are squares, vestibules diamonds (with stair marks if they have stairs); ruins are brown, lakes
  teal; water is a blue tint by depth; your heading is an arrow in a gold ring; long passages are dashed lines; a walk in
  progress is a dotted line with a dot for how far along you are.
* **Using it.** The Map button, the command `map`, or Escape to close. Drag to move, wheel or +/- to zoom, Centre, tap a
  room for its name and state. The canvas has a text description for screen readers, and the game is fully playable
  without it.
* **Code.** `src/game/mapdata.ts` (pure, tested: fog rules, levels, water matches the simulation) and `src/web/map.ts`
  (painting only).

## Sound through doorways
* For each door, the director works out what you would hear from the hall beyond (waves booming, gulls, falling water,
  rain), reduced to 45% by the door and the distance, and places it **ahead, to the right, to the left, or behind you**,
  relative to the way you last walked. A doorway behind you is more muffled (1100 Hz) than one ahead (2400 Hz).
* Several doors in one wall to the same hall are one source (a single portal at the middle of them).
* Long passages swallow what lies beyond them; Drowned Halls and the dark hall leak nothing.
* **Hearing the tide before you see it.** Water reaches each room about two minutes after the one before, and less deep.
  So a tide booming next door is heard (and felt as a rumble through the floor) before it wets your own floor. A test
  finds a moment when the next hall is wet and yours is dry, and checks the doorway carries the boom.
* The same facts reach the text: `listen` says, for example, *"Through the south door, behind you, comes the boom of
  waves."*
* **Code.** `portalsFor` in `src/audio/director.ts`; doorway voices (each with its own pan, filter and timing) in
  `src/audio/engine.ts`; the sentences in `src/game/narrator.ts`.

## Not yet done
* Sound from rooms more than one door away, and from long passages' far ends.
* Other visitors on the map and in the soundscape (milestone 8).
* The map does not show the statues or any detail inside a hall.

## Leaving the map on a phone
The map is full screen on a phone, so the first thing in it is a wide, labelled "← Back to the House" button (at least 44 px
tall) instead of a small cross. Escape and the Map button still close it, and the level and zoom buttons are 44 px targets.
