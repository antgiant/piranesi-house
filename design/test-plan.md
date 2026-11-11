# Test plan: what to check by hand

Open the live site (`house.wooleys.us`), open **About, credits and privacy** and note the **Version**: it should be at or after the commit named in the message
that brought you here. Tick what works; write what does not, with the place and the time. Things marked **(ears)** are judgements of sound that could not be tested by a machine.

Time travel for seasons: add `#at=2026-06-20T06:30:00Z` (any date and time, in UTC) to the address, then press Enter or reload. `#scale=60` makes a minute pass every second.
Useful halls (type `travel to the …`; naming works even for a hall you have not been to, with a chance of going astray):
First Western Hall (tidal, near the sea) · First North-Western Hall (waterfall) · Sixth Western Hall (bird shelter) · Sixth North-Western Hall (rooks) · Seventeenth Vestibule (starling murmurations) ·
Forty-Third Vestibule (albatrosses) · Eighty-Eighth Western Hall (the gull colony) · 192nd Western Hall (the dark hall with one door).

## 1. The bar, Play/Pause, Back/Forward, mute (desktop and phone)
- [ ] The bar shows: Back, a round Play button, Forward, then Journal, (Map if on), a speaker, and a sliders icon (Settings). Nothing wraps untidily on a phone; the place name is on its own line.
- [ ] **Play** starts a wander and the button turns to **Pause**; Pause stops where it is. Typing anything also stops it.
- [ ] With "Read aloud: Only while playing" (default), Play reads each passage and does not move on until the reading ends. Pausing mid-passage and pressing Play reads that passage again.
- [ ] **Back** reads the last passage again (the passage is marked with a line on its left); pressed again quickly it goes one further back; pressed after a few seconds into a passage it restarts that passage. **Forward** moves through passages you already heard, and at the end skips to the next step of the wander.
- [ ] While a replayed passage is being heard the House does not move on; after the last replay it carries on.
- [ ] Keys when not typing: `w` play/pause, `,` back, `.` forward, `s` mute, `j` journal, `r` repeat.
- [ ] **Mute** (speaker icon) silences both the House's sounds and the reading, and shows it is muted. In Settings you can make it silence only one of them.
- [ ] Share is not in the bar; **Settings, Your journey, Share this room** shares or copies the link (and refuses politely if you are lost).

## 2. Settings
- [ ] Settings is in groups: Sound and reading aloud, Reading, Getting about, The House, Your journey, Help. On a phone it fills the screen with Save/Cancel pinned at the bottom.
- [ ] Read aloud: Never / Only while playing / Always, voice, speed all work. Text size, plain lettering, contrast apply when saved.
- [ ] Changing speed of time, seed, dead, relics or outside restarts the walk but keeps the journey.
- [ ] Settings → Help → the introduction and About open. About ends with a Version.

## 3. iPhone (foreground only)
- [ ] Play reads aloud and you can hear it (the House's sounds may dip while it speaks; they come back between passages).
- [ ] The screen does not lock while it is playing or reading.
- [ ] If you switch to another app or lock the phone, it **pauses** (and nothing keeps talking). Coming back, press Play.

## 4. Naming and memory
- [ ] `call this hall the Hall of Weeping` names the hall; the heading, address (`as=`) and `names` show it. `call the minotaur Old Horns` (or whatever statue you looked at, or `call it …`) names a thing. Quotes are optional.
- [ ] A name already given to another thing is refused. `names` lists what you remember and how sure you are; `forget <name>` lets one go.
- [ ] A "name this place" button appears under a description and starts the naming for you.
- [ ] Name five or six things within a few minutes: you are told you doubt you will keep them all.
- [ ] Lost (with the map off) and arriving where you named a thing: you may recognise the place, and are told "This is the place you called …".
- [ ] After a long while (change the speed of time to "1 hour per second", wait, return), unused names fade, used ones last longer.

## 5. Narrative names
- [ ] Every hall heading reads like "First Western Hall, the Hall of the Straining Giants". The dark hall is "the Hall of the Single Door"; the First Vestibule "the Hall of the Minotaurs".
- [ ] The address carries `room=` (the ordinal name) and `as=` (the narrative name); editing `as` changes nothing, `room` moves you.

## 6. The stars
- [ ] In the 192nd Western Hall on a clear night the single doorway frames named constellations, and "the sky has moved on" after a while. By day or under cloud it is simply dark. On the night of the full moon the moon fills the doorway.
- [ ] In an **upper-level** hall on a clear night: "Through the broken roof X stands high overhead, and Y is climbing in the east", different at different hours and in different months.

## 7. Water and wind (ears)
- [ ] A lower hall by the sea: waves come in, brighten and crest with a hiss, and wash back, each a little different; laps and small bubbling between. Not a constant hum.
- [ ] A waterfall hall (First North-Western Hall): falling water is a thick, natural trickling, not a tone.
- [ ] A middle-level hall next to a hall nearer the sea or a waterfall: through the doorway you hear the sea or water muffled, from the right side, swelling with the waves, getting louder as you approach the door and fading as you leave. Is it convincing as "through a door/wall"?
- [ ] An upper hall in wind (or stormy weather): gusts and lulls, not a steady siren; stronger wind has gusts closer together.
- [ ] Anything too loud, too busy, too hissy, too thin, or worse than before: note it.

## 8. The year (use `#at=`)
- [ ] 20 June, early morning, a hall with perches: a dawn chorus, louder than midday, with blackbird song.
- [ ] Early July in the gull colony: "the thin, endless peeping of chicks" and a chick call among the gulls. August: young gulls. October: the gulls have gone.
- [ ] Upper hall in July: swifts; in January: none (gulls only). Lower hall, shore, in January: small waders; in July: none.
- [ ] A roosting hall at night in January may have an owl; in July not.
- [ ] Plants: a glance in spring, summer, autumn and winter says different things about green, weed, moss, flowers and bareness.

## 8b. Fog, plants, planets, moon, geese
- [ ] Fog: use `#at=2026-10-14T06:00:00Z` and look at several mornings (try a few dates in October, or `#scale=3600` through the nights): some mornings have "A thin mist hangs..." and a few "Fog fills the hall, white and still...". It is in upper halls and vestibules, not the lower halls. By early afternoon it is gone. The light is dimmer and the birds are quiet when it is dense.
- [ ] Plants over weeks: stand in the same middle-level hall (not by the sea) on 1 March, 15 April, 1 June, 15 July, 1 October, 1 December: bare, shoots, taller, flowering, seed, straw/bare. Check a neighbouring hall: it should be a bit earlier or later, or a different kind (ferns by a waterfall, grass, moss, thistles).
- [ ] Planets: in an upper hall on a clear night or at dusk or dawn, you may be told Venus, Jupiter, Mars or Saturn is low in the west or the east. Venus only ever shows near sunset or sunrise.
- [ ] Moon: "The waxing gibbous moon stands high in the south, among the Lion." Rising in the east early in its time up, in the west late. By day a pale moon is mentioned when it is up and not too thin or too full.
- [ ] Geese: late September to mid November and March to mid April: a skein goes over upper halls by day, and geese call unseen at night. Listen for the honk (ears).
- [ ] The chick and goose calls sound like what they are (ears).

## 9. Weather
- [ ] Over a year (`#scale=3600` and watch): rainier in autumn and winter, thunder in summer, snow and frost only in the cold, warmer afternoons than nights (the temperature is not shown, but frost and snow follow it).

## 10. The tide moves things
- [ ] In First Western Hall (tidal) look around at a given time, then at the same hall after a tide (about 12½ hours, or speed up time): loose things (a pen, a scrap, an empty packet) may have shifted to another wall "where the water left it", or gone; flotsam (weed, driftwood, shells, rope) may have been left "along the foot of the … wall, left by the tide".
- [ ] A hall far from any vestibule never shows flotsam. The sleeping bag under the great stair and chalk marks never move.

## 11. Still in place from before
- [ ] The journey survives closing and reopening; "Take my journey with me" carries it to another browser.
- [ ] Offline (airplane mode) after one load: it still opens.
- [ ] The map is off by default and can be turned on in Settings.
