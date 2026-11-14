# Footsteps

The visitor is barefoot: the book gives a castaway in ragged clothes who makes coverings of cloth for his cold feet and means to make shoes of fish leather; shoes come only later, as a gift, and
the game leaves that out. So a step is the foot itself (`src/audio/steps.ts`).

A step is a heel and, a tenth of a second later, a toe: each a damped low thud and a short slap of filtered noise, the heel harder. What the floor adds:
* **marble** (dry stone): firm, no give; thud near 230-460 Hz, slap 1.3-3.6 kHz. The room's echo does the rest.
* **wet**: a film of water damps the slap (0.8-2.3 kHz, longer), adds a small wet sound and sometimes a bubble.
* **shallow**: water over the foot: a longer splash and several bubbles.
* **rubble**: a soft thud and a crowd of sharp grains (16-30) over a third of a second, 1.6-6 kHz, with grain levels varying by 19 dB.
Every step is drawn afresh (pitch, level, timing), so it does not machine-gun.

## Measured (two starter recordings; measurement only, never shipped)
Freesound 565609, bare feet dancing on a wood floor, and 766931, bare feet on gravel. `scripts/audition/steps.py` measures a recording and a render alike.
* **Wood:** thump 140-280 Hz that has fallen 20 dB in about 15 ms (median), a rise of about 10 ms, per-step centroid 490 Hz, 10 dB more energy at 250-500 Hz than at 1 kHz and flat above;
  very pitched (spectral flatness 0.09). Spacing 0.39 s median while dancing.
* **Gravel:** per-step centroid 3.4 kHz (2.1-4.7), very noisy (flatness 0.55), about 200 ms to fall 20 dB, steps' levels spread 19 dB, almost nothing below 250 Hz (125 Hz is 24 dB under 1 kHz).
Renders now: marble centroid 480 Hz, +14/+11 dB at 250/500 Hz over 1 kHz, 4 dB over at 2 kHz; rubble centroid 3.5 kHz, flatness 0.35, 125 Hz 23 dB under 1 kHz, 2-4 kHz 4 dB brighter than the
recording. The wood's floor boom (125 and 62 Hz) is deliberately not copied for stone.

## Not yet
* Stone, marble and wet-stone recordings: the stone steps are tuned from the wood's foot and are a guess about the floor itself.
* A lot of bare footsteps in water (shallow) and on wet stone, from real recordings.
* The room: steps, drips and voice should share a room response made from the hall's size (echo), with early reflections off the walls.
* Knitted foot-coverings (a duller, softer step), and the slap changing with pace (running).
