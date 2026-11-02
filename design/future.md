# Future improvements (owner's list, to be planned into milestones)

## A truer simulation of life
- Constellations consistent for the viewing place and season (the dark hall now frames them by hour and day; extend to a full sky model: latitude, precession-free approximation, planets, moon phase and position).
- Animal and plant life that follow realistic seasonal patterns: migrations (arrivals and departures of species by month), nesting and raising young (eggs, chicks, fledging, colonies noisy then empty), moulting, flowering, fruiting, leaf fall.
- Weather patterns right for the time of year (a climatology: fronts, fog, frost, snow, storm season, day length), not independent dice.
- Tides that rearrange loose articles: debris, shells, weed and relics are carried, stranded and moved by the tide, deterministically from the tide and the seed.
- More in the same spirit (decay, growth of weed and lichen, erosion, light through the seasons).

## Better sound
- **Decision (owner): building on what others have done is welcome.** Learn from, and where licences allow use, the work of game audio and sound-design practice and of open sound libraries and tools: procedural and physically informed sound for games (wind, water, weather, creatures, footsteps, reverberant spaces), game-audio middleware ideas (layered loops, randomised one-shots, parameter-driven mixing, occlusion and propagation through openings), published synthesis techniques, and freely licensed recordings. Use code or sounds only where the licence permits (public domain, CC0, MIT and the like, or with credit as required) and record the source and licence of each; do not copy anything unlicensed or anything from the book.
- Study real recordings of the animals simulated, and use what they show to build better synthesised versions, with attention to the different calls (song, alarm, contact, begging, flight) and what each means, used in the right situation and season.
- Study real weather recordings (rain on different surfaces, thunder, snow hush) to improve ours.
- A better water model, so it sounds heard *through doors and walls* or smelled in the air: occlusion by the number and kind of openings, low-pass and resonance by the space, distance, reverb tail, and a mix of surf, drip, slosh and trickle. Real recordings of water heard from another room are the reference.
- Better wind: gusts with natural spectral and amplitude behaviour, resonances in openings and corridors, whistling at edges, leaves and trees.
- Is a realistic physical simulation of wind and sound possible? Partly: wind as filtered noise driven by gusts with a turbulence spectrum, tuned resonators for apertures (Helmholtz and pipe modes), and room impulse responses. A full fluid simulation is not practical in the browser.
- Practical notes: samples must be public domain (CC0) or properly licensed with credit, and small (budget is 190 KB gzipped, we are at 144 KB): analyse recordings offline to tune synthesis parameters, or ship a few short loops. Nothing downloaded from the book. Record the source and licence of every recording.

## Interface redone (DONE: see audiobook.md)
- Wander becomes a play button which starts wandering and turns into a pause button.
- Sound becomes a mute button that controls ambience and narration together (independent controls in settings).
- Share moves into settings.
- Settings made short, mobile-friendly and clear: everything now feels thrown together, so group it, label it plainly, and make it quick to take in.
- An "audiobook" mode: wanders and narrates in the background with play, pause, skip back and skip forward working. Feasible: keep the wander as a recorded list of segments (position, text, time) so back and forward are real, drive it from the Media Session API for lock-screen and headset controls, and keep audio alive in the background with a silent media element (mobile browsers suspend Web Audio and speech otherwise). Needs a decision on speech: browser voices are the only offline option; pre-rendered audio would break the size budget.
