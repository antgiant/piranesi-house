# Birds, starting again (notes to myself)

**State.** All bird *sound* code was removed (commit after 56b7425). Left alone: which birds are where and when (`src/sim/light.ts`, `src/sim/seasons.ts`, `src/world/hall.ts` bird halls, `speciesFor` and the scene `birds` field), the narration (`narrator.ts`, `nature.ts`), the Settings toggle for birds, and tests for those.
`AudioEngine.bird()` in `src/audio/engine.ts` is an empty stub that only counts a call: a new voice has one place to go. Size budget is back to 170 KB JS / 230 KB total / 150 KB any file (gzipped); now 134 KB JS.
The removed code is all in git: `git show 56b7425:src/audio/birdsynth.ts` (and birdsong.ts, birdcalls.ts, birdlib.ts, colonybed.ts, scripts/birds/*). Read it for ideas; do not restore it wholesale.
The owner chose synthesis only (no shipped audio). Almost every usable recording is CC BY-NC-SA, Macaulay is © Cornell: measure from recordings, keep none in the repository.

## What the owner needs to hear
A colony that sounds like XC599932 (the Robin Hood's Bay dawn colony) and a flock like ML278198681 and ML547765491 (Venetian Shores Park): many individual birds, a bed of far ones, the real MIX of call kinds, each call real-looking on a spectrogram next to the original. The owner judges by ear AND by spectrogram, and was repeatedly sent sounds that were visibly wrong. Never send a sound that has not been compared, call by call, with the real one.

## Process lessons (the expensive ones)
1. **Judge against the real call, every call, before sending anything.** Make a contact sheet of ALL calls (real above, synth below), never a hand-picked few. A look score (correlation of the blurred spectrograms, 150 Hz to 6 kHz) matched the eye: 0.82 to 0.96 good, under 0.75 visibly wrong. Only 7 of 32 clean calls passed with the old synthesis.
2. Round-trip checks (analyse my own synthesis with my own analyser) and band-average spectra said "the same" when the spectrograms were not. They cannot find a wrong pitch track, a missing step, a noise haze or a smooth line that should be rough.
3. The pitch tracker (harmonic-sum Viterbi) chooses an octave, a harmonic or a subharmonic wrongly on many calls (a bird with an alternating-period voice has a weak line half-way). Check every contour against the spectrogram, restrict the range per recording.
4. A median over calls is not a bird: fifty copies of one voice sound like five birds. Each call must be a real individual's; a colony is many individuals. Also keep real calls in their own time (apex alignment stretched an onset into a swoop).
5. Things I added that were wrong: harmonic flutter and pitch jitter (a vibrating plate), a long tail (a held tone), a pure arch for the chick call (a drill), synthetic rustle/wing noise (a broom), a smooth fade (cut short), low-frequency noise (a hoarse low gull), fixed spectrum through the call.
6. Long background jobs died when the shell ended unless started detached; keep a "done" marker file. A stop hook insists on commit and push (the branch is `claude/house-plan`; `main` only when the owner says "push live"). `scripts/birds/library.json` was too big for the commit hook.

## What was measured (own words; trust the numbers, not the code)
- **Real calls**: hold their level to near the end (-2 to -4 dB through the body), fall about 15 dB in the last tenth of a second and stop (about -26 dB at 0.8 of the call, -43 at 0.9). Onset about -6 dB. Harmonic lines are smooth (real vibrato is slow, 6 to 13 a second, and small); many calls are two notes with an abrupt pitch step; some are noise-dominated (squeals); some have a second, non-harmonic ridge near 1.4 to 1.5 times the pitch (about half of gull calls, 9 to 11 dB down, for a fifth to a quarter of the call).
- **Gull call kinds** (Xeno-canto type tags, 532 recordings read; no open labelled dataset exists): alarm 0.10 s, about 860 Hz, rough; flight 0.16 s, about 790 Hz; long call 0.19 s, 1270 Hz, clean; plain call 0.20 s, 1120 Hz; begging 0.20 s, 1370 Hz, rough and pulsed about 45 a second. A colony's calls by nearest neighbour: about a third flight-like low rough calls, a fifth alarm, a third mews and long-call notes, 10 to 30% begging where there are young. Winter flock: long trains of 10 to 25 "kek" pulses at about six a second, fundamental 1.7 to 1.9 kHz. Choking: trains of 5 to 12 pulses at 3 to 5.5 a second, each 0.085 s, near 650 Hz. Thin high call of the young: 3.3 to 4.7 kHz pure tone, 0.1 to 0.8 s (a screen grab of four chick calls from ML165926 shows thin rising-then-falling arches, 0.3 to 0.5 s).
- **Colony** statistics (20 ms envelope of 0.8 to 6 kHz): 90 to 220 call starts a minute, in a call 50 to 75% of the time, level moving 4 to 10 dB; a feeding flock is bursty (36 gaps over a second in 100, none over six, 50 dB level swing, median pitch 1.67 kHz against 1.27 in a colony, much brighter). Long-term spectrum has far more 200 to 800 Hz than single calls give (mostly the recording's background, wind, many far birds).
- **Albatross** (Laysan): claps are single, slow, 0.33 to 0.45 s apart in runs of seven to eleven, a longer gap now and then, two seconds or more between runs; the apparent claps 0.1 s apart are the pulses of a whirr (pulsed or tonal, 1 s). Each greeting should differ.
- **Sparrow** chirps overlap and answer; no clicks; a pure whistle or a block of noise is wrong. **Rook** was judged decent. **Owl** (barn): a harmonic ridge at 1.7 to 2.2 kHz, 1 to 1.3 s with noise.
- The room echo (`src/audio/room.ts`) turns a pure tone into a long steady whistle-like tail; audition clips used a 4 s hall.

## Where the recordings are (not in the repository: licences)
- Scratchpad `/tmp/claude-0/-home-user-piranesi-house/f7f8e8d9-11bf-5c49-886c-446dd7505cb2/scratchpad/`: `lib/` (many species, Xeno-canto, by group: `gull/ g_alarm/ g_flight/ g_long/ g_song/ g_plain/ beg/ m_duet/ m_domination/ m_mobbing/ m_short/ rook/ sparrow/ blackbird/ buzzard/ owl/ albatross*/ colonyrec/ ind/`), `birds/colony/` (colony and flock recordings: XC599932 599934 1086854 861758 486846 845872 400551), `user/` (the owner's Macaulay screen recordings as wav), `lib/mac/` the four clean alarm calls cut (m1 to m4), `lib/f5`, `lib/f6` the two flocks. Metadata of 1,731 Larus recordings with their type tags: `gull_meta.json`, `larus_meta.json`.
- The owner's originals: `/root/.claude/uploads/f7f8e8d9-11bf-5c49-886c-446dd7505cb2/*ScreenRecording*.m4a`. The four clean alarm calls (ML165926 is the third, with chicks in the background; the first is ML165927; fourth ML165931), a feeding flock (ML278198681), a winter flock (ML547765491): the spoken notes at the end (read with faster-whisper in the scratchpad venv, small.en) give place, time, microphone (Sennheiser MKH 416-T), recorder (Microtrack 2), distance (1 m).
- Python venv with numpy, scipy, matplotlib, faster-whisper: `.../scratchpad/venv`. Render the real engine offline: `scripts/audition/render.mjs`. Spectrogram montage: it was `scripts/birds/spec.py` (in git history).

## Second attempt, step 1: one call matched (offline prototype, `scripts/birds/gull_resynth.py`)
Approach (from the owner's brief): behaviour drives a parametric source plus noise synth; recordings are targets, never playback.
- Target: the alarm call at about 9.0 s in the clean recording m2 (0.5 s, f0 1.25 kHz falling to 0.9 kHz, a quick flick down at the very end).
- Measured per frame from the spectrogram: f0 by harmonic-sum salience (h1 to h4), eight harmonic amplitudes, a second non-harmonic ridge at 1.5 times f0 (present about a seventh to a quarter of the call), noise left over after masking the lines.
- Look score: harmonics alone 0.83; plus residual noise and second voice 0.96; after fixing a time shift (scipy `stft` already returns window-centre times) 0.98 with every frame's tracks kept.
- Reduced to curves: pitch on 12 knots and harmonics as rank-2 log amplitude through the same knots keep 0.95 or better on three different calls of m2 (0.957, 0.957, 0.954). With 8 knots it falls to 0.92: the onset and the end flick need knots of their own.
- Pitfalls found: (a) the onset is noise, so f0 there is unreliable: hold the first clean value; (b) track the last 20 frames on the peak itself or the end flick is lost; (c) noise scaled to the measured residual was too hazy (0.4 of it scored best); (d) the single-peak f0 tracker failed on call c, harmonic-sum salience did not.
- Owner's ear (round 1): noise overpowered the clear "halftone" lines in the onset. Those lines (about 650, 1850, 3100, 4300 Hz) are odd multiples of f0/2: a period-doubled second voice, not a ridge at 1.5 f0 with its own multiples. Modelled as lines at 0.5, 1.5 ... 5.5 times f0, and the onset noise (first 70 ms) halved: the lines now show as in the real call. The look score falls slightly (0.957 to 0.952) because it does not reward them; trust the picture.
- Not yet done: judged again by the owner's ear; onset is softer than the real 5 ms attack; noise bed is a little smeared; only one recording (one bird) and one call kind; no VoiceProfile, no behaviour, no TypeScript port, nothing in the engine.

## Second attempt, step 2: the same model on three more recordings (m1, m3, m4; 108 isolated alarm calls)
Run with `scripts/birds/gull_batch.py REC.wav OUTDIR` (finds the calls, runs `gull_resynth.py` on each, prints a table). Look scores:
m3 37 calls, median 0.961, all 0.91 or more; m1 23 calls, median 0.907, none under 0.86; m4 48 calls, median 0.895, four under 0.75
(two are another call kind, see below). Together: 72 of 108 at 0.9 or more, 32 at 0.75 to 0.9, 4 under 0.75. The owner has judged the
first m2 call (and the version with the halftone lines) by ear: "excellent reproductions, can barely tell them apart".
- **The owner's steer:** individual gulls sound very similar, so do not spend effort on per-bird voice variation for gulls (it is for
  later species). A mix of call types and call variants should be enough for gulls.
- **Bugs that were not the model:** (a) `para()` (parabolic peak) blew up to 1e36 on a flat peak: clamp it; (b) the call detector
  converted envelope indices with 5 ms instead of the real hop (220 samples = 4.99 ms): 0.1 s drift at 46 s, so late calls were cut
  in the wrong place and scored 0.6 to 0.7. Always check the time axis before blaming the synthesis.
- **Model changes that mattered:** pitch tracked by Viterbi over the harmonic-sum salience with a small gliding cost and a flat jump
  cost, so a two-note call's pitch step is followed (single-peak tracking cannot jump); steps kept as two neighbouring knots and
  smoothing never crosses one; knots chosen where the curve is worst until it is within 1.2% (8 to 14 for a simple call, 20 to 38
  for steps or a wave, 36 knots for five vibrato-like cycles); noise estimated as 1.2 times the band median so stray lines cannot
  inflate it.
- **Call types seen:** a single falling note (m3, most of m4); two notes with an abrupt pitch step (most of m1, a third of m4); trains
  of short rising-falling pulses (m1); a wave (about five slow cycles of pitch, m1); and a dense, squealing call with a pitch below
  750 Hz (end of m4, not handled: calls 45 and 47 of m4, 0.64 and 0.67).
- **Known flaws:** after a pitch step the synthesis switches about 35 ms earlier than the real call in at least one m1 call (not yet
  explained: the step tracker reads the change in the frame before the picture shows it); a patch of noise haze at the second note
  of some two-note calls where the real has a shorter burst; less onset noise scores lower (0.5 of the measured level is kept), even
  though the owner liked the clear halftone lines.
- **Not done:** the other call kinds (long call, mew, choking train, begging), the order and spacing of calls in a series, the
  procedural grammar that produces these curves from a call kind and a mood (so far each call is analysed from a recording,
  not generated), the TypeScript port and the engine.

## Second attempt, step 3: the rasp, the pop and the closing click (owner's ear, round 2)
Owner on m3_9 (and the others): the biggest audible difference is the start and the end. The real call has a noisy rasp (throat) and
then an immediate pop to full level on the lines; at the end the tone stops suddenly as the pitch dives, and a quick closing sound
follows. The synth blurred all of that together and so sounded gentler and less abrasive.
- **Why:** loudness and noise were measured through a 23 ms window and smoothed, so a 2 ms pop became a 30 ms ramp and the click had no
  place to live. The harmonics also stopped at 8 kHz; the real lines go past 9 kHz (the 6 to 12 kHz band was about 9 dB too quiet).
- **What the real call does (m3_9, 14.19 to 14.46 s):** rasp 14.19 to 14.23 (low, pulsed noise, tone 10 dB down); at 14.231 the line level
  jumps about 11 dB in 2 ms (with a dip just before it); full level to 14.37; the level collapses around 14.395 as the pitch dives from
  1.4 to 0.9 kHz; a short broadband click at about 14.445; finished by 14.46.
- **Fix:** a second, fine analysis (5.8 ms window, 0.7 ms hop): a gain (real line level over synth line level) stored as a few dB
  knots (5 to 36 per call), and the noise bed per fine frame (24 bands, 250 Hz to 12 kHz, low-percentile estimate, lines masked, mask
  widened while the pitch moves but never wider than the gap between halftone lines). Harmonics to 12 kHz, halftone lines to 9.5 times f0.
  Units are now true amplitudes: the old tone scale was wrong by a constant that the final level match hid, and the old noise factor
  of 0.4 was partly compensating for it. The final level correction is now 0.94 to 1.08 on every call.
- **Fine measure (1 ms level contours against the real call, m3_9, 14.185 to 14.47 s):** RMS error in the f0 line band 16.3 dB before,
  3.4 dB after; 2 to 4 kHz 20.1 to 4.7 dB; 6 to 12 kHz 12.8 to 6.5 dB. The line reaches -24 dB 26.5 ms after the start in the real call.
- **The look score falls** (m3 median 0.961 to 0.916, m1 0.907 to 0.843, m4 0.895 to 0.861) because it blurs 23 ms, cannot see a 2 ms pop,
  and punishes noise whose random detail cannot match the real. Trust the 1 ms contours and the 5.8 ms spectrograms for this; do not
  tune the look score back up. (`scripts/birds/gull_resynth.py` prints both; the fine plot was a scratch script.)
- **Mistakes on the way:** a noise estimate taken near the lines was inflated by halftone lines (tone too quiet in the rasp of m2);
  a mask that grew with harmonic number covered the whole spectrum where halftone lines are only half an f0 apart (a hole above 8 kHz);
  and line smear during the end dive read as a false click. Always check the original (m2) call after changing the noise.
- **Still different on m3_9:** the first 50 ms after the pop is about 5 dB brighter above 6 kHz in the real call; from 14.32 to 14.39 the
  line band is about 2 dB too loud. m2: the f0 line in its rasp is 5 to 8 dB too quiet and a faint haze trails 25 ms after the end.

## Second attempt, step 4: m1_16, the two-note call (the owner approved m3_9 and the m2 call as "perfect")
- **Pitch step 50 ms early (the long-standing m1 flaw, found).** Where the old note is fading and the new one is not yet there, the old
  and the new pitch score alike and the Viterbi path jumps at the earliest tie. The fine window shows the truth (the new line rises from
  0.01 to 0.06 within 12 ms at 32.308 s; the tracker said 32.254). Fix: after the Viterbi, put each step where the lines of the new pitch
  overtake the old at 0.7 ms resolution. **Only for a real step**: steady pitch on both sides (peak-to-peak under 3% over 6 frames,
  sampled 3 to 14 frames away from the jump). The first version applied it to every large jump and flattened a real glide (m4 call 35:
  a 1550 to 1100 Hz glide became two plateaus; mean score fell 0.015). A glide is not a step.
- **Onset sweep.** Real onsets can sweep: m1_16 rises from about 1030 to 1250 Hz over 31.845 to 31.885 s, then drops to the body pitch
  1076 Hz at 31.897 s. The 23 ms window cannot see that and the 5.8 ms one cannot resolve the lines: the first 55 ms are tracked on an
  11.6 ms window (smooth path, no jumps) instead of holding the first value. Neutral to slightly positive on the scores (+0.003).
- **Noise floor 10 dB too high between the lines (the big one).** The 5.8 ms window leaks energy from strong lines into the gaps, and that
  was counted as noise: red all over the body in the synth minus real plot. In the steady body the long window's estimate is now a ceiling
  on the fine one; the fine estimate stays for the onset rasp (first 70 ms) and the end (last 50 ms). Raised every score: m1_16 0.884 to
  0.929, m3_9 0.913 to 0.967, m2 first call 0.922 to 0.964. (So most of the "look score falls" in step 3 was this haze, not the fine events.)
- **Totals (108 calls of m1, m3, m4):** m3 median 0.964 (36 of 37 at 0.9 or more), m1 0.897 (11 of 23), m4 0.907 (29 of 48); 76 of 108 at 0.9
  or more, 2 under 0.75 (the dense squealing calls). No failures; final level correction 0.45 to 1.35 (the extremes are the squeals).
- **Still different on m1_16:** the onset sweep is a few crisp lines in the real call and a hazier fan in the synth; the first line
  in the second note dips 15 dB mid-note in the real call and stays level in the synth (the rank-3 shape cannot do a single line's own
  dynamics); the step itself is a 3 ms glide in the synth and an instant change in the real.
- **Biphonation in some m4 calls** (m4 call 35, 40.47 to 40.60 s): two independent voices, a line at 1550 Hz and another at 2200 Hz
  with their sum (3750 Hz) and 2 times the higher one: not a harmonic series. The model fakes it with harmonics of one pitch plus
  the halftone lines; a true two-source model is needed if it is audible.

## Ideas for the second attempt
- Start from ONE clean bird and one call type and make the spectrogram match (look score above 0.9), then widen. Use the four clean recordings (m1 to m4) as the test set from the start.
- Model what the real calls show: a call as a few notes, each with a pitch contour that may step, a loudness contour that holds then drops, a rough or clean voice (a noise-dominated squeal needs a noise source, not harmonics plus noise), an optional second voice, no added flutter.
- Or granular/resynthesis from the recorded call itself (pitch contour and spectral envelope taken directly from the spectrogram frame by frame, not through 12 or 24 numbers) if that is allowed within "synthesis only".
- Then the colony: individuals, a far bed, the measured mix, bursts, chains of calls set off by neighbours, wing sounds (not yet measured).
