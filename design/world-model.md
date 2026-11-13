# One simulated world

The owner's direction: the game keeps, inside, a real three-dimensional model of a full simulated world, so that the soundscape and the visual
descriptions can be consistent at all times. Even though it is played as a text adventure, the model should be what a 3D game would need.

## The rules
1. **The world is the only source of truth.** Everything that exists, where it is and what state it is in lives in the world model: a pure, deterministic
   function of the seed, the world clock and the visitor's own actions. Nothing is invented by a renderer.
2. **Narration, sound and the map are readers, never authors.** Each is a pure function of (world, time, the visitor's pose). `audioFor` and the narrator
   both read the same scene; the narrator's `listen` is written from the very scene the sound engine is given.
3. **Every source of sound is an entity with a place.** If it can be heard it can be found: a door, a stair, a fall, a leak, a bird. If it can be described
   as being somewhere, the sound comes from there (`tests/consistency.test.ts` checks this across the world).
4. **Everything has a place and a time.** Places are metres in a hall's own frame (x east, y north, z up from the floor; the visitor's ears about 1.6 m up) and a
   level; time is the world clock. The visitor has a position (free, or at a wall) and a heading (continuous). A 3D client would read the same model.
5. **A change in the world changes both readings together**: the rain, the tide, the hour, where you stand, which way you face.

## What the world holds now (and where)
| Thing | Where it lives | Place | Read by |
|---|---|---|---|
| Halls | `world/hall.ts` | a box in metres; level | all |
| Doors, stairs | `world/layout.ts`, `Hall.stairs` | a wall and a position along it | narrator, sound (doorways, stair water), walking |
| Falls | `Hall.falls` | a stretch of a wall | narrator, sound (falls), walking |
| Leaks | `world/leaks.ts` | x, y, z in the hall | narrator, sound (drips) |
| Statues, features | `world/statues.ts`, `Hall.features` | a wall and a position; height | narrator, walking |
| The visitor | `Game.pos` | free point or wall + position; heading | sound pose, narrator, walking |
| Weather | `sim/weather.ts` (incl. the long rains) | the world clock | narrator, birds, hydrology, sound |
| Water stores | `sim/hydrology.ts` | the rain of the last fortnight | falls, streams, stairs, leaks |
| Tides | `sim/tides.ts` | per hall, from the vestibules | narrator, sound |
| Light, moon, stars | `sim/light.ts`, `planets.ts`, `stars.ts` | sky and windows | narrator |

## Gaps, in order of what they cost the consistency
1. **Birds are a mood, not creatures.** The world knows a mode and a rate (`foraging`, 3 a minute); the engine picks a species and a place for each call at
   random, so the text can say "birds" but not "a gull on the north wall", and what you hear has no body to look at. Next: birds as entities (species, perch or flight
   path, nests, flocks) in the world, read by both.
2. **Descriptions are by wall, not by pose.** `look` says what is on the north wall; it does not yet say what is ahead of you, how far, from where you
   stand. A view-dependent description (from the pose) is the sight-side twin of the sound's placement.
3. **The visitor has no height.** The great stair is 25 m high and its climb is a timed walk; z is in the model but the visitor does not use it.
4. **Wind, the hall's own echo, footsteps** are not yet tied to the geometry (open sides and windows; the box's size and material; the floor under you).
5. **Tides and flooding** are described and heard hall-wide, not as water that is deeper at one end of a hall.
