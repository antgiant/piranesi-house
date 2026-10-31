# Architectural flourishes (WORLD_VERSION 3) and walking, narrated

## Where the flourishes come from
The House is named for the eighteenth-century Italian etcher whose drawings of enormous, impossible buildings are the
most famous thing about the name: the "imaginary prisons" (vast vaulted halls where arch opens behind arch, stairs
climb to blank walls, bridges cross with no parapet, galleries hang on chains, great wheels, ropes and pulley-blocks
stand untended, and a single shaft of light falls through the dark) and the views of Rome (colossal piers, fallen
cornices with ferns in the joints, obelisks, basins and fountains, trophies of arms carved in relief, trees rooted
in the walls).

I cannot look at the drawings themselves (I have no way to see images), so the list is built from what I know of them
and their manner, in our own words, and kept to what a place of this kind could hold. All of it is peaceful: no
instruments of cruelty, only stone, timber and iron that have stood a very long time.

## What there is (`src/world/flourishes.ts`)
About thirty kinds: receding arches, stairs that end in blank masonry, railless bridges, hanging timber walkways,
arcaded galleries, a raised drawbridge, untended ropes and pulley-blocks, a great wheel, spiral stairs round piers,
colossal piers with piers inside them, coffered vaults with a round eye of light, iron rings, balconies with no stair,
obelisks, a column of ships' prows, worn lettering, fallen cornices, colonnades, shafts of light, cantilevered
landings, doors too high to reach, flying arches, crossing stairs, trophies, a rooted fig tree, basins and fountains,
rows of urns, chained iron gates, a stepped platform, one very long stair, and passages within passages.

* Every hall gets 2 to 4 (a vestibule 3 to 5); none in the dark hall or the Drowned Halls. Each is on a wall, at a
  height that scales with the hall (a few need a tall hall), and sits above the statues without taking a statue slot.
* A pure function of the seed, the hall and its level (`flourishesFor`), so every view agrees. Each has a sentence for
  looking and a short phrase for seeing in passing.
* In `look`: "Above the statues the building does stranger things." followed by them.
* Later views will draw the same list: a bridge is a bridge in the side-scroller and the 3D view.

## Walking, narrated (`src/game/stroll.ts`)
The option `walkNarration` is on whenever the House is read aloud or Wander is running.
* No distances or times are said: "You set off for the west door.", "You set out for the Ninth Vestibule." The header
  and the countdown line are quiet too.
* A walk is described as it goes: statues passed (any of six phrasings), flourishes seen overhead, the columns and
  niches, an apse, the light, the water, the weather, the birds, a sound. At a gentle pace this is a thing every
  ten to twenty seconds. Nothing is said in the first five seconds, some slots are dropped on purpose so there are
  silences to hear the sound in, and a very short walk says nothing.
* The walk is described the same way each time (a pure function of the world, the hall and the walk).
* Stairs get their own two lines. Long journeys say "You pass through the Fourth Western Hall." for each hall.
