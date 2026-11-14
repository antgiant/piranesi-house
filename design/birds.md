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
**More of them, at the book's density** (the owner's decision): beyond the halls the book names, bird halls are placed through the world by the seed. Within the stretch of the House the book walks (the first forty-five
vestibules, and the halls out to the Eighty-Eighth Western, about 25,000 halls of the middle level) it names one of each: one gull colony, one flock of rooks, one hall where the birds gather in cloud; and among the
vestibules one with the albatrosses and one with the murmuration. So each of those now occurs in about one hall in 25,000 (`BIRD_HALLS`) and one vestibule in 45 (`BIRD_VESTIBULES`), by a hash of the seed and the
place (`getHall`), the same every time; the named halls are kept. (World version 9.) These are estimates from one book; they are constants to change.
**A buzzard** (the owner said yes): rarely, by day, in a hall with perches (about one hour in 400), it circles and the small birds fall still; the narrator says so; it mews once in a while.
**Mice and rats**: considered and dropped by the owner (the book's mice are carved, only birds are alive in it).

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

## Built: calls made from measured templates (version 1)
Pipeline (all in `scripts/birds/`, nothing downloaded is kept or shipped):
1. `xc.py` fetches Creative Commons recordings from xeno-canto for measurement. Recording numbers used: gull 1184281, 483105, 804205, 1029296, 845875, 1002938; rook 949915, 1100510, 840813 (colony levels:
   832307, 899575); house sparrow 791783, 459144; buzzard 1002995, 1156614; barn owl 1098022, 1182233; blackbird 904743; Laysan albatross 730154, 862222 (bill clapping, calls), black-browed 952602 (a pulsed whirr).
2. `template.py`/`build.py` find each clear call in a recording, track its pitch (a harmonic-sum tracker with a smoothness constraint, checked by eye against the spectrograms), measure the loudness along it, the spectrum of its
   tonal part and of its noisy part (with the recording's background taken away), the amplitude modulation of a whirr, and the gaps and bout sizes between calls; then take the median over the calls
   (`scripts/birds/templates.json`). `gen_ts.py` writes the numbers to `src/audio/birdcalls.ts` (about 7 KB).
3. `birdsynth.ts` makes a call from a template: a harmonic series along the pitch contour, each harmonic as loud as the tonal spectrum says at its own frequency, plus noise with the noise spectrum, under the
   loudness contour, a little different every time. `birdsong.ts` makes an episode of calling from the measured gaps and counts (a gull colony's alarm run of three to six mews about 1.3 s apart, its laughing long call
   of ten to fourteen short notes a quarter of a second apart, a rook's one to four caws, a sparrow's chirps and ticks in a bout of about five, a blackbird's rattle of tinks, the albatross's clacking of the bill seven to
   eleven times about 0.4 s apart and then a whirr at about 9 a second). The engine plays them (`playPlan`) with a few rendered variants of each call kept and pitched a little differently.
4. Checked by spectrogram: the synthetic gull mew (f0 from about 1.5 kHz falling to 1.1 kHz over 0.3 s, three strong harmonics) has the shape of the real one; the sparrow chirp and the buzzard's plateau and fall match in
   shape; the rook's comb of harmonics now sits in its measured band (1.2-3.2 kHz) with noise on it. The call rates a colony makes: gulls about 55-85 calls a minute near a nesting colony, rooks 6-21 a minute in a colony
   within earshot, sparrows about 100-125 a minute in a flock; the scene's rates (loudness 800 gulls, 600 rooks) give about 57 and 27 notes a minute.

Known gaps (the next work, and where the owner's ears or recordings are needed):
* Blackbird: only the alarm rattle (tinks); the song and the soft 'chook' are not done. The owl: one screech measured from two recordings (a barn owl); the book's owl is "pale". The gull chick's begging is measured, the albatross chick's is not.
* The murmuration's wing rush and the rustle are still the old synthesised noise; there are recordings of wing beats (xeno-canto 1054490, rook) to measure.
* A single template is a median: real birds vary more, and an individual has its own voice. More recordings per call type would give a better spread.
* Whether any of it sounds like the real bird, to an ear. The measurements make it close in the spectrogram; only listening can say whether it is right.
