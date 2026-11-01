// Finer wording for finer kinds of figure. A bird is not "rearing on the hind legs" and a ship is not "its coat shown in fine
// ridged lines": each sort of subject draws on phrases that make sense for it. Every list here is the same shape as the ones in
// kindlists.ts (12 poses, 24 attributes, 4 solitary and 8 "with" companions) so a hall's four choices stay one-to-one.

import type { Figure } from './catalogue';
import { KIND_LISTS, type KindLists } from './kindlists';

export type Sub =
  | 'human' | 'mythic' | 'beast' | 'bird' | 'sea' | 'insect' | 'reptile'
  | 'vessel' | 'weapon' | 'instrument' | 'vehicle' | 'construction' | 'household' | 'tool';

const L = (poses: string[], attributes: string[], solitary: string[], withs: string[]): KindLists => ({ poses, attributes, solitary, withs });

const BIRD = L(
  ['perched with the head turned to one side', 'wings half open, about to leave', 'standing on one leg', 'with the head tucked under a wing', 'preening a feather', 'stretching up to cry',
   'gliding, wings fully spread', 'landing, claws forward and wings cupped', 'sitting on a nest', 'looking down with one bright eye', 'with the neck stretched out', 'walking with a high, careful step', 'tilted forward, listening'],
  ['every feather separately cut', 'with a ribbon tied about one leg', 'its breast feathers ruffled', 'with a berry in its beak', 'with a ring of tiny carved stars about the neck', 'its tail fanned wide',
   'with the crest raised', 'with eyes of polished dark stone', 'a twig of olive in the beak', 'its wings finely scalloped', 'with a worn patch on the back where hands have touched it', 'a worm hanging from its beak',
   'its claws gripping a carved branch', 'one foot raised to the breast', 'with its beak slightly open', 'with a scroll held in its claws', 'with the wing tips crossed behind', 'with a crown of small feathers',
   'its plumage cut in long flowing lines', 'with a small bell at its leg', 'with a collar of carved flowers', 'its head crowned with a tuft', 'with droplets of stone water on its back', 'with a tiny key hung at its throat'],
  ['alone on the plinth', 'facing outward', 'looking aside', 'high on its perch'],
  ['a nest of carved twigs beneath it', 'its mate beside it', 'a nestling pressed against its breast', 'a pair of eggs at its feet', 'a cat watching from below', 'a snake coiled in the branch behind', 'a fallen feather on the plinth', 'a small flock carved at its feet'],
);
const SEA = L(
  ['gliding along the plinth', 'curled round on itself', 'rising on the swell', 'with the tail lashed to one side', 'leaping out of a carved wave', 'resting on the sand', 'turning its eye to look up',
   'with its fins spread', 'half hidden in a carved reef', 'rolling on its side', 'hanging motionless in the water', 'darting forward', 'swimming in a slow circle'],
  ['every scale separately cut', 'its fins fine as lace', 'with a bead of stone water at the mouth', 'with eyes of polished dark stone', 'a band of carved bubbles rising from it', 'with weed clinging to its side',
   'with a pearl in its mouth', 'its back ridged with tiny shells', 'with barnacles carved on the flank', 'with long trailing whiskers', 'its tail curled up behind', 'patterned with bars and spots',
   'a wreath of kelp about it', 'with spines raised along the back', 'its eyes set high on the head', 'wrapped in a net of fine lines', 'with a necklace of small shells', 'a crown of coral on the head',
   'with a ripple of carved waves behind', 'worn smooth where hands have touched it', 'with a little ring of stars above', 'with its mouth wide open', 'each scale a different pattern', 'its gills finely cut'],
  ['alone on the plinth', 'by itself', 'in a bowl of carved water', 'at the edge of a wave'],
  ['a shoal of small ones carved about it', 'a shell at its side', 'a crab on the plinth', 'a heron standing over it', 'weed wound about its tail', 'a net lying across it', 'a starfish below it', 'a smaller one of its own kind following'],
);
const INSECT = L(
  ['wings folded', 'wings spread wide', 'crawling up a stem', 'resting on a leaf', 'hovering above a flower', 'poised on a twig', 'curled up, asleep', 'climbing a carved branch',
   'tilted as if listening', 'with its legs drawn in', 'creeping along an edge', 'about to take off', 'turning to look back'],
  ['its wings veined like leaves', 'each segment of the body cut separately', 'with eyes like tiny polished domes', 'with feelers curled over its head', 'its legs fine as hairs',
   'its wings patterned with eyes', 'a drop of dew carved on its back', 'with a tiny gold-looking crown', 'its back marked in a careful pattern', 'with a thread of stone silk trailing behind',
   'its body wound in carved ivy', 'its wings edged with fine fringe', 'a ladybird on its back', 'with a speck of pollen on its legs', 'worn smooth where hands have touched it', 'with a minute ring about its middle',
   'its shell cracked and mended', 'its wings powdered with carved dust', 'carved with great exactness, as large as a hand', 'with a long curved sting', 'its abdomen banded in two colours of stone', 'with a tiny bell tied to it',
   'its eyes set with flecks of dark glass', 'with fine hairs cut one by one'],
  ['alone on the plinth', 'on its own leaf', 'very small on the plinth', 'facing outward'],
  ['a flower carved beside it', 'a spider\'s web above it', 'a bird watching from above', 'a leaf curled about it', 'a drop of stone water below', 'a second of its kind close by', 'a hive carved behind it', 'a mushroom at its side'],
);
const REPTILE = L(
  ['coiled upon itself', 'stretched along the plinth', 'with the head raised', 'sunning itself on a stone', 'sliding off the plinth', 'sitting very still', 'with the mouth wide open', 'crawling down a wall',
   'with the neck drawn in', 'turning to look back', 'half buried in carved sand', 'asleep with the head on its foot', 'poised to strike'],
  ['every scale separately cut', 'with eyes of polished dark stone', 'its back ridged and patterned', 'with a forked tongue just showing', 'with a worn patch where hands have touched it', 'its skin cut in fine rows',
   'its shell marked in careful plates', 'with a collar of carved flowers', 'its throat swollen with a song', 'its tail curled round a branch', 'with a small coin balanced on its head', 'its toes spread on the stone',
   'with a ring of tiny stars about the neck', 'its claws finely cut', 'with a ribbon about its middle', 'with a drop of stone water on its nose', 'its back crusted with moss', 'its pattern running in diamonds',
   'its spines raised', 'with the mouth lined in tiny teeth', 'wound in a garland of ivy', 'with yellow-looking eyes', 'with a thread of carved weed trailing', 'with warts cut one by one'],
  ['alone on the plinth', 'on a warm stone', 'facing outward', 'in the shade of the plinth'],
  ['a reed beside it', 'a small bird perched on its back', 'a frog by its side', 'its eggs at its feet', 'a lily-pad under it', 'a bowl of carved water', 'a heron watching it', 'a carved snail on the plinth'],
);
const VESSEL = L(
  ['riding a carved wave', 'with the sails full', 'with the sails furled', 'heeled over in a gust', 'drawn up on a carved shore', 'riding at anchor', 'sailing straight toward you', 'seen from the side, broad and low',
   'with the oars lifted', 'half sunk in the swell', 'with the prow rising', 'lying at a quay', 'turning slowly about her anchor'],
  ['every rope carved as if it could be untied', 'with a carved figurehead at the prow', 'with the planking cut plank by plank', 'with a pennant at the masthead', 'with oars shipped in neat rows',
   'with a small lantern hung at the stern', 'with barrels lashed on the deck', 'with a rudder carved in fine detail', 'a rope ladder hanging over the side', 'with the hull encrusted with tiny shells',
   'with a crowded deck of tiny carved figures', 'with the name worn from the stern', 'with a gilded-looking rail', 'her sails carved in stone folds', 'with a gull on the rigging', 'with a coil of cable on the deck',
   'with a net draped over the side', 'its bow decorated with carved waves', 'a patched sail', 'with a mast leaning a little', 'its anchor hanging from the bow', 'with bright-looking painted eyes at the prow',
   'with a crew of three tiny figures', 'with a chart spread on the deck'],
  ['alone on the plinth', 'by itself', 'on a carved sea', 'facing outward'],
  ['a gull on the mast', 'a small boat towed behind', 'a carved dolphin at the bow', 'a harbour wall at one end of the plinth', 'a heap of nets on the quay', 'a barrel on the plinth', 'a swell of carved water beneath it', 'a lighthouse carved at one corner'],
);
const WEAPON = L(
  ['laid across the plinth', 'standing upright', 'leaning against a block', 'crossed with another', 'hanging from a carved hook', 'pointing at the floor', 'pointing at the vault', 'set at an angle on a rest',
   'laid on a folded cloth', 'with the point resting on the ground', 'shown from the side', 'lying where it fell', 'raised on two supports'],
  ['every part cut with great care', 'its edge worn blunt by age', 'with a hilt wound with carved cord', 'its blade etched with a pattern', 'with a pommel carved as a head', 'with a worn patch where hands have gripped it',
   'wrapped in a carved banner', 'with a belt of studs', 'the leather straps carved in fine folds', 'with a chip taken from one edge', 'a wreath of laurel hung on it', 'its handle bound in carved rope',
   'marked with a small carved cross', 'with a ribbon tied round it', 'its surface fine-grained like old iron', 'half hidden under a cloak', 'with a dent in the side', 'rusted, in stone, to a brownish look',
   'with a crack along the length', 'a stone bird perched on it', 'inlaid with a pattern of stars', 'its rivets cut one by one', 'with a tassel hung from it', 'with a carved coat of arms on it'],
  ['alone on the plinth', 'by itself', 'in the middle of the plinth', 'facing outward'],
  ['a heap of carved shot at its foot', 'a helmet beside it', 'a banner draped across it', 'a laurel wreath laid on it', 'a shield leaning against it', 'a small bird perched on it', 'a sash tied round it', 'a drum at its side'],
);
const INSTRUMENT = L(
  ['standing on its end', 'lying on its side', 'resting against a stool', 'hung from a carved peg', 'laid on a folded cloth', 'set upright on a stand', 'tilted as if just put down', 'open, with the lid raised',
   'shown from the front', 'with a stool pulled up to it', 'leaning on a wall', 'on a small stage', 'half wrapped in cloth'],
  ['every string carved as if it could be plucked', 'with a carved rose cut in the soundboard', 'with its keys worn to hollows', 'with the pegs cut one by one', 'with tassels hanging from it',
   'with a carved ribbon wound round it', 'its wood grain cut in fine lines', 'with a bow laid across it', 'its pipes of graded lengths', 'with a worn patch where hands have held it',
   'its edge inlaid with a pattern of notes', 'with a cord for the shoulder', 'with a crack in its belly', 'with a mouthpiece worn smooth', 'a wreath of ivy hung on it', 'with a carved bird on the top',
   'with a pattern of tiny stars on the lid', 'its strings broken', 'with a small bell hung from it', 'its case carved with leaves', 'its pedals cut in detail', 'a sheet of carved music on its stand',
   'inlaid with tiny shells', 'a cloth of stone folds over it'],
  ['alone on the plinth', 'by itself', 'facing outward', 'in the middle of the plinth'],
  ['a sheet of carved music beside it', 'a stool at its side', 'a small bird perched on it', 'a garland laid across it', 'a second instrument leaning against it', 'a sleeping cat below', 'a candlestick beside it', 'a child\'s hat on the plinth'],
);
const VEHICLE = L(
  ['standing at rest', 'with a wheel off', 'drawn up beside a carved road', 'tilted in a rut', 'caught in a carved storm', 'ready to set out', 'stopped at a milestone', 'half turned on its axle',
   'laden to the top', 'empty', 'with the shafts resting on the ground', 'seen from the back', 'seen from the side'],
  ['every spoke of the wheels cut separately', 'with a canvas top carved in folds', 'with lamps hung at the front', 'with luggage lashed on the roof', 'its wheels splashed with carved mud',
   'with a worn step at the side', 'with the harness hanging loose', 'its axle tilted a little', 'with a tiny carved driver\'s seat', 'its paint flaking away, in stone', 'with a crest on the door',
   'with a carved lantern swinging', 'its curtains drawn', 'with a broken shaft', 'with straw on the floor', 'with a bell hung at the side', 'its wheels bound in iron', 'with a whip laid on the seat',
   'with a pennant at the corner', 'with chains hanging from the back', 'with a carved sack on the seat', 'its door ajar', 'with a roof of carved thatch', 'with a patched cover'],
  ['alone on the plinth', 'by itself', 'facing outward', 'at the edge of the plinth'],
  ['a pair of carved horses at the shafts', 'a dog under it', 'a driver asleep on the seat', 'a heap of luggage beside it', 'a small child on the step', 'a milestone beside it', 'a horse trough nearby', 'a signpost at one corner'],
);
const CONSTRUCTION = L(
  ['rising from a stepped base', 'standing alone on the plinth', 'seen from below', 'seen from a distance, small and exact', 'set in a carved landscape', 'half ruined', 'complete, with every stone in place',
   'with its door shut', 'with its door open', 'with a path leading up to it', 'with a carved fence round it', 'leaning slightly', 'with a flight of steps in front'],
  ['every stone cut separately', 'with tiny windows in careful rows', 'with a weathervane on the top', 'with ivy carved on the walls', 'its roof tiled tile by tile', 'with a flag on the highest point',
   'with a bell in the little tower', 'its gate studded with nails', 'with a miniature figure at the door', 'with smoke carved above a chimney', 'its walls worn smooth where hands have touched them',
   'with a tiny stair spiralling up the side', 'a ring of small trees about its foot', 'with a moat of carved water', 'with a crack running up one wall', 'with a niche on each face', 'with a carved inscription round the base',
   'with a nest in the highest window', 'its arches crowned with leaves', 'with a small boat tied at the foot', 'with a worn stone threshold', 'with shutters carved half closed', 'with a lamp in a window', 'with moss carved on the north side'],
  ['alone on the plinth', 'by itself', 'in the middle of the plinth', 'facing outward'],
  ['a carved road leading to it', 'a tiny crowd gathered at the foot', 'a flock of carved birds circling', 'a heap of building stones beside it', 'a small tree growing by it', 'a carved river running past', 'a figure with a ladder against it', 'a dog asleep at the gate'],
);
const HOUSEHOLD = L(
  ['standing as it would in a room', 'set slightly crooked', 'with the lid open', 'with a cloth thrown over it', 'half pushed under a table', 'set beside a fire', 'on a shelf', 'lying on its side',
   'in use, with a tiny carved hand on it', 'worn and put away', 'laid out carefully', 'with the door open', 'tilted a little'],
  ['every grain of the wood carved', 'with a worn patch where hands have touched it', 'with a crack mended with a staple', 'its handle polished by use', 'with a cloth folded over the back',
   'a small carved cat curled on it', 'with a pattern of leaves cut round the edge', 'with a tiny carved key in the lock', 'its feet carved as paws', 'with a tarnished-looking finish, in stone',
   'with a patch of carved lace', 'with a few carved crumbs beside it', 'its surface marked with rings from cups', 'with a candle-stub carved on it', 'its hinges cut one by one', 'with a ribbon tied to a knob',
   'with a child\'s name scratched in the base', 'with one leg shorter than the rest', 'with a pair of carved gloves lying on it', 'with a spider-web carved in a corner', 'its glass cracked', 'with its cord worn',
   'with a stain of carved wine', 'a jug set beside it'],
  ['alone on the plinth', 'by itself', 'in the middle of the plinth', 'facing outward'],
  ['a cat asleep on it', 'a child\'s toy beside it', 'a cup left on it', 'a pair of slippers below', 'a basket at its side', 'a ball of wool on the plinth', 'a broom leaning against it', 'a dog asleep underneath'],
);

const SUBS: Record<Exclude<Sub, 'human' | 'mythic' | 'beast' | 'tool'>, KindLists> = {
  bird: BIRD, sea: SEA, insect: INSECT, reptile: REPTILE, vessel: VESSEL, weapon: WEAPON, instrument: INSTRUMENT, vehicle: VEHICLE, construction: CONSTRUCTION, household: HOUSEHOLD,
};

const re = (s: string): RegExp => new RegExp(`\\b(${s})s?\\b`, 'i');
const BIRD_RE = re('sparrow|gull|owl|owlet|eagle|hawk|falcon|vulture|raven|crow|dove|nightingale|lark|kingfisher|stork|cockerel|hen|parrot|peacock|pelican|goose|duck|swan|heron|crane|ostrich|flamingo|cormorant|albatross|swallow|thrush|rook|wader|bird|dovecote');
const SEA_RE = re('dolphin|whale|seal|eel|carp|pike|octopus|crab|lobster|fish|oyster|shell|nautilus|starfish|walrus');
const INSECT_RE = re('bee|butterfly|dragonfly|spider|scorpion|cricket|moth|snail|ant|beetle|silkworm');
const REPTILE_RE = re('tortoise|frog|toad|crocodile|lizard|salamander|serpent|snake');
const VESSEL_RE = re('ship|galleon|boat|galley|gondola|barge|raft|cog|canoe|smack|longboat|rowing');
const WEAPON_RE = re('cannon|mortar|catapult|trebuchet|ballista|battering|bow|crossbow|halberd|pike|sword|broadsword|rapier|dagger|mace|war-hammer|battle-axe|shield|helm|armour|breastplate|musket|pistol|powder|cannonball|quiver|standard|spear|siege|javelin|sling');
const INSTRUMENT_RE = re('lute|harp|viol|organ|harpsichord|drum|trumpet|bell|tambourine|pipes|flute|lyre|horn|bagpipe');
const VEHICLE_RE = re('coach|cart|wagon|sleigh|sledge|litter|palanquin|wheelbarrow|chariot|haywain|balloon|sedan|dog-cart|trunk');
const CONSTRUCTION_RE = re('tower|bridge|gate|gateway|fountain|obelisk|column|arch|well|aqueduct|city|walls?|lighthouse|pyramid|platform|hut|chapel|altar|font|pulpit|shrine|steps|road|milestone|signpost|pillory|stocks|gibbet|hall|sepulchre|windmill|mill|beehive|castle|kiln|cistern|basin|sundial|pier|stair|dome');
const HOUSEHOLD_RE = re('cradle|chair|table|bed|clock|mirror|candlestick|key|doll|toy|hearth|pot|broom|wardrobe|window|rocking|basket|pair of shoes|kite|top|hourglass|lamp|jug|cauldron|stool|book|globe|quill|inkwell|ledger|scales|coin|strongbox|barrel|chest|sack');

/** The finer kind of a figure, for wording. The kind of figure (person, creature, spirit, made thing) is fixed in the catalogue; this refines it. */
export function subOf(f: Pick<Figure, 'kind' | 'label'>): Sub {
  if (f.kind === 'human') return 'human';
  if (f.kind === 'mythic') return 'mythic';
  const l = f.label;
  if (f.kind === 'animal') return BIRD_RE.test(l) ? 'bird' : SEA_RE.test(l) ? 'sea' : INSECT_RE.test(l) ? 'insect' : REPTILE_RE.test(l) ? 'reptile' : 'beast';
  // made things
  if (VESSEL_RE.test(l)) return 'vessel';
  if (WEAPON_RE.test(l)) return 'weapon';
  if (INSTRUMENT_RE.test(l)) return 'instrument';
  if (VEHICLE_RE.test(l)) return 'vehicle';
  if (CONSTRUCTION_RE.test(l)) return 'construction';
  if (HOUSEHOLD_RE.test(l)) return 'household';
  return 'tool';
}

/** The words that suit a sort of subject. People are handled elsewhere (they depend on the hall's mood). */
export function listsFor(sub: Exclude<Sub, 'human'>): KindLists {
  if (sub === 'mythic') return KIND_LISTS.mythic;
  if (sub === 'beast') return KIND_LISTS.animal;
  if (sub === 'tool') return KIND_LISTS.object;
  return SUBS[sub];
}
export const SUB_KINDS: readonly Exclude<Sub, 'human'>[] = ['mythic', 'beast', 'bird', 'sea', 'insect', 'reptile', 'vessel', 'weapon', 'instrument', 'vehicle', 'construction', 'household', 'tool'];
