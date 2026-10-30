# The House

An explorable, sound-first, procedurally generated House of endless halls, vestibules, tides and statues.
Static site (GitHub Pages), no server. The world is a pure function of a seed, so it is always the same;
any multiplayer is peer-to-peer and ephemeral.

This is an unofficial fan project inspired by a novel. It contains no text from the book. See `PLAN.md` for the plan,
`canon/` for the facts it is built from (in our own words), and `design/` for our own design decisions.

## Status
Milestone 0 (canon) is a draft awaiting review. Milestone 1 (world core) is underway: deterministic layout, naming,
doors, halls, and the statue generator with canon overlay and a consistency test suite. Nothing is playable yet.

## Develop
```sh
npm install
npm test                        # ~80 tests: layout, canon fixtures, statue invariants, golden snapshot
npm run typecheck
npm run build:canon             # regenerate src/generated/canon-statues.json after editing canon/statues.yaml
npm run hall -- "Ninth Vestibule"             # print a hall
npm run hall -- --xy 6 0 --statues 5          # a Drowned Hall
npm run hall -- "Third North-Western Hall" --no-dead
```

## Rules for contributors
- Never commit the source text. `scripts/check-no-source-text.sh` runs as a pre-commit hook
  (`git config core.hooksPath .githooks`) and in CI.
- Before committing changes to `canon/` or generated wording, run
  `python3 -I scripts/check-canon-not-verbatim.py /path/to/private/copy 7` (CI cannot).
- Changing generation changes the world. Bump `WORLD_VERSION` and update the golden snapshot on purpose.
