# The year in the House (second slice of the simulation-of-life work)

All of this is a pure function of the date (and the tide cycle), so every visitor sees the same year. Changing the weather bumped `WORLD_VERSION` to 6.

## Birds (`src/sim/seasons.ts`)
| | when (day of the year) |
|---|---|
| swifts here | 125 to 222 (early May to early August) |
| small waders on the shore | 228 to 135 (mid August to mid May: winter visitors) |
| blackbirds in full song | 40 to 200 (mid February to mid July); otherwise a dry scolding cry |
| owls calling | 275 to 90 (October to March) |
| gulls at the colony | 60 to 243 (March to August): paired and incubating, then chicks in June and July, then fledglings in August |
| sparrow broods begging | with the chicks, June and July |
| dawn chorus | in song season, the first hour of light is twice as loud as the day |
| starling murmurations | September to February (was September to December) |

The voices follow (`speciesFor(mode, season)` in the engine): no swift call out of season, the blackbird's song gives way to the sparrow, the owl is quiet in
summer, and a new **chick** call (thin, high, quavering peeps, run on and on) is heard at the nests in June and July and from fledglings in August. The narration
follows too (`birdSentence`, `soundBits`, `birdLines`): "the thin, endless peeping of chicks", "young gulls, brown and clumsy", no swifts in winter.

## Growing things (`plantLines` in `nature.ts`)
Weed on the lower walls: new green in spring, soft and thick in summer, brown and storm-torn in autumn, thin and dark heaps in winter. Pavement cracks and plinths:
new green and moss in spring, grass and flowers in summer, seed, damp moss and mushrooms in autumn, bare and black in winter. None in the Drowned Halls or the dark.

## Weather (`src/sim/weather.ts`)
* A **daily swing** in temperature: coolest about 03:00, warmest about 15:00, half-range 5.5 degrees in summer and 2.5 in winter (a smoothed triangle in integers). Frost is now a winter-night thing.
* **Rain** is likelier in autumn and winter than in summer (the threshold of the rain noise differs by season).
* **Thunderstorms** belong to the warm months: three times as likely in summer as in spring or autumn, and almost unknown in winter.
* Autumn gales: wind is stronger from October.

## The sky (`src/sim/stars.ts`)
Besides the dark hall's doorway, the open upper halls on a clear night now name what stands overhead and what is climbing in the east ("Through the broken roof the
Swan stands high overhead, and the Hunter is climbing in the east."), by the hour and the season.

## The tide moves things (`washed` in `src/world/relics.ts`)
Each tide cycle (12 h 24 m) the water may lift a loose article (an empty packet, a scrap of cloth, a pen, a crumpled sheet) and set it against another wall, or carry it
off. The nearer the hall is to a vestibule the likelier: 70% a cycle one room away, 40% at two, 15% at three, none beyond. The tide also leaves its own flotsam along the foot
of a wall for a cycle or two (weed, driftwood, shells, a cuttlebone, old rope). The sleeping bag under the great stair and the chalk marks never move. The narration says
"left by the tide" or "where the water left it", never "long ago".

## Fog (`fog` in `Weather`, `fogHere` in `LocalWeather`)
Radiation fog: forms on calm, damp mornings (thickest about dawn, gone by about 12:30), likeliest in autumn and least in summer, and never in rain or a wind above about a third of full. About one hour
in ten has some in autumn; dense fog (0.6 and over) is a morning in autumn most weeks. It fills the open halls: the upper level fully, the vestibules and the halls the cloud comes into mostly; not the
lower halls, the Drowned Halls or the dark hall. It dims the light, muffles sound a little, silences the birds when it is dense, and is described ("Fog fills the hall, white and still...", "Fog stands in
the openings like milk in a bowl"). Changing the weather bumped `WORLD_VERSION` to 7.

## Plants that grow over weeks (`src/sim/plants.ts`)
Each hall has a kind of plant (`floraFor`: ferns where there is falling water, otherwise meadow grass, moss or thistles by the hall's own luck) and its own few days of earliness (`growthOffset`, plus or
minus twelve). Growth by date: bare until about day 55; shoots to 95; growing to 150; flowering to 215; seeding to 275; dying back to 320; bare again. Height is a number the prose turns into words (no taller
than a fingernail, a finger high, hand-high, knee-high, as high as your thigh). So the same hall reads differently from March to May to July, and next to its neighbour on the same day. (The grass in
the cracks of the pavement is one of these: it comes up as a green haze, stands hand-high, flowers with bees, goes to seed, and is straw by November.)

## Planets and the moon (`src/sim/planets.ts`)
A circular-orbit model: Venus, Jupiter, Mars and Saturn on their mean motions from the year 2000, seen from forty-five degrees north, so they are really in the right parts of the sky at the right
times of the year (Venus is only ever an evening or morning star, within about 46 degrees of the sun; Jupiter and Saturn change slowly over years). Visible when above the horizon, clear of the sun, and
the sky dark enough, by brightness. The open upper halls name up to two ("Venus, a brilliant white light, hangs low in the west.") and the moon ("The waxing gibbous moon stands high in the south, among the
Lion."; by day, "A pale waning crescent moon hangs low in the east in the daylight."). The moon rises in the east, stands highest in the south, and sets in the west over 12.4 hours, in the figure of the
zodiac that the sun's longitude plus its phase gives. A planet low in the east shows in the dark hall's doorway too.

## Geese
Passing over in spring (day 60 to 110) and autumn (day 270 to 320): a skein heard and seen from the upper halls by day, and heard calling unseen through the night. A new goose call in the engine
(low nasal honks, each throat a little different).

Not done yet: migrating birds other than geese, animals other than birds on land, sea fog and fog horns, comets, eclipses, and the planets' brightness changing with their distance.
