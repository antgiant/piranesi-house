# Naming things, and remembering them (milestone 4j)

A visitor may name almost anything: a hall ("call this hall the Hall of Weeping"), a statue ("call the minotaur Old Horns", or "call it ..."
for the thing last looked at), the great stair, a door ("call the north door Squeaker"), something left behind, one of the building's strange
features ("call the bridge the Long Span"). Quotation marks are optional: the game finds where the thing ends and the name begins. `names`
lists what you still remember; `forget <name>` lets one go.

## A name is a landmark
Coming upon something you named is the surest way to know where you are again. Lost or astray, arriving among things you have named gives
a chance of recognising the place that grows with how well you remember the name and what sort of thing it names (a whole hall 1, the stair
0.95, a statue 0.9, a strange feature 0.85, something left behind or a door 0.6), up to 95%. It adds to knowing a place from having been there
(`1 - (1 - familiarity)(1 - landmark)`), and you are told what did it ("This is the place you called ..."). Names are also how you find your way
by name (`travel to the Hall of Weeping`), and "this is the Hall of Weeping" puts you right if you are right. With the map on there is no being
lost, but names still give the places a voice: they appear in the heading and in what you notice.

Names must be **yours alone** while remembered (a name two things share is no landmark); a name that has faded may be given again.

## Memory works like memory (`src/game/memory.ts`)
* **It fades if not used.** A new name keeps `retention = strength x exp(-time / stability)`: with the first stability of three days, about
  72% is left after a day, a third after three days, and it is gone (below a quarter) in about a week.
* **Using it makes it last.** Each time a name is brought to mind (you come upon the thing, examine it, travel by it, say it) *after at least
  half an hour* since the last time, its stability grows by 80% and it firms up a little. Brought to mind again within the half hour it counts
  once: the spacing effect. A name that has already faded is not rescued by being half recalled. Used regularly over weeks, a name is kept.
* **Naming a lot at once crowds it.** About four names can be given in half an hour and kept. Beyond that each further name is fixed less well
  (down to 45%), and the names given just before slip (each loses 5% per name over the limit, down to 15%). The game says so: "You have been
  naming so many things so quickly that you doubt you will keep hold of them all." Twelve names in twelve minutes leave perhaps half of them a
  day later; twelve names over two days are all kept.
* A name is **sure** at 60% or more, **half-remembered** between a quarter and that ("Something about this place seems to be what you once
  called ..."), and **forgotten** below a quarter. `names` tells you how sure you are of each, and how many you can no longer call to mind.
* Time is the House's clock (so it follows the speed-of-time setting). Names are saved with the journey and survive a carry to another browser.

## Narrative names
The book names halls by number and compass ("the Sixth North-Western Hall", the 192nd Western Hall), and that is how every hall is found, in
the address as well. It also speaks of places by what is in them (the Drowned Halls, the Coral Halls, the hall with the single door, and, in
others' mouths, "the minotaur room"). So each hall now also has an epithet from its most striking thing (`src/world/epithets.ts`): the single door,
the minotaurs, the gull colony, one of the book's own statues, or the rarest of its strange architecture: "the Hall of the Railless Bridge". It
heads the description ("First Western Hall, the Hall of the Straining Giants"), and rides in the address beside the plain name
(`#room=First+Western+Hall&as=the+Hall+of+the+Straining+Giants`; only `room` finds the place). If you have named the hall and remember, your name
replaces the epithet ("which you call ...") in both. A hall you cannot name (lost) has neither.
