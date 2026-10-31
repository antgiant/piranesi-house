// Statue vocabulary. Our own wording. Deliberately excludes the book's named one-off statues (those live in canon
// placements) so that canon statues stay unique. No modern objects or technology (canon S-R09).

export type Mood = 'serene' | 'joyful' | 'solemn' | 'effort' | 'violent' | 'crowd';
export const MOODS: readonly Mood[] = ['serene', 'joyful', 'solemn', 'effort', 'violent', 'crowd'];

export type Theme =
  | 'pastoral' | 'maritime' | 'scholarly' | 'martial' | 'beasts'
  | 'mythic' | 'allegorical' | 'craft' | 'courtly' | 'celestial'
  | 'sacred' | 'trade' | 'civic' | 'household' | 'fable' | 'travel';
export const THEMES: readonly Theme[] = [
  'pastoral', 'maritime', 'scholarly', 'martial', 'beasts', 'mythic', 'allegorical', 'craft', 'courtly', 'celestial',
  'sacred', 'trade', 'civic', 'household', 'fable', 'travel',
];

/** What a figure is: a person (or people), a creature, a spirit/god/monster, or a made thing (vehicle, weapon, tool, building). */
export type Kind = 'human' | 'animal' | 'mythic' | 'object';

export interface Figure {
  id: string;
  label: string;
  themes: readonly Theme[];
  kind: Kind;
}

import { EXTRA_FIGURES } from './figures';

const f = (id: string, label: string, kind: Figure['kind'], ...themes: Theme[]): Figure => ({ id, label, themes, kind });

const CORE_FIGURES: readonly Figure[] = [
  // pastoral
  f('shepherd', 'shepherd', 'human', 'pastoral'),
  f('shepherd-boy', 'young shepherd', 'human', 'pastoral'),
  f('reaper', 'reaper', 'human', 'pastoral'),
  f('sower', 'sower', 'human', 'pastoral'),
  f('vine-dresser', 'vine-dresser', 'human', 'pastoral', 'craft'),
  f('ploughman', 'ploughman', 'human', 'pastoral', 'craft'),
  f('milkmaid', 'milkmaid', 'human', 'pastoral'),
  f('goatherd', 'goatherd', 'human', 'pastoral'),
  f('orchard-picker', 'orchard picker beneath a bough', 'human', 'pastoral'),
  f('piper', 'piper', 'human', 'pastoral', 'courtly'),
  // maritime
  f('sailor', 'sailor', 'human', 'maritime'),
  f('helmsman', 'helmsman', 'human', 'maritime'),
  f('fisherman', 'fisherman', 'human', 'maritime', 'pastoral'),
  f('net-mender', 'net-mender', 'human', 'maritime', 'craft'),
  f('harbour-warden', 'harbour warden', 'human', 'maritime'),
  f('sea-nymph', 'sea nymph', 'mythic', 'maritime', 'mythic'),
  f('triton', 'triton', 'mythic', 'maritime', 'mythic'),
  f('mermaid', 'mermaid', 'mythic', 'maritime', 'mythic'),
  f('shipwright', 'shipwright', 'human', 'maritime', 'craft'),
  f('beacon-keeper', 'beacon keeper', 'human', 'maritime'),
  // scholarly
  f('scribe', 'scribe', 'human', 'scholarly'),
  f('astronomer', 'astronomer', 'human', 'scholarly', 'celestial'),
  f('geometer', 'geometer', 'human', 'scholarly'),
  f('librarian', 'librarian', 'human', 'scholarly'),
  f('physician', 'physician', 'human', 'scholarly'),
  f('philosopher', 'philosopher', 'human', 'scholarly', 'allegorical'),
  f('cartographer', 'cartographer', 'human', 'scholarly', 'maritime'),
  f('young-scholar', 'young scholar', 'human', 'scholarly'),
  f('old-scholar', 'old scholar', 'human', 'scholarly'),
  f('lecturer', 'lecturer', 'human', 'scholarly'),
  // martial
  f('archer', 'archer', 'human', 'martial'),
  f('spearman', 'spearman', 'human', 'martial'),
  f('standard-bearer', 'standard-bearer', 'human', 'martial', 'courtly'),
  f('horseman', 'horseman', 'human', 'martial'),
  f('captain', 'captain', 'human', 'martial', 'courtly'),
  f('sentinel', 'sentinel', 'human', 'martial'),
  f('shield-maiden', 'shield-maiden', 'human', 'martial', 'mythic'),
  f('drummer', 'drummer', 'human', 'martial', 'courtly'),
  // beasts
  f('bear', 'bear', 'animal', 'beasts'),
  f('lion', 'lion', 'animal', 'beasts', 'courtly'),
  f('stag', 'stag', 'animal', 'beasts', 'pastoral'),
  f('wolf', 'wolf', 'animal', 'beasts'),
  f('heron', 'heron', 'animal', 'beasts', 'maritime'),
  f('owl', 'owl', 'animal', 'beasts', 'scholarly'),
  f('horse', 'horse', 'animal', 'beasts', 'martial'),
  f('ox', 'ox', 'animal', 'beasts', 'pastoral'),
  f('hound', 'hound', 'animal', 'beasts'),
  f('swan', 'swan', 'animal', 'beasts', 'maritime'),
  f('serpent', 'serpent', 'animal', 'beasts', 'mythic'),
  f('boar', 'boar', 'animal', 'beasts'),
  f('ibex', 'ibex', 'animal', 'beasts'),
  f('camel', 'camel', 'animal', 'beasts'),
  f('ram', 'ram', 'animal', 'beasts', 'pastoral'),
  f('crane', 'crane', 'animal', 'beasts'),
  // mythic
  f('centaur', 'centaur', 'mythic', 'mythic', 'martial'),
  f('satyr', 'satyr', 'mythic', 'mythic', 'pastoral'),
  f('sphinx', 'sphinx', 'mythic', 'mythic', 'allegorical'),
  f('griffin', 'griffin', 'mythic', 'mythic', 'beasts', 'martial'),
  f('siren', 'siren', 'mythic', 'mythic', 'maritime'),
  f('dryad', 'dryad', 'mythic', 'mythic', 'pastoral'),
  f('cyclops', 'one-eyed giant', 'mythic', 'mythic', 'craft'),
  f('river-god', 'river god', 'mythic', 'mythic', 'maritime'),
  f('north-wind', 'wind spirit', 'mythic', 'mythic', 'celestial'),
  f('giant', 'giant', 'mythic', 'mythic'),
  f('winged-child', 'winged child', 'mythic', 'mythic', 'celestial', 'courtly'),
  f('chimera', 'chimera', 'mythic', 'mythic', 'beasts'),
  // allegorical
  f('patience', 'figure of Patience', 'human', 'allegorical'),
  f('temperance', 'figure of Temperance', 'human', 'allegorical'),
  f('justice', 'figure of Justice', 'human', 'allegorical', 'courtly'),
  f('hope', 'figure of Hope', 'human', 'allegorical'),
  f('memory', 'figure of Memory', 'human', 'allegorical', 'scholarly'),
  f('silence', 'figure of Silence', 'human', 'allegorical'),
  f('fortune', 'figure of Fortune', 'human', 'allegorical'),
  f('prudence', 'figure of Prudence', 'human', 'allegorical'),
  f('time', 'figure of Time', 'human', 'allegorical', 'celestial'),
  f('mercy', 'figure of Mercy', 'human', 'allegorical'),
  f('vigilance', 'figure of Vigilance', 'human', 'allegorical', 'martial'),
  // craft
  f('smith', 'smith', 'human', 'craft'),
  f('potter', 'potter', 'human', 'craft'),
  f('weaver', 'weaver', 'human', 'craft'),
  f('mason', 'mason', 'human', 'craft'),
  f('glassblower', 'glassblower', 'human', 'craft'),
  f('carpenter', 'carpenter', 'human', 'craft'),
  f('dyer', 'dyer', 'human', 'craft'),
  f('bell-founder', 'bell-founder', 'human', 'craft'),
  f('lute-maker', 'lute-maker', 'human', 'craft', 'courtly'),
  // courtly
  f('king', 'king', 'human', 'courtly'),
  f('queen', 'queen', 'human', 'courtly'),
  f('prince', 'prince', 'human', 'courtly'),
  f('princess', 'princess', 'human', 'courtly'),
  f('chancellor', 'chancellor', 'human', 'courtly', 'scholarly'),
  f('jester', 'jester', 'human', 'courtly'),
  f('herald', 'herald', 'human', 'courtly', 'martial'),
  f('cupbearer', 'cupbearer', 'human', 'courtly'),
  f('dancer', 'dancer', 'human', 'courtly'),
  f('lutenist', 'lutenist', 'human', 'courtly'),
  // celestial
  f('angel', 'angel', 'mythic', 'celestial'),
  f('cherub', 'cherub', 'mythic', 'celestial'),
  f('moon-goddess', 'moon goddess', 'mythic', 'celestial'),
  f('sun-god', 'sun god', 'mythic', 'celestial'),
  f('star-bearer', 'star-bearer', 'human', 'celestial'),
  f('dawn-maiden', 'dawn maiden', 'mythic', 'celestial'),
  f('night-figure', 'veiled figure of Night', 'mythic', 'celestial', 'allegorical'),
  f('twin-brothers', 'pair of twin brothers', 'human', 'celestial'),
];

/** Every subject the House's sculptors carved: the core set above and the wider cast in figures.ts. */
export const FIGURES: readonly Figure[] = [...CORE_FIGURES, ...EXTRA_FIGURES];

export const POSES: Readonly<Record<Mood, readonly string[]>> = {
  serene: [
    'standing at rest', 'seated with hands in the lap', 'gazing into the distance', 'head slightly bowed',
    'one hand raised in greeting', 'leaning on a staff', 'looking down with a faint smile', 'arms folded peacefully',
    'kneeling in quiet attention', 'turned a little to one side', 'resting against a column', 'looking upward',
  ],
  joyful: [
    'caught mid-dance', 'laughing with head thrown back', 'arms flung wide', 'leaping from the plinth',
    'clapping hands overhead', 'running forward, cloak streaming', 'spinning on one foot', 'swinging a child by the hands',
    'singing with open mouth', 'raising a cup to the ceiling',
  ],
  solemn: [
    'standing very upright', 'seated on a heavy chair', 'hand pressed to the chest', 'holding a long, grave pose',
    'eyes closed, hands joined', 'kneeling with head bowed low', 'arm outstretched in blessing', 'looking straight ahead without expression',
    'veiled and motionless', 'guarding a doorway',
  ],
  effort: [
    'straining forward with every muscle', 'heaving at a heavy load', 'pulling against a rope', 'bracing a shoulder under an arch',
    'wrestling an unseen weight', 'pushing back with both arms', 'climbing with clenched teeth', 'hauling a net',
  ],
  violent: [
    'trampled beneath a rearing beast', 'torn at by many arms', 'dragged away by the hair', 'locked in a death-grip with a serpent',
    'flung backward with arms thrown up', 'screaming with open mouth', 'stabbing downward at a fallen man', 'carried off over a shoulder',
    'crushed under a collapsing arch', 'fleeing with a face twisted in terror',
  ],
  crowd: [
    'pressed among neighbours, face turned toward the doorway', 'on tiptoe to see over the heads in front',
    'an arm around the person beside', 'holding a child up to see', 'reaching a hand toward the light',
    'half-turned to speak to a neighbour',
  ],
};

/** Poses of the giants of the Drowned Halls (they strain out of the walls over still water). */
export const POSES_DROWNED: readonly string[] = [
  'straining out of the wall, chest and arms reaching over the dark water',
  'leaning so far out that the broad back forms a flat ledge above the water',
  'hauling both arms forward, shoulders bulging from the stone',
  'twisting out of the wall with head thrown back',
  'pushing a huge hand toward the surface of the water',
  'half-risen from the wall, curls and beard streaming',
  'bracing against the wall with one arm, the other flung out over the lake',
  'bent double, forehead almost touching the water',
];

export const ATTRIBUTES: readonly string[] = [
  'wearing a laurel crown', 'carrying a lantern with no flame', 'holding an open book', 'clasping a closed scroll',
  'hung with a heavy chain of linked rings', 'holding a pair of scales', 'carrying a water jar on one shoulder',
  'wearing a long hooded cloak', 'with a sash of carved ribbon', 'holding a small boat in one hand',
  'bearing a basket of fruit', 'holding a staff topped with a star', 'with a mask pushed up on the forehead',
  'with a veil of stone lace', 'holding a drinking horn', 'carrying a bundle of arrows',
  'holding a long trumpet', 'wearing a crown of reeds', 'with a coil of rope over one arm', 'holding a mirror',
  'carrying a model of a tower', 'with a cluster of grapes at the hip', 'holding a branch in flower', 'wearing a mantle of feathers',
  'carrying a shell to the ear', 'holding a set of pipes', 'with a bird carved on the shoulder', 'wearing a broad-brimmed hat',
  'holding a short sword, point down', 'with a necklace of carved fishes', 'grasping a bunch of wheat', 'holding a net rolled up',
  'carrying a plain jar sealed with wax', 'wearing sandals with wings', 'with a knotted cord at the waist', 'holding a hammer and chisel',
  'holding a bowl of carved fire', 'with one sleeve rolled to the shoulder', 'holding a spindle', 'carrying a bundle of keys',
  'with a crescent moon on the brow', 'holding a ring in the open palm', 'wearing a heavy apron', 'carrying a pole across the shoulders',
  'with a cap of carved waves', 'holding an hourglass', 'carrying a small bell', 'holding a compass of stone',
  'with a snail shell at the foot', 'wearing a garland of ivy', 'holding a sprig of rosemary', 'with a flute tucked in the belt',
  'holding a wreath out in front', 'with a chain of stars about the neck', 'bearing a stone tablet', 'carrying a bow strung with thread',
  'holding a lamp shaped like a fish', 'wearing a shell-crusted collar', 'holding a ladder-like staff', 'with a quiver slung low',
  'carrying a folded banner', 'holding a pot of carved flames', 'wearing a heavy chain of office', 'with an open hand and an empty palm',
  'holding a fan of feathers', 'carrying a spade', 'with a ring of keys at the belt', 'holding a measuring rod',
  'wearing a pointed cap', 'with a stone scarf blowing sideways', 'holding a goblet upside down', 'bearing a bundle of reeds',
];

export const COMPANIONS_SOLITARY: readonly string[] = [
  'alone', 'looking aside', 'facing outward', 'head tipped back', 'weight on one hip', 'with a faint frown',
];
export const COMPANIONS_WITH: readonly string[] = [
  'with a small hound at the feet', 'a bird perched on the shoulder', 'a child clinging to the hem',
  'a lamb at the side', 'a snake coiled around the plinth', 'a hawk on the wrist', 'a pair of doves above',
  'a sleeping cat in the lap', 'a fox pressed against the knee', 'a goat butting at the elbow',
  'a tortoise on the plinth', 'a heron standing behind', 'a pair of fish carved at the base',
  'a younger figure leaning on an arm', 'an old figure sitting at the feet', 'a hooded watcher behind',
];
export const COMPANIONS: readonly string[] = [...COMPANIONS_SOLITARY, ...COMPANIONS_WITH];

// A statue's workshop mark: shared by every statue in a hall, unique per (x mod 64, y mod 64, level). 12 * 32 * 32 = 12288.
export const MARK_MOTIFS: readonly string[] = [
  'stars', 'waves', 'leaves', 'knots', 'scales', 'rings', 'spirals', 'feathers', 'chevrons', 'lozenges', 'bars', 'dots',
];
export const MARK_EDGES: readonly string[] = [
  'plain', 'beaded', 'fluted', 'notched', 'chamfered', 'rope-twist', 'double-line', 'scalloped',
];
export const MARK_BASES: readonly string[] = ['square', 'round', 'octagonal', 'stepped'];

export const SIZE_WORD = { small: 'small', life: 'life-sized', large: 'larger-than-life', huge: 'huge', colossal: 'colossal' } as const;
