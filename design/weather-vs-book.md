# The weather model against the book

Checked against the novel's own descriptions (the owner's private copy) and the canon notes in `canon/tides_weather.yaml`. Nothing here is quoted; it is
what the book says, in other words, and what the model does.

| What the book describes | The model | |
|---|---|---|
| Clouds own the Upper Halls and drift through them, so their windows are pale and misty and statues loom out of the white | cloud fills the upper level; the ceiling-collapse region lets it down into the middle halls | matches |
| A flash of lightning sometimes lights a whole row of windows | lightning needs heavy rain, thick cloud and wind; commonest in summer, almost unknown in winter | matches (the book gives no frequency) |
| The upper halls give fresh water, shed in the vestibules as rain, running in streams down the walls and stairs | rain falls in the vestibules and the upper level; streams on the stairs and walls while it runs off (hydrology) | matches |
| One autumn a rain of five days, steady and grey and soaking, fell across every vestibule; puddles stood at the doors and the birds crowded in to shelter | **was missing**: the longest rain was about 30 hours. Now: long rains of two to five days, a few a year, mostly autumn and winter (the real English coasts have five to ten episodes of 48 hours or more a year, and the model has about eight); steady (350-600 of 1000), a thick grey sky, the wind down; the birds shelter | fixed |
| Puddles form at the vestibule doors in a long rain | not modelled (no narration for it yet) | not yet |
| Winter: snow on the stairs, icicles, a south wind that howls and makes statues whistle | frost and snow in the cold; south wind strongest in winter; whistling statues | matches |
| Storms from the west bring strong winds and turbulent tides; fish are driven out for days | the storm flag (strong west wind) and the tides' disturbance | matches |
| The Drowned Halls are rain-fed freshwater lakes, shut off from the tides | drowned regions hush the weather and the sea | matches |
| Fresh water is never short: most halls have falls of it | falls never dry up (flow of at least 0.45 of an ordinary day), but thin in a dry spell and swell after rain (hydrology) | matches |
| Fog | **not in the book** (its one "fog" is in the other world). The model has radiation fog on calm cool mornings, most in autumn. The book's mist is the cloud of the upper halls, which the model has. Canon WX-008 calls fog only "inferred". | our addition: owner's decision |

## How often it rains (grounded in real records)

The book never says how often it rains. The author lives in Derbyshire and the sea is the English coast of the imagination, so the model is fitted to ten years
(2014-2023) of real hourly precipitation from Open-Meteo's historical archive (ERA5 reanalysis, CC BY 4.0): Derbyshire, Nottingham, and the coasts at Whitby,
Plymouth and Liverpool, with Keswick as a very wet place and Miami as a contrast. `scripts/climate/fetch.sh` fetches them and `stats.py` measures them with the
same definitions for the records and for the game; `tests/climate.test.ts` holds the game to the fit.

An earlier model rained about a tenth of the time, in showers of about five hours, with a few long rains a year and a dry summer. That was a guess, and wrong:

| | Derbyshire | English coasts | The game now |
|---|---|---|---|
| hours with measurable rain | 19% | 21-25% | 22-24% |
| rain episodes of 48 hours or more, a year | 3.4 | 5-10 | 8-9 |
| wettest season against the driest | flat | 1.1-1.3 times | under 1.6 times |

Rain is spread through the year; summer is as wet as winter in the hours it is wet (the downpours are heavier in summer and the steady rains in autumn and
winter). Counting snow as precipitation matters: counting only rain makes winter look dry. The hydrology (reservoirs filling and draining) was left alone and
still fits.
