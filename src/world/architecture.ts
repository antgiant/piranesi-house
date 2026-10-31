// The catalogue of architectural flourishes: the strange, enormous and beautiful things a great imagined building does
// above its statues, in the manner of the eighteenth-century etchers of impossible halls and ruined cities. Wording is ours;
// everything is peaceful: stone, timber, iron and water that have stood a very long time, and what has grown on them.
//
// A definition is a family, a weight, a height (as a fraction of the hall's) and a few variants. A variant is
// [what you see when looking around, what you notice in passing]. Placeholders: {w} the wall ("north"), {y} the height up the wall
// ("16 metres"), {h} the hall's height ("30 metres"), {n} a count.

import type { Level } from './layout';

export type Family =
  | 'stairs' | 'bridge' | 'opening' | 'vault' | 'support' | 'surface' | 'machine' | 'water' | 'nature' | 'light' | 'object' | 'floor';

export interface Def {
  id: string;
  fam: Family;
  weight: number;
  /** Height of it on the wall as a fraction of the hall (0 = floor level, 1 = at the vault). */
  at: number;
  minH?: number;
  /** Only in these levels (default: all). */
  levels?: readonly Level[];
  /** Count range for {n}. */
  n?: readonly [number, number];
  v: readonly (readonly [string, string])[];
}

const d = (id: string, fam: Family, weight: number, at: number, v: readonly (readonly [string, string])[], extra: Partial<Def> = {}): Def => ({ id, fam, weight, at, v, ...extra });

export const DEFS: readonly Def[] = [
  // --- stairs: rare on purpose; only some halls have one at all, never a vestibule (it has real stairs) -------------------------
  d('stair-nowhere', 'stairs', 10, 0.5, [
    ['A flight of stone steps climbs the {w} wall without a rail, rising {y}, and stops against blank masonry.', 'a stair on the {w} wall that climbs without a rail and ends in the stone'],
    ['Steps without a rail climb the {w} wall in a long diagonal, turn once, and end at a plain wall {y} above the floor.', 'steps going up the {w} wall to nowhere'],
  ]),
  d('spiral-stair', 'stairs', 8, 0.5, [
    ['A spiral stair winds round a great pier near the {w} wall, up past {n} landings, each with its own arched door.', 'a spiral stair coiling up round a pier, door after door'],
    ['Round one pier a stone stair coils upward, landing after landing, each landing leading to a door of its own.', 'a stone stair winding round a great pier'],
  ], { n: [3, 9] }),
  d('crossing-stairs', 'stairs', 6, 0.5, [
    ['Two flights of stairs cross the {w} wall at different slants, each reaching the other\'s landing, and neither, so far as you can tell, reaching the floor.', 'two stairs crossing, each leading to the other\'s landing'],
  ]),
  d('long-stair', 'stairs', 5, 0.7, [
    ['On the {w} wall a staircase climbs {y} in one unbroken flight, so steep and so long that the top is a dark slit in the distance.', 'one very long stair climbing into the dark'],
  ], { minH: 40 }),
  d('pegs-stair', 'stairs', 4, 0.5, [
    ['A ladder of stone pegs is set in the {w} wall, one above another, climbing {y} to a small round door.', 'a ladder of stone pegs going up the wall to a little round door'],
  ]),
  d('hanging-stair', 'stairs', 4, 0.6, [
    ['A stair hangs down from a hole in the vault along the {w} wall and ends in the air, a long way above the floor.', 'a stair hanging down out of the vault and stopping in mid-air'],
  ], { minH: 30 }),
  d('stair-in-wall', 'stairs', 5, 0.4, [
    ['A narrow stair is cut into the thickness of the {w} wall; you can see its slanting row of tiny windows from here, climbing {y}.', 'a row of slit windows climbing the wall where a stair runs inside it'],
  ]),
  d('stair-of-statues', 'stairs', 3, 0.5, [
    ['Each step of a wide stair on the {w} wall carries a small stone figure at its end, so that a hundred of them climb together toward a landing you cannot make out.', 'a wide stair with a small stone figure at the end of every step'],
  ]),
  d('double-helix', 'stairs', 3, 0.5, [
    ['Two stairs wind up round the same pier, one right-handed and one left, so close that those climbing could shake hands and never meet.', 'a double stair winding up one pier, its two flights never meeting'],
  ], { minH: 36 }),

  // --- bridges ---------------------------------------------------------------------------------------------------------------
  d('bridge', 'bridge', 12, 0.55, [
    ['A stone bridge with no parapet crosses the hall from one gallery to the other, {y} above the floor, so slender that it seems to hang in the air.', 'a railless stone bridge crossing high overhead'],
    ['High over the floor a bridge of cut stone spans the hall, flat and railless, joining two galleries in the {w} and opposite walls.', 'a long stone bridge thrown across the hall, far above'],
  ]),
  d('catwalk', 'bridge', 8, 0.6, [
    ['A timber walkway hangs by iron chains from the vault, swaying very slightly in no wind, {y} up along the {w} wall.', 'a plank walkway slung from chains along the {w} wall'],
    ['Along the {w} wall, a plank walkway is slung from chains thick as a man\'s arm; the boards are black with age.', 'a hanging gallery of black planks, chained to the vault'],
  ], { minH: 28 }),
  d('rope-bridge', 'bridge', 4, 0.6, [
    ['A bridge of rope and plank sags from the {w} wall to a pier in the middle of the hall, its ropes grey and furred and quite sound.', 'a rope bridge sagging across the hall'],
  ]),
  d('hump-bridge', 'bridge', 5, 0.5, [
    ['A hump-backed bridge of a single great arch crosses the hall high up, its crown carrying a small stone seat.', 'a high hump-backed bridge with a stone seat at the crown'],
  ]),
  d('bridge-chapel', 'bridge', 3, 0.55, [
    ['In the middle of a high bridge stands a small stone chapel, its door open and its single window dark, as though the bridge had grown a house.', 'a little chapel built on the middle of a high bridge'],
  ], { minH: 30 }),
  d('broken-bridge', 'bridge', 5, 0.55, [
    ['A bridge leaves the {w} wall at {y} and stops, in the middle of the air, with clean broken ends.', 'a bridge that stops in the middle of the air'],
  ]),
  d('twin-bridges', 'bridge', 4, 0.5, [
    ['Two bridges cross the hall at different heights, one directly above the other, and a thin stone stair links them by a hole in the upper one.', 'two bridges, one above the other, crossing in the dark'],
  ], { minH: 34 }),
  d('tower-bridge', 'bridge', 3, 0.65, [
    ['A narrow bridge joins two slender towers that stand against the {w} wall, with a gate in the middle of its span.', 'a bridge between two towers, with a gate halfway across'],
  ], { minH: 32 }),

  // --- openings ---------------------------------------------------------------------------------------------------------------
  d('arches-receding', 'opening', 10, 0.35, [
    ['In the {w} wall one great arch opens behind another, {n} of them, each smaller than the last, until the farthest is a dark point you cannot judge the distance to.', 'the arches in the {w} wall, opening one behind another until they are lost'],
    ['An arch in the {w} wall frames a second arch, and that a third; you count {n} before the light gives out.', 'a {w}-wall arch that frames arch after arch into the dark'],
  ], { n: [4, 8] }),
  d('vaulted-passage', 'opening', 6, 0.2, [
    ['A vaulted passage opens in the {w} wall, and in it a smaller vaulted passage, and in that a smaller; the floor of each is a few steps higher than the last.', 'passages within passages, each a few steps higher than the last'],
  ]),
  d('door-too-high', 'opening', 6, 0.65, [
    ['A handsome doorway with a carved lintel opens in the {w} wall {y} above the floor, with no stair, ledge or ladder to it.', 'a doorway high in the wall with no way up to it'],
    ['High in the {w} wall is a pair of tall doors, closed, with worn steps beneath them that stop ten metres short of the floor.', 'tall doors far above the floor, with steps that stop short'],
  ]),
  d('oculi', 'opening', 6, 0.8, [
    ['A row of round windows runs along the top of the {w} wall, each the width of a cart, each with a different pattern of stone bars.', 'a row of round windows high in the wall, no two barred alike'],
  ]),
  d('blind-doors', 'opening', 6, 0.1, [
    ['Doors are carved in the {w} wall that open on nothing: handles, hinges and keyholes cut in the solid stone, and the door itself a shallow panel.', 'carved doors in the stone that open on nothing'],
  ]),
  d('small-door', 'opening', 6, 0.05, [
    ['Between two great piers a small plain door, no higher than your chest, is set at floor level in the {w} wall, half hidden by a drift of old leaves of stone.', 'a very small door at floor level, half hidden'],
  ]),
  d('giant-doors', 'opening', 5, 0.3, [
    ['A pair of doors three times the height of a statue stands shut in the {w} wall, bound in iron, with rings on them that no hand could circle.', 'a pair of vast shut doors bound in iron'],
  ], { minH: 30 }),
  d('serliana', 'opening', 4, 0.4, [
    ['A tall window in the {w} wall is divided into three: a wide arched light between two narrow square ones, set in a frame of fluted pilasters.', 'a triple window in the wall, its middle light arched'],
  ]),
  d('blind-arcade', 'opening', 6, 0.5, [
    ['A blind arcade of {n} arches runs along the {w} wall, every arch filled in with stone and each filling carved with a different small scene.', 'a blind arcade, every arch filled with its own small carved scene'],
  ], { n: [8, 24] }),
  d('grated-openings', 'opening', 5, 0.15, [
    ['Low openings in the {w} wall are closed with iron grates, and behind each there is a faint glimmer, as of water or of lamps.', 'low iron-grated openings with a glimmer behind them'],
  ]),
  d('floor-well-opening', 'opening', 3, 0, [
    ['A round opening, wide as a room, is cut in the floor near the {w} wall, ringed by a low parapet; the dark below it has no sound.', 'a round opening in the floor, ringed by a low wall'],
  ]),
  d('tunnel-mouths', 'opening', 4, 0.25, [
    ['Dark mouths of tunnels open in the {w} wall at different heights, each one with a small landing, none with a way to reach it.', 'tunnel mouths at all heights in the wall'],
  ]),

  // --- vaults and ceilings ------------------------------------------------------------------------------------------------------
  d('coffered-vault', 'vault', 8, 1, [
    ['The vault overhead is coffered in deep square panels, each with a rosette, every rosette different, and a single round opening at the crown lets in a shaft of light.', 'the coffered vault with its round opening of light'],
    ['The ceiling is a field of sunken square panels, shrinking toward a round eye in the middle through which a column of paler air descends.', 'the sunken panels of the ceiling, each rosette different'],
  ]),
  d('groin-vault', 'vault', 7, 1, [
    ['The ceiling is a lattice of groined vaults, each crossing of the ribs marked by a carved boss, and the bosses are all faces.', 'a ceiling of crossing ribs, each crossing a carved face'],
  ]),
  d('barrel-vault-ribs', 'vault', 6, 1, [
    ['A long barrel vault runs the length of the hall, ribbed with arches every few metres, so that it looks like the inside of a great animal.', 'a long ribbed vault like the inside of a great animal'],
  ]),
  d('dome-oculus', 'vault', 6, 1, [
    ['Above the middle of the hall a shallow dome rests on the walls, with a round window at its crown, and all the sound in the hall seems to gather under it.', 'a shallow dome with a round window at its crown'],
  ], { minH: 28 }),
  d('beam-ceiling', 'vault', 5, 1, [
    ['The ceiling is a grid of timbers, each as thick as a tree, laid crosswise in layers and furred with dust and the nests of birds.', 'a ceiling of great crossing timbers'],
  ]),
  d('chains-from-vault', 'vault', 5, 0.9, [
    ['From the vault hang a thousand fine chains, each ending, a long way above the floor, in nothing at all, and they stir when you speak.', 'a thousand fine chains hanging from the vault, each ending in nothing'],
  ], { minH: 30 }),
  d('fallen-vault', 'vault', 4, 1, [
    ['A part of the vault has fallen, leaving a ragged mouth through which you can see the underside of the floor above, and its own carved ceiling, as though the building went on in layers.', 'a break in the vault through which more rooms can be seen'],
  ]),
  d('hanging-bosses', 'vault', 4, 0.95, [
    ['Great carved pendants hang from the vault like stone fruit, each as big as a room, and each cut with small leaves.', 'huge carved pendants hanging from the vault like fruit'],
  ], { minH: 30 }),

  // --- supports ---------------------------------------------------------------------------------------------------------------
  d('colossal-pier', 'support', 8, 0.3, [
    ['A pier in the {w} wall is as wide as a farmhouse, and carries on its face a smaller arch with a smaller pier within it, and so on inward.', 'a pier as big as a house'],
    ['The {w} wall is carried on piers so massive that each one has a stair and a room cut inside it.', 'one of the colossal piers, with a stair and a room inside it'],
  ]),
  d('colonnade', 'support', 8, 0.2, [
    ['A colonnade of {n} columns marches along the {w} wall in front of the statues and out of sight, each shaft a little different in its fluting.', 'a long colonnade, column after column'],
  ], { n: [12, 40] }),
  d('flying-arches', 'support', 6, 0.7, [
    ['Bare arches leap across the hall like ribs, from the {w} wall to the opposite one, bracing the building; birds go in and out between them.', 'bare arches leaping across the hall overhead like ribs'],
  ]),
  d('buttresses', 'support', 5, 0.4, [
    ['Buttresses step out from the {w} wall one beyond another, each carrying the next, until the last stands apart in the middle of the floor holding up nothing.', 'buttresses stepping out from the wall, the last holding up nothing'],
  ]),
  d('caryatid-order', 'support', 5, 0.35, [
    ['The entablature on the {w} wall is carried by a row of carved figures in place of columns, every one bearing its weight on a different shoulder.', 'a row of carved figures bearing the cornice on their shoulders'],
  ]),
  d('spiral-column', 'support', 5, 0.5, [
    ['A column covered with a band of carving winds up in a spiral from foot to capital; the tiny figures on it climb and climb and never reach the top.', 'a column with a spiral band of tiny climbing figures'],
  ]),
  d('lone-column', 'support', 6, 0.5, [
    ['One column stands alone in the middle of the floor, enormous, supporting nothing, with a worn plinth and a capital that has been cut for something long gone.', 'a single great column standing alone'],
  ]),
  d('slender-pier-arch', 'support', 4, 0.5, [
    ['A great arch rests on a single pier so slender that you would not trust it with a roof; it has held a roof for as long as anyone knows.', 'a huge arch resting on one slender pier'],
  ]),
  d('corbels', 'support', 5, 0.6, [
    ['Huge brackets of carved stone jut from the {w} wall in a line, each cut as a head or a beast, each carrying nothing now but a little shadow.', 'a row of enormous carved brackets, carrying nothing'],
  ]),
  d('leaning-piers', 'support', 3, 0.3, [
    ['The piers on the {w} side lean a little outward, all at the same angle, with their arches following, in a way that is somehow more steady than if they stood straight.', 'a row of piers all leaning gently the same way'],
  ]),
  d('screen-columns', 'support', 5, 0.3, [
    ['A screen of paired columns stands a few paces in front of the {w} wall, so that a second hall seems to lie behind it, darker than this one.', 'a screen of paired columns with a darker hall behind'],
  ]),

  // --- surfaces and carved decoration ---------------------------------------------------------------------------------------------
  d('inscription', 'surface', 8, 0.8, [
    ['A band of tall capital letters runs along the {w} wall above the tiers; the stone is so worn that the letters are shallow furrows, and the line goes on beyond reading.', 'a long band of lettering worn past reading'],
    ['Lettering as tall as a person is cut into a long panel high on the {w} wall; wind and damp have taken it, so that only the shape of the words is left.', 'tall letters on the wall, worn to furrows'],
  ]),
  d('trophies', 'surface', 6, 0.5, [
    ['Over the doors on the {w} wall, stone trophies are carved in relief: helmets, shields, standards and bundles of spears, heaped as if after a triumph, and weathered smooth.', 'carved heaps of helmets and banners in stone above a doorway'],
    ['Carved in the stone above the {w} doors are heaps of arms and banners, crowns and laurel, rubbed soft by time.', 'carved heaps of arms and banners above a door'],
  ]),
  d('procession-frieze', 'surface', 6, 0.55, [
    ['A frieze runs the length of the {w} wall in low relief: a procession of tiny figures with banners and animals and carts, walking, walking, and never arriving.', 'a long carved procession of tiny figures, always walking'],
  ]),
  d('city-relief', 'surface', 4, 0.5, [
    ['A great relief on the {w} wall shows a walled city seen from above, every roof and street carved; some of the streets are worn bright, as if touched.', 'a huge relief of a walled city seen from above'],
  ]),
  d('map-wall', 'surface', 4, 0.5, [
    ['A map is cut into the {w} wall, with coasts and mountains and lines that might be roads, and a sea with no coast at all in one corner.', 'a stone map of places that may not exist'],
  ]),
  d('zodiac-band', 'surface', 4, 0.8, [
    ['A circle of carved signs runs round the top of the hall, beasts and scales and twins, and between them a ring of small stars cut deep.', 'a circle of carved star-signs around the top of the hall'],
  ]),
  d('name-tablets', 'surface', 5, 0.4, [
    ['Rows of stone tablets are let into the {w} wall, each cut with a long list of short lines; the letters are still sharp, but they are in no alphabet you know.', 'rows of tablets cut with long lists in a strange script'],
  ]),
  d('rosettes', 'surface', 6, 0.9, [
    ['A band of rosettes runs along the {w} wall, one after another, and each rosette has a different number of petals.', 'a band of carved rosettes, no two alike'],
  ]),
  d('egg-dart', 'surface', 6, 0.75, [
    ['The cornice of the {w} wall is carved in the egg-and-dart of old buildings; the eggs are as big as heads and some are chipped as though they have hatched.', 'a cornice of huge carved eggs and darts'],
  ]),
  d('sundial-wall', 'surface', 3, 0.6, [
    ['A great sundial is cut into the {w} wall, its lines radiating over many square metres; its iron pointer is bent, and a thread of light touches it for a little while each day.', 'a vast sundial on the wall, its pointer bent'],
  ]),
  d('carved-curtain', 'surface', 4, 0.5, [
    ['The {w} wall carries a carved curtain, a great swag of stone cloth drawn back at one side, and behind it a smooth blank panel as though something had been hidden there.', 'a carved stone curtain drawn back from a blank panel'],
  ]),
  d('arms-worn', 'surface', 5, 0.7, [
    ['A great coat of arms hangs over the {w} wall, shield, beasts and crest, worn so smooth that all that is certain is that there were animals.', 'a great coat of arms rubbed smooth'],
  ]),
  d('relief-sea', 'surface', 4, 0.55, [
    ['The {w} wall is carved with a sea of stone waves, ships riding it, and gods and sea-beasts among them, the waves so deep that real shadows pool in their troughs.', 'a wall carved into a sea, with ships on it'],
  ]),

  // --- machines and gear ----------------------------------------------------------------------------------------------------------
  d('great-wheel', 'machine', 4, 0.5, [
    ['Half hidden in the shadow of the {w} wall stands a wooden wheel taller than a house, its spokes as stout as pillars and its rim furred with dust. It has plainly not turned in centuries.', 'a huge wooden wheel in the shadow of the {w} wall, still for centuries'],
  ], { minH: 30 }),
  d('ropes-pulleys', 'machine', 8, 0.5, [
    ['Ropes as thick as a thigh run up the {w} wall through iron-bound pulley blocks and vanish into the vault; they are stiff with age and nothing pulls on them.', 'ropes and pulley blocks, stiff and unmoving, running up into the vault'],
    ['Heavy pulley blocks hang from the {w} wall on chains, their ropes looped over great wooden beams and left, long ago, exactly as they were.', 'great iron-bound blocks hanging on chains from a beam'],
  ]),
  d('iron-rings', 'machine', 6, 0.3, [
    ['Iron rings the size of cartwheels are set in the {w} wall at intervals, high up, rust-streaked down the stone beneath them.', 'great rusted iron rings set high in the {w} wall'],
  ]),
  d('hoist-crane', 'machine', 4, 0.8, [
    ['A great timber crane stands out from the {w} wall at the top, its long jib braced with iron, with a hook hanging from it that would take a whole statue.', 'a great timber crane with a hook hanging from its jib'],
  ], { minH: 30 }),
  d('capstan', 'machine', 4, 0, [
    ['A capstan as big as a round room stands in the floor near the {w} wall, its bars as long as masts, a rope still coiled on its drum.', 'a gigantic capstan with a rope still coiled on it'],
  ]),
  d('weighing-beam', 'machine', 3, 0.6, [
    ['A beam as long as a ship hangs from the vault by a single chain at the middle, with a pan at each end, level, and both pans empty.', 'a vast balance hanging in the dark, level, both pans empty'],
  ], { minH: 32 }),
  d('stone-pendulum', 'machine', 3, 0.7, [
    ['A pendulum of dark stone hangs from the vault on a rod as thin as a rope, so still that the dust on it lies undisturbed.', 'a great pendulum hanging perfectly still'],
  ], { minH: 30 }),
  d('handless-clock', 'machine', 4, 0.8, [
    ['A clock face as wide as a house is set in the {w} wall, its numerals cut deep, its hands gone and its works silent.', 'a huge clock face with no hands'],
  ]),
  d('great-bell', 'machine', 5, 0.6, [
    ['A bell large enough to shelter a family hangs in a timber frame near the {w} wall, its tongue tied up with a rope, green with age.', 'a great bell hanging in a frame, its tongue tied'],
  ]),
  d('organ-pipes', 'machine', 4, 0.5, [
    ['Ranks of pipes are built into the {w} wall, tall and fluted, silver-grey, and when the wind comes through them they give a long low note like a held breath.', 'ranks of organ pipes in the wall, humming faintly in the moving air'],
  ]),
  d('windlass-chains', 'machine', 4, 0.5, [
    ['Chains run from a drum high on the {w} wall down through a hole in the floor, taut, as if something were hanging on the other end.', 'a taut chain running from a drum into a hole in the floor'],
  ]),
  d('millstones', 'machine', 3, 0, [
    ['Millstones as big as cartwheels lie stacked against the {w} wall like coins, each grooved in a different pattern, some with their iron eyes still in.', 'a stack of giant millstones'],
  ]),
  d('long-telescope', 'machine', 3, 0.7, [
    ['A tube of brass and wood as long as a boat is slung in a cradle across a high window in the {w} wall, aimed at the sky and green with age.', 'an enormous brass telescope in a cradle at a high window'],
  ]),

  // --- water features ----------------------------------------------------------------------------------------------------------------
  d('basin', 'water', 5, 0, [
    ['A great stone basin on a carved pedestal stands against the {w} wall, wide enough to float a boat; it is full of still, clear water that no one can have filled.', 'a great stone basin on a carved pedestal'],
    ['A fountain stands against the {w} wall: a basin on the backs of stone sea-horses, dry now, with a green stain where the water ran.', 'a dry fountain on the backs of stone sea-horses'],
  ]),
  d('lion-spout', 'water', 5, 0.25, [
    ['Stone lions\' heads project from the {w} wall at head height, each with a spout in its mouth and a trough under it; one still trickles, with a note like a small bell.', 'stone lion-heads spouting into troughs, one still trickling'],
  ]),
  d('channel-floor', 'water', 5, 0, [
    ['A channel as broad as a road is cut across the floor, lined with fitted stone and spanned by little single-slab bridges; it is always damp and sometimes running.', 'a stone channel across the floor, crossed by small bridges'],
  ]),
  d('aqueduct-crossing', 'water', 4, 0.8, [
    ['An aqueduct on tall arches crosses the upper part of the hall; it has leaked for so long that a fringe of green hangs from every arch and the floor beneath is always spotted with drips.', 'an aqueduct crossing overhead, dripping green'],
  ], { minH: 32 }),
  d('cistern', 'water', 4, 0.1, [
    ['Steps lead down into a cistern with a vaulted roof on short piers, its still water as black as ink and its pillars standing in it like the legs of animals.', 'the mouth of a cistern, its water black and still'],
  ]),
  d('sluice-gate', 'water', 4, 0.1, [
    ['Huge sluice gates of timber and iron stand in the {w} wall, shut, with the marks of water high on them and a rime of salt.', 'great sluice gates of timber, rimed with salt'],
  ]),
  d('drain-grates', 'water', 5, 0, [
    ['Round drain grates are set in the floor in a long line down the middle, each cast with a different pattern of holes, each breathing a faint, cool air.', 'round iron drain grates breathing cool air'],
  ]),
  d('water-staining', 'water', 6, 0.3, [
    ['The {w} wall is streaked from top to bottom with the long dark stains of water that has run down it for ages, and in the stains, if you look for them, there are faces.', 'long dark stains of old running water down the wall'],
  ]),

  // --- nature and ruin ---------------------------------------------------------------------------------------------------------------
  d('fig-tree', 'nature', 5, 0.8, [
    ['A fig tree has taken root in the {w} wall {y} up and thrown a great pale root down the stone toward the floor; its leaves move in some current of air.', 'a tree rooted high in the wall, its roots clasping the stone'],
  ]),
  d('ferns-joints', 'nature', 6, 0.15, [
    ['Ferns grow in the joints of the {w} wall in neat rows, as though planted, a green line at every course of stone.', 'ferns in every joint of the stone'],
  ]),
  d('ivy-sheet', 'nature', 5, 0.5, [
    ['A single sheet of ivy covers a whole panel of the {w} wall, up to the cornice, with the carving still showing through it like a face under a veil.', 'a sheet of ivy over a carved wall'],
  ]),
  d('moss-lines', 'nature', 5, 0.2, [
    ['Moss grows in thick green lines along the lower edges of the {w} wall where the damp runs down, and there are tiny white flowers in it.', 'green lines of moss and tiny white flowers'],
  ]),
  d('fallen-entablature', 'nature', 7, 0, [
    ['Blocks of a fallen cornice lie at the foot of the {w} wall, carved with leaves and egg-and-dart, with grass and small ferns growing in the joints.', 'a heap of fallen cornice blocks with ferns in the joints'],
  ]),
  d('slipped-keystone', 'nature', 4, 0.6, [
    ['The keystone of a huge arch on the {w} wall has slipped a hand\'s breadth and the whole arch has settled around it, and is plainly content.', 'an arch whose keystone has slipped, and which does not mind'],
  ]),
  d('nest-capitals', 'nature', 6, 0.7, [
    ['In the capitals of the columns on the {w} side there are nests, piled twigs and weed and feathers, some of them as big as cartwheels.', 'nests in the capitals of the columns, some as big as cartwheels'],
  ]),
  d('root-curtain', 'nature', 4, 0.9, [
    ['Roots come down through the vault in a pale curtain, thin as hair, and sway in the moving air without ever reaching the floor.', 'a curtain of fine pale roots hanging from the vault'],
  ]),
  d('salt-crust', 'nature', 4, 0.2, [
    ['The stone of the {w} wall is crusted with salt in white flowers and feathers, which glitter when the light is right.', 'walls crusted with white flowers of salt'],
  ]),
  d('lichen', 'nature', 5, 0.4, [
    ['Lichen spreads in great coloured discs across the {w} wall, yellow and orange and grey, so regular that you might think them painted.', 'discs of orange and grey lichen like painted suns'],
  ]),
  d('mineral-drip', 'nature', 4, 0.9, [
    ['Pale stone icicles hang from the cornice on the {w} side, grown from the drip of a thousand years, with matching spires pointing up from the floor beneath.', 'stone icicles hanging from the cornice, with spires beneath them'],
  ]),
  d('crack-grass', 'nature', 4, 0, [
    ['A long crack runs across the floor from the {w} wall almost to the middle of the hall, and in it grows a line of tall thin grass, trembling.', 'a crack in the floor with a line of grass in it'],
  ]),
  d('collapse-heap', 'nature', 3, 0, [
    ['A whole section of the upper wall has come down in an enormous slope of rubble, up which a stair of fallen stones climbs, tidy as if by intention.', 'a vast slope of fallen masonry, with a stair of fallen stones up it'],
  ]),

  // --- light --------------------------------------------------------------------------------------------------------------------------
  d('light-shaft', 'light', 9, 1, [
    ['A single slot of an opening high in the vault lets down a narrow shaft of light that lies on the floor like a fallen plank.', 'a straight shaft of light standing on the floor'],
    ['Through a break in the vault, a shaft of light as straight as a pillar comes down onto one square of the floor and leaves the rest in shadow.', 'a column of light from a break in the vault'],
  ]),
  d('window-patches', 'light', 6, 0.1, [
    ['The tall windows throw their shapes onto the floor, great slanting panes of light with the bars of the windows laid across them, and they creep as the hours go.', 'tall panes of window light creeping across the floor'],
  ]),
  d('rose-window', 'light', 4, 0.8, [
    ['A rose window of many petals fills the upper part of the {w} wall; most of its glass is gone, but a few coloured pieces remain and throw a spot of red and a spot of blue onto the floor.', 'a rose window with a few pieces of coloured glass left'],
  ]),
  d('hanging-lamps', 'light', 5, 0.6, [
    ['Lamps as big as barrels hang from the vault on long chains, in rows, unlit, their glass dull; their chains are so long that they hang within reach.', 'rows of huge unlit lamps on long chains'],
  ]),
  d('braziers-cold', 'light', 4, 0.1, [
    ['Bronze bowls on tripods stand down the middle of the hall, each wider than a bed, filled with old grey ash and a few charred ends of something.', 'big bronze bowls of cold ash on tripods'],
  ]),
  d('sooted-sconces', 'light', 4, 0.4, [
    ['Iron sconces are set along the {w} wall, high, each with a black fan of soot above it, as though long ago the hall were lit at night.', 'rows of sooted iron sconces'],
  ]),
  d('light-through-arches', 'light', 5, 0.3, [
    ['Light comes through an arcade in the {w} wall from a hall you cannot see, lying in a row of long slanting bars across the floor.', 'light coming through an arcade from another hall'],
  ]),
  d('mirror-sheet', 'light', 3, 0.5, [
    ['A sheet of polished metal as large as a wall hangs on the {w} side, dark and dull but for one bright streak, in which the hall is the wrong way round.', 'a great polished metal mirror, dull and dark'],
  ]),

  // --- objects and constructions ----------------------------------------------------------------------------------------------------
  d('obelisk', 'object', 4, 0.6, [
    ['An obelisk of grey stone rises from a stepped base against the {w} wall, {y} tall, its four faces cut with small neat figures in rows.', 'an obelisk against the {w} wall, cut with rows of tiny figures'],
  ]),
  d('rostral-column', 'object', 4, 0.6, [
    ['A column stands apart from the {w} wall with the bronze-green prows of ships jutting from it in rows, one above another, as though a whole fleet had been driven into the stone.', 'a column bristling with the prows of stone ships'],
  ]),
  d('urns', 'object', 6, 0.4, [
    ['A row of urns taller than a person stands in arched niches along the {w} wall, each with its own lid and a different carved band round the belly.', 'a row of tall urns in arched niches'],
  ]),
  d('stepped-platform', 'object', 3, 0.1, [
    ['A stepped platform of rough blocks stands in the middle of the floor, with a stair up each side, bare at the top.', 'a stepped stone platform with a stair on each side'],
  ]),
  d('chained-gate', 'object', 5, 0.1, [
    ['A gate of iron bars, taller than three people, stands in an arch on the {w} wall, bound with a chain whose links are as big as a hand and rusted into one piece.', 'a great iron gate bound with a rusted chain'],
  ]),
  d('free-gateway', 'object', 4, 0.5, [
    ['In the middle of the floor stands a gateway all alone, two piers and a lintel, with no wall on either side; the floor on the other side of it is the same as the floor on this.', 'a gateway standing alone in the middle of the floor'],
  ]),
  d('triumphal-arch', 'object', 4, 0.6, [
    ['A triumphal arch stands across the hall like a smaller building inside the larger, three passages wide and carved with winged figures, and nothing at all passes through it.', 'a triumphal arch standing like a building inside the hall'],
  ], { minH: 30 }),
  d('stone-throne', 'object', 4, 0.2, [
    ['A throne of grey stone is cut into the {w} wall on a three-stepped dais, with a high back carved in flames; it is larger than any person, and its seat is worn into a shallow dish.', 'a huge empty throne cut into the wall'],
  ]),
  d('stone-bench-ring', 'object', 3, 0, [
    ['A ring of stone benches in three tiers stands in the middle of the floor, round a plain flagstone, as if for a council that has long since finished.', 'a ring of stone seats round one flagstone'],
  ]),
  d('great-book', 'object', 3, 0.1, [
    ['A book of stone as big as a cart lies open on a lectern near the {w} wall, its pages carved with rows of lines that look like writing and are only the idea of it.', 'a giant stone book open on a lectern'],
  ]),
  d('stone-globe', 'object', 3, 0.1, [
    ['A globe of stone twice the height of a person turns on an iron axle in a ring of bronze; its lands and seas are cut in shallow relief, and none of them is a shape you know.', 'a stone globe on an axle, its lands unknown'],
  ]),
  d('pyramid', 'object', 2, 0.1, [
    ['A small pyramid of dark stone stands against the {w} wall, its sides cut with rows of steps, and on its flat top a single stone bowl.', 'a small stepped pyramid with a bowl on its top'],
  ]),
  d('stone-ship', 'object', 2, 0.15, [
    ['A ship of stone as long as a hall stands on blocks in the middle of the floor, her ribs and planking cut true, her mast carrying a stone sail that has never filled.', 'a stone ship on blocks, her sail never filled'],
  ], { minH: 30 }),
  d('stone-table', 'object', 3, 0.1, [
    ['A table of stone long enough for a hundred seats stands set for a feast, every plate and goblet carved from the same block, with a carved loaf on each.', 'a long stone table laid for a feast of stone'],
  ]),
  d('beehive-tower', 'object', 3, 0.3, [
    ['A tower shaped like a beehive stands against the {w} wall, in rings that narrow as they rise, with a spiral of tiny windows and a door at its foot only as high as your knee.', 'a beehive-shaped tower with a knee-high door'],
  ]),

  // --- floors ------------------------------------------------------------------------------------------------------------------------
  d('labyrinth-floor', 'floor', 4, 0, [
    ['In the floor, a labyrinth is inlaid in dark stone, thirty paces across, its single path turning and turning on itself toward a centre with a small bright disc.', 'a labyrinth inlaid in the floor, its path turning on itself'],
  ]),
  d('checker-floor', 'floor', 6, 0, [
    ['The floor is laid in great squares of black and white, each square as big as a room, so that the whole hall seems a chessboard and you its only piece.', 'a floor of enormous black and white squares'],
  ]),
  d('compass-rose', 'floor', 4, 0, [
    ['A great compass rose is inlaid in the middle of the floor, its points as long as boats, its centre a bronze disc worn smooth by feet.', 'a vast compass rose inlaid in the floor'],
  ]),
  d('sunken-court', 'floor', 3, 0, [
    ['The middle of the floor is a sunken circle ringed by steps, with a floor of its own below, like a smaller room dropped into this one.', 'a sunken round court in the middle of the floor'],
  ]),
  d('raised-dais', 'floor', 3, 0.05, [
    ['A raised dais of three wide steps occupies one end of the hall, empty, with a worn patch in the middle of the top step.', 'an empty raised dais with a worn patch'],
  ]),
  d('floor-mosaic', 'floor', 5, 0, [
    ['The floor is a mosaic of tiny stones in the shapes of fish and waves and shells, the patterns running on and on, and the sea has long since scoured away half of them.', 'a mosaic floor of fish and waves, half worn away'],
  ]),
  d('floor-spiral', 'floor', 3, 0, [
    ['A spiral of white stone in the dark floor winds inward from the doors, and the pavement has been worn along it, by feet or by tides, into a shallow groove.', 'a white spiral in the floor, worn into a groove'],
  ]),

  // --- the upper level: the roof is half missing and the sky is part of the architecture ----------------------------------------------
  d('open-roof', 'vault', 9, 1, [
    ['Much of the roof is gone, and the hall is open to the sky between the bare rafters; clouds pass in the gap.', 'the open roof, with sky between the bare rafters'],
    ['The vault has fallen away over half the hall, leaving ribs like the bones of a great animal against the sky.', 'the roof ribs like bones against the open sky'],
  ], { levels: [2] }),
  d('roof-beams-sky', 'vault', 7, 1, [
    ['Bare timber beams span the hall at the top, and between them there is only air and cloud and a great quantity of sky.', 'bare roof beams with only sky between them'],
  ], { levels: [2] }),
  d('gutter-spouts', 'water', 6, 0.9, [
    ['Carved spouts jut from the cornice on the {w} wall, long-necked beasts with open mouths, and in rain every one of them streams.', 'carved spouts like long-necked beasts at the cornice'],
  ], { levels: [2] }),
  d('parapet-clouds', 'object', 6, 1, [
    ['A parapet runs along the top of the {w} wall, open to the air; sometimes a roll of cloud comes over it and goes along the wall like a slow animal.', 'a parapet at the top of the wall, with cloud rolling over it'],
  ], { levels: [2] }),
  d('stairs-into-sky', 'stairs', 4, 0.9, [
    ['Steps climb the {w} wall to a gap in the roof and end, in cloud, on nothing.', 'steps climbing to a gap in the roof and ending in cloud'],
  ], { levels: [2] }),
  d('weather-vane-tower', 'object', 4, 1, [
    ['At the corner a slender tower rises through the broken roof carrying a weathervane in the shape of a ship, that turns on its spindle with a very small squeak.', 'a slender tower with a ship for a weathervane'],
  ], { levels: [2] }),
  d('frosted-rails', 'nature', 5, 0.6, [
    ['Every ledge and rail on the {w} wall wears a little hem of frost or damp, and the stone feels, from here, colder than the air.', 'ledges and rails wearing a hem of frost'],
  ], { levels: [2] }),
  d('singing-cornice', 'machine', 5, 0.9, [
    ['The wind finds the carved cornice of the {w} wall and sings in it, a thin note that rises and falls and rises, like someone humming a tune they have forgotten.', 'the wind singing in the cornice'],
  ], { levels: [2] }),

  // --- the lower level: the sea comes and goes, and the building has learnt to live with it -----------------------------------------------
  d('sea-arches', 'opening', 8, 0.3, [
    ['Wide arches in the {w} wall are open to the sea itself; in them the water rises and falls in slow steps, and the light that comes through is green.', 'wide arches open to the sea, the light green through them'],
  ], { levels: [0] }),
  d('tide-notches', 'surface', 7, 0.5, [
    ['The piers are cut with rows of notches from the floor to the vault, a mark for the height of every tide that anyone has thought worth remembering.', 'tide-marks cut in rows up the piers'],
  ], { levels: [0] }),
  d('barnacle-piers', 'nature', 8, 0.3, [
    ['The piers are crusted with barnacles and mussels as high as the highest tide, in grey and blue drifts, and below them the stone is polished and dark.', 'piers crusted with mussels and barnacles'],
  ], { levels: [0] }),
  d('mooring-rings', 'machine', 7, 0.3, [
    ['Bronze rings are set in the walls at all heights, each worn bright inside by the passing of a rope, and there are stone bollards on the ledges, green with weed.', 'bronze mooring rings and weedy bollards'],
  ], { levels: [0] }),
  d('weed-arches', 'nature', 8, 0.5, [
    ['Weed hangs from the crown of every arch in long dark ribbons and sways when the water moves, whether or not you can feel it move.', 'long ribbons of weed hanging from the arches'],
  ], { levels: [0] }),
  d('sunken-arcade', 'support', 5, 0.1, [
    ['An arcade runs along the {w} wall half-sunk in the floor, so that only the upper halves of its arches stand clear, like a row of eyebrows.', 'an arcade half sunk in the floor, only the tops of its arches clear'],
  ], { levels: [0] }),
  d('shell-niches', 'nature', 6, 0.4, [
    ['The niches in the {w} wall are lined with shells set in patterns, with some of the work Roman and some the sea\'s, and it is hard to say which is which.', 'niches lined with shells in patterns, half made and half the sea\'s'],
  ], { levels: [0] }),
  d('stair-to-water', 'stairs', 4, 0.1, [
    ['A flight of steps comes down the {w} wall and goes on into the water, step after step, as far as the light reaches.', 'steps going down into the water, as far as the light reaches'],
  ], { levels: [0] }),
  d('pearl-lustre', 'nature', 4, 0.35, [
    ['In the lowest course of the {w} wall the stone is lined with the pale lustre of mother-of-pearl, the work of some patient animal over centuries.', 'a band of pearly lining along the foot of the wall'],
  ], { levels: [0] }),
];
