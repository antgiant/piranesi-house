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

## Where you think you are (the location indicator is not always right)
With no map, the name at the top of the screen, `where`, the heading of a description, the names in "You go through the west door into ...",
"You pass through ...", the stamp on a journal entry, the address bar and Share all give **what you believe**, which is not always the truth.
You are in one of three states (`Belief` in `src/game/lost.ts`):
* **Sure** (the usual): you know where you are, and what you are told is true.
* **Astray without knowing it**: you went wrong by memory and did not notice. You are sure you are somewhere else (a fixed offset from the
  truth, so as you walk the names change as a real person's belief would: consistently wrong). The header, address and descriptions name
  the place you believe you are in. Travelling by name plans from that wrong place, so it takes you wrong again.
* **Lost** (you know that you do not know): the header says "Somewhere you do not know", descriptions are headed "A place you do not know",
  doors lead into "a hall you do not know", the address bar names no room, Share refuses, and travelling by name from here is refused
  ("You do not know where you are, so you cannot say how to get there from here"). You can still retrace the way you came (`way back`).

How it changes: only a way followed by memory can send you astray (walking step by step you always know which door you took). On a wrong
turn each hall that is not the one expected may be noticed (then you are lost) or not (then you believe you are where you expected to be).
At the end of what you remember you may notice (always, if it was meant to be home) or think you have arrived. Coming into a hall:
* home is always recognised (the minotaurs); 
* a hall you have been in before is recognised with a chance that grows with each visit (1 - 1/2 to the number of previous visits); then
  you know where you are again, and are told so;
* astray in a hall you do not know, you may suddenly see that nothing is as you expected (3 in 10) and are lost.
With a map (Settings) none of this applies: the indicator is always right. Belief is saved with the journey.

## Offline, and why the page waits to be claimed
The service worker (`public/sw.js`, cache `house-v2`) stores every file the page names when it is installed, so a fresh install works offline
at once. A page that was already open when the worker first activates is not controlled by it until it is claimed or reloaded; a test that
goes offline in that instant used to fail, so the test now waits for the claim.
