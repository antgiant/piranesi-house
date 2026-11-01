# The journal, and keeping a journey (milestone 4i)

## The journal
A place to write whatever you like, in your own words: the book itself is a set of journals, and a visitor who has no map has good
reason to keep one. It is private: it lives on this device and goes nowhere unless you carry it yourself.
* **Button "Journal"** (or `j`, or typing `journal`) opens a panel (full screen on a phone, with the big Back button): a text box
  (Ctrl or Cmd + Enter writes it down) and your entries, newest first. Each is stamped with where and when in the House it was written,
  as words ("Written in the Third Western Hall, about nine in the morning, in summer") and the real date. Any entry can be changed or
  torn out (asked twice). Up to 20,000 characters an entry, 2,000 entries.
* **From the command line:** `write the sea was loud tonight` adds a line, exactly as typed, case and all; `journal` in a text-only
  setting reads the latest back.
* It is kept apart from the rest of the journey: beginning again keeps it unless you ask to tear it out too.

## A journey that survives sessions
Everything that makes it a journey is kept in the browser's own storage, per world (`the-house.save.v1.<seed>`, and
`the-house.journal.v1.<seed>`): where you stand and which way you face, the halls you have been in, what you have found and marked,
how often you have taken each way (what you have learned), the way you would go back, how many times you have tried to remember, and
what has already been said of each hall. It is written when anything changes, every 15 seconds, and when the page is hidden or closed.
Coming back, the title says so ("Your journey is here: you remember visiting many halls, and you have 3 entries in your journal") and offers "Return to
Piranesi's House" (or "Begin a new journey instead"). A walk in progress is not kept: you are where you were when it began.
* Refreshing the page is not a crossing: if the address names the hall you were in, you simply carry on. A link to a *different* hall is
  a crossing (you arrive with no trail), but you keep everything else you know.
* Old per-world lists of found things and marks from earlier versions are picked up the first time.
* If the browser will not keep it (storage blocked or full) the page says so once, and suggests saving a copy.

## Taking it to another browser
Settings, "Take my journey with me":
* **Take it:** save a copy to a file (`piranesis-house-journey-DATE.json`), or copy it as text (`HOUSE1:` and a block of characters) for
  pasting where a file is awkward. Both hold the journey, the journal and your settings.
* **Bring one here:** choose the file or paste the text, press "Look at it" (it says what it holds: the world, how many halls, how many
  entries, when it was saved, before anything changes), then "Bring it here". That replaces what this browser keeps for that world and
  reloads the page. A damaged, cut-short or foreign file is refused in plain words and nothing is changed.
* A small checksum notices damage; it is not a security measure. A copy is readable by anyone who has it. Nothing is sent anywhere.

## How it is built
`src/game/save.ts` (pure: `toSave`, `applySave` which keeps only well-formed data, `exportText`/`importText`, `toCode`, the journal's
shape and cleaning), `src/web/store.ts` (guarded storage), the panels in `src/web/main.ts`. Tests: `tests/save.test.ts` (round trips,
junk, damage, the journal) and the browser test (write, reload, come back, carry to a fresh browser, refuse a bad copy, begin again).

## Not yet
* Syncing between devices automatically (it would need a server; carrying a copy is the server-free way).
* Several journeys in one world; exporting only the journal as plain text (the transcript already saves what you have read).
