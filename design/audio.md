# Audio (milestone 3)

Two halves, kept apart on purpose.

**The director** (`src/audio/director.ts`) is a pure function from `SceneState` to an `AudioScene`: a plain description
of the soundscape (how loud the sea is, how long the reverb, whether a tide is booming, what the birds are doing).
It is fully unit-tested. The narrator's "listen" command reads the same description back as prose, so what you hear and
what you read cannot disagree.

**The engine** (`src/audio/engine.ts`) realises an `AudioScene` with the Web Audio API. It is entirely procedural: no
sample files, so no licensing and a tiny download. It needs a user gesture to start (the title screen's button).

## Spatial audio (`src/audio/spatial.ts`, placement in `engine.ts`)
Sounds are placed in 3D with Web Audio `PannerNode`s in HRTF mode, so on headphones the sound comes from outside the head and
front/back and up/down are audible, not just left/right. On speakers it degrades to something like stereo.

* **The listener is fixed** at the origin facing -Z (+X right, +Y up, metres). The director already gives every door's bearing
  *relative to the way the visitor faces*, so sources are placed around the listener and the listener never turns.
* **Doorways, wall-borne beds and "outside" hints** get one panner each, placed by bearing (`bearingPosition`): left and right are
  hard left and right, an opening ahead is nudged by its position along the wall, and one behind is really behind (the old stereo pan
  could not tell ahead from behind). Moving between positions eases, so turning does not click.
* **Birds** each get a voice (`voice()`): a gain, an air-absorption low-pass and a panner. Perched birds sit somewhere around and
  above you at 4-14 m. Birds that fly (gull, swift, goose, wader, in the soaring, passing and shore scenes) cross the sky on a straight
  path (`flybyPath`) with the panner's position automated along it. The panner has no Doppler, so the pitch of every note is
  scaled by `dopplerRatio` for where the bird is at the moment the note starts; and the air takes the highs off with distance
  (`airCutoffHz`). The flock is scattered over the sky burst by burst.
* **Loudness**: `refDistance` is 4 m, so nothing nearer than that is louder than before; farther sources fall off (inverse model).
* **Small frequent sounds** (laps, bubbles, drips, footsteps) cannot each have an HRTF panner: they share a lazily-made ring of at
  most 37 fixed directions (`stageCell`). Footsteps are placed under you.
* **Still unplaced** (centre of the head, as before): the main sea, rain, wind and falls beds, thunder, the muttering and the reverb
  (a 2-channel noise IR). Making these surround is the next step.

Checked in `tests/spatial.test.ts` (geometry, Doppler, paths) and, measured on the rendered output of the real engine in an offline
context: a source at the left is about 3.5x louder in the left ear, right likewise; ahead is louder than behind; a fly-past
from left to right moves the level between the ears and glides pitch from about +6% to -6%.

## Water, rain on water and deep bass
The sea has been rebuilt from measurements of real recordings, with rain on water and an always-on deep end: see `design/sea-model.md`.
The layer table below describes the original, procedural-noise design; the sea, rain-on-water and bass rows are superseded by that file.

## Layers
| Layer | Made from | Driven by |
|---|---|---|
| Sea | six directions of roar, hiss and foam, stereo sub and cave resonances, travelling waves (see `design/sea-model.md`) | distance to the nearest vestibule; loud in lower halls; silent in Drowned Halls |
| Tide rumble and strikes | deep noise plus low thumps | tide approaching, booming (depth), or submerged (muffled hush) |
| Fresh water | bubble physics: wash, fine bubbles, plops and drips, placed on the fall's wall (see `design/falls-model.md`) | falls of water, streams, rain; rare drips in the hushed halls |
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

## Weather, by level (checked in `tests/weather-sound.test.ts`)
| | Rain | Snow | Wind | Thunder |
|---|---|---|---|---|
| Upper halls (half-open roof) | all of it, loudest | none; a soft hush (muffle) | loud, whistling in the cornices | loudest |
| Vestibules | all of it | hush | loud | loud (80%) |
| Ordinary middle halls | on the windows (30%), more near falls | none | soft | about half |
| Lower halls | a faint hiss through the sea (15%) | none | very soft | a quarter, far off |
| Drowned Halls, the dark hall | almost none / none | none | almost none | none |

Snow makes no rain sound (it used to). Thunder is new: a crack (only close storms) and a long low rumble that rolls in three or
four swells; far more often when lightning is near, rarer in a plain storm.

## Bird calls, one voice each (`speciesFor` in `src/audio/engine.ts`)
Sparrow chirps; blackbird's fluting phrases; dove's coo; swift's high descending scream; gull's cry; wader's "tew-tew";
rook's caw; albatross's clatter and low groan; starling's chatter (with the murmuration's rushing); owl's two hoots (rare, only
roosting); and the rustle of wings. Which are heard depends on where: sparrows, blackbirds and doves in the middle halls by day;
gulls and swifts above the upper halls; gulls and waders on lower pavements at low tide; rooks in their hall; gulls on their
nests; a starling flock at the murmuration; an owl, very rarely, at night.
