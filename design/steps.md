# Footsteps

The visitor is barefoot: the book gives a castaway in ragged clothes who makes coverings of cloth for his cold feet and means to make shoes of fish leather; shoes come only later, as a gift, and
the game leaves that out. So a step is the foot itself (`src/audio/steps.ts`).

A step is a heel and, a tenth of a second later, a toe: each a damped low thud and a short slap of filtered noise, the heel harder. What the floor adds:
* **marble** (dry stone): firm, no give; thud near 230-460 Hz, slap 1.3-3.6 kHz. The room's echo does the rest.
* **wet**: a film of water damps the slap (0.8-2.3 kHz, longer), adds a small wet sound and sometimes a bubble.
* **shallow**: water over the foot: a longer splash and several bubbles.
* **rubble**: a soft thud and a crowd of sharp grains (16-30) over a third of a second, 1.6-6 kHz, with grain levels varying by 19 dB.
Every step is drawn afresh (pitch, level, timing), so it does not machine-gun.

## Measured (eleven recordings; measurement only, never shipped)
Freesound 565609 (bare feet on wood), 766931 (gravel), 272086 (ceramic tile), 608369 (a bathroom, walking), 272287 (concrete, running), 273102 (paving slabs on earth, running), 272541 (linoleum, running),
221764 (wading a puddle), 398345 (wading, calf-deep), 627004 (a creek), 116750 (a flooded mine). `scripts/audition/steps.py` measures a recording and a render alike, including the average
spectrum of one footfall (the first 60 ms after each).
* **Hard floors** (tile, ceramic, concrete, paving; wood is the odd one out with a floor boom): one footfall is a smile: about +6 to +8 dB at 62-125 Hz, flat from 500 Hz to 2 kHz, +3 to +5 dB at 4-8 kHz;
  it falls 20 dB in 20-50 ms; centroid 2-3 kHz per step; noisy (flatness 0.4-0.5), not a tone. Wood is 14 dB up at 62-250 Hz (the floor), and 4 dB up at 2-4 kHz.
* **Gravel:** per-step centroid 3.4 kHz, flatness 0.55, 200 ms to fall 20 dB, 19 dB spread between steps, 125 Hz 18-24 dB under 1 kHz.
* **Water** (puddle, calf-deep, creek, mine): little or no thud (62-125 Hz is 8-19 dB down; deeper is lower), most energy 500 Hz-2 kHz (strongest 560-870 Hz), falling above (4 kHz 0 to -10 dB, 8 kHz
  -3 to -14); a footfall takes 190-350 ms to fall 20 dB (a puddle is quickest and brightest at 2.6 kHz, the mine slowest and darkest at 1.0 kHz). Steps 0.16-0.19 s apart in wading.
* **Rooms:** the bathroom's steps fall away within 50 ms (a reverberation time of about 0.3 s); the flooded mine falls 20 dB in 0.4 s and then has a long tail (a fit gives about 5 s, but it is two
  slopes and the drips in it make it a poor measure). Both are for the echo work.
Renders now (one footfall, dB re 1 kHz at 62 / 125 / 250 / 500 / 2k / 4k / 8k Hz): marble -2 / +3 / -6 / -3 / 0 / 0 / 0 (hard floors: +6 / +8 / +3 / -1 / +1 / +3.5 / +5); shallow water -26 / -17 / -10 / 0 / 0 / -6 / -12
(wading: -11 / -9 / -8 / 0 / -2 / -5.5 / -9); rubble centroid 2.7 kHz, flatness 0.30, 125 Hz 26 dB under 1 kHz. Close to within about 5 dB; stone's 62-250 Hz is the largest gap.

## Not yet
* Marble or stone recordings proper (the hard floors measured are tile, ceramic, concrete and paving), and bare feet on wet stone.
* The room: steps, drips and voice should share a room response made from the hall's size (echo), with early reflections off the walls.
* Knitted foot-coverings (a duller, softer step), and the slap changing with pace (running).
