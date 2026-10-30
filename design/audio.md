# Audio (milestone 3)

Two halves, kept apart on purpose.

**The director** (`src/audio/director.ts`) is a pure function from `SceneState` to an `AudioScene`: a plain description
of the soundscape (how loud the sea is, how long the reverb, whether a tide is booming, what the birds are doing).
It is fully unit-tested. The narrator's "listen" command reads the same description back as prose, so what you hear and
what you read cannot disagree.

**The engine** (`src/audio/engine.ts`) realises an `AudioScene` with the Web Audio API. It is entirely procedural: no
sample files, so no licensing and a tiny download. It needs a user gesture to start (the title screen's button).

## Layers
| Layer | Made from | Driven by |
|---|---|---|
| Sea | brown noise, low-passed, slow swell | distance to the nearest vestibule; loud in lower halls; silent in Drowned Halls |
| Tide rumble and strikes | deep noise plus low thumps | tide approaching, booming (depth), or submerged (muffled hush) |
| Fresh water | band-passed noise and "plink" drips | falls of water, streams, rain; rare drips in the hushed halls |
| Rain | high-passed noise | rain in vestibules |
| Wind | band-passed noise with a drifting centre, plus whistling tones | wind in exposed places; the statues "sing" |
| Birds | short synthesised calls per species (sparrow, gull, rook, albatross, flock, rustle) | the bird scene: nesting, murmuration, roosting, sheltering |
| Reverb | generated impulse response, length from room volume | 2.5 s in a small hall to about 9 s in the largest; shorter in cloud |
| Muffle | one low-pass on the output | cloud in the hall; being under water |
| Footsteps | noise bursts | the surface: marble, wet, shallow water, rubble |

## Lessons recorded in the tests
* Marble is so reflective that a literal reverb formula gives 9 seconds for every hall; room volume is mapped
  logarithmically instead.
* A swell oscillator wired straight into a gain parameter *adds* to the level, so a "silent" sea swung through full
  volume. The swell now has its own gain stage that scales the signal. The browser test measures real output
  (Drowned Hall about 0.0004 RMS vs a vestibule about 0.019).
* The Drowned Halls are hushed against weather too, not just against the sea.

## Not yet done
* ~~Sounds from neighbouring halls arriving through doorways, with direction~~ (done in milestone 4; see `design/map.md`).
* Other visitors' footsteps and voices (milestone 8).
* The muttering (milestone 6; see `design/mutter.yaml`).
