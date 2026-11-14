# Footsteps

The visitor is barefoot: the book gives a castaway in ragged clothes who makes coverings of cloth for his cold feet and means to make shoes of fish leather; shoes come only later, as a gift, and
the game leaves that out. So a step is the foot itself (`src/audio/steps.ts`).

## What a step is (research and recordings; version 3)
Version 1 and 2 made a heel and then a toe: two small clacks a tenth of a second apart, a low sine thud and a patter of bright noise. It sounded like a heeled shoe, or
like something exploding in a shoe. The research and the recordings say it is something else:
* The physical models of walking sound (Cook's physically informed stochastic models, and Nordahl, Serafin, Turchet and Fontana's work on real-time footstep synthesis, which
  extracts the **ground reaction force** and uses it to excite the floor) treat a step as one exciter driving a resonator: an impact as the foot lands, then a **rolling contact**
  (a friction noise that lasts as long as the force does), with the roughness of the surface a noise, and for loose ground (gravel, snow) a crowd of small collisions.
  The force of a walking step has two humps over about 0.6 s, but only the first is an impact; the push-off is a soft friction, not a tap. Barefoot walking has a heel-strike
  transient that is, if anything, more marked than in shoes. (Cook; Nordahl et al., Presence 2009 and IEEE TVCG 2011; Turchet et al., DAFx 2010; Logan, Li and Pastore on what listeners
  hear in a footstep: where the spectrum's centre lies and how much high-frequency energy there is.)
* In ten recordings of bare feet, the average step (`scripts/audition/stepspec.py` aligns every isolated step and averages the spectrograms; `stepenv.py` gives its three-band
  envelope) is: **one** click a few milliseconds wide, broad all the way up to 10 kHz; a low body under about 500 Hz that falls 15 dB in 40 ms; the mid and high frequencies down 20 dB
  in 20 ms; and then only the room. **No second tap.** Crest factors (peak over the rms of the step) are 19-29 dB.

So a step is now: a broad click (3-8 kHz, 2-3 ms), a low body (noise through a low-pass at 350-600 Hz, 20-30 ms), a faint thud, a short mid slap, and a faint rolling noise that swells over
30-60 ms and fades over 50-100 ms. The left foot and the right take turns, a hand's breadth either side of the middle, with a body a few per cent different in pitch and one landing a little
harder; the interval between steps wanders by a few per cent (a person's steps are never evenly spaced). The surfaces:
* **marble** (dry stone): as above, with the click and the slap sharp.
* **wet**: the click is smothered (about 10 dB less), the slap dull and longer, more rolling, and the foot leaves a small wet sound and sometimes a bubble.
* **shallow**: no thud, a broad splash that peaks near 1 kHz and falls over a fifth of a second or more, a low slosh and several bubbles.
* **rubble**: a soft thud and a crowd of 16-30 sharp grains over a third of a second.
* **snow**: a muffled low body and a soft crunch of small grains.

## Measured (eleven recordings; measurement only, never shipped)
Freesound 565609 (bare feet on wood), 766931 (gravel), 272086 (ceramic tile), 608369 (a bathroom, walking), 272287 (concrete, running), 273102 (paving slabs on earth, running), 272541 (linoleum, running),
221764 (wading a puddle), 398345 (wading, calf-deep), 627004 (a creek), 116750 (a flooded mine). `scripts/audition/steps.py` measures a recording and a render alike, including the average
spectrum of one footfall (the first 60 ms after each).
* **Hard floors** (tile, ceramic, concrete, paving; wood is the odd one out with a floor boom): one footfall is a smile: about +6 to +8 dB at 62-125 Hz, flat from 500 Hz to 2 kHz, +3 to +5 dB at 4-8 kHz;
  it falls 20 dB in 20-50 ms; centroid 2-3 kHz per step; noisy (flatness 0.4-0.5), not a tone. Wood is 14 dB up at 62-250 Hz (the floor), and 4 dB up at 2-4 kHz.
* **Gravel:** per-step centroid 3.4 kHz, flatness 0.55, 200 ms to fall 20 dB, 19 dB spread between steps, 125 Hz 18-24 dB under 1 kHz.
* **Water** (puddle, calf-deep, creek, mine): little or no thud (62-125 Hz is 8-19 dB down; deeper is lower), most energy 500 Hz-2 kHz (strongest 560-870 Hz), falling above (4 kHz 0 to -10 dB, 8 kHz
  -3 to -14); a footfall takes 190-350 ms to fall 20 dB (a puddle is quickest and brightest at 2.6 kHz, the mine slowest and darkest at 1.0 kHz). Steps 0.16-0.19 s apart in wading.
* **Snow** (Freesound 417647, a walk in snow and then on wet ground, in boots, so only the snow is taken): one footfall is muffled: 62-500 Hz 2-5 dB over 1 kHz, 2 kHz 6 dB under, 4 and 8 kHz 13-14 dB under; per-step centroid 500 Hz, falls 20 dB in 12 ms (no ring), and it is tonal at the bottom (a soft thud). The wet ground that follows is brighter (+8 dB at 62 Hz, flat to 2 kHz, -2 above) and falls in 24 ms.
  The game gains a `snow` surface: when snow is falling in the open halls (the same condition the narrator uses for "snow lies"); lying snow that outlasts the fall is not modelled (nothing keeps a store of snow).
* **Rooms:** the bathroom's steps fall away within 50 ms (a reverberation time of about 0.3 s); the flooded mine falls 20 dB in 0.4 s and then has a long tail (a fit gives about 5 s, but it is two
  slopes and the drips in it make it a poor measure). Both are for the echo work.
Renders now (one footfall, dB re 1 kHz at 62 / 125 / 250 / 500 / 2k / 4k / 8k Hz): marble -2 / +3 / -6 / -3 / 0 / 0 / 0 (hard floors: +6 / +8 / +3 / -1 / +1 / +3.5 / +5); shallow water -26 / -17 / -10 / 0 / 0 / -6 / -12
(wading: -11 / -9 / -8 / 0 / -2 / -5.5 / -9); rubble centroid 2.7 kHz, flatness 0.30, 125 Hz 26 dB under 1 kHz. Close to within about 5 dB; stone's 62-250 Hz is the largest gap.

## Not yet
* Marble or stone recordings proper (the hard floors measured are tile, ceramic, concrete and paving), and bare feet on wet stone.
* The room: steps, drips and voice should share a room response made from the hall's size (echo), with early reflections off the walls.
* Knitted foot-coverings (a duller, softer step), and the slap changing with pace (running).
