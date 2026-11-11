# Water and wind (first slice of the better-sound work)

No recordings were available to download here (the sound libraries need accounts or licences we cannot satisfy from this sandbox), so this slice
builds on published procedural techniques and checks itself with numbers instead of ears. **It has not been listened to by its author: please
listen and say what is wrong.** Every change below is in `src/audio/engine.ts` and `src/audio/director.ts`.

* **Waves, not a hum** (`wave()`). The sea was one low-passed brown noise with a sine swell. Now a surf layer rises over about 38% of each swell,
  brightens as it does (the low-pass sweeps up), crests with a short high hiss, and washes back down. Waves are irregular (each a different length
  and height). Between waves, laps and sloshes (short band-passed noise, 200 to 650 Hz) with a few bubbles.
* **Bubbles** (`bubble()`). Falling and running water is a scatter of tiny rising sines, one per air bubble: in water an air bubble rings at a pitch
  set by its size and rises as it shrinks (the physically based liquid-sound model of van den Doel, 2005, "Physically based models for liquid
  sounds"). A trickle makes a few a second, a fall a dozen.
* **Gusts** (`gust()`). The wind was one band-pass with a slow sine. Now three bands (a low body from brown noise, a middle rush, a high hiss)
  each drift to new levels on their own random schedules, the middle ones also wandering in pitch, and gusts come closer together the stronger the
  wind. Air gusts and lulls instead of oscillating.
* **Water heard through the walls** (`Bed` in the director, `syncBeds()` in the engine). When the hall next door is wetter than this one (nearer the
  sea, a fall, a stream) its sea and falling water arrive as a steady muffled bed per doorway: low-passed hard (half the doorway's cutoff) with a
  bump around 200 Hz, because through an opening or a wall the low parts of water carry and the rest does not. The bed swells with the same waves,
  a fraction of a second later, and falls arrive as quiet bubbles. It is panned to the door and fades as you move away. The narrator does not mention
  these (`portals` still carries what the narrator describes).

Next, when recordings can be fetched: compare spectra of real surf, streams and wind with these and tune the band centres, levels and timings.
Left for later: sea heard through the *floor* shaped by depth; wind whistling in corridors (resonances by opening size); leaves and rustle; rain on
different surfaces.
