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

Not done: wind direction as a cue (the gust coming through the door that faces it), wind in the stair shaft, snow-hush.
