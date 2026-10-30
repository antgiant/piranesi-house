# Canon (milestone 0)

Structured facts about the House, extracted from the source novel, **in our own words**.
The source text is copyrighted and is never stored in this repo (see `scripts/check-no-source-text.sh`).
Entries are short factual descriptors with a line reference; there are no quotations and no prose borrowed
from the book. If you need the original wording, open your own copy at the cited line.

## Setting
Set before the events of the book; the story's characters and their actions are out of scope (see
`excluded.yaml`). Opt-in packs for rare outside hints and visitor marks live in `design/packs.yaml`, not here.

## Status: DRAFT v2 — all parts read in full, needs your review

### Coverage
| Source section | Lines (approx.) | How it was read |
|---|---|---|
| Part 1 (first journal entries) | 59-256 | read in full |
| Part 2 (The Other) | 258-1218 | read in full |
| Part 3 (The Prophet) | 1219-1755 | read in full |
| Part 4 (16) | 1756-2540 | read in full |
| Part 5 (Ketterley, real world) | 2541-2787 | read in full (milestone 5); real-world scene plus the crossing; arrival sensations added as ARR-001 to ARR-004 |
| Part 6 (Wave) | 2788-3538 | read in full |
| Part 7 (real world, later reflections) | 3539-3755 | read in full (milestone 5); every statue already recorded; walking-in-memory and sleeping-place notes added as ARR-005, ARR-006 |

Every part of the source has now been read in full. Nothing further is pending for coverage.

### Line references
`src: 267` is a line number in the plain-text export the project owner supplied (the numbering the
file reader displays, starting at 0). `src: ~1632` means the number came from a keyword sweep and may be off
by about ten lines. Ranges are written `a-b`.

### Keeping the canon free of the book's wording
`scripts/check-canon-not-verbatim.py <path-to-your-private-copy> [N]` fails if any run of N (default 7)
consecutive words in any file we wrote (`canon/`, `src/`, `design/`, tests, docs) also appears in the source. Numbered place names ("Fifth North-Western Hall")
are factual identifiers and are ignored. CI cannot run this (it has no copy of the book), so **run it locally
before every commit that touches `canon/`**. Last run: 0 overlaps at N=7.

## Files
| File | Contents |
|---|---|
| `world.yaml` | structure, dimensions, levels, naming, regions, landmarks, relative positions |
| `statues.yaml` | generation rules for statues + every named statue found so far |
| `tides_weather.yaml` | tides, flooding, weather, seasons, light, the sky |
| `life.yaml` | birds, sea life, plants, food, and the optional skeletal Dead |
| `senses.yaml` | sound, smell, touch and light descriptors for the audio and text layers |
| `rules.yaml` | testable invariants distilled from the above (these become tests in M1) |
| `relics.yaml` | traces of earlier visitors already present in the world (litter, sleeping bag, scraps, door marks) |
| `excluded.yaml` | everything deliberately left out as plot or out-of-world |
| `open_questions.yaml` | ambiguities and decisions still needed |

## Field conventions
- `scope`: `core` (always on), `optional` (behind a config toggle), `excluded` (listed only so nobody re-adds it).
- `confidence`: `stated` (book says it plainly), `inferred` (a reasonable reading), `guess` (our design choice;
  the book is silent).
- Names keep the book's ordinal-plus-compass naming (e.g. "Fifth Northern Hall"). Coordinates are assigned in
  milestone 1, not here.
