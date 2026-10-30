# Simulation (milestone 2)

Everything that changes with time is a pure function of `(world seed, world time, place)`. No state, no server: two
visitors who agree on the seed and the time-scale see the same tide, weather and sky. All timing is integer maths
(BigInt where products exceed 2^53), so every machine agrees to the millisecond.

## World time
`worldTime(cfg, realMs) = (realMs - realZeroMs) * timeScale`. `timeScale` 1 is real time; the room creator's value
travels with the room. Calendar: 365-day years, twelve months, no leap days. Winter is December to February.
Day length runs from 8 hours at midwinter to 16 at midsummer. The moon has a 29.53-day cycle and its phase is
offset by the seed. A full moon stands in the 192nd Western Hall's doorway on the evening of the full moon.

## The sea
The sea lives in the **lower level**. Tides climb the **vestibule staircases** and spill into the **middle halls**.
The **upper level** is never touched.

* Eight sea sources, one per compass direction, each on its own cycle (about 13 hours; counts per eight years are
  distinct primes, so cycles never repeat in step). Each has a character: colour, foam, sound, and whether it carries
  fish. East, west and north follow the book; the other five are our own design.
* A vestibule is fed by two sources (the ray it lies on, plus a neighbour). The Ninth Vestibule is fed by east, west
  and north. The Tenth and Twelfth are pinned to the sources named in the book.
* A wave reaches vestibules nearer its source slightly earlier. Each event has its own strength, so most tides are
  small and a few are big (a table of tides is predictable but not regular).
* Water reaches a hall by its distance in rooms from a vestibule: 100% at the vestibule, 62% one room away, 28% two
  rooms away, nothing beyond. With a vestibule in every 3x3 block, that leaves roughly a fifth of all halls dry.
  Each room is reached two minutes after the last (the "boom, boom" through successive chambers).
* **Joined tides** reinforce each other. The reinforcement depends on how closely the peaks coincide (the fourth
  power of the least-aligned pulse), so loose overlaps are a bad day and a true coincidence is a catastrophe.
* **The great join.** East, west and north peak together at the Ninth Vestibule once every eight years, arriving in
  that order a few minutes apart. It towers to about 15 m. Roughly three loose near-misses occur in the same eight
  years; they are big tides but under 60% of the join.
* **South wind** raises high tides by up to 35% and, with no swell, drains a lower hall completely above 80% wind.
* **Drowned Halls** are a rain-fed lake: no tide. The **dark hall** is never wet.

## Weather
Seeded smooth noise with seasonal bias. Cloud (upper level, and the North-East collapse zone in the middle level),
rain (vestibules, only under cloud), wind (direction by season; a strong westerly is a storm), temperature (cold
winter), lightning (only in heavy rain and cloud and wind), winter frost (statues wear snow and icicles).

## Birds and light
Birds follow the hour, season and weather: gulls nest March to August, rooks are loud by day, a murmuration fills the
17th Vestibule on clear autumn evenings, flocks go silent in storms and cloud and gather in the Sixth Western Hall,
the Drowned Halls are always silent. Interior light follows sun, moon and cloud; stars always shine, so only the dark
hall is ever truly dark; the Fifty-Second Western Hall's wall turns golden in the late afternoon.

## SceneState
`sceneAtWorldTime(world, x, y, level, t)` returns one object (hall, tide, next tide, weather, local weather, light,
moon, birds) that every view reads. See `src/sim/scene.ts`.

## Inspecting it
```sh
npm run now -- "Ninth Vestibule" --at 2026-06-10T09:00:00Z
npm run now -- "Ninth Vestibule" --join         # the moment of the next great join
```

## Known simplifications
* Water depth is computed from Manhattan distance to vestibules, not the door graph.
* Birds and light are coarse; they are the inputs for the audio layer in milestone 3.
* Moonrise uses a simple rule of thumb, not astronomy.
