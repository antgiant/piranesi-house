# Audition and measurement tools

How the water sounds were built and checked (see `design/sea-model.md`). Reference recordings are never kept in the repository.

* `render.mjs`: render the real engine offline to a WAV (seeded, so comparisons are fair). Needs Playwright's Chromium (preinstalled in the
  cloud session) and `npm install`. See the header of the file for the arguments.
* `analyse.py`: measure a WAV (bands, swell, resonances, stereo, events) and draw a spectrogram. `clinks.py`: audible discrete clinks per
  second. `tonal.py`: how pitched (peaky) short frames are. The last two found the pebble/ice character in the first foam.
  Python needs numpy, scipy, matplotlib: `python3 -m venv v && v/bin/pip install numpy scipy matplotlib`.

* `walk.mjs`: render a walk across a real hall through the real world, director and engine, with or without the sound following your place; scenarios `falls`, `stairs` (a draining tide) and `leaks` (wet weather).

A useful comparison is always: the real recording, the old sound and the new sound through the same measurements. Calibrate the detector
first with controls (white noise should score as noise; a deliberately flanged copy should light up).
