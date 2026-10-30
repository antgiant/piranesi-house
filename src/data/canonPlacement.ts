// Where each named canon statue stands. Positions follow canon/statues.yaml; anything the book leaves open is a
// DESIGN CHOICE (marked `guess`) made deterministically.

import type { Level } from '../world/layout';
import type { SizeClass } from '../world/hall';

export type WallRef = 'N' | 'E' | 'S' | 'W' | 'opposite-stairs';

export type Where =
  | { hall: string; level?: Level }
  | { aboveHall: string }
  | { lowerOfVestibule: number }
  | { upperOfVestibule: number }
  | { home: true } // book gives no location: deterministic home within 3..14 steps on a ray (guess)
  | { coral: true };

export interface Placement {
  id: string;
  where: Where;
  wall: WallRef;
  /** Position along the wall, 0..1000 from the low end (west or south). */
  along: number;
  /** Height of the plinth above the floor, metres. */
  baseM: number;
  /** Height of the figure, metres. */
  sizeM: number;
  /** Wording for groups where the YAML label covers several statues. */
  label?: string;
  guess?: boolean;
}

export const PLACEMENTS: readonly Placement[] = [
  { id: 'ST-BEEHIVE-WOMAN', where: { hall: 'Ninth Vestibule' }, wall: 'W', along: 600, baseM: 15, sizeM: 4.5 },
  { id: 'ST-GARDENER', where: { hall: 'Ninth Vestibule' }, wall: 'W', along: 960, baseM: 1, sizeM: 4 },
  { id: 'ST-FAUN', where: { hall: 'Fifth North-Western Hall' }, wall: 'E', along: 470, baseM: 0, sizeM: 2.3, guess: true },
  { id: 'ST-GORILLA', where: { hall: 'Fifth Northern Hall' }, wall: 'W', along: 500, baseM: 0, sizeM: 1.8, guess: true },
  { id: 'ST-CYMBAL-BOY', where: { home: true }, wall: 'N', along: 500, baseM: 0, sizeM: 1.6, guess: true },
  { id: 'ST-ELEPHANT-CASTLE', where: { home: true }, wall: 'S', along: 500, baseM: 0, sizeM: 3.5, guess: true },
  { id: 'ST-KINGS-CHESS', where: { home: true }, wall: 'E', along: 500, baseM: 0, sizeM: 2, guess: true },
  { id: 'ST-HORNED-GIANTS', where: { hall: 'First Western Hall' }, wall: 'E', along: 380, baseM: 2, sizeM: 6, label: 'Huge horned figure straining out of the wall at the waist, arms swept back to push, face contorted (right of the east door)' },
  { id: 'ST-HORNED-GIANTS', where: { hall: 'First Western Hall' }, wall: 'E', along: 620, baseM: 2, sizeM: 6, label: 'Huge horned figure straining out of the wall at the waist, arms swept back to push, face contorted (left of the east door)' },
  { id: 'ST-FATHER-THORN', where: { hall: 'First Western Hall' }, wall: 'E', along: 760, baseM: 0, sizeM: 2.2 },
  { id: 'ST-ANGEL-ROSE', where: { hall: 'Second Northern Hall' }, wall: 'N', along: 940, baseM: 5, sizeM: 2.4 },
  { id: 'ST-DOGFOX', where: { hall: 'Fourth Western Hall' }, wall: 'N', along: 60, baseM: 0, sizeM: 2 },
  { id: 'ST-HIEROPHANT', where: { hall: 'Nineteenth Southern Hall' }, wall: 'E', along: 500, baseM: 0, sizeM: 2.2, guess: true },
  { id: 'ST-ANGEL-TRUMPET', where: { hall: 'Second North-Eastern Hall' }, wall: 'W', along: 250, baseM: 9, sizeM: 2.4 },
  { id: 'ST-SHIP-WAVES', where: { hall: 'Second North-Eastern Hall' }, wall: 'W', along: 750, baseM: 9, sizeM: 2 },
  { id: 'ST-MAN-BOOK', where: { hall: 'Second North-Eastern Hall' }, wall: 'W', along: 330, baseM: 4, sizeM: 2.2 },
  { id: 'ST-WOMAN-CLOUD-SHIELD', where: { hall: 'Second North-Eastern Hall' }, wall: 'W', along: 670, baseM: 4, sizeM: 2.2 },
  { id: 'ST-CHILD-FLOWER', where: { hall: 'Second North-Eastern Hall' }, wall: 'W', along: 410, baseM: 12, sizeM: 1.2 },
  { id: 'ST-GRAIN-MICE', where: { hall: 'Second North-Eastern Hall' }, wall: 'W', along: 590, baseM: 12, sizeM: 1.4 },
  { id: 'ST-TRAMPLED-MAN', where: { aboveHall: 'Nineteenth Eastern Hall' }, wall: 'N', along: 500, baseM: 3, sizeM: 5 },
  { id: 'ST-MUSSEL-STAIR', where: { hall: 'Forty-Fifth Vestibule' }, wall: 'opposite-stairs', along: 500, baseM: 6, sizeM: 2.4 },
  { id: 'ST-WOMAN-BEAR-CUB', where: { hall: 'Fifty-Second Western Hall' }, wall: 'N', along: 900, baseM: 0, sizeM: 2, guess: true },
  { id: 'ST-ELEPHANT-NEST', where: { hall: 'Eighty-Eighth Western Hall' }, wall: 'S', along: 300, baseM: 0, sizeM: 3.5 },
  { id: 'ST-OLD-KING-CROWN', where: { hall: 'Eighty-Eighth Western Hall' }, wall: 'S', along: 700, baseM: 0, sizeM: 3.2 },
  { id: 'ST-MOON-CROWD', where: { hall: 'One-Hundred-and-Ninety-Second Western Hall' }, wall: 'W', along: 500, baseM: 0, sizeM: 2.2 },
  { id: 'ST-MAN-BOY-STARS', where: { hall: 'Twenty-Third South-Eastern Hall' }, wall: 'S', along: 400, baseM: 8, sizeM: 2.4 },
  { id: 'ST-SHEPHERDESS', where: { upperOfVestibule: 2 }, wall: 'S', along: 500, baseM: 0, sizeM: 2 },
  { id: 'ST-OLD-MAN-SHIP', where: { hall: 'First Northern Hall' }, wall: 'E', along: 500, baseM: 0, sizeM: 2 },
  { id: 'ST-WINGED-HORSE-COLT', where: { hall: 'First Northern Hall' }, wall: 'W', along: 500, baseM: 0, sizeM: 3 },
  { id: 'ST-KNEELING-SPHERE', where: { hall: 'Nineteenth North-Western Hall' }, wall: 'N', along: 300, baseM: 0, sizeM: 1.8, guess: true },
  { id: 'ST-HERETIC-POPE', where: { upperOfVestibule: 32 }, wall: 'opposite-stairs', along: 500, baseM: 0, sizeM: 3, guess: true },
  { id: 'ST-QUEEN-CHARIOT', where: { hall: 'Forty-Fourth Western Hall' }, wall: 'S', along: 500, baseM: 0, sizeM: 3.4, guess: true },
  { id: 'ST-LANTERN-WALKER', where: { hall: 'Fifty-Third Northern Hall' }, wall: 'E', along: 500, baseM: 0, sizeM: 2, guess: true },
  { id: 'ST-KING-CITY', where: { hall: 'Forty-Eighth Western Hall' }, wall: 'N', along: 500, baseM: 0, sizeM: 2.2 },
  { id: 'ST-CHILDREN-FLUTE', where: { hall: 'Twenty-Seventh Southern Hall' }, wall: 'W', along: 500, baseM: 0, sizeM: 1.4, guess: true },
  { id: 'ST-GARDENER-ROSE', where: { hall: 'Nineteenth South-Eastern Hall' }, wall: 'W', along: 500, baseM: 0, sizeM: 2, guess: true },
  { id: 'ST-RECLINING-SNAKES', where: { lowerOfVestibule: 8 }, wall: 'S', along: 500, baseM: 0, sizeM: 3, guess: true },
  // Eight minotaurs, each different. Two flank the south-east corner.
  ...[
    ['S', 930, 'head lowered, horns raked forward'], ['E', 70, 'one fist pressed to the chest, horns level'],
    ['N', 150, 'chin raised, eyes shut'], ['N', 420, 'seated, hands on knees, a heavy brow'],
    ['N', 700, 'one hand on a broken wheel'], ['W', 300, 'arms crossed, horns curving inward'],
    ['W', 720, 'turned to look over one shoulder'], ['S', 480, 'kneeling, horns almost touching the floor'],
  ].map(([wall, along, look], i): Placement => ({
    id: 'ST-MINOTAURS', where: { hall: 'First Vestibule' }, wall: wall as WallRef, along: along as number, baseM: 0, sizeM: 9,
    label: `Minotaur ${i + 1} of 8: a massive figure ${look}, solemn and inscrutable`,
  })),
  // The Coral Halls: six altered statues in one hall.
  ...[
    'Woman crowned with coral, her hands turned to coral stars',
    'Figure with antlers of red coral',
    'Figure bound to a branch of coral, as if on a cross',
    'Figure pierced through with coral arrows',
    'Lion trapped in a cage of coral bars',
    'Man holding a small box, his left half engulfed in rose-red coral like flames',
  ].map((label, i): Placement => ({
    id: 'ST-CORAL-GROUP', where: { coral: true }, wall: 'S', along: 120 + i * 150, baseM: 0, sizeM: 2.4, label, guess: true,
  })),
];

/** Canon facts about the hall itself that the generator must respect. Keyed by "x,y,level". */
export const HALL_OVERRIDES: Readonly<Record<string, { sizeClass?: SizeClass }>> = {
  '0,0,1': { sizeClass: 'large' }, // First Vestibule: minotaurs tower over everything else
  '-1,0,1': { sizeClass: 'life' }, // First Western Hall: the Horned Giants are far larger than the rest
  '-2,1,1': { sizeClass: 'large' }, // Ninth Vestibule: statues two or three times human height
  '-192,0,1': { sizeClass: 'life' }, // the dark hall: a crowd of near life-size people
};

/** Canon ids that are served by the generator rather than by a pinned placement. */
export const GENERIC_CANON: Readonly<Record<string, string>> = {
  'ST-HALL-GENERIC-SCHOLARS': 'scholar figures are in the catalogue (scholarly theme)',
  'ST-OWL-SET': 'owl figures are in the catalogue (beasts theme)',
  'ST-VIOLENT-SET': 'violent mood halls (the upper halls above the Nineteenth/Twentieth Eastern Hall are forced violent)',
  'ST-DROWNED-GIANTS': 'every Drowned Hall is colossal and populated by straining giants',
};
