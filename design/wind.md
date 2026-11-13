# Wind

## Weather (fitted to real records)
Ten years of hourly 10 m winds for Derbyshire (the author's home) and the Plymouth and Liverpool coasts (Open-Meteo archive, CC BY 4.0). In the weather
scale 1000 is a 36 mph hourly mean. Real: median 9-10 mph, one hour in ten over 16-18 mph, one in a hundred over 23-26; a fifth windier in winter than in
summer; from the south-west and west about 40% of the time (Derbyshire 46%); strongly persistent (correlation 0.72 after six hours, 0.40 after a day). The game's
wind now has median 9.7 mph, p90 16.7, p99 23.6, SW+W 46%, correlation 0.70 / 0.43, and about 27 hours a year of 27 mph or more (real 17): the storms of the
book are rare, and from the west. `tests/climate.test.ts` holds it there.

## Sound (`src/audio/wind.ts`)
Wind is not a point and not a steady hiss. Five independent beds in the shared ring (front pair, rear pair, overhead) so gusts move across you; a low roar always,
a mid rush opening with speed, a hiss only in a strong wind; loudness rising steeply with speed (aerodynamic noise goes as about the fifth power); gusting that
deepens as it blows harder. Whistles are Strouhal shedding off edges and rods: pitch = 0.2 x speed / thickness, so three whistles, each at its own place and thickness,
rise and fall with every gust. Shelter (inside, the Drowned Halls) comes from the director's gain as before.

### Measured on a real recording (measurement only, never shipped)
Freesound 483479, "Wind blowing, gusting through a French castle tower" (Astounded; the top turret of the citadel at Sisteron, a mistral). 80 s, 96 kHz. What it taught:
* **Spectrum** falls steadily from the bass: relative to 500 Hz, 62 Hz +8 dB, 125 Hz +6, 250 Hz +5, 1 kHz -3, 2 kHz -12, 4 kHz -16, 8 kHz -21. My first wind peaked at 1 kHz, a mid hiss. (The lowest octave is partly wind on the microphone, so the new one is not made as heavy there.)
* **Gusts** are deep and common to all bands: the level swings 12-14 dB between its p5 and p95 in every band at once, and the envelope's memory is about two seconds (autocorrelation 0.77 / 0.60 / 0.42 / 0.13 at 0.5 / 1 / 2 / 4 s). My first wind swung 4-6 dB, each band on its own, with no memory.
* **Tones** are mostly low and fixed: in 38% of frames there is a peak, most often near 200 Hz, then 150, 250, 300 and 500 Hz, and a little at 2.4 kHz. These are the stone's own notes (the openings ringing), not whistles that follow the speed. My first wind had 63-74% tonal frames, all high. So the stone now moans at 195 and 305 Hz with the gusts, and the speed-following whistles are far quieter.
* **Stereo** of this recording is nearly mono (L/R correlation 0.98), so it says nothing about the beds around the listener; those stay as designed (correlation about 0.6).
New wind (gale / fresh): spectrum within a few dB of that shape, gusts 15 dB deep, 34% / 28% tonal frames at 150-300 Hz. `scripts/audition/wind.py` measures both alike.

### Four more recordings (measurement only; Freesound IDs 47704, 27756, 558664, 30444)
A highrise's windows in a gale (indoors), an open window in a 30-50 mph windstorm, a forest in a 40 mph blizzard (first five minutes), and a binaural howl heard indoors. What they added:
* **Gusts last longer outdoors**: the envelope's correlation after 2 s is 0.66 (windstorm) and 0.74 (blizzard), and still 0.46 / 0.59 after 4 s; the castle's gusts were quicker (0.42 / 0.13). The wind now gusts in two scales, a slow one that lasts seconds and a quicker one, giving 0.77 / 0.62 / 0.44 / 0.30 after 0.5 / 1 / 2 / 4 s and a depth of 12-14 dB.
* **Stone and window tones come in bursts**: in the highrise and the windstorm the tonal peaks last a tenth to a second, at fixed pitches (about 350 and 2850 Hz in the highrise; 150-330 Hz in the windstorm), and their level follows the gusts (correlation 0.5-0.8) but their pitch does not (correlation 0). The moans are now gated by the gusts' peaks, at fixed pitches, with a faint tone near 2.8 kHz.
* **A howl is a different thing**: indoors, a held note 27 dB above the floor that wanders slowly between about 260 and 650 Hz (median 410; glides about 30 Hz a second). The wind now has one, which comes in only in a strong wind (about 330-560 Hz in the render).
* **Spectrum by place**: outdoors the highs stay up (forest: 4 kHz is only 8 dB below 500 Hz, from the trees and ice; an open window: 2 kHz is 3.5 dB below), and indoors they fall away (the howling building: 1 kHz is 13 dB below its 500 Hz hump). The House is stone, so the castle's shape stays; a wooded courtyard would be the place for the forest's.
* **Stereo**: outdoors the two ears are far less alike (correlation 0.23 forest, 0.56 open window) than indoors (0.82-0.98). The beds sit at 0.57-0.6, in range.

### Three more (Freesound 96647 a rusty door rattling in an empty building; 381821 a storm with rain on a glass door; 204958 wind and showers heard from a conservatory in Wales)
* **Driven rain follows the gusts.** In both storm recordings the rain's loudness and the wind's rise and fall together (correlation about 0.4, no lag), though the rain swings much more (19-25 dB against 10-11 dB for the wind) because showers come and go over about twenty seconds. The rain bed is now pushed by the wind's common gust, in proportion to the wind (0.8 dB swing without it, 7 dB with it); the showers themselves still come from the weather model.
* **Rattles.** A loose door gives about two impacts a second while it lasts, median gap 0.3 s, a third of the gaps under 0.2 s, in a clatter of the whole spectrum (centroid 2.1 kHz). The wind now rattles a door or window on the wall it blows against: bursts of three to nine impacts (a click and three ringing modes of the wood or iron), every few seconds, more often in a stronger wind, from that wall's direction. The narrator says so too ("A door rattles in its frame to your left"). That is the beginning of a wind-direction cue; the walls come from the weather's wind direction and the hall's windows and doors.

Not done: wind direction as a cue (the gust coming through the door that faces it), wind in the stair shaft, snow-hush.
