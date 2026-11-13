# The sea, rain on water, and deep bass

Built from measurements of real recordings of surf in sea caves (reference clips from Freesound, kept out of the repository and used only to
measure; nothing is copied or shipped). Everything is still procedural. Code: `src/audio/sea.ts`, `patter.ts`, `noise.ts`, `bass.ts`.
This is the sea. (The first, noise-and-LFO sea was removed once the owner had heard both and preferred this one.)

## What the recordings said
| | Real caves | Old sea | Now |
|---|---|---|---|
| Deep energy (15-90 Hz) | a large share of the power, some of it under 20 Hz | none under ~30 Hz | sub layer, 15-90 Hz, with a 24-30 Hz thump per wave |
| Cave "hollow" | broad hump 60-300 Hz | none | body layer: resonances near 72, 140, 290 Hz |
| Highs in the two ears | almost uncorrelated above ~5 kHz (about 0.0-0.15) | nearly identical (0.84-0.95) | each mid/high layer is six independent sources in six directions (HRTF) |
| Surf hiss (2-8 kHz) | -9 to -26 dB re total | -19 to -34 | -13 to -23 |
| Swell depth | 8-16 dB | 6.5 dB | about 12 dB |
| Foam | dense fizz; at most ~2 audible clinks/s | none | fizz of short unpitched pops: 0.1 clinks/s |
| Echo tail after a splash | about 0.8-1.4 s | 4 s (hall reverb) | unchanged (hall reverb) |

## Layers
* **sub, body**: stereo as mid/side (about 0.85 alike), so wide but not hard-panned. Brown / pink noise through filters.
* **roar, hiss, foam**: one source per direction (`AROUND` in `spatial.ts`), each with its own noise offset, speed and slow random flutter.
* **waves**: each starts on one side and travels across the space; sizes are lognormal with a bigger one every fourth; occasionally two
  close together or a lull. Each ends with an impact (thump, slap, spray) and a run of gurgles.
* **doorways** still use the old noise beds (not yet rebuilt), pulsed by the new waves.

## The foam, and the pebbles (a lesson)
The first foam was thousands of pitched, ringing pops, some loud. Played alone it made 10.5 audible clinks a second (real surf: 0 to 1.9)
and was strongly pitched; it sounded like pebbles or ice clinking, which is what the owner heard. Measuring it inside the full sea hid
this (the swell and the six directions diluted it). The foam is now many very short, even, unpitched pops (a fizz). `tests/noise.test.ts`
counts the clinks so it cannot come back.

## Rain on water (`patter.ts`)
The original pops, softened (no very loud ones), are the sound of drops landing on water. They join the ordinary rain wherever rain falls
on water: a hall the tide has flooded (all of it), the lower halls by the sea (70%), a hall with falls or a stream (60%). The director says
how much (`rain.onWater`), and "listen" says so ("Rain patters on the water all around you").

## Deep bass (`bass.ts`: always on, full range)
The mix always carries its deep end: a +4 dB low shelf below 60 Hz, a harder impact thump (x1.4), and -1.5 dB overall so the peaks stay put;
only rumble under 12 Hz is removed. Measured on the new sea: +2.4 / +1.5 dB at 16-32 / 32-64 Hz, mids -1.5 dB, peak unchanged.

A three-way setting (small speakers / standard / full) was built and then dropped at the owner's request. Its premise, "more headroom on
small speakers", was measured and is false: the sea's loudest peaks are not made of sub-bass (the peak was the same in all three modes).
Its one remaining use was keeping tiny drivers from buzzing on notes they cannot play, which could not be measured here. If a phone speaker
ever sounds rattly, a steep 70 Hz high-pass (two 2nd-order sections, 24 dB/octave) cut 16-32 Hz by 34 dB and 32-64 Hz by 13 dB, with nothing
above 125 Hz changed; it is easy to bring back.
Web Audio quirk, learned here: a high-pass's `Q` is in dB, so the flat (Butterworth) value is -3.01, not 0.707.

## Not done
* Doorway sea and falls still the old noise.
* The browser's built-in HRTF dips about 5 dB near 2 kHz for everything placed in space; a corrective EQ is possible.
* The reverb is still a 2-channel noise impulse response (real small caves measured at about 1 s).
* "Carbonated" waves (a fizzing wash where the tide drains over a flooded floor) were suggested; not built.
