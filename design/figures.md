# The cast of statues (WORLD_VERSION 2)

The House holds, as far as anyone can tell, a statue of everything. So the catalogue (`src/data/catalogue.ts` for the
original figures, `src/data/figures.ts` for the wider cast, `src/data/kindlists.ts` for the wording that fits each kind)
is meant to hold what a sculptor in the long classical tradition might be asked to carve: the trades and professions of the
age, its people high and low, its creatures real and imagined, its gods, spirits and monsters, its stories and fables, and
its made things: ships, coaches, weapons, tools, instruments, buildings.

## Era
Antiquity to about the end of the eighteenth century. Nothing later: no engines, electricity, photographs, modern weapons or
modern professions (a test, S-R09, reads every word of every list). Tales are those told by then (old fables, romances,
the fairy tales of the 1600s and 1700s, the Arabian nights), not the nineteenth-century ones.

## Size
About 1,100 figures, in 16 themes: pastoral, maritime, scholarly, martial, beasts, mythic, allegorical, craft, courtly,
celestial, and the new sacred, trade, civic, household, fable and travel. A figure may belong to more than one theme.
Four kinds: **people** (including groups and scenes), **animals**, **spirits/gods/monsters**, **made things**.

## How a hall draws on it
* A hall keeps up to 64 figures: up to 44 from its own theme and 20 from anywhere, so no hall is only one subject but every
  hall has a flavour. Violent halls draw from mythic/martial/beast figures only; crowd halls only from people; the Drowned
  Halls still hold only their giants.
* Each hall then draws 6 to 12 poses (by mood), 32 attributes and 12 companions **for each kind**, so a galleon is "raised
  on a stepped plinth, its ropes carved as if they could be untied", never "hands joined, holding a net", and a heron is
  never "wearing a laurel crown and sandals". The lists for the four kinds are always the same length, so the choice of
  figure, pose, attribute and companion remains one-to-one and no two statues in a hall are alike (S-R08).
* A subject written as an idea or scene ("the fox and the crow") is introduced as "a carving of ...".

## What changed in the world
Only the statues. Layout, tides, weather and doors are exactly as before: the seed is now mixed with a fixed epoch rather
than with the version number, so bumping the version no longer re-rolls every hall. Statues differ from version 1 everywhere
except the canon (book-named) statues, which are placed by the same table as before.

## Known limits, to refine
* Within a kind, all lists are shared: a bird or a fish may be described as "rearing on the hind legs" or "one paw resting
  on a stone ball". Sub-kinds (bird, fish, insect, quadruped; ship, weapon, tool, building) would fix that.
* Craft and trade halls still show some figures that are in many halls; with 64 figures drawn from 1,100 the overlap
  between two halls is small, but not zero.
* The visual views (milestones 7 and 9) will have to draw this whole catalogue; the plan there is a drawn part for each
  figure, pose, attribute and companion, composed from the same four choices.

## Finer wording (world version 5)
Birds, sea creatures, insects, reptiles, ships, weapons, instruments, vehicles, buildings and household things each have their own
poses, attributes and companions (`src/data/sublists.ts`; `subOf` sorts every figure), on top of the four kinds. A heron is "perched
with the head turned to one side, every feather separately cut", a galleon "riding a carved wave, with oars shipped in neat
rows", a cannon "laid across the plinth, a heap of carved shot at its foot". A hall draws up to 12 poses, 24 attributes and 12
companions from each sort it needs, so figure, pose, attribute and companion are still one-to-one within a hall.
