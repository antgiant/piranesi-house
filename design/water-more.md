# Weather-driven water, doorway water, stairs and shaft, leaks

Built after the falls (`design/falls-model.md`), from the same recordings plus measurements of a small fall down several steps (615245) and a stream
running into a sinkhole (552485). Code: `sim/hydrology.ts`, `audio/through.ts`, `audio/stairs.ts`, `world/leaks.ts`, `audio/buffers.ts` (shared buffers).

## The weather fills and empties the water (`sim/hydrology.ts`)
Rain does not reach the falls at once. Two stores follow the rain of the last fortnight: **runoff** (roofs and walls: rises within hours,
gone in about a day; time constant 10 h) and the **store** (cisterns and stone: fills over days, drains over about a week; 84 h). Rain here is
about a tenth of the time, in spells of about five hours (longest about 30), so "full" means a wet fortnight (mean rain 0.07).
| | dry spell | ordinary | after long rain |
|---|---|---|---|
| Flow of a fall (x an ordinary day) | 0.48 (a thread, never dry: the book's water is constant) | 0.85 | up to 1.9-2.1 (overflow) |
| Drips (x ordinary) | 0.3 | 0.8 | up to 3-4 |
Median flow 0.85; overflow (>20%) about a tenth of the year. Snow stores nothing (a thaw is not modelled). `audioFor` scales falls by flow, adds rain
streams to the stairs and walls of the open halls while it runs off, and the narrator says so (threads and drips; or swollen and roaring).
A fall in overflow is not just louder: more roar and more big plops (`falls.ts`, `heavy`).

## Doorway water (`through.ts`)
The sea and falls of the hall next door, heard through its opening: the opening takes the highs away and leaves the low body (the sea's boom and
hollow resonances near 72, 140, 290 Hz with a little foam above; the wash of a fall without its sparkle). It sits at the door's true place, swells with
each wave a little later than it reaches you. Levels match the old beds to 0.1 dB (-33.9 dBFS sea at 0.3; -51.4 falls at 0.12), but there is now real
content above 1 kHz where the old bed had none.

## Water on the great stair (`stairs.ts`)
Two voices at the stair, where the stair is as you walk: **steps**, a smooth roar (the steps recording has no rhythm: modulation only 2.6 dB above noise;
filtered pink noise, 260 Hz to 9.5 kHz, slow flutter; within about 5 dB of the recording in every band); and **shaft**, below you toward the stair, the deep
chamber the water falls into (hollow resonances at 125 and 205 Hz, big slow gurgles, spray; 125 Hz at -2.2 dB against the recording's -1.8). It runs while a
tide drains back down the stair (the tide is falling and there is water on the floor) and with the rain streams of the open halls. Flow is scaled by
distance to the stair (about 115 ft to half).

## Leaks (`world/leaks.ts`)
Every hall has leaks: fixed points (x, y, height) derived from the seed, not stored in the hall (so the world version and the golden snapshot are untouched).
A bigger hall has more (3 to 16). Each has a rate of its own and a pitch of its own (800-4400 Hz, median 1450). The nearest four are heard, each from its true
place (above you for a ceiling leak), at its own pitch, so a drip comes from one place and stays there as you walk. The weather sets the rate (the hydrology's
dripping figure); the Drowned Halls drip at a tenth, the dark hall at 0.6. The first drips (random directions) were deliberate scatter; this replaces them.

## The world keeps real places (the 3D-ready model)
The game's world is now a place you can stand anywhere in, not only at walls. A hall is a box: x east, y north, z up, metres from its south-west
corner; the floor is z = 0 and your ears are about 1.6 m up. You have a position (`pos.at`, a free point; or a wall and a place along it) and a heading
(`pos.heading`, continuous degrees from north). Features have places: doors and stairs (a wall and a position), falls (a stretch of wall), leaks (x, y, z),
statues (a wall and a position along it). A text game and a 3D game would read the same model: `stop` leaves you where you are; `walk north 100 feet`
walks across the floor; `walk toward the falls / the stair / the middle`; `face east`. Saved in the save file (`at`, `heading`); old saves are fine.
Not yet: height (z) of the visitor (the great stair is 25 m high and its climb is still a timed walk), and walking toward any named feature.

## Not done
* Tides (the approach hiss, the boom, the surge) and the water over a flooded floor are still the first versions.
* Lake halls, rain on stone, and water through a doorway from a neighbour's stair.
* Birds, wind, the hall's reverb and the outside hints do not yet vary by where you stand.
