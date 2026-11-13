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

Not done: wind direction as a cue (the gust coming through the door that faces it), wind in the stair shaft, snow-hush.
