// Poses, attributes and companions for things that are not people. A person is described by `POSES`, `ATTRIBUTES` and
// the companions in catalogue.ts; creatures, spirits and made things have their own phrases so that a "galleon" is never
// "hands joined" and a "heron" is never "holding a net". Each list is kept long enough to draw a hall's share from.

import type { Kind } from './catalogue';

export interface KindLists {
  poses: readonly string[];
  attributes: readonly string[];
  solitary: readonly string[];
  withs: readonly string[];
}

const ANIMAL: KindLists = {
  poses: [
    'standing alert, head raised', 'lying curled at rest', 'crouched as if to spring', 'rearing on the hind legs', 'with head lowered to the ground',
    'looking back over one shoulder', 'mid-stride, one foot lifted', 'sitting upright, ears pricked', 'stretched out asleep', 'standing with one forefoot raised',
    'with neck arched', 'with the head cocked, listening', 'crouching low, watching something small', 'turning in a slow circle', 'standing square, looking straight ahead',
    'drinking from a stone bowl', 'caught in the middle of a cry',
  ],
  attributes: [
    'with a collar of carved roses', 'its coat shown in fine ridged lines', 'with a tiny crown on its head', 'every hair of the coat separately cut', 'with a ribbon tied round its neck',
    'one paw resting on a stone ball', 'with eyes of polished dark stone', 'with a bell hung at its throat', 'with a garland of oak leaves', 'its mouth slightly open',
    'with a chain trailing from a ring', 'the tail curled over the back', 'ears laid flat', 'with a deep scar across the flank', 'its coat in carved braids',
    'wearing a little saddle-cloth', 'with a scroll held in its mouth', 'with one forefoot raised', 'with a worn patch where hands have touched it',
    'with a wreath of vine over one ear', 'with one forefoot planted on a shell', 'hung with seaweed rags', 'with a plume of carved water behind it', 'with a set of tiny pearls at the throat',
    'its back strewn with carved petals', 'with a smooth stone under one forepaw', 'a quiver of reeds on its back', 'with a coin of stone in its mouth', 'the hide cut in a pattern of lozenges',
    'with a stone ring at the throat', 'the whole body wound in carved ivy', 'with a halo of small stars',
  ],
  solitary: ['alone on the plinth', 'looking aside', 'facing outward', 'with a faint frown'],
  withs: [
    'its young pressed to its side', 'a smaller one of its kind below', 'a bird perched on its back', 'a child leaning on it', 'a snake coiled at its feet',
    'a fish carved at the base', 'a hooded figure standing behind', 'a sleeping shepherd at its feet', 'a mouse on the plinth', 'a hound beside it',
    'a hunter crouched behind', 'a garland of flowers across it',
  ],
};

const MYTHIC: KindLists = {
  poses: [
    'wings spread wide', 'rising out of the wall', 'caught mid-stride', 'crouched with claws outstretched', 'coiled upon itself',
    'half-turned to look behind', 'with one arm raised', 'bent over its prey', 'seated and thoughtful', 'in a wide, swaggering stance',
    'looking upward with a fixed gaze', 'reaching down with both hands', 'standing on a rock in a storm', 'asleep with a smile', 'weeping into cupped hands',
    'at the edge of a dance', 'in the middle of a long, slow gesture',
  ],
  attributes: [
    'wearing a crown of stars', 'holding a flaming torch', 'carrying a pair of scales', 'with a mantle of stone feathers', 'bearing a long spear',
    'holding a shell to the lips', 'with a wreath of vine leaves', 'wreathed in carved smoke', 'with snakes for hair', 'with eyes closed and a hand held out',
    'carrying a lyre', 'holding a cup of stone wine', 'with a sickle of carved moonlight', 'with great horns wound with flowers', 'with a robe of rippling water',
    'holding up a mask', 'with a golden-looking apple in the hand', 'carrying a bundle of lightning', 'with a net of pearls',
    'with a serpent coiled round one arm', 'carrying a basket of carved fruit', 'with a trumpet of shell', 'bearing a bundle of reeds', 'holding a book that cannot be opened',
    'with a halo of rays', 'holding a ball of fire', 'with hair like falling water', 'wearing a heavy chain', 'with a hunting-horn at the hip',
    'holding the broken end of a chain', 'with a staff of twisted wood', 'with a dozen small faces carved on the robe',
  ],
  solitary: ['alone', 'gazing out over the hall', 'with the face turned away', 'with a distant look'],
  withs: [
    'a small hound at the feet', 'a bird on the shoulder', 'a child clinging to the robe', 'a lamb at the side', 'a snake coiled about the plinth',
    'a pair of doves above', 'a fox pressed against the knee', 'a goat butting at the elbow', 'a tortoise on the plinth', 'a heron standing behind',
    'a pair of fish carved at the base', 'an old figure sitting at the feet',
  ],
};

const OBJECT: KindLists = {
  poses: [
    'raised on a stepped plinth', 'tilted as if on a slope', 'half-sunk in the plinth', 'shown from the front', 'shown from the side',
    'set at an angle', 'lashed down with carved cord', 'balanced on a single point', 'standing open', 'lying on its side',
    'shown in the middle of use', 'shown abandoned', 'standing among carved reeds', 'raised above a carved wave', 'half-wrapped in cloth',
    'set on a bed of carved leaves', 'with a worn path of steps leading up to it',
  ],
  attributes: [
    'every part carved with great care', 'its surface fine-grained like old wood', 'with studs cut one by one', 'with ropes carved as if they could be untied', 'its joints carefully shown',
    'worn smooth where hands have touched it', 'with a crack across one side', 'with a small bird nesting in it', 'with ivy carved climbing it', 'draped in a carved cloth',
    'with a dedication cut around the base', 'with an owl perched on it', 'a dent in one side', 'with the tools of its maker laid before it', 'inlaid with a pattern of stars',
    'with a banner tied to it', 'with a hanging chain', 'with a garland of laurel', 'its wheels half-sunk', 'with a carved lock and no key',
    'with a single carved flame above it', 'with a ring of keys hung on it', 'rimmed with small shells', 'with a mask carved on the front', 'in a pattern of overlapping scales',
    'with a pair of carved gloves lying on it', 'with a hat set on top', 'with a feather lying across it', 'covered with tiny carved letters no one can read', 'with a spider-web of fine cracks',
    'with a bowl of carved fruit beside it', 'with a carved candle burning on it',
  ],
  solitary: ['alone on the plinth', 'by itself', 'facing outward', 'in the middle of the plinth'],
  withs: [
    'a child seated beside it', 'a hound asleep at its foot', 'a bird perched on top', 'a small figure holding it steady', 'a hooded figure leaning on it',
    'a pair of hands resting on it', 'a cat curled up under it', 'a sack beside it', 'a heap of carved coins at the foot', 'a bundle of straw nearby',
    'an old man seated against it', 'a flower in a pot at its side',
  ],
};

export const KIND_LISTS: Readonly<Record<Exclude<Kind, 'human'>, KindLists>> = { animal: ANIMAL, mythic: MYTHIC, object: OBJECT };
