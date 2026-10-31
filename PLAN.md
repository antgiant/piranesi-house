# The House — project plan

An explorable, sound-first, procedurally generated rendition of the infinite House
described in *Piranesi*: halls, vestibules, statues, tides, clouds, birds.
**No plot, no characters** (the Other, 16, the rituals, the outside world are out of scope).
Static site on GitHub Pages; any multiplayer is peer-to-peer and ephemeral.

---

## 1. Guiding ideas

1. **The world is a pure function.** `hall(seed, worldVersion, x, y, level)` returns the
   same hall every time, anywhere, with no storage and no server. The world is infinite
   because nothing is stored.
2. **One scene state, many front-ends.** Text, audio, map, and 3D never look at the world
   directly. They all read the same `SceneState` (where you are, what is around you, tide
   level, weather, light, which statues are visible and in what condition). That is the
   mechanism that keeps statues consistent in every medium.
3. **Time is also a pure function.** Tides, clouds, moon and day/night derive from
   `f(seed, UTC time)`. Everyone computes the same tide with nothing to sync.
4. **Canon beats generation.** Hand-authored facts from the book are a layer that
   overrides the generator, and a test suite proves the generator never contradicts them.
5. **Only player-caused change is networked, and it is ephemeral.** The shared Yjs doc
   holds presence and a few movable things. No persistence. When the last person leaves,
   the House forgets.

## 2. What the book says about the space (so far)

Read so far: Part 1 and the start of Part 2 (about lines 0–910), plus targeted searches
for statues, directions and measurements. **I have not read all 3,800 lines.** Milestone 0
is a full extraction pass; the facts below are a starting point, not the full canon.

**Structure** (L87–109)
- Halls and Vestibules, joined by Doors, Passages and Corridors. Halls ≈ 200 m × 120 m
  (L499). Doors ≈ 4 m × 11 m (L851). Staircase steps are about twice comfortable height;
  stairs ≈ 25 m high (L491, L2923).
- Three levels: **Lower** (tides, fish, seaweed), **Middle** (people, birds), **Upper**
  (clouds, rain, fresh water).
- Windows look onto empty paved Courtyards with 3, 4, 6 or 8 sides. Outside: only sun,
  moon and stars. The House is almost never dark; stars shine through windows even at
  night. The 192nd Western Hall has no windows and is truly dark (L847–849).
- Halls are named by ordinal plus compass sector ("Third North-Western Hall", "Fifth
  Northern Hall"); Vestibules are numbered separately, with the First Vestibule as origin.
- Explored extents: Western ≥ 960, Northern ≥ 890, Southern ≥ 768. No sign of an edge.
- East of the First Vestibule is **derelict**: collapsed floors, ceilings and walls, grey
  light shafts, rubble.
- Roughly 40–50 halls east of the First Vestibule form the **Drowned Halls**: freshwater
  lakes, white water lilies, unusually silent, deep and treacherous in the middle.

**Statues** (L71–99, L233–245, L499, L525–559, L839–873, L1169, and more to extract)
- Every hall, vestibule, stair and passage has statues. Hundreds to a thousand per big
  room, in tiers, up the walls. A few deliberate **absences**: an empty plinth, niche,
  apse, or bare wall patch.
- Size is roughly uniform within a hall but varies between halls: shoulder-high,
  life-size, 2–3× human, and 15–20 m in the Drowned Halls.
- Mood is regional. Most halls are joyful, tranquil, or serenely distant. One upper hall
  is all violence (centaurs, octopuses, anguished faces). One hall is a moon-gazing crowd.
- Condition depends on exposure: seaweed rags and shellfish crust where tides reach,
  clean where dry, water-worn where falls splash, shattered where the floor has gone.
- Named statues so far: Woman with Beehive (Ninth Vestibule, west wall, 15 m up, bees
  thumb-sized, one on her left eye), Faun with finger to lips (door between 5th and 4th
  N-W Halls), Gorilla (Fifth Northern Hall), Boy with cymbals, Elephant carrying a castle,
  Two Kings playing chess, Horned Giants (pair, ≈6 m, flanking the east door of the First
  Western Hall), Gardener, Angel blowing trumpet, Ship on little waves, Man reading a big
  book, Woman with a dish showing clouds, Child with curls looking at a flower, Sack of
  grain eaten by mice, Hierophant (19th Southern Hall), Angel caught on a rose bush
  (2nd Northern Hall, NE corner), Dog-fox with an audience of squirrels and satyrs (4th
  Western Hall, NW corner), Old man with a ship model and Winged horse with colt (1st
  Northern Hall), Shepherdess with lamb, Man and boy mapping stars, Woman giving a bear
  cub a dish, Eight Minotaurs (First Vestibule, ≈9 m, each different), the Trampled Man
  and Centaur, curly-bearded giants straining out of the walls of the Drowned Halls
  (one's back makes a fishing platform), a Crowd with a young man holding a banner.
- No modern objects, no named real people. Subjects are classical, allegorical,
  mythological, animals, trades.

**Tides** (L69–81, L105, L481–485)
- Distinct named tides come from different regions, each with its own character: the
  far-eastern tide is colourless and shallow; the western one is loud, pewter-grey with
  bone-white foam; the northern one is ice-white and glittering. Some tides are rich in
  fish and some are clean and empty.
- They fill vestibules from the lower halls up the staircases. They roar, the walls
  vibrate, and being submerged gives a sudden silence. The three-tide join at the Ninth
  Vestibule happens once every eight years.
- Tides move debris, such as a marble finger from some other statue.
- Storms from the west drive fish away.

**Weather** (L455–461, L493, L513)
- Clouds sit in the Upper Halls and drift into the Middle Halls through broken ceilings.
  Cloud makes things grey, cold, quiet and hides statues. Wind clears it. Lightning
  lights whole window rows. Rain falls in vestibules and runs down walls in streams.

**Life**
- Birds (sparrows, rooks, gulls, albatrosses, a buzzard) whose flocks perch on particular
  statues. Gulls nest in the 88th Western Hall. Evening murmurations in the 17th
  Vestibule, late in the year. Fish, lobsters, crustaceans, mussels, seaweed, water lilies.
  One monkey skeleton, no live monkeys.

**Ambiguities to settle** (these are decisions, not bugs)
- ~~Hall pitch~~ **Resolved**: the book is right everywhere, so hall size varies by region
  (≈105 m per hall on the long western run, ≈225 m on the shorter run). Size is a
  per-region property in the layout, and the canon records both measurements as tests.
- Exactly how hall ordinals count in the diagonal sectors. The Dog-Fox directions at
  L1199–1203 are a worked example and become a unit test.
- Length of a game day and "the Year" at `timeScale = 1` (see decisions).

**Proposed in/out of scope**
- In: all of the above, plus the skeletal Dead as quiet landmarks (bones on plinths and
  in niches). **On by default**; visitors can turn it off with the `showDead` config toggle.
- **Setting (decided)**: the experience is set *before* the events of the book. All
  character pieces are out: the other inhabitant, the visitors, the ritual, the journals,
  the gifts, the story's Flood trap, their messages and items, and the real-world scenes.
- In as rare opt-in packs (see `design/packs.yaml`): `outside_traces` (a draught, smell,
  muffled sounds or a stray wrapper hinting at an outside; very rare, never explained) and
  `visitor_marks` (visitors leave preset chalk marks and pebble patterns).

## 3. Architecture

```
          ┌────────────────────────────── canon/*.yaml ──────────────┐
          │ hand-authored facts + source line refs + confidence      │
          └──────────────┬───────────────────────────────────────────┘
                         ▼
 seed ──► world/  (pure, integer-only hashing, versioned)
          ├ rng.ts        sfc32 / hash(seed, x, y, level, salt)
          ├ layout.ts     hall graph, doors, naming, levels, derelict/drowned zones
          ├ statues.ts    subject catalogue → placed Statue records
          └ canon.ts      overrides + invariants
                         ▼
 time ──► sim/   tide(), weather(), light(), moon()   (pure of seed + UTC)
                         ▼
                 SceneState  ◄── net/ (Yjs awareness + shared items; peers appear here)
        ┌────────┬───────┴────────┬────────────┬────────┐
        ▼        ▼                ▼            ▼        ▼
     text/    audio/            map/        side/        view3d/
   (parser +  (Web Audio,      (2D canvas, (2D parallax (three.js,
   narrator)  procedural)      fog of war) side-scroller) etching look)
```

**Stack**: TypeScript, Vite, vanilla DOM or Preact for UI. Vitest and fast-check for
invariants. Playwright smoke test. GitHub Actions → `actions/deploy-pages`. Vite `base`
set to `/piranesi-house/`. No backend.

**Determinism rules** (the bit that bites later)
- Integer hashing only. No `Math.random`, no float-dependent branching in the generator.
- Every generated record is keyed by a stable path ID, e.g.
  `h:W4/s:N/t:3/k:17` (hall, wall, tier, slot). Never by creation order.
- `worldVersion` is part of every hash. Changing generator behaviour means bumping the
  version, and a golden-snapshot test fails until you do it on purpose.
- Share links carry `#seed=…&v=1`.

## 4. Keeping the statues consistent

A statue is one record, and everything else renders from it:

```ts
Statue { id, hall, wall, tier, slot, subjectId, scale, pose, mood,
         attributes[], condition{ seaweed, shellfish, moss, waterwear, broken },
         perchedBy?: birdFlock }
```

- **Subject catalogue** (`canon/subjects.yaml`): each subject has tags (industry,
  innocence, violence, crowd, beasts, craft…), mood, allowed sizes, required attributes
  ("beehive with marble bees; one bee on left eye"), and forbidden contexts.
- **Hall character** is chosen first (size class, mood, theme, crowd or individuals), and
  statues are drawn from the catalogue conditioned on it. This reproduces "uniform within
  a hall, varied between halls".
- **Condition** is derived from tide reach and water exposure, not rolled independently.
  A statue at 3 m in a flooded hall is crusted; the same subject 20 m up is clean.
- **Canon statues** are pinned to stable anchors ("Ninth Vestibule, west wall, ~15 m") and
  override generation. The generator then avoids duplicating unique canon pieces.
- **One describer**: `describe(statue, viewpoint)` is the single source for text. The 3D
  mesh builder and the bird-perching logic read the same record.
- **Tests** (the real answer to "in all respects"):
  1. *Canon assertions*: every extracted fact is a test with its line reference.
  2. *Golden snapshot*: hashes for a fixed set of halls, so accidental drift is loud.
  3. *Property tests* over thousands of random halls: uniform size within a hall, no modern
     subjects, absences present at the expected rate, condition consistent with water
     exposure, all four walls populated.
  4. *Route tests*: the Dog-Fox directions must actually navigate in our layout.
  5. *Cross-renderer test*: text and 3D builders produce the same statue list for a hall.
- **Canon coverage report** in CI: which extracted facts have tests, which don't.

## 5. Soundscape

Fully procedural Web Audio, no sample library, so no licensing and a tiny download. An
audio director reads `SceneState` and fades layers in and out.

| Layer | Driven by |
|---|---|
| Sea bed (filtered noise, slow swell) | nearest lower hall's tide level, loudest near stairs and vestibules |
| Tide events: distant rumble → clap → wall vibration → drowned silence (low-passed everything) | tide arrival time at your vestibule, one per named tide, each with its own timbre (pewter, glittering, thin) |
| Drips and falls (granular), streams on stairs | fresh-water falls in the hall, rain level |
| Wind and cloud (low-passed, close reverb) | weather, and whether the ceiling is broken |
| Reverb | convolution IR generated from hall dimensions and marble; Drowned Halls dry and hushed |
| Birds | region, season, hour; gull colonies; albatross clack; evening murmuration; and silence when cloud-chilled |
| Footsteps | surface: marble, wet, rubble, shallow water, stair |
| Neighbours through doors | portal model: sounds from adjacent halls arrive from the door's direction, low-passed by distance |
| Other players | footsteps and optional proximity voice, attenuated by hall-graph distance |

Notes: audio needs a user gesture to start (a "Enter the House" button). HRTF panning is
used for point sources. Everything is parameterised from the same seed, so two people
standing in the same hall hear the same ambience.

## 6. Text adventure

- Verb–noun parser plus **always-visible clickable exits and nouns**, so mobile works and
  nobody has to guess verbs. It doubles as a screen-reader-friendly mode.
- Narrator is template and grammar based (Tracery-style), seeded per hall, reading
  structured data only. **All prose is our own**, never the book's sentences.
- Verbs: go/climb/descend, look, examine <statue>, listen, wait, fish and gather (ambient
  flavour only), rest, map, share location.
- Optional "Capitalised Nouns" diary voice as a style toggle.

## 7. Visualisations (ladder, cheapest first)

1. **Schematic map**: 2D canvas, fog of war (per player, ephemeral), level slider, live
   tide shading.
2. **Cutaway section**: three-level cross-section showing water, cloud and your height.
3. **Side-scroller (2D)**: you walk along one wall of a hall and across doors into the
   next, with parallax depth layers (far wall, near pillars, windows with sky and stars).
   Tiers of statues rise up the wall; stairs and ladders-of-masonry let you climb. The tide
   rises visibly up the lower tiers and over the pavement; cloud drifts in at the top;
   rain streaks down walls; birds perch on the right statues. Other players appear as
   figures in the same strip. This is the intermediate step before 3D because:
   - it needs the same **statue sprite pipeline** (generate an etched 2D figure from
     `subject + pose + attributes + condition`), which 3D later extrapolates from;
   - it exercises the SceneState → renderer contract with a real-time animated view;
   - it is cheap to run on phones (Canvas 2D or PixiJS, no WebGL requirement).
   Statues beyond the canon set start as stylised silhouettes and are upgraded over time.
4. **First-person 3D** (three.js): box halls with instanced tiers. The honest cost is
   statues. Plan a fidelity ladder: (a) etched relief cards generated on canvas (shared with the side-scroller),
   (b) parametric low-poly figures from pose and attributes, (c) a library of ~100
   glTF canon subjects later. A hatching or etching post-process, in the spirit of the
   real Piranesi prints, hides a lot of low-poly sins and suits the setting.

## 8. Multiplayer (ephemeral)

- **Shared automatically**: seed, version, tide clock. These are pure functions, so there is
  nothing to sync.
- **Yjs doc, in memory only** (no y-indexeddb): presence and position via Awareness; a
  `Y.Map` of movable items (offerings, bones relocated, chalk marks, notes), last-writer-wins.
  Items can be given a TTL and swept away by tides, which is thematic and bounds memory.
- **Room name** = hash(seed, worldVersion), so everyone on the same seed meets.
- **Memory indicator**: "The House remembers while 3 people are here." Late joiners are
  filled in by any current peer.
- **Signalling is the weak point on static hosting.** `y-webrtc` expects a signalling
  server, and the public demo ones should not be relied on. Options, best first:
  1. **Trystero** (WebRTC signalled over BitTorrent trackers, Nostr relays or MQTT; built
     for static sites), bridged to Yjs with a small provider.
  2. PeerJS public broker (free, but a third-party dependency).
  3. Manual copy-paste offer/answer (zero infrastructure, clunky; good fallback).
  4. A tiny Cloudflare Worker signaller (not on Pages, but free and tiny; only if 1–3 fail).
  Plan a one-day spike to confirm which of these is actually healthy today.
- Caveats to state in the UI: peers see each other's IP via WebRTC, and some NATs need a
  TURN relay that we won't have.

## 9. Milestones

| # | Deliverable | Done when |
|---|---|---|
| 0 | **Canon extraction** (DRAFT v1 in `canon/`: full pass over Parts 1-4 and 6 done, awaiting your review): full read of the book into `canon/*.yaml` (places, statues, tides, weather, sounds, light, creatures, rules), each with line refs and an in/out-of-scope tag | you have reviewed and signed off the canon |
| 1 | **World core** (layout, pins for the book's relative positions, halls, statues, canon overlay, CLI and 111 tests done; see `design/layout-decisions.md` for the remaining deviations): rng, layout and naming, statue generator, canon overlay, full test suite, CLI to print a hall | invariants and golden tests green; Dog-Fox route works |
| 2 | **Sim** (DONE: clock, sun, moon, eight tide sources, great join, weather, light, birds, SceneState; see `design/simulation.md`) | tide join at the Ninth Vestibule is computable and tested |
| 3 | **Playable text + audio v1** (DONE: parser, narrator, live events, procedural Web Audio, web page, browser test, Pages workflow; see `design/audio.md`): parser, narrator, sea bed, reverb, drips, wind, birds, footsteps; Pages deploy | someone can wander and *hear* the difference between a Drowned Hall and a flooded vestibule |
| 4 | **Map + audio v2** (DONE: fog-of-war map, doorway sounds with direction, tides heard before seen; see `design/map.md`) | tide arrival is audible before it is visible |
| 4b | **Earlier visitors and outside traces** (DONE: very rare relics already in the world, with a private list of what you have noticed; rare draughts, almost-voices and the skitter of a wrapper from the First Vestibule's south-east corner; see `design/relics-and-outside.md`) | the First Vestibule shows what was left behind; an outside hint can be heard in a real browser |
| 4c | **Narration and wander** (DONE): an opt-in setting reads each description aloud with the browser's own speech voices (voice and speed choosable), and a Wander button / `wander` command walks the House for ever on its own, describing, listening, looking at statues and taking stairs, until the visitor types or presses it again | narration off by default; wander never stops by itself; `design/narration-and-wander.md` |
| 4d | **A far wider cast of statues** (DONE): about 1,100 figures in 16 themes (trades, people of every station, creatures, gods and monsters, fables, vehicles, weapons, tools, buildings; classical era only), with wording that fits each kind; `WORLD_VERSION` 2 (statues only) | `design/figures.md`; `tests/figures.test.ts` |
| 4e | **Getting about** (DONE): travel by name to any hall, home, straight runs (`travel west 40`), private marks, approach a statue, and "Travel here" on the map; real walking time throughout | `design/travel.md`; `tests/travel.test.ts` |
| 5 | **Read the unread book sections properly** (DONE): a careful, complete reading of Part 5 and the unread middle of Part 7 (everything so far was searched, not read). Fold anything new into `canon/` (places, statues, sounds, rules), add or adjust tests, record what the reading found. | `canon/README.md` coverage reads "read in full" for every part, and nothing new is left unrecorded |
| 6 | **Mutter** (DONE): the occasional incoherent murmur of the visitor's character, generated only from our own writing, through the hall's reverb (see `design/mutter.yaml`); toggle on by default | it can be heard in different halls with different reverb, and turned off |
| 7 | **Side-scroller view** (NEXT): walking strip with parallax, tiers, tide/cloud/rain, perched birds, and the statue sprite pipeline | same statue list and tide level as the text view, at the same moment |
| 8 | **Multiplayer**: spike to find a working signalling method for a static site, then presence and other visitors' footsteps and sounds, then **inventory** (random starting kit, take, drop, give) and **visitor marks** (preset chalk and pebble messages that need chalk or pebbles), all shared and ephemeral under the witness rule; relics become pick-up-able here; other visitors appear in the side-scroller | two browsers on different networks meet, marks and dropped items are seen by both, and all of it vanishes when both close |
| 9 | **3D view**, fidelity step (a) reusing the sprite pipeline, then (b) | same statue list as text and side views |
| 10 | **Polish**: accessibility, mobile, PWA offline, performance budget, credits and fan-work notice | a checklist written at the start |
## 10. Risks

- **Canon fidelity** depends on a full, careful extraction. Budget real time for M0.
- **Determinism drift** from careless generator edits (mitigated by golden tests and
  `worldVersion`).
- **Statue fidelity** is the largest visual cost sink. The etched look is the mitigation, and the side-scroller gives us the sprite pipeline cheaply before 3D.
- **P2P reliability** with no server: be prepared to ship single-player first.
- **IP**: the book is in copyright and its text must never be committed. Enforced by
  `.gitignore`, `scripts/check-no-source-text.sh` (run as a pre-commit hook via
  `git config core.hooksPath .githooks`, and in CI). Keep the source file outside the repo
  directory entirely. Store only our own paraphrased facts and short descriptive labels, write
  all narration originally, and credit the work as an unofficial fan project. This is a
  consideration, not legal advice.

## 11. Decisions (resolved)

1. **The Dead**: included, on by default, with a config toggle (`showDead`) to turn them off. When
   off, those niches and plinths are generated as ordinary Absences, so the world layout
   does not change, only what occupies the spots.
2. **Time**: real-time by default, with a config option `timeScale` (1 = real time, 60 =
   one minute per second, and so on). Because the eight-year three-tide join is
   effectively unwitnessable at 1×, add a `?t=` / time-scrub override for demos and tests.
   In multiplayer the room's `timeScale` is set by whoever created it, and travels with
   the room.
3. **Hall size**: varies by region, per the book (see section 2).
4. **Views**: start with the etched, stylised look. Realism, if wanted later, is added as
   another view, which the SceneState architecture already allows.
5. **Visibility**: public repo, served from its own GitHub Pages domain. Still no source
   text, and the credit and fan-work notice ships in v1. Still to pick: a code licence
   (suggest MIT or similar for code; canon data and generated output under the same terms,
   with the book itself excluded).

6. **Setting and story material**: set before the book's events; no characters. The House
   appears as it does at the start of the book (after the North-East ceiling collapse). Rare
   outside hints and visitor-left marks are allowed. Marks use fixed presets only (no free
   text) for legal and safety reasons.
7. **Visitor inventory**: each visit starts with a small random kit (3-5 stacks, capacity 6)
   that visitors can drop, pick up and give. Chalk and pebbles must be carried or collected
   to be used, which is the natural limit on marks. Marks and dropped items follow a
   witness rule: a hall's shared state exists only while a connected visitor who has seen
   that hall carries it. See `design/inventory.yaml` and `design/packs.yaml`.
8. **Previous visitors**: the initial world state contains very rare, anonymous leftovers
   (litter and a sleeping bag near the First Vestibule, torn scraps in the 88th Western
   Hall's gull nests, faded chalk marks on doorframes, a damp note now and then). Placed
   deterministically from the seed. Any wording is our own and always partly illegible.
9. **Mutter**: milestone 6, after the unread book sections are properly read. When built it must run through Web Audio so it gets
   reverb and effects, generated only from our own corpus, with a toggle (`mutter`).

### Config (draft)
`seed`, `worldVersion`, `timeScale`, `showDead`, `packs.outsideTraces`, `packs.visitorMarks`, `packs.previousVisitors`, `relicDensity`, `inventory`, `audio.master`, `view` (`text` | `map` |
`3d`), `multiplayer` (`off` | `on`), `roomName`.
