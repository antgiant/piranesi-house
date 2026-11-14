# Birds

Status: planning and tooling. The present birds are a set of synthesised calls (src/audio/engine.ts, `bird()` and `speciesFor()`) chosen by place and season; the aim is to model the
variety of calls singly, in groups and by season, from measurements of real recordings, and to place them in the House the way the author's own English birds would be.

## What the book gives (canon/life.yaml, B-001 to B-012; own words)
Sparrows and other small birds in mixed flocks in the vestibules, flying together in swoops from statue to statue; a murmuration of birds filling a vestibule on autumn evenings; gulls (nesting
halls, droppings), rooks, blackbirds; a buzzard that hunts small birds inside the halls and perches on high statues for long periods; an albatross (a flight through a doorway; chicks in the narration);
in cold cloudy weather the birds fall silent and gather in one hall, on every statue; in pitch dark they stay away; after floods and in days of rain they shelter indoors and chatter; sea creatures
in the lower halls. The reading of the owner: the House's life is that of the author's home, the English coast and Derbyshire, with animals straying in through the portal now and then, unless the book says otherwise.

## What to model
For each species: which calls it makes (song, contact, alarm, flight, begging, territorial, roosting, display), in what order and rhythm, alone and in groups, by month, by time of day relative to
sunrise and sunset, by place (the three levels, vestibules, derelict halls, the sea halls), and by weather (silent in cold cloud; sheltering in rain; the wind and the dark).

Behaviours to cover for each: **nesting** (colony noise, nest building, mating displays, chicks begging, fledglings), **foraging** (contact calls, small flocks, scratching and pecking), **roosting and
sleeping** (the evening gathering, settling chatter, the silence, a call in the night), **dawn and dusk choruses**, **alarm cascades** (a predator, the buzzard, the sound travelling through the flock),
**flocks in flight** (flight calls, wings, the murmuration's rush), **the odd lone visitor** (the stray from outside).

## The birds of the book, and the trim (the owner's decision: the House is not to feel too alive)
Counted in the book: the albatross by far the most (78 mentions), then birds in general, gulls, rooks, and one or two each of sparrows, an owl, a buzzard, blackbirds, crows, eagles (statues), a swan, pigeons
(an idiom, not birds). Nowhere: swifts, waders, geese, doves, starlings, a dawn chorus, songbirds singing on the pavements. What it says of each:
* **Albatross:** a pair that settled in the Forty-Third Vestibule: a raucous clacking and whirring greeting, loud slapping feet on the pavement, a tall nest a metre across, an egg, and a chick that
  grows slowly (it takes the rest of the book to be nearly grown). Another flew through a doorway over the sea. They are silent at sea; the pair clacks at a visitor and when tending the chick.
* **Herring gulls:** a colony in the Eighty-Eighth Western Hall, nests on statue shoulders and plinths made of dry seaweed and fish bones; furious and screaming at an intruder, flying at them; gone by
  late summer or early autumn when the young are grown. Gulls in the floods, with the others below.
* **Rooks:** a flock in the Sixth North-Western Hall, perched on the high statues, that greet a visitor noisily (descending, wheeling, calling); a pair sometimes woken. Crows and rooks take stones.
* **Sparrows:** the Ninth Vestibule full of little birds, mostly sparrows, rising together and flying as one; an autumn evening when a vestibule is full of birds in the air, a whirling dance.
* **After floods, and in days of rain:** herring gulls, rooks, blackbirds and sparrows on the statues and banisters, chattering in their different voices. Cold cloudy weather: they fall silent and gather in one hall.
* **A buzzard** once, hunting small birds in a hall; and **a pale owl** once, gliding into the First Vestibule: both rare.

So the set is now: albatross (the pair and chick, in their vestibule only), herring gull (the colony; some about the upper and lower halls, few), rook (the flock hall; some in the rain), sparrow (a few in the middle halls; the
murmuration, once a year on an autumn evening, in a vestibule that has one), blackbird (only in the rain and the floods), the owl (rare, at night) and, if wanted, the buzzard (rare, mostly silent).
Taken out: goose, swift, wader, dove, starling, the night passage of geese, the dawn chorus and the blackbirds foraging; the sparrows and soaring and shore gulls are made quieter (about half).

## Research so far (what was found, and what was not)
* **Dawn chorus:** mean song onset before sunrise, from recording days across six UK songbirds: robin about 58 minutes, blackbird 53, song thrush 49, great tit 31, blue tit 16 (Bristol-led study:
  https://pmc.ncbi.nlm.nih.gov/articles/PMC4375366); the order follows how well each species sees in dim light (the RSPB says the same). No monthly figures found from the BTO.
* **Rook:** early nester: some patch nests from January, laying from late February, incubation 16-18 days, fledging about 32-33 days after hatching (BTO bird facts, https://bto.org/learn/about-birds/birdfacts/rook).
  Breeding-season calls are softer and more varied than the familiar caw (croaks, warbles).
* **Gulls:** breeding season April to July in the colonies studied; herring gull is red-listed; urban and rooftop colonies have grown. No calendar of arrival, laying and fledging dates found; the BTO/JNCC
  Seabird Monitoring Programme accounts and Spencer and Dickins (Lundy Field Society journal 2014) are the leads. The calls (long call, mew call, alarm call, begging) are to be taken from recordings.
* **Starlings and the autumn roosts:** not found yet (the book's murmuration is on autumn evenings).
* The grounding must be from sources: nothing here comes from memory without a source, and anything uncited above is marked as unverified.

## Recordings
Xeno-canto (the public site; its API needs a key) has large numbers of Creative Commons recordings with the species, the type of call, the quality, the place and the date. `scripts/birds/xc.py`
searches and downloads them into a new directory, for MEASUREMENT ONLY (their licences are mostly non-commercial; they are never kept in the repository or shipped, and only the recording numbers
and the measurements are kept). Freesound is not reachable from the working environment (the proxy refuses it), so any Freesound recordings have to be uploaded by the owner.

## Method
1. For each species and call type, take several good recordings (the quality grade A, from Britain, a call of its own, not a chorus) and measure: the frequency track (pitch contour and harmonics),
   the length of a note, the interval and the rhythm, the number of notes in a phrase, how the loudness changes through it, and for groups: how many call at once, how they overlap.
2. Fit a small parametric synthesis to each call (a few contour points and an envelope), so a call costs a few numbers, not a sample, within the sound budget.
3. Build the behaviour: a schedule for each species (when, how often, in what company) from the research, by month and by time from sunrise, and by place and weather.
4. Group sounds: a flock as many voices with their own timing and distance, not one loud bird; chorus by the measured order and onsets.
5. Check by measurement against the recordings (spectrograms of the real call and the synthetic one side by side, as for the footsteps) and tests on the schedule.
