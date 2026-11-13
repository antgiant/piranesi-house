# Falling and running water

Built from 14 recordings of small falls, cave streams, steps, a sinkhole, drips and fountains (Freesound IDs 431452, 135483, 656430,
615245, 546359, 813251, 132836, 732036, 278140, 38012, 638070, 552485, 181660, 125649; licences not recorded; used only to measure,
nothing copied or shipped). Code: `src/audio/bubbles.ts` (the physics), `falls.ts` (the voice), `noise.ts` (shared buffers).
Measured with `scripts/audition/` against the same clips.

## The book
Fresh water falls in most of the halls, and it has splashed onto some statues for so long that it has nearly cut them in two; rain runs
down walls and staircases in streams (the drinking water); drained tidewater falls back down the vestibule stairs. No waterfalls into
the sea, no rivers. Each hall's `falls` knows its wall and its extent along it.

## What the recordings said, and what is done
| | Real | Old falls | Now |
|---|---|---|---|
| Body, 250 Hz - 1 kHz | -5 to -20 dB re total | 8-15 dB too thin | wash from 380 Hz + room resonance |
| Audible plops a second | 1.2-2.5 (falls), 4-12 (fountains) | 0.0-0.1 | 2.0-2.3 |
| Short-term tonality (peak/median, dB) | 11.5-18 | 9.8-10.1 | 15.7-16 |
| Bright end, 8 / 16 kHz | -7 to -14 / -12 to -21 | -6 / -14 | -14.5 / -15 |
| Stereo above 5 kHz | 0.0-0.8 | 0.95 (mono) | 0.35 |
| Drips: pitch (median) / decay / tail at 150-400 ms | 1.1-1.95 kHz / 75-155 dB/s / -25 to -33 dB | descending, 120 ms | 1.6 kHz / 97 dB/s / -31 dB |
| Overall level at a hall with falls | n/a | -41.3 dBFS | -40.6 dBFS (same) |

## Layers
* **Bubbles** (`bubbles.ts`): every splash is a crowd of air bubbles, each ringing at the pitch its size gives it, rising ~10% per decay
  time and dying faster the higher it rings (van den Doel). FINE = 650 a second around 3.2 kHz; PLOPS = 9 a second around 2 kHz, big ones
  you can pick out; TRICKLE = 40 a second around 1.5 kHz. Pre-rendered into looping buffers, each voice from its own offset and speed.
* **Point source** (`falls.ts`): wash (white noise, 380 Hz - 14 kHz, brightened above 4.5 kHz, flutter) + fine + plops + trickle, through
  the room's resonance, placed in 3D on the fall's wall. The resonance is a delay line fed back through a 520 Hz low-pass: the cave
  recording had resonances 23 Hz apart, an echo about 43 ms long; small / large / vast halls use 30 / 43 / 65 ms.
* **Diffuse surround**: four independent copies of wash and fine bubbles in the ring, quieter.
* **Live drips**: single drops from near the fall, now and then; also used by rain and the hushed halls (`engine.drip`).
* **Flow**: the scene's falls gain (0.3 a fall, 0.18 a stream) sets the level; the share of falls to trickle follows it.

## More water is not nearer water
First version: flow scaled the whole fall's level (a 19 dB range) and nothing else, which sounded like three distances from the same fall, not three
volumes of water. Now the two are separate in the scene: `falls.amount` (the water itself) and `falls.near` / `falls.dist` (how far you are).
* **Amount** changes the character: the wash's body (the cut falls from 850 to 230 Hz as the water grows, and a rumble of the mass of it joins above about
  half flow), the size of the bubbles (the swarms play slower, so lower, with more water), the roar (almost none in a thread, most of it in a torrent) and
  the density (single drops stand out in a thread: 2.8 a second; a torrent hides them: 0.7). A thin fall has a fine spray on top and is brighter. Loudness
  moves only by the square root of the flow: 6.8 dB from a thread to a torrent (was 19).
* **Distance** changes only the loudness (down to 0.3 across a huge floor) and takes the highs off (`airCutoffHz`).
Measured: from a thread to a torrent the low energy (60-250 Hz) rises 10.7 dB and the high (2-10 kHz) only 3 dB, the centroid falls from 2.2 to 1.3 kHz;
from near to far everything falls together (low -10 dB, high -12 dB). The real recordings agree: thin falls and splashes have centroids of 3.7-4.3 kHz, the
heavy cascade down steps 1.6 kHz. `tests/pose-sound.test.ts` keeps the amount independent of distance.

## Where the water is
A hall with falls: its own wall, and its position along that wall (`h.falls`), so it stays put as you turn (`audioFor` gives the
bearing relative to your facing, like doors). A stream has no wall: `fallSide` picks a fixed one per hall.

## Lessons
* Measuring layers in isolation matters: the sparse plops, normalised like the dense layers, were 12 dB louder than the wash and
  dominated 500 Hz until they were soloed and turned down. Sparse events need levelling by event, not by RMS.
* A high-shelf boost lifts unfiltered noise up to the Nyquist frequency; low-pass above it.
* Compare spectra at the same bearing: a source behind you loses its highs to the HRTF.

## Not done
* Doorway falling water (through walls) still uses the old noise bed with plinks.
* Water down steps (`steps-waterfall`) and the sinkhole's deep chamber rumble are measured but have no voice of their own yet.
* The book's water splashing onto statues (a sheet on dry stone, not into a pool) has no recording yet.
