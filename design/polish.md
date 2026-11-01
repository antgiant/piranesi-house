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

## Next, in rough order
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
