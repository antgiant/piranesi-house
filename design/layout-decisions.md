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

## Pins: rooms the book locates relative to one another
These are enforced for every seed by `tests/pins.test.ts`. "N halls west and north" is read as N rings out (Chebyshev
distance), because a vestibule can never sit on a ray.

| Claim in the book | How it is pinned |
|---|---|
| The Ninth Vestibule is two halls west and north of the First | Vestibule 9 at `(-2, 1)` |
| The Twenty-Second Vestibule is five halls south and west | Vestibule 22 at `(-5, -4)` |
| The Sixth Vestibule's stair floods the Second Southern Hall | Vestibule 6 at `(1, -2)`, next to `(0, -2)` |
| The Tenth and Twelfth Vestibules both flood the Eighth Northern Hall | Vestibules 10 and 12 at `(1, 8)` and `(-1, 8)`, either side of `(0, 8)` |
| The Thirteenth Vestibule's stair climbs to the hall above the Eighteenth North-Eastern Hall | Vestibule 13 at `(17, 18)`, beside `(18, 18)` |
| The Seventeenth Vestibule is passed through from the Twelfth South-Eastern Hall | Vestibule 17 at `(12, -11)`, beside `(12, -12)` |
| The Forty-Third Vestibule's stair leads to the lower hall beneath the Thirty-Seventh South-Western Hall | Vestibule 43 at `(-37, -36)`, beside `(-37, -37)` |
| The Forty-Fifth and Seventy-Eighth Vestibules lie on the road west to the dark hall | Vestibules 45 and 78 at `(-45, 1)` and `(-78, -1)` |
| The Sixth North-Western Hall is 13 rooms from the First Vestibule | It is `(-6, 7)`, 13 steps away, with a winding route of doors forced open; shortest path is exactly 13 |
| The Twenty-Fourth Vestibule lies between the Sixth and Eighteenth North-Western Halls | Vestibule 24 at `(-6, 8)`; the Eighteenth is `(-6, 9)`; doors on both sides |
| The Fourth and Fifth North-Western Halls share a door (the Faun) | The Fourth is `(-4, 5)`, beside the Fifth `(-5, 5)`; the shared door is pinned |
| A swept-away man ends seven halls away (Eighth Northern to Third Western) | The Third Western Hall is `(-3, 1)` |

**Name swaps.** Several of these need a room to carry a name that ring-based numbering would give to a different cell.
Each is a swap of two halls' names (`NAME_SWAPS` in `src/world/layout.ts`), so names stay unique and round-trip. Swaps
used: `(-6,6)<->(-6,7)`, `(-18,18)<->(-6,9)`, `(-4,4)<->(-4,5)`, `(-3,0)<->(-3,1)`. Side effect: the hall at `(-18, 18)` is
called "Ninth North-Western Hall, 3 rows north", and similar. That is a deliberate trade for putting the book's rooms where
it says they are.

## Remaining deviations (the generator does NOT reproduce these)
| Claim in the book | What we do | Why |
|---|---|---|
| 20 km to the 192nd Western Hall in 3.76 h | We do not yet model walking time; halls on the west axis are 105-250 m wide | Distance model arrives with the simulation (milestone 2) |
| Absolute positions in metres | Topological only in M1 | Not needed until the 2D/3D views |
| Statues whose hall the book does not give (Cymbal Boy, Elephant with a Castle, Two Kings, ...) | Deterministic hash places each within 3-14 steps of the origin on a ray | Marked `guess: true` in `src/data/canonPlacement.ts` |
| Other numbered rooms (the 2nd, 8th, 16th, 18th, 32nd Vestibules, and so on) | Placed by distance from the origin | The book gives no relative position for them |

If you spot a place where the generator contradicts the text and it is not listed here, that is a bug: please say so.
