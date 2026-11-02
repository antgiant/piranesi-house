// Narrative names for halls. The House names its halls by number and compass ("the Third Western Hall"), and that is how every hall is
// found. But a person who has been somewhere calls it by what they remember of it: "the hall of the railless bridge". Each hall has such
// an epithet, chosen from the most striking thing in it: a place the book's own talk is full of (the single door, the minotaurs, the
// gull colony), one of the book's own statues, or the rarest of its strange architecture. Wording is ours. Pure and deterministic.

import { DEFS } from './architecture';
import { flourishesFor } from './flourishes';
import type { Hall } from './hall';
import { canonIn } from './slots';
import type { World } from './world';

const TAGS: [string, string][] = [
  ['dark-hall', 'the Hall of the Single Door'], ['first-vestibule', 'the Hall of the Minotaurs'], ['ninth-vestibule', 'the Vestibule of Three Stairs'],
  ['gull-colony', 'the Hall of the Gulls'], ['rook-flock', 'the Hall of the Rooks'], ['albatross-nest', 'the Hall of the Albatrosses'],
  ['golden-wall', 'the Hall of the Golden Wall'], ['horned-giants', 'the Hall of the Straining Giants'], ['pebble-bank', 'the Hall of the Shining Pebbles'],
  ['mussel-stair', 'the Hall of the Mussel Stair'], ['murmuration', 'the Hall of the Starlings'], ['bird-shelter', 'the Hall of Sheltering Birds'],
  ['drowned', 'the Drowned Hall'], ['coral', 'the Coral Hall'], ['cloud-zone', 'the Hall of Cloud'], ['ruinous', 'the Fallen Hall'],
];

/** The book's own statues, by what they are. */
const CANON: Record<string, string> = {
  'ST-FAUN': 'the Hall of the Faun', 'ST-GORILLA': 'the Hall of the Gorilla', 'ST-ANGEL-ROSE': 'the Hall of the Angel in the Roses', 'ST-DOGFOX': 'the Hall of the Dog-Fox',
  'ST-BEEHIVE-WOMAN': 'the Hall of the Beehive Woman', 'ST-ELEPHANT-NEST': 'the Hall of the Elephant', 'ST-OLD-KING-CROWN': 'the Hall of the Old King',
  'ST-ANGEL-TRUMPET': 'the Hall of the Trumpeting Angel', 'ST-SHIP-WAVES': 'the Hall of the Ship on the Waves', 'ST-MAN-BOOK': 'the Hall of the Reader',
  'ST-TRAMPLED-MAN': 'the Hall of the Trampled Man', 'ST-FATHER-THORN': 'the Hall of the Father and the Thorn', 'ST-HIEROPHANT': 'the Hall of the Hierophant',
  'ST-MAN-BOY-STARS': 'the Hall of the Man and Boy and the Stars', 'ST-SHEPHERDESS': 'the Hall of the Shepherdess', 'ST-KNEELING-SPHERE': 'the Hall of the Broken Sphere',
  'ST-HERETIC-POPE': 'the Hall of the Heretic Pope', 'ST-QUEEN-CHARIOT': 'the Hall of the Queen in her Chariot', 'ST-LANTERN-WALKER': 'the Hall of the Lantern-bearer',
  'ST-KING-CITY': 'the Hall of the King and his City', 'ST-CHILDREN-FLUTE': 'the Hall of the Children and the Flute', 'ST-GARDENER-ROSE': 'the Hall of the Gardener',
  'ST-RECLINING-SNAKES': 'the Hall of the Sleeper and the Snakes', 'ST-MUSSEL-STAIR': 'the Hall of the Mussel Stair', 'ST-OLD-MAN-SHIP': 'the Hall of the Old Man and the Ship',
  'ST-WOMAN-BEAR-CUB': 'the Hall of the Woman and the Bear Cub', 'ST-WINGED-HORSE-COLT': 'the Hall of the Winged Horse', 'ST-WOMAN-CLOUD-SHIELD': 'the Hall of the Cloud Shield',
};

/** What each kind of strange architecture is called when a hall is known for it. Kinds not listed take their id as words. */
const FLOURISH: Record<string, string> = {
  bridge: 'the Hall of the Railless Bridge', catwalk: 'the Hall of the Hanging Walkway', 'stair-nowhere': 'the Hall of the Stair to Nowhere',
  'spiral-stair': 'the Hall of the Spiral Stair', 'arches-receding': 'the Hall of Receding Arches', 'great-wheel': 'the Hall of the Great Wheel',
  'ropes-pulleys': 'the Hall of Ropes and Pulleys', 'labyrinth-floor': 'the Hall of the Labyrinth Floor', obelisk: 'the Hall of the Obelisk',
  'stone-ship': 'the Hall of the Stone Ship', 'fig-tree': 'the Hall of the Fig Tree', 'light-shaft': 'the Hall of the Single Shaft of Light',
  'coffered-vault': 'the Hall of the Round Eye', 'dome-oculus': 'the Hall of the Dome', basin: 'the Hall of the Great Basin', 'great-book': 'the Hall of the Stone Book',
  'stone-globe': 'the Hall of the Stone Globe', 'handless-clock': 'the Hall of the Handless Clock', 'great-bell': 'the Hall of the Great Bell', 'organ-pipes': 'the Hall of the Organ in the Wall',
  'free-gateway': 'the Hall of the Lone Gateway', 'triumphal-arch': 'the Hall of the Triumphal Arch', 'stone-throne': 'the Hall of the Empty Throne',
  'stone-table': 'the Hall of the Stone Feast', 'checker-floor': 'the Hall of the Chessboard Floor', 'compass-rose': 'the Hall of the Compass Rose',
  'floor-mosaic': 'the Hall of the Fish Mosaic', 'drawbridge': 'the Hall of the Raised Drawbridge', 'colonnade': 'the Hall of the Long Colonnade', 'rostral-column': 'the Hall of the Ships\' Prows',
  'inscription': 'the Hall of the Worn Lettering', 'pyramid': 'the Hall of the Little Pyramid', 'beehive-tower': 'the Hall of the Beehive Tower', 'hump-bridge': 'the Hall of the High Bridge',
  'bridge-chapel': 'the Hall of the Chapel on the Bridge', 'open-roof': 'the Hall of the Open Roof', 'roof-beams-sky': 'the Hall of the Bare Beams', 'sea-arches': 'the Hall of the Sea Arches',
  'door-too-high': 'the Hall of the High Door', 'flying-arches': 'the Hall of the Leaping Arches', 'chains-from-vault': 'the Hall of a Thousand Chains', 'weighing-beam': 'the Hall of the Great Balance',
};

const titled = (id: string): string => id.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
const WEIGHT = new Map(DEFS.map((d) => [d.id, d.weight]));

/** The epithet of a hall: "the Hall of the Railless Bridge". Never null for a hall that has anything to say for itself; null for the bare few. */
export function epithetFor(world: World, hall: Hall): string | null {
  for (const [tag, ep] of TAGS) if (hall.tags.includes(tag as never)) return ep;
  for (const id of canonIn(world, hall)) { const ep = CANON[id]; if (ep) return ep; }
  // otherwise the rarest of its strange architecture: the thing least likely to be in any other hall
  const rarest = [...flourishesFor(world, hall)].sort((a, b) => (WEIGHT.get(a.kind) ?? 9) - (WEIGHT.get(b.kind) ?? 9) || a.id.localeCompare(b.id))[0];
  if (!rarest) return null;
  return FLOURISH[rarest.kind] ?? `the Hall of the ${titled(rarest.kind)}`;
}
