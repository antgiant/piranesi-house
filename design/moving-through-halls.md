# Moving through a hall, and units

## Why
The halls are huge (the one used for the walk demo is 820 x 446 ft; the great road crosses hundreds), and a walk across one takes
minutes. The sound used to be worked out once per hall, so it was the same at the west door and at the east. Now it follows you.

## What the sound knows about where you are (`src/audio/pose.ts`, `listenerPose` in `game.ts`)
A pose is a place in the hall (metres from its south-west corner) and a heading (degrees clockwise from north).
* **Standing**: at the wall you arrived at (or walked to) and the position along it, or the middle of the floor; facing the way you last went.
* **Walking**: between where you set out and the door, wall or stair you are going to, by how far along the walk is (the header's progress);
  heading the way you are moving. A stair walk goes to the hall's stair.
* `stop` now leaves you where the walk had taken you (a free point on the floor): see `design/water-more.md`, "The world keeps real places".

## What follows you (`audioFor(world, scene, { pose })`)
| Sound | Where it comes from | How loud |
|---|---|---|
| A doorway (and the sea or falls heard through it) | the door's own point on its wall; its direction swings continuously as you pass | 1.9x at the door, half of that 130 ft away, never below 0.25x |
| A fall | the nearest point of the stretch of wall it runs down | 1.7x at the wall, half of that 100 ft away, never below 0.3x: a far murmur across the floor |
| The sea and tide (halls with stairs) | unchanged (all round) | a little louder near the stairs (x1.3), softer across the floor (x0.7) |
| Muffling of a doorway | continuous: 2400 Hz ahead, 1750 beside, 1100 behind | |
Without a pose (old saves, tests) everything is as before: four directions, hall-wide levels (`az` is undefined).
Measured on the walk demo (`scripts/audition/walk.mjs`): the water band (2-8 kHz) rises from -56 to -43 dBFS (about 13 dB) over a 790 ft walk toward
the fall, while the hall-wide version stays flat at -43; the doorway swings from 94 degrees left to 166 behind and fades out.

## Not yet
Birds, wind, rain, the hall's reverb and the outside hints do not yet vary by position; the sea only varies near stairs.

## Units (`src/game/units.ts`)
The world is generated and described in metres. What is shown or spoken is converted at the last moment, in `print()`, so the world, its
generation, saves and the golden snapshot never change with the setting. Settings, "Distances": Automatic (United States, Liberia and Myanmar get
feet and miles; everywhere else metres), Feet and miles, or Metres and kilometres. Feet are rounded as a person would say them (6.6 for a
statue, 35 for a stair, 345 for a hall); a number written in words stays in words ("ten metres" is "thirty-five feet"); "a few metres" becomes
"a few yards"; km/h becomes mph. The speed slider and its note follow it.
