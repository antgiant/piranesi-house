# Walking (milestone 3, revised)

Movement used to be instant: one command crossed a whole hall. It now takes the time it would take.

## Pace
* **The book's pace.** 20 km in 3.76 hours, rests excluded (canon D-002): about **1.48 m/s**. `WALK_SPEED_MPS` in
  `src/game/walk.ts`.
* **The world clock sets the pace.** Walking time is world time. At real time a 200 m hall takes about two and a quarter
  minutes; at 60x time it takes two seconds. So `timeScale` and walking agree.
* **Walking-pace setting** (settings panel, or `#pace=real|brisk|fast|instant` in the URL): real, 4x, 20x, instant.
  This only changes how long you wait, not how far anything is.
* **Terrain.** Rubble (ruined halls) slows you to 60%; water to 90% (a skin), 65% (knee-deep) or 45% (waist-deep).
* **Stairs.** A great stair is about 25 m high with steps nearly twice a comfortable height: 150 s up, 120 s down, plus
  the walk to it.
* **Long passages** add 130 m per hall's length. Every door adds 12 m of wall.

## The road is the right length
The generator now makes the great east-west road (cells within two rows of the west and east axis) out of tall narrow
halls, so it crosses their *short* axis, about 105 m each. The road west to the 192nd Western Hall comes out at
20.1-20.7 km for every seed tested (the book says 20 km), which is 3.8 hours on foot against the book's 3.76. This was
the hypothesis recorded as D-H1 in `canon/world.yaml`; before this, the road was 31 km long. A test asserts it.

## In play
* `go west` starts a walk: *"You set off for the west door, 105 metres away. It will take about 70 seconds."* You are
  still in the old hall until you arrive; the header counts down; footsteps sound continuously.
* Halfway through a long walk you pass a statue of the room you are crossing.
* Mid-walk you can `look` (progress), `listen`, `time`, `help`, or `stop` (you stop where you are, in the open floor).
  Starting a second move is refused.
* If the water has risen too deep by the time you reach the door, you wait in the doorway instead of wading in.

## Not done
* Other visitors walking (multiplayer, milestone 5).
* Fatigue, rest stops: no survival, by decision (Q-016).
