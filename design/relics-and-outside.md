# Earlier visitors and outside traces (milestone 4b)

Two small packs that make the empty House feel less empty without putting anyone in it. Both default on, both can be
turned off in Settings (each restarts the walk, like the Dead toggle).

## Earlier visitors (`src/world/relics.ts`)
Very rare, anonymous leftovers already lying in the world when you arrive. A pure function of the seed, so everyone
sees the same ones. Nothing is explained, nothing rewards you, and no wording is borrowed.

| Where | What |
|---|---|
| The First Vestibule | Always: one stiff old sleeping bag in the hollow under the great stair (the only one in the world) and one to three bits of litter caught there |
| The 88th Western Hall (gull colony) | Ten to twenty torn scraps of paper on the pavement, always; five to ten more woven into the old nests, but only when the gulls are not nesting (not March to August) |
| Within five rings of the First Vestibule | About one hall in 25: litter, a crumpled note, or a stray (a pen, an empty tin, a scrap of cloth) |
| Farther away | About one hall in 400: a crumpled note or a stray |
| Anywhere | Runs of faded chalk marks on doorframes, low down, each run 5 to 13 halls in a line: arrows, a chalk circle, or tally strokes that count up along the run (1, 2, 3...). Roughly one run in 500 halls, so about 2% of halls |

* **Words.** Notes and scraps show at most one of nine fragments we wrote (e.g. "...the sea was loud all night..."),
  always damaged. Door marks are pictures and never words. Reading more scraps unlocks nothing.
* **Never** in a Drowned Hall, in the dark hall, or off the middle level.
* **Looking closely.** Relics appear in a "Left behind by someone, long ago" list, numbered after the statues; `examine`
  shows our description and adds it to your list. `found` shows that list. The list is private: it lives in this
  device's browser storage, per world, and is never sent anywhere.
* **Setting.** `relicDensity` (1 is the default rarity; 0 turns them off).
* **Not yet.** Picking them up needs the inventory (milestone 8).

## Outside traces (`src/sim/outside.ts`)
Very rare hints that something exists beyond the House. Nothing to enter, nobody to meet, never explained.

* **When.** A pure schedule per in-world day. About two days in five have an event; at most one a day; most days none.
  Each is brief (8 to 120 seconds). So you only catch one by lingering in the right place.
* **Where.** 85% in the First Vestibule's south-east corner, in the shadow between the two minotaurs there; the rest
  somewhere within 12 halls of it. Never in a Drowned Hall, the dark hall, or off the middle level.
* **What** (weights 40/25/15/20): a cold draught that smells of rain and metal; a few seconds of faint sounds that are
  almost voices, in no words; a low rushing like nothing in the House; a scrap of wrapper skittering across the pavement.
* **Sound** is always muffled and indistinct, as if through a wall, placed in the corner it comes from and relative to the
  way you face (`src/audio/engine.ts`, `applyOutside`).
* **Text.** It appears in the room description while it lasts, in `listen`, and once as a live event when it begins.
* **Setting.** `outsideTraces` (on by default).

## Tests
`tests/relics.test.ts`, `tests/outside.test.ts`, `tests/game-relics.test.ts`, and the browser test (which finds a real
draught moment from the simulation and checks the engine plays it).
