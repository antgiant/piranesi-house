# Getting lost, and the way back (milestone 10)

The book is explicit that the House has no map and that people easily get lost. Its people mark doorways with chalk, write
directions back to where they came from, or carry the House in memory. So there is **no map by default** (Settings: "Keep a map
of where I have been" turns it on, and with it travelling anywhere by name).

## What you have instead
* **A trail in your head.** The game keeps the way you came, hall by hall: which wall of each hall you came in by, and which door in
  it (counted from the west or south end). Coming back to a hall you have been in forgets the loop between; arriving home forgets
  everything; arriving by a link (a crossing, not a walk) leaves you with no trail at all: "You came here in a moment, and you have
  no memory of the way."
* **The way back** (`way back`, `home`, `back`, `retrace`): you try to call to mind the way you came and walk it. Each step is
  remembered **right or wrong**. A slip is most often a wall mistaken for its neighbour, sometimes a hall forgotten, and now and
  then a door counted one out (which matters little here, since every door in a wall leads to the same neighbour).
* **Going by name** (`travel to the fifth western hall`) is the same: only to places you have been or marked, only through halls
  you have been in, by what you remember of the way.
* **Chalk** (`mark the fountain`) is the in-world memory aid: a marked hall is almost never misremembered.
* A **straight run** (`travel west 40`) always works: you only walk on.

## The chance of getting it wrong (`src/game/lost.ts`, `slipChance`)
Per step, leaving a hall: about 3 in 100 if you have been in that hall once; roughly halved by each further visit (3 / (1 + 1.5 x
extra visits)); a chalk mark cuts it to a tenth; darkness, water or a storm underfoot, and hurrying (a jog or faster), each make it half
as likely again to go wrong (x1.6, x1.5, x1.5); never more than 1 in 4. So a short way back is usually fine (3 halls: about 9 in 10),
and a long way is often lost (35 halls: about half), as in the book.

## What being lost looks like
Following a wrong memory faithfully takes you somewhere else. Each hall that is not the one you expected may be noticed ("This does
not look as you remember it. Somewhere you have gone wrong.") or not, with about even odds per hall; or there is no door where you
remembered one; or you come to the end of what you remember and it is not home. Then you are where you are, with the true trail
(including the wrong turns) as your new way back, and another try is another throw of the dice (the same attempt in the same world
goes the same way; the next attempt goes its own way).

## Not yet
* Written directions (the book's chalked instructions) as a thing you can read, and leave for others.
* Tiredness and long absence making memory worse; a notebook that records the way properly (a pen and a book from the visitor's
  starting kit, as designed for the inventory).
