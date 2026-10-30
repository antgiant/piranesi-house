# Layout decisions and known deviations from the book

The book's own geometry is not fully self-consistent (distances, ordinals and "N halls west and north" claims conflict
in places). The generator therefore makes a small number of explicit design choices, pins what the book states
unambiguously, and records every place it departs from the text. Nothing here is hidden: tests assert what holds, and
this file lists what does not.

## Choices
1. **Cells.** A cell is `(x, y)` with the First Vestibule at `(0, 0)`, `x` east, `y` north; each exists on three levels
   (0 lower, 1 middle, 2 upper). A cell is a hall or a vestibule.
2. **Rays and names (Q-001).** Eight rays (N, NE, E, SE, S, SW, W, NW). Each non-origin cell belongs to its nearest ray.
   A hall's name is `<ordinal of its ring> <Ray> Hall`, where ring = `max(|x|, |y|)`. A cell exactly on the ray has the
   book's plain name ("Fourth Western Hall"); a cell off the ray is `"Fifth Northern Hall, 1 row east"`.
   Names are unique and round-trip (tested).
3. **Vestibules (Q-002).** One per 3x3 block at a hashed position, never on a ray, so every ray cell is a hall. The First
   is at the origin. The Ninth is pinned at `(-2, 1)`. Others are numbered by distance from the origin.
4. **Doors.** Doors belong to walls. Ordinary doors are reciprocal (tested). A few one-sided "corridor" doors reproduce
   the book's directions (dog-fox route, the corridor to the First South-Western Hall).
5. **Size.** Halls are about 200 x 120 m scaled 80-125% by district, with either axis long (D-H1). Vestibules are 20% larger.

## What is pinned and tested (holds for every seed)
- First Vestibule at the origin; Ninth Vestibule two halls west and one north.
- Second Southern Hall is two halls east of the Second South-Western Hall (P-003).
- The First Vestibule opens to the First Northern, Western and Eastern Halls, plus a corridor to the First South-Western.
- The dog-fox route works with the stated door counts, ending at the dog-fox in the Fourth Western Hall's north-west corner.
- The 192nd Western Hall: windowless, one door, a crowd, the banner-bearer at the back, no tide line.
- Horned Giants flank the First Western Hall's one east door and are far bigger than the rest; eight different minotaurs
  in the First Vestibule; the Woman with the Beehive 15 m up on the Ninth Vestibule's west wall; and so on (see `tests/statues.test.ts`).

## Known deviations (the generator does NOT reproduce these)
| Claim in the book | What we do | Why |
|---|---|---|
| The 22nd Vestibule is "five halls south and west" of the First (P-002) | Vestibule numbers beyond the pinned two are by distance; the 22nd is wherever that puts it | Cannot be reconciled with "two halls west and north" for the Ninth without extra pins |
| The 24th Vestibule sits between the Sixth and Eighteenth North-Western Halls (P-011) | Not enforced | Same reason |
| The Sixth North-Western Hall is thirteen halls from the First Vestibule by path (P-010) | Our Sixth NW Hall is at `(-6, 6)`; its shortest path through doors is not tied to 13 | Door layout is random; the book calls the route "meandering" |
| The Faun stands at a door "between" the Fifth and Fourth North-Western Halls | Placed at a pinned door on the Fifth NW Hall's east wall | Those two halls are diagonal neighbours in our grid, so no door joins them |
| A swept-away man ends "seven halls" from where he began (Eighth Northern to Third Western) | Those cells are 8-11 steps apart | Book arithmetic is loose |
| 20 km to the 192nd Western Hall in 3.76 h | We do not yet model walking time; halls on the west axis are 105-250 m wide | Distance model arrives with the simulation (milestone 2) |
| "Absolute" positions in metres | Topological only in M1 | Not needed until the 2D/3D views |
| Statues whose hall the book does not give (Cymbal Boy, Elephant with a Castle, Two Kings, ...) | Deterministic hash places each within 3-14 steps of the origin on a ray | Marked `guess: true` in `src/data/canonPlacement.ts` |

If you spot a place where the generator contradicts the text and it is not listed here, that is a bug: please say so.
