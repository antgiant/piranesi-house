# The sea, rain on water, and deep bass

Built from measurements of real recordings of surf in sea caves (reference clips from Freesound, kept out of the repository and used only to
measure; nothing is copied or shipped). Everything is still procedural. Code: `src/audio/sea.ts`, `patter.ts`, `noise.ts`, `bass.ts`.
Off by default until approved: `engine.seaModel = 'new'` (the old sea remains the default).

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

## Deep bass (`bass.ts`, a setting)
Small speakers cannot play below about 70 Hz, and a web page cannot tell what it is playing through, so it is a setting:
* **Small speakers**: a steep (24 dB/octave) cut at 70 Hz on the whole mix, and no impact thump. Measured on the new sea: 16-32 Hz -34 dB,
  32-64 Hz -13 dB, nothing above 125 Hz changed. It protects small drivers from buzzing; it does *not* give more headroom, because the
  sea's loudest peaks are not made of sub-bass (measured: the peak is the same in all three modes).
* **Standard**: as built; only inaudible rumble below 12 Hz is removed.
* **Full range**: +4 dB low shelf below 60 Hz, a harder thump, and -1.5 dB overall so the peaks stay put. Measured: +2.4 / +1.5 dB at 16-32 /
  32-64 Hz, mids -1.5 dB.
Web Audio quirk, learned here: a high-pass's `Q` is in dB, so the flat (Butterworth) value is -3.01, not 0.707.

## Not done
* Doorway sea and falls still the old noise.
* The browser's built-in HRTF dips about 5 dB near 2 kHz for everything placed in space; a corrective EQ is possible.
* The reverb is still a 2-channel noise impulse response (real small caves measured at about 1 s).
* "Carbonated" waves (a fizzing wash where the tide drains over a flooded floor) were suggested; not built.
