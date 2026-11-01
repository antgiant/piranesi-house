# Polish, text first (milestone 10, started)

The aim: a really good text experience before any visual one. Written as a checklist so we know when it is done.

## Done
- [x] A read-through of what the game actually says in narrated and plain modes; fixed: missing "the" and "a" ("into the First
  Northern Hall", "a winged horse and its colt"), the meta-label "minotaur 8 of 8", the same sea sound announced in every hall,
  a list line cut off mid-word, "3 great staircases", the theme sentence contradicting the book's own halls.
- [x] The size of the statues said once for a hall and never again.
- [x] A clearer help screen, in groups; a "did you mean" for a mistyped command.
- [x] Share: a button that opens the device's share sheet (or copies the link to the room).
- [x] Reading comfort: text size (4 steps), plain spaced-out lettering, higher contrast; applied everywhere at once.
- [x] Phone: the header and the map's Back button; settings buttons stay in reach (sticky Save).

## Done (second batch)
- [x] **Screen readers.** The log is a polite live region; with narration on it is switched off so the voice and a screen reader do not talk over each other (a setting, "Let my screen reader announce new text"). Controls are labelled; the map has a text description. (Still worth a real screen-reader trial by someone who uses one.)
- [x] **A first-run introduction**, short and dismissible, shown once and available again from Settings.
- [x] **Keyboard:** single-key shortcuts when not typing (`/` m w r s ?), switchable off (WCAG 2.1.4); arrow keys walk command history.
- [x] **Quick actions that follow the place:** "go on" in the direction you were facing, and "wander".
- [x] **The narrator's voice over a long wander:** glances no longer restate the statues' size and mood hall after hall, nothing said is said again for the next few halls, more ways of saying the light, the sea, the weather and the mood, thunder and wind in the sound line. A test over 600 glances keeps it that way.
- [x] **A transcript:** "Save what I have read" writes a plain text file on the device.
- [x] **Errors in plain words:** no sound possible, sound waiting for a tap, storage blocked, an old browser without dialogs, and a catch-all for something going wrong in the page.
- [x] **Offline:** a service worker lets a visited House open and play with no connection (tested). Add to the home screen with the manifest and icons.
- [x] **A performance budget** (`npm run check:budget`, run in CI): script, style, page and total gzipped weight, and no single file over 150 KB. Now about 120 KB in all.
- [x] **Credits, privacy and the fan-work notice** in an About dialog (from the title screen or Settings): what is kept on the device, what is never sent, and the honest note about online reading voices.
- [x] **Colour and motion:** every colour pair in the four themes (dark, light, and the high-contrast pair of each) is tested for contrast; the light theme's button text was too faint and is fixed; reduced motion switches off all animation.

## Was next (all now done above)
- [ ] **Screen readers.** The log is a live region; with narration on, a screen reader and the browser's voice would talk over each
  other. Offer "Let my screen reader read new text" and set the live region accordingly; check focus order and labels on every
  control; test with a real screen reader.
- [ ] **A first-run orientation.** One short, skippable paragraph on the title screen or after entering: what the House is, that
  it is mostly sound, how to move (buttons or words), what Wander does. Not shown again.
- [ ] **Keyboard.** A shortcut to focus the command line, to repeat, to toggle sound and Wander; the arrow keys already walk
  through command history.
- [ ] **Quick actions that follow the place** (buttons under each description): they already list doors and "look closely"; add
  "go on" in the direction you were facing and "wander" when idle.
- [ ] **Voice of the narrator.** A pass for variety and repetition over a long wander: check a thousand glances for repeated
  sentences in a row, and for phrases overused (the fish, the light, the sea breathing); add variants where they repeat.
- [ ] **A transcript.** "Save what I have read" as a plain text file (private, from the page).
- [ ] **Errors in plain words**: sound refused by the browser, storage blocked, speech unavailable, an old browser.
- [ ] **Offline** (a service worker, so it opens with no signal) and **a performance budget** (page weight and first sound).
- [ ] **Credits, privacy and the fan-work notice** on one quiet page; what is stored on the device (settings, found list, marks)
  and that nothing is sent anywhere.
- [ ] **Colour and motion**: respect `prefers-reduced-motion` everywhere (smooth scroll is already off), check contrast of the dim text.

## Thoughts on multiplayer
Under consideration: replacing milestone 8 with the links we already have plus an outside chat. See the note in PLAN.md.
