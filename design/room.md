# The echo of a hall

`src/audio/room.ts` makes the impulse response that the engine's convolver plays, from the hall's size and where you stand. Before, it was lowpassed noise with one exponential fall,
from the volume alone: the same echo in a long hall and a tall one, no first echo, the highs and lows dying together.

## What a real room does (measured on four clap recordings; measurement only, never shipped)
Freesound 161587 (a small hexagonal chapel), 868385 (a two-storey concrete garage), 769038 (a stone powder room in a fort), 568191 (a small cave). `scripts/audition/room.py` measures a clap or
a built impulse response: reverberation time by octave (T20 and early decay), clarity, the first reflections, and the tail's spectrum.

| reverberation time, s | 250 Hz | 500 Hz | 1 kHz | 2 kHz | 4 kHz | 8 kHz |
|---|---|---|---|---|---|---|
| chapel | 2.2 | 2.7 | 2.6 | 2.4 | 1.6 | 1.2 |
| concrete garage | 2.1 | 2.7 | 2.5 | 2.2 | 2.0 | 1.5 |
| stone powder room | 0.66 | 0.70 | 0.67 | 0.62 | 0.53 | 0.39 |
| small cave | 0.52 | 0.57 | 0.60 | 0.59 | 0.53 | 0.46 |

* The decay of the highs: against 1 kHz, 2 kHz lasts 0.9 as long (0.87-0.98), 4 kHz 0.78 (0.64-0.88), 8 kHz 0.60 (0.45-0.77). That is the stone and concrete themselves (`MATERIAL`).
* The first reflections arrive in the first few milliseconds in these small rooms (30-40 of them in 100 ms), a wash within about 50 ms. In a hall tens of metres across there is **nothing** for
  the first tenth of a second or more.
* The two ears hear the tail differently (correlation 0.5-0.6), so the echo is wide.
* Clarity C50 is -4 to +5 dB: the clap sits in its echo.

## The model
* **Early:** an image-source model of the hall as a box (every reflection to the third order, 62 of them), each at its true time and weakened by every wall it met and by distance,
  with the highs weakened more by the air and the surfaces, so a far echo is duller. The floor's bounce (the first 15 ms) is left out: it is part of how a sound arrives. The first echo in a hall
  80 m by 60 m by 25 m with you 20 m from a wall comes at about 117 ms.
* **Late:** noise in seven octaves (two steep filters each, so a long low octave does not leak into a short high one), each falling at its own rate from half the mixing time, where it joins
  the reflections: rate = the room's own (the stated time at 1 kHz, shortened by `MATERIAL`) plus the air's (0.13 dB a second at 125 Hz up to 26 dB a second at 8 kHz, at 20 degrees and 70% humidity).
  A hall rated 5 s at 1 kHz is 4.4 s at 1 kHz, 3.7 at 2 kHz, 2.6 at 4 kHz and 1.3 s at 8 kHz; cloud or water damps the highs further (`damp`).
* The stated time still comes from the hall's volume (2.5 to 9 s, `director.ts`), because the real figure for these halls, with their open doorways and windows, is not known.
* The two ears get independent noise and slightly different reflection times, so the echo is wide.
* Built when the hall, or your place in it to the nearest tenth of the hall's short side (at least 8 m), changes; it takes about 0.2-0.5 s, and the old echo is held for a moment so that nothing is cut.
  Its total energy is matched to the noise echo it replaces, so the wet level means what it did.

## Checked
Impulse responses built for a hall 80 x 60 x 25 m (5 s), a vast hall 200 x 150 x 60 m (8 s) and a small chapel-like room reproduce the intended time in each octave from 125 Hz to 4 kHz to within
about 10% (8 kHz is up to 20-60% long, because the filters meet the Nyquist frequency there); `tests/room.test.ts` holds them to a quarter.

## Not yet
* Rooms the clap recordings cannot tell us about: a hall this big has no recording here. The reverberation times are the existing ones; the shapes (the highs, the first echoes, the width) are measured.
* Statues, pillars and balconies scatter the echo (the early reflections here are those of an empty box): more, quieter early reflections.
* Doorways and windows lose sound to the next hall: they are part of why the stated time is shorter than a closed room's, but they are not modelled as leaks you could hear (the portals are the doorway sounds).
* Sources at a distance from you sit in the same echo as one at your feet; a call from across the hall should have more echo and less direct sound.
