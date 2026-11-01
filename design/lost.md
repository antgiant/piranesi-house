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
* **Going by name** (`travel to the fifth western hall`) is the same, to any named hall, by memory where you have been and by the names
  alone where you have not.
* **Chalk** (`mark the fountain`) is the in-world memory aid: a marked hall is almost never misremembered.
* A **straight run** (`travel west 40`) always works: you only walk on.

## Learning: the more you take a way, the surer you are
Every move teaches. The game counts how many times you have taken each *way* (a door between two halls, in either direction), and
the chance of going wrong on a step depends on that, as in life:

| You have taken this way | Chance of misremembering a step |
|---|---|
| never (going by the names of the halls alone, counting) | about 15 in 100 |
| once | 3 in 100 |
| twice | about 1.2 in 100 |
| three times | 0.75 in 100 |
| ten times | under 0.5 in 100 |

(`passes`: P = 3 / (100 x (1 + 1.5 x (passes - 1))).) And then: a chalk mark on the hall you are leaving cuts it to a tenth; going on in
the same direction as the step before is easier (x0.6); darkness (x1.6), water underfoot or a storm (x1.5) and hurrying (x1.5) make it
worse; never above 4 in 10. Wrong turns teach too: a way walked by mistake is a way you now know.

Planning favours the ways you know: when choosing how to go, a known way counts for less than an equally short unknown one, so you
tend to keep to the roads you have worn.

## Going to a named hall (no map)
`travel to the Eighth Western Hall` always lets you try, whether or not you have been there, because the names of the halls tell you
how far and which way ("eighth western" is eight halls west of the first vestibule). If you have never been that way it says so ("going
by the names alone and counting halls") and the guesses are risky; a way you have walked many times is nearly sure. `way back` (and
`home`) retrace the actual trail you walked, which is the same thing with a way you know to have just taken once.

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
