# Working agreements for this repo

- **Push every change to `main`** (the owner wants Pages to update on every change). Commit with a clear message, run the
  checks below first, then `git push origin HEAD:main`.
- **Never commit the novel's text** or anything derived from it by copying. `scripts/check-no-source-text.sh` guards this.
- Before committing prose (`canon/`, `src/`, `design/`, tests, docs) run
  `python3 -I scripts/check-canon-not-verbatim.py /path/to/private/copy 7` if the owner's private copy is available.
- Run `npm run typecheck`, `npm test` and `npm run build` before pushing. Changing generation changes the world:
  bump `WORLD_VERSION` and update the golden snapshot on purpose.
- See `PLAN.md` for the plan, `canon/` for facts from the book (own words), `design/` for our decisions.
