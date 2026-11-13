# Running water: turbulence, not amount

Two separate things grow with the flow, and each is controlled by a *turbulence* (`src/audio/turbulence.ts`), not by a plain "amount":

1. **The fall** (`falls.ts`): thread to waterfall. A thread is smooth: single drops and bubbles in a calm pool, all audible. As the flow rises the jet breaks up and the
   plunge pool churns: the drops are buried in a roar, and past a critical flow it is deeper rather than louder.
2. **The stream** (`stream.ts`): trickle to river, the water running away over the floor (below a fall; or alone, from rain, in halls with no fall). Smooth, it
   is a few clear bubbles over stones. As it speeds and deepens the surface turns white, the events merge into a rush, and a low roar of the mass of water sits
   under it. A river is not a louder trickle.

Turbulence runs from 0 to 1 across a threshold in the flow (1 = an ordinary day for that water, from hydrology): streams break up between 0.45 and 1.7, falls
between 0.45 and 1.3. `discreteShare` is how much of the single-event sound is still audible: all of it when smooth, 3% when turbulent. The pool the drops land in
does not grow, so their level is fixed and the roar rising over them is what hides them.

## Grounding
Bubbles ring at Minnaert's frequency and are the main source of running water's sound (Minnaert 1933; reviews of rain and breaking-wave noise); a flume study found a
turbulence threshold above which sound levels change distinctly; stream measurements put turbulence in the lowest octaves and bubbles near 1 kHz; waterfall studies find
loudness rising with bubble size and flattening past a critical discharge (Galbrun et al.). No published curve gives the spectrum by Reynolds or Froude number, so the
thresholds and levels are fitted by ear and by measurement (`scripts/audition/compare.py`) to the recordings, and are the numbers to change when it sounds wrong.

Measured (stream, 6 m, one scale): trickle -49.6 dB with 2.5 audible clinks a second; stream -48.5 dB, 0.06; fast -42.2 dB, 0; river -41.0 dB, 0 and the most low energy.
