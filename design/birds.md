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

## Version 2 (after the owner's first listening)
* **"Broom" / "swish":** two causes. (1) The old synthesised *rustle*, a burst of high-pass noise, was in the species lists for most situations and came first in a clip (the first event is at once), and through the echo it was a swish:
  removed, and the flock's wing noise with it (the murmuration is now sparrow chirps only until wings are measured). (2) The albatross's bill clap was a 12 ms burst of band-limited noise, a whoosh; the real clap, measured
  on two recordings of Laysan albatrosses, is a broadband impulse about 2-3 ms wide that sets the bill's cavity ringing at about 0.8, 2.6, 3.1, 3.7 and 4.6 kHz for about 2 ms a time constant. It is now made so
  (`click` in the template: an impulse and damped resonances), and so is the sparrow's tick.
* **Frequencies not tamed:** the templates stopped at 6.3 kHz, so everything above was missing (the real calls reach 10 kHz and clap noise 17 kHz). They now run to 16 kHz; above the last measured band the level falls away
  instead of being held. The pitch contour of a falling call was also smeared at its start (the tracker settling): fixed, so the gull's mew now starts at its true 1.5 kHz and falls to 1.1 kHz without a swoop.
* **Albatross:** the book has one pair and a chick; the many mentions are of them. The extra albatross nests are taken out; only the Forty-Third Vestibule has them.
* **The owl:** the roosting birds are asleep (no sound); the owl is the only voice and calls one time in eight.

## Version 3 (the gull was wrong)
The owner knows the herring gull as the seaside gull, and the first synthetic gull was nothing like it. Compared with the real calls in detail (a spectrogram at 5 ms, and measured):
* **Too clean:** the real voice has a harmonic-to-valley ratio of 24-46 dB (median 34; it is a rough, breathy voice); the synthetic one was 58-77 dB, an organ tone. Each template now has the measured `hnr`
  (gull mew 37 dB, the laughing notes 25, the rook 12, the sparrow's chirp 25, the buzzard 30) and the call's noise is scaled, per call, until a measurement of that very call gives it (the peaks from the tone, the valleys from the noise).
  The synthetic mew then measures 35-37 dB.
* **Smeared contour:** a real mew rises quickly (about 1.25 to 1.55 kHz in 40 ms), peaks, then glides down to 1.1 kHz; the median of calls had smeared the apex. Calls are now aligned on their apex before the median is taken
  (the rise and the fall each stretched to a fixed length; `apex`), so the sharp peak is kept.
Not yet done and visible in the spectrograms: the faint broadband noise burst at the start of some real calls, and the fine irregularity of each harmonic line.

## Version 4: colonies measured against real colony and flock recordings

Compared with recordings of herring-gull colonies and flocks from Britain (Xeno-canto 599932, 599934, 1086854, 861758, 486846, 400551; a 20 ms
envelope of the 0.8 to 6 kHz band, call frames being those within the top 65% of the level range):
- A real colony is a bed of overlapping calls, not separate calls: 90 to 220 call onsets a minute, about half to three quarters of the time inside a call,
  the level moving by only 4 to 10 dB (standard deviation). Ours was 48 onsets a minute and 17 dB, so every call stood out from silence. A nesting hall now
  starts episodes 3.2 times as often (about 110 to 170 onsets a minute, 5 to 8 dB), which falls in the measured range.
- The long call's notes were an even tick; in the recordings the laugh slows as it goes and is uneven, so the gaps now stretch by about half over the run, with jitter.
- The begging call's pitch track had failed (octave jumps, played as a steep sweep through the whole range and sounding nothing like a gull). The recordings show an arch:
  up to about 4.9 kHz, level for a third of a second, then down to about 2.1 kHz. `scripts/birds/overrides.py` holds that correction with its evidence.
Still different: real calls have a rougher onset and a wobble in pitch from call to call; ours hold steadier lines. That wants more recordings of single calls.

### Albatross cadence and sparrow answering
- Albatross claps are single and slow: 0.33 to 0.45 s apart in runs of seven to eleven, a longer gap (about 0.6 s) now and then, and pauses of two seconds or more between runs.
  (An earlier version here had "rolls" of claps 25 ms apart. That was a mistake: the detector had counted the throat whirr, and the ringing of each clap, as claps.) Each greeting now
  differs: its tempo, its length, where the longer gaps break it into groups, one to three runs, a quick pair now and then, and whether a whirr ends it.
- Sparrows answer one another: after a bout, one or two others take it up from their own places, 0.3 to 1.8 s later (so bouts overlap), and the answers can be answered
  (three deep at most). A bout is never fewer than three calls. The modal-click "tick" is no longer used: among the chirps it sounded like a water drop.

### Individual gulls (version 5)
A colony of fifty gulls all using one median call sounds like five. Each gull now has its own mew, measured on its own recording (Xeno-canto 1005243, 1032698,
1093406, 1093407, 1102859, 1157890, 1157891, 1193631, 284200, 528591, 744909, 798407, 896886, 990704, 483105, 804205: sixteen birds, from Britain, Ireland, France,
the Netherlands and Sweden). They differ in pitch (950 to 1700 Hz), length (0.16 to 0.53 s), roughness (16 to 43 dB harmonic-to-valley) and spectrum.
Each calling episode picks one of the sixteen (`GULL_VOICES`). Recordings are not kept, only the numbers.

### The colony fills the cliff (version 6)
A colony's birds are not all 4 to 14 m away: episodes in a nesting hall are now placed from 4 to 70 m (spread evenly in the logarithm of the distance), so the far ones are
quiet and make the diffuse bed under the near ones, and the rate rose to 4.2 times (measured on the render: about 150 onsets a minute, 31 dB range, 9 dB standard deviation, against
the Robin Hood's Bay colony recording's 94, 27 and 8.5).

### Corrections after listening (version 7)
- A hoarse, low gull was in the colony: of the sixteen individuals, five were dropped (1032698 and 284200 are a flat, rough call, 1093407 is noisy, 528591 and 896886 are rough and low), leaving eleven. The test for a voice
  is now: an arched contour, 25 dB or more of roughness-to-valley and 0.35 s or less in length.
- The sparrow chirp sounded like an aerosol spray. Its measured noise included the clicks that sit between chirps in the recording; it is now 10 dB lower, with the roughness target at 32 dB
  (`scripts/birds/overrides.py`).

### Version 8: richer colony, flocks, chicks
- Colony: birds now spread from 4 to 120 m, and the far ones are only partly dimmed by distance (their level falls as the distance to the power of 0.25 past 4 m, not 1), so the far
  birds make a bed under the near ones, as in the recordings; a call is taken up by one to three neighbours (each in its own voice and place), so the quick runs have a chorus behind
  them; the rate is 4 times the single-bird rate. On a 20 ms envelope: about 175 call onsets a minute, in-call 64% and a 7 dB standard deviation (XC1086854: 112, 69%, 9 dB).
  The long-term spectrum agrees from 800 Hz up, but has none of the 200 to 800 Hz body of the recordings (-50 dB against -30); that body is unmodelled (adding noise there risks the hoarse
  sound that was just removed), and needs recordings of single birds at close range.
- Feeding flock: a new bird mode, `feeding` (a flock of gulls overhead over food): flying birds, nine mews to a run or bouts of short laughing notes, neighbours joining in, 2.5 times the base
  rate (about 130 onsets a minute, 8 dB, 64%, against 120, 10 dB and 57% in an Essex flock, XC861758). Nothing in the world yet makes this mode: where it occurs is a decision.
- Chick: a pulsing (14 a second) rather than a pure arch, half the length, a quieter series of two to five calls.
- Sparrows: eight individual birds (XC1082700, 791782, 1152146, 1145371, 1092252, 1089317, 1152144, 1145322), 2.7 to 6 kHz and 0.09 to 0.2 s, one picked for each bout, so no two sparrows are the same sweep.

### Version 9: corrections after listening
- Every synthesised call used to start and stop at full level (a 4 ms fade): heard as a thump at the start of some calls (the lowest ones, and the long call's low mew) and as cut off at the end. Each call now rises
  over 6 to 15 ms and dies away over 12 to 60 ms, as the recordings do.
- The low murmur: recordings of colonies and flocks hold 200 to 800 Hz at 20 to 30 dB below the main band (our calls start near 900 Hz and leave nothing there). `colonybed.ts` adds a quiet band of noise with soft
  humps near 400, 560 and 740 Hz, from three places, swelling slowly, in nesting and feeding modes. Measured on a render: -21 and -22 dB (XC1086854: -30 and -24, XC599932: -21 and -18).
- Chicks: clips of begging chicks (XC1187910, XC1162581) show short calls (0.2 to 0.35 s), rich in harmonics from 1.5 to 5 kHz and pulsed about 45 times a second: a rough buzz, shrill and high, so a likeness to a dentist's drill is
  partly true to life. The previous version was a pure 5 kHz arch, a different (cleaner) sound. Now: fundamental 1.5 to 2.1 kHz, 45 Hz pulsing, rough (`hnr` 20), a bout of three to six.
- Sparrows: the four individuals whose chirps rendered as a bare block of noise or a pure whistle (1145371, 1145322, 1089317, 1092252) are dropped; the noise of the rest is 18 dB lower. The long steady "whistle" tails seen in a
  spectrogram after a chirp are the hall's own echo (a pure tone through a four-second hall comes back as a steady narrow band of noise at the same pitch), not part of the call.

## Version 10: a library of real calls, checked by analysis-by-synthesis
The median templates (one averaged call per kind) are replaced, for the gull mew and notes, the rook, the sparrow, the blackbird and the buzzard, by a library of real calls.
- **Recordings** (`scripts/birds/harvest.py`, from Xeno-canto; only numbers are kept): about 60 of the herring gull (all kinds of call, Britain, Ireland, France, the Netherlands, Germany, Scandinavia), 24 each of rook, house sparrow, blackbird and buzzard,
  20 of barn owl, 21 of albatross (Laysan, black-footed, wandering).
- **Measurement** (`library.py`): every clear call in each recording (pitch contour, loudness contour, length, roughness, spectrum in third octaves split into tone and noise). 1,271 gull calls, 727 sparrow, 350 rook, 340 blackbird, 209 buzzard.
- **Selection** (`build_lib.py`): the pitch tracker's failures are plain in the numbers: 600 to 900 Hz "gull calls" with roughness under 10 dB are noise taken for calls (this was the hoarse low gull). Each kind has a filter on pitch, length and roughness;
  a recording with enough passing calls is a voice (its own spectrum, and up to six of its real calls, spread through the recording). Up to 14 voices a kind.
- **Round trip** (`qa_render.ts`, `qa.py`): every call is rendered as the game renders it, measured again by the same analysis, and must come back with the same pitch (within 8%), roughness (within 12 dB) and harmonic spectrum (within 9 dB).
  What fails is dropped (gull mew 63 of 84 pass, gull notes 41 of 46, rook 36 of 72, sparrow 50 of 72, blackbird 34 of 54, buzzard 42 of 50). The final library: 13 + 8 + 7 + 11 + 6 + 10 voices, `src/audio/birdlib.ts` (about 15 KB gzipped).
- **Use**: a calling episode is one bird: it takes one voice and each note is one of that voice's real calls (rendered once, kept). The old medians stay for what has no library (the chick's begging, the albatross, the owl, and the timing of notes).
- The barn owl's screech is a rough hiss without a clear pitch: one call in eight came back from the round trip, so the owl is left as it was.

## Version 11: the owl, the chick and the albatross from real calls too
- **Owl** (20 barn owl recordings, Belgium, France, the Netherlands, Britain, Denmark): a narrow search (1.5 to 2.8 kHz, 0.4 to 2.4 s) finds a harmonic ridge near 1.7 to 2.2 kHz in 12 recordings, one screech each; seven pass the
  round trip: seven voices. (The earlier try, with a wide pitch range, found one call in eight: the screech is not toneless, the search was too wide.)
- **Chick** (24 recordings of begging herring gulls, juveniles of all ages, Britain, Ireland, France, the Netherlands, Estonia): the pulsing is measured for each call (`template.am_of`, rate 6 to 90 a second and depth) and played back
  (`libTemplate` sets `am`); 58 of 72 calls pass the round trip, twelve voices. These are fledglings and young birds; downy chicks peep higher and shorter, and there is no recording of one that is clean enough.
- **Albatross whirr**: pulsed or tonal calls of 14 recordings (Laysan, black-footed, wandering), 17 of 22 pass: nine voices. **Claps**: three birds' claps each (Midway, Clarion, Hawaii) and the combined one. The other
  recordings' apparent claps 0.1 s apart are the pulses of a whirr (an automatic search for clicks found them), so the claps stay at 0.3 to 0.45 s from the three clean recordings.
- A pulsing call needs its pulsing in the round trip: the first QA run dropped most chick and whirr calls because the synthesis lacked it; with it in, they pass.

## Version 12: the call-type mix of a colony, and the lost frequencies
- **Labelled calls.** No open annotated gull dataset exists (searched: Zenodo, BirdSet, the literature); the labels that do exist are Xeno-canto's own type tags on each recording (alarm call, long call, flight call, begging call, call, song).
  Metadata of 532 herring gull recordings (A and B quality) were read; recordings whose tags are only one type were measured (alarm 36 recordings / 1,397 calls, flight 30 / 594, long 28 / 671, plain call 30 / 781, begging 23 / 570):
  | type | length (median) | pitch (median) | roughness |
  |---|---|---|---|
  | alarm | 0.10 s | 860 Hz | 17 dB (rough) |
  | flight | 0.16 s | 790 Hz | 29 dB |
  | long call | 0.19 s | 1270 Hz | 38 dB |
  | plain call | 0.20 s | 1120 Hz | 26 dB |
  | begging | 0.20 s | 1370 Hz | 33 dB |
  The alarm and flight calls are LOW (about 800 Hz) and rough. The first library dropped everything below 900 Hz or under 22 dB of roughness as pitch-tracker junk, so it held none of the calls that make up much of a colony.
- **The mix.** The calls of six colony and flock recordings were labelled by nearest neighbour against those groups: about a third flight-like, a sixth to a quarter alarm, a third mews and long-call notes, and 10 to 30% begging where there are young
  (599932 dawn colony: flight 40%, alarm 25%, plain 18%, begging 12%, long 5%). The colony plan now draws episodes in about those proportions: flight 34%, alarm run 20%, mew 37%, long call 9%; the young add begging.
  (A rough labelling: the labels are per recording, not per call.) New libraries `gullAlarm` (12 voices) and `gullFlight` (9 voices), through the same filter and round-trip check.
- **Lost frequencies.** Measured on the rendered calls against the real ones, the synthesis was 35 to 50 dB down under 800 Hz and 15 to 40 dB down above 8 kHz. The calls matched their own measured spectra: the loss was in what was measured. The analysis throws away
  a band that does not clear the recording's background (10 dB for the tone, 4 dB for the noise), which in a noisy recording removes the call's lows and highs with the background. `fillBands` now fills what is empty (joins a gap, and continues past the last
  measured band at 4 dB a band for the tone, 2.5 for the noise above and 1.5 below). The shortfall falls to 10 to 20 dB below 800 Hz and 3 to 10 dB above 8 kHz (some of the rest is the real recordings' own background).

## Version 13: biphonation, and the calls that were missing
- **Biphonation.** Looked at closely (250 gull calls of five kinds, a second tracker on what the first leaves), about half of the calls have a ridge that is not a harmonic of the pitch: at 1.4 to 1.5 times it (the odd half-harmonic of a
  period-doubled voice), 9 to 11 dB below it, present in a fifth to a quarter of the call, anywhere in it (alarm 53% of calls, plain call 53%, flight 50%, begging 44%, long call 36%). `CallTemplate.second` renders it: a second
  set of four harmonics at 1.3 to 1.6 times the pitch, 7 to 12 dB down, swelling in and out over a quarter to six-tenths of the call; the game gives it to half of the gull calls at random. (A mask of 5% around each harmonic had counted the
  skirts of the main ridge as a second voice and found 90%: the mask is 13%.)
- **Choking.** Xeno-canto has no tag for it, and its remarks name it once. The recordings tagged duet, displaying, domination, excitement call, mobbing, courtship and copulation (55 recordings of six gull species) were searched for regular trains of
  pulses: 21 trains in 16 recordings, 5 to 12 pulses, 3.2 to 5.5 a second (median 4.5), each pulse 0.085 s, near 650 Hz and fairly clean (32 dB). That is the "rhythmic, deep, guttural clucking" described, so it is `gullChoke`
  (10 voices, from the trains' pulses), played in trains at that pace, slowing a little, in 7% of colony episodes.
- **Size.** The JS budget (170 KB gzipped) now holds the library trimmed to 10 voices of four calls each (`trim_lib.py`; the full, checked library is made by `build_lib.py` and `qa.py`).
- **Not done**: the long sustained "wail" of a pair's duet (a flat tone, 0.6 to 1.5 s); a closer look at the long call itself (the book of the colony's most obvious call); downy chick peeping.

## Version 14: clean single-bird recordings (Cornell Macaulay Library, from the owner's own copies, used for measuring only)
Four very clean recordings of herring gull alarm calls at one metre with a shotgun microphone (Appledore and Smuttynose Islands, Maine, June 2011; "yow" and "kek-kek"; Microtrack 2 recorder, Sennheiser MKH 416-T; the spoken notes at the end were read with a speech-to-text model), and a feeding flock (American Herring Gull, Suffolk NY, 2020, ML278198681).
- **Round trip on clean data.** Each clean call was measured, resynthesised from its own numbers and compared band by band over 125 Hz to 12.7 kHz: the mean difference is within 8 dB everywhere (0 to -8). So with a clean source the
  synthesis does not lose frequencies: the 35 to 50 dB shortfall seen earlier was the recordings' own background, and what was measured of it.
- **What the comparison did show** (real and resynthesised spectrograms side by side): (1) the contour glitches: where the pitch tracker changed octave (a jump of nearly two between neighbouring frames) a call was resynthesised with a V in its pitch. Calls with such a jump are now left out of the library;
  (2) the apex warp used to build medians stretched a short onset glide over a third of the call (a swoop). Each real call is now kept in its own time (`unwarp`); (3) real calls lose their high harmonics before they end and their lines ripple: a brightness change through the call (3 numbers, measured) and a flutter of each of the
  first twelve harmonics (about 1 dB, 22 to 62 Hz) and of the pitch (0.2 to 0.25%) are now in the synthesis.
- The four clean recordings are the first voices of the alarm kind (`gullAlarm`).
- **Feeding flock**: the close recording shows a bursty flock (36 gaps of over a second in 100, none over six; calls bunched; 50 dB of level swing; median pitch 1.67 kHz against 1.27 for a colony; much brighter, broadband squeals, wingbeats).
  The feeding mode now alternates spells (4 to 12 s at 1.8 times the rate) and lulls (1.5 to 5 s at a tenth), and pitches calls 12 to 45% higher. Wingbeats and squeals are not done.

## Version 15: the thin high call, and trains of "kek" (a winter flock, ML547765491, Suffolk NY, 10 Feb 2023; clear, 60°F, 12:55 pm)
- Long regular trains of short pulses (10 to 25 a train, about six a second, fundamental about 1.7 to 1.9 kHz, with thin arched harmonics reaching 10 kHz) fill much of the recording. The alarm episodes of the colony and the flock now include
  them in 30% of the runs (10 to 22 pulses 0.15 to 0.19 s apart), the rest keep the shorter, slower runs of the clean alarm recordings.
- **The thin high call.** 239 detections of a pitch between 3.2 and 7 kHz: 147 coincide with a mid-range call (they are its second harmonic), 92 stand alone: flat or gently falling pure tones at 3.3 to 4.7 kHz, 0.1 to 0.8 s, 13 to 60 dB clean (a winter flock with first-winter birds).
  With the begging recordings' own high tones they form `gullThin` (11 voices, 51 of 72 calls pass the round trip), now the main call of the young (62% of a chick episode; the rest is the rougher begging).
  The owner's observation: chicks give a thin high call that is stronger and lower in juveniles and lower still in adults (the mew). That fits the measured tones (3.3 to 4.7 kHz for first-winter birds against the mew's 1.2 to 1.6 kHz), but this recording has no
  downy chicks, so the highest, thinnest call of the smallest chicks is not measured. That the kek trains hide the call is a hypothesis: here the stand-alone thin calls fall inside the trains only rarely (8 of 239 detections), but the trains' own arched harmonics fill the same 4 to 10 kHz band.
- The library trimmed to ten voices of three calls to stay under the JS budget (167.7 KB gzipped).

## Version 16: what the owner heard in the first resynthesis of the clean recordings, and what was wrong
The owner heard calls fading too hard and fast and so cut short, calls with a vibrato made to sound like a vibrating plate, smooth calls that seemed to be muted at a regular rate, and some calls "blown out" and flat. Measured against the clean originals (the real call, aligned by its start, in 20 ms frames):
- **Muting and the vibrating plate**: the 22 to 62 Hz flutter of the harmonics and the 37 and 83 Hz wobble of the pitch that version 14 added are removed. Real vibrato (measured on the pitch of the clean calls): 6 to 13 a second; the depth measured, 1 to 4%, includes the tracker's own error and was far
  wavier than the real lines when played, so a quarter of it, at most 0.6%, is played.
- **Fading**: the real loudness contour is about -6 dB at the start, -2 to -4 through the body, -16 at 0.7 of the call, -26 at 0.8, -43 at 0.9 and then the call has stopped. The measured contours (frames within 18 dB of the peak) start too low and end too high; `shapeEnds` fixes the ends, and a 50 ms tail
  carries the end on. The synthesised median now follows the real one to within 6 dB all along it (a longer tail, tried first, rang on as a held tone after each call).
- **Blown out**: some resynthesised calls came back much noisier than their source (the achieved roughness 13 to 29 dB below the target, in 5 of 32): the octave error of the pitch tracker (the second harmonic taken for the pitch) spoils the roughness measure and the noise level. The analysis now tries half the pitch
  as well and keeps it when the voice is much cleaner there; the round-trip check rejects a call that comes back more than 8 dB noisier than its source.

## Version 17: the pitch in 24 points
Side by side with the clean originals, a call's pitch steps (two-part calls: an abrupt step of a few hundred cents between notes) came back as glides, because the pitch was stored at 12 points. It is now 24 points, uniformly in time, and played straight; the steps stay steps. Pitch of the synthesis against the real contour (analysed the same way):
median error 29 to 44 cents (the worst tenth, 65 to 190, at the steps). Calls tracked at the wrong octave (the second harmonic taken for the pitch: the first call of recording m1 steps the wrong way) are still a risk; the library keeps ten voices of two calls each to stay under the JS budget (166.5 KB gzipped).

## Version 18: the budget raised, and the known faults
- **Budget** (`scripts/check-budget.mjs`), raised at the owner's request for the real-call library: JS 300 KB (was 170), total 380 KB (was 230), any one file 300 KB (was 150), gzipped. Now JS 180 KB, total about 218 KB.
  The library is no longer trimmed to ten voices of two calls: up to 14 voices of 6 calls a kind (13 + 8 + 11 + 11 + 12 + 9 + 8 + 12 + 7 + 6 + 8 + 11 + 9 voices, 600-odd calls).
- **The wrong-way step in the first clean recording.** It was not a tracker octave error: that bird's calls have a strong fundamental near 2.1 kHz with a weak subharmonic line half way (an alternating-period voice), and the search range (700 to 2400 Hz) let the
  tracker slip down to the subharmonic. Each of the four clean recordings is now searched in its own range (the first 1.2 to 2.5 kHz, the others 0.9 to 1.9 kHz). The step now goes the right way.
- **Haze of noise.** The round trip rejects a call that comes back more than 5 dB noisier than its source (was 8). The very rough calls (under 8 dB) are left out of the gull kinds, as a harmonic voice with noise cannot make a call that is mostly noise (the squeal): they want a noise-based
  synthesis, not done.
- Measured against the clean originals: pitch contour error median 26 to 64 cents; roughness within 6 dB (median 0 to +2). Known remaining: some two-part calls have a short spike at the step, and noise-dominated squeals are missing.

## Version 19: a look test against the real recording, and an honest count
The owner's complaint: sounds that were clearly off on the spectrogram were still being sent. The checks so far compared the synthesis with numbers taken from the same analysis (round trip), never with the real call itself, and a handful of side-by-side panels chosen by eye hid the bad ones.
- **Look score** (`scripts/birds/qa.py`, `look`): the correlation of the real call's spectrogram (150 Hz to 6 kHz, from its start, blurred so that a small shift does not count) with its synthesis: a misplaced ridge, a missing step or a haze of noise lowers it. Calibrated on a contact sheet of
  all 32 sampled calls of the four clean recordings: the calls that look right score 0.82 to 0.96, the visibly wrong ones 0.0 to 0.75.
- **The count.** Only 7 of 32 clean calls (22%) pass 0.75 (m2: 3 of 8, m3: 3 of 8, m4: 1 of 8, m1: 0 of 8). The failures are of known kinds: a bird whose voice alternates its period (recording 1, strong subharmonics), two-part calls with steps, rough or noisy calls (squeals), and the first frames of some calls (a start streak, now reduced
  by `steadyOnset`). A per-harmonic amplitude profile (`CallTemplate.harm`) was tried and moved the score little: the missing piece is the noise, the steps and the second voice, not the smooth spectrum.
- **The library is now verified**: every library call (with a source recording) must score 0.75 or more against its own real call. Voices left: gull mew 8, notes 5, alarm 5, flight 5, choke 5, rook 6, sparrow 8, blackbird 5, owl 6, whirr 5. Where fewer than five voices survive (the thin call, the buzzard, the begging) the earlier,
  looser library is kept and is UNVERIFIED (`gullThin`, `buzzardMew`, `gullBeg`): these are the least trustworthy sounds.
