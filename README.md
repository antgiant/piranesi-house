# The House

An explorable, sound-first, procedurally generated House of endless halls, vestibules, tides and statues.
Static site (GitHub Pages), no server. The world is a pure function of a seed, so it is always the same;
any multiplayer is peer-to-peer and ephemeral.

This is an unofficial fan project inspired by a novel. It contains no text from the book. See `PLAN.md` for the plan,
`canon/` for the facts it is built from (in our own words), and `design/` for our own design decisions.

## Status
Milestone 0 (canon) is a draft awaiting review. Milestones 1-3 are done: a deterministic world (layout, naming, doors, halls, statues with canon overlay), a simulation
of time, tides, weather, light and birds, and a playable text adventure with a procedural soundscape, with 200+ tests
a fog-of-war map, sound through doorways, and a real-browser test that measures the audio. Next: multiplayer.

## Play
```sh
npm install
npm run dev          # open the printed address, click "Enter the House", and listen
```
Developer shortcuts in the URL hash: `#seed=abc`, `#scale=60` (time runs 60x), `#pace=instant` (developer override: skip walking times; players choose 5.3 to 21.1 km/h in Settings), `#at=2034-02-01T08:00:00Z` (start at a moment),
`#debug` (exposes `window.__house`). Try the next great tide: `npm run now -- "Ninth Vestibule" --join`.

## Publish
Pushes to `main` deploy to GitHub Pages (`.github/workflows/pages.yml`). One-time: repository Settings > Pages >
Build and deployment > Source: **GitHub Actions**. The site is static and needs no server.

## Develop
```sh
npm install
npm test                        # ~80 tests: layout, canon fixtures, statue invariants, golden snapshot
npm run typecheck
npm run build && npm run test:e2e   # real-browser test (needs Playwright + Chromium)
npm run build:canon             # regenerate src/generated/canon-statues.json after editing canon/statues.yaml
npm run hall -- "Ninth Vestibule"             # print a hall
npm run hall -- --xy 6 0 --statues 5          # a Drowned Hall
npm run hall -- "Third North-Western Hall" --no-dead
npm run now -- "Ninth Vestibule" --join       # the moment of the next great join of three tides
```

## Rules for contributors
- Never commit the source text. `scripts/check-no-source-text.sh` runs as a pre-commit hook
  (`git config core.hooksPath .githooks`) and in CI.
- Before committing anything with prose in it (`canon/`, `src/`, `design/`, tests, docs), run
  `python3 -I scripts/check-canon-not-verbatim.py /path/to/private/copy 7` (CI cannot). It scans every file we wrote
  for runs of 7 or more words shared with the book.
- Changing generation changes the world. Bump `WORLD_VERSION` and update the golden snapshot on purpose.
