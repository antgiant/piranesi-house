// The narrator: prose built from the hall record, the simulation scene and the audio scene. All wording here is our own.
// Every claim comes from data (never invented on the spot), so the text, the sound and the later views cannot disagree.

import type { Flourish } from '../world/flourishes';
import { birdLines, plantLines, seaLines, skyLines } from './nature';
import { framedInDoorway, skyAbove } from '../sim/stars';
import { compassWord, heightPhrase, moonSky, planetsVisible } from '../sim/planets';
import type { Rand } from './wander';
import canonStatues from '../generated/canon-statues.json';
import type { AudioScene, Portal } from '../audio/director';
import type { SceneState } from '../sim/scene';
import { formatClock, sunTimes } from '../sim/time';
import type { Hall } from '../world/hall';
import type { Exit, Side } from '../world/layout';
import { Rng, hashInts } from '../world/rng';
import { describeStatue, type Statue } from '../world/statues';
import type { OutsideNow } from '../sim/outside';
import type { Relic } from '../world/relics';

export type Style = 'plain' | 'diary';

const pick = <T>(seed: number, arr: readonly T[]): T => arr[seed % arr.length] as T;
const seedOf = (h: Hall, salt: number): number => hashInts(0x51ea, h.x, h.y, h.level, salt);
const SIDE_WORD: Record<Side, string> = { N: 'north', E: 'east', S: 'south', W: 'west' };
export const sideWord = (s: Side): string => SIDE_WORD[s];
const LEVEL_WORD = ['lower', 'middle', 'upper'] as const;
const SIDES_WORD: Record<number, string> = { 3: 'three', 4: 'four', 6: 'six', 8: 'eight' };

const round10 = (n: number): number => Math.round(n / 10) * 10;
const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/** The "diary" style capitalises the House's nouns. */
export function stylise(text: string, style: Style): string {
  if (style === 'plain') return text;
  return text.replace(
    /\b(halls?|vestibules?|statues?|tides?|doors?|walls?|staircases?|stairs?|windows?|courtyards?|sea|house|world|pavements?|floors?|ceilings?|clouds?|water|waters)\b/g,
    (m) => cap(m),
  );
}

// ---------------------------------------------------------------------------------------------------------------
// The place
// ---------------------------------------------------------------------------------------------------------------

function sizeSentence(h: Hall): string {
  const x = round10(h.xExtent);
  const y = round10(h.yExtent);
  const vol = h.xExtent * h.yExtent * h.heightM;
  if (h.kind === 'vestibule') {
    return pick(seedOf(h, 1), [
      `This is a vestibule, a great shaft of a room about ${x} by ${y} metres whose walls climb ${h.heightM} metres into shadow.`,
      `You are in a vestibule: ${x} metres across one way, ${y} the other, and so tall that its upper tiers fade into the gloom.`,
    ]);
  }
  const adj = vol < 450_000 ? 'modest' : vol < 800_000 ? 'large' : 'immense';
  const art = adj === 'immense' || adj === 'large' ? 'a' : 'a';
  return pick(seedOf(h, 1), [
    `${cap(art)} ${adj} hall, about ${x} metres from west to east and ${y} from south to north, roofed ${h.heightM} metres overhead.`,
    `The hall is ${adj}: ${x} metres by ${y} on the floor, its ceiling ${h.heightM} metres up.`,
  ]);
}

function countWord(n: number): string {
  if (n < 200) return 'Some scores of';
  if (n < 600) return 'Hundreds of';
  if (n < 1500) return 'Many hundreds of';
  return 'Thousands of';
}

const SIZE_PHRASE: Record<Hall['sizeClass'], string> = {
  small: 'none of them higher than your shoulder',
  life: 'about your own height',
  large: 'two or three times your height',
  huge: 'towering six to nine metres',
  colossal: 'fifteen to twenty metres tall',
};

const MOOD_SENTENCE: Record<Hall['mood'], readonly string[]> = {
  serene: ['Their faces are calm, as if each were listening to something a long way off.', 'A deep calm is carved into every face.', 'There is a great peace in the stone; nothing here is hurrying.', 'The figures are at rest, and the rest is catching.'],
  joyful: ['Many are caught laughing or dancing; the joy in the stone is almost loud.', 'They are mid-laugh, mid-leap, mid-song, and the whole place feels glad.', 'It is a merry company, caught at the height of a festival.', 'A great many of them are dancing, and you find your step lightens.'],
  solemn: ['They stand grave and upright, watching without a flicker.', 'Every figure is weighty and still, as though keeping a vigil.', 'The faces are grave; something is being remembered here, a long way back.', 'Nothing is said, and a great deal seems to be meant.'],
  effort: ['Nearly every figure is straining against something, muscles knotted, faces contorted but unbowed.', 'All of them push, pull or heave at weights you cannot see.'],
  violent: ['These are scenes of violence: bodies trampled, torn, dragged and flung, faces twisted in rage and terror.', 'Everywhere you look something is being done to someone; every mouth is open in a cry.'],
  crowd: ['They are not set out in tiers but crowded together, shoulder to shoulder, all of them turned the same way.', 'It is a crowd, jostling and leaning, every face lifted toward the same point.'],
};

const THEME_SENTENCE: Record<Hall['theme'], string> = {
  pastoral: 'Shepherds, reapers, sowers and vine-dressers are the commonest figures here.',
  maritime: 'Sailors, net-menders, helmsmen and sea-spirits fill the tiers.',
  scholarly: 'Scribes, geometers, astronomers and old scholars with their books fill the tiers.',
  martial: 'Archers, standard-bearers, sentinels and horsemen stand in rank above rank.',
  beasts: 'Animals of every kind crowd the walls: bears, herons, stags, hounds and lions.',
  mythic: 'Centaurs, satyrs, sphinxes and sea-folk people the walls.',
  allegorical: 'Grave figures of Patience, Memory, Silence and Justice line the tiers.',
  craft: 'Smiths, potters, weavers, masons and glassblowers stand at their work.',
  courtly: 'Kings, queens, heralds, dancers and jesters fill the walls.',
  celestial: 'Angels, moon-goddesses, star-bearers and dawn-maidens look down from the tiers.',
  sacred: 'Prophets, pilgrims, monks and saints, with their wheels, lions and lambs, fill the walls.',
  trade: 'Merchants, clerks, pedlars, judges and showmen crowd the tiers among their scales and strongboxes.',
  civic: 'Magistrates, watchmen, builders and benefactors stand among bridges, fountains and city gates.',
  household: 'Mothers, children at play, hearths, cradles and kitchen things fill the walls.',
  fable: 'Foxes and crows, giants, fairy-folk, wandering knights and a hundred figures out of old stories fill the tiers.',
  travel: 'Travellers, coachmen, carters and ferrymen stand beside their coaches, sledges and signposts.',
};

function statuesParagraph(h: Hall, s: SceneState): string {
  const parts: string[] = [];
  const count = countWord(h.slotCount);
  if (h.mood === 'crowd') parts.push(`${count} statues fill the walls, ${SIZE_PHRASE[h.sizeClass]}.`);
  else parts.push(`${count} statues cover every wall in tiers, ${SIZE_PHRASE[h.sizeClass]}.`);
  if (h.regions.drowned && h.level === 1) parts.push('Colossal bearded giants strain out of the walls above the water.');
  else parts.push(pick(seedOf(h, 2), MOOD_SENTENCE[h.mood]));
  if (h.mood !== 'violent' && h.mood !== 'crowd' && !(h.regions.drowned && h.level === 1)) parts.push(THEME_SENTENCE[h.theme]);
  if (h.tideReachDm > 0 && h.level === 1) {
    parts.push(`Up to about ${(h.tideReachDm / 10).toFixed(1)} metres from the floor the marble is hung with weed and crusted with shells; above that line it is clean.`);
  }
  if (h.level === 0) parts.push('Every statue here is weed-hung and barnacled, and the lower tiers are under the sea.');
  if (h.falls) parts.push(`Water falls down the ${SIDE_WORD[h.falls.wall]} wall, and the statues there are worn smooth by it.`);
  if (h.regions.coral) parts.push('Coral has grown over many of the figures, bending them into strange new shapes.');
  if (h.regions.derelict >= 60) parts.push('Much of this place is ruined: floors have fallen away and shattered statues lie where they dropped.');
  if (s.weather.frost && (h.kind === 'vestibule' || h.level === 2)) parts.push('Snow lies on the statues\' shoulders, and icicles hang from every outstretched arm.');
  return parts.join(' ');
}

function structureParagraph(h: Hall): string {
  const a = h.architecture;
  const bits: string[] = [];
  if (Object.values(h.windows).every((n) => n === 0)) bits.push('There are no windows at all.');
  else bits.push(`Tall windows look out on an empty paved courtyard with ${SIDES_WORD[h.courtyardSides]} sides.`);
  bits.push(pick(seedOf(h, 3), [
    `The supports are ${a.columns}, the pilasters ${a.pilasters}, the niches ${a.niches}.`,
    `${cap(a.niches)} niches break the walls between ${a.columns}.`,
  ]));
  if (a.apses > 0) bits.push(a.apses === 1 ? 'One deep apse opens off the hall.' : `${a.apses} apses open off the hall.`);
  if (h.kind === 'vestibule' && h.stairs.length > 0) {
    const n = h.stairs.length;
    bits.push(n === 1 ? `A great staircase leaves the ${SIDE_WORD[h.stairs[0]!.wall]} wall, going up and down.` : `${cap(['', 'one', 'two', 'three', 'four'][n] ?? String(n))} great staircases leave the ${SIDE_WORD[h.stairs[0]!.wall]} wall, each going up and down.`);
  }
  return bits.join(' ');
}

/**
 * Under the broken roofs of the upper halls, on a clear night, the sky itself: what stands overhead and what is climbing in the east, the
 * planets that are up, and the moon, where it stands and which figure it is in; by day, a pale moon if one is up.
 */
function skyLine(h: Hall, s: SceneState): string {
  if (h.level !== 2 || s.weather.cloud >= 600 || s.weather.precip !== 'none' || s.here.fogHere >= 300) return '';
  const phase = s.light.sunPhase;
  const out: string[] = [];
  if (phase === 'night') {
    const { overhead, rising } = skyAbove(s.clock.dayOfYear, s.clock.minuteOfDay);
    if (overhead && rising) out.push(`Through the broken roof ${overhead} stands high overhead, and ${rising} is climbing in the east.`);
    else if (overhead) out.push(`Through the broken roof ${overhead} stands high overhead.`);
    else if (rising) out.push(`Through the broken roof ${rising} is climbing in the east.`);
  }
  if (phase !== 'day') {
    const ps = planetsVisible(s.t, s.clock.dayOfYear, s.clock.minuteOfDay).slice(0, 2);
    for (const p of ps) out.push(`${p.name}, ${p.look}, hangs ${heightPhrase(p.alt)} in the ${compassWord(p.az)}.`);
  }
  const m = moonSky(s.moon, s.t, s.clock.minuteOfDay);
  if (m) {
    if (phase !== 'day') out.push(`The ${s.moon.phase} moon stands ${m.where}, among ${m.in}.`);
    else if (m.paleByDay) out.push(`A pale ${s.moon.phase} moon hangs ${m.where} in the daylight.`);
  }
  return out.length ? ` ${out.join(' ')}` : '';
}

export function lightSentence(h: Hall, s: SceneState, v: Pick = (xs) => xs[0] as never): string {
  return lightCore(h, s, v) + skyLine(h, s);
}

function lightCore(h: Hall, s: SceneState, v: Pick): string {
  const l = s.light;
  if (h.tags.includes('dark-hall')) {
    if (l.moonInDoorway) return 'The full moon stands centred in the single doorway and fills the hall with pale light; the statues seem to have just turned to look at it.';
    // out of the dark, the doorway is a tall, narrow frame of sky: what stands in it depends on the hour and the season
    if (s.light.sunPhase === 'night' && s.weather.cloud < 600 && s.weather.precip === 'none') {
      const framed = framedInDoorway(s.clock.dayOfYear, s.clock.minuteOfDay);
      const names = framed.length === 0 ? '' : framed.length === 1 ? (framed[0] as string) : `${framed.slice(0, -1).join(', ')} and ${framed[framed.length - 1]}`;
      // a planet low in the east shows in the frame too
      const wanderer = planetsVisible(s.t, s.clock.dayOfYear, s.clock.minuteOfDay).find((p) => p.az > 60 && p.az < 120 && p.alt < 40);
      const planet = wanderer ? ` ${wanderer.name}, ${wanderer.look}, is among them.` : '';
      if (names) return `Everything is dark but the single doorway behind and before you, a tall pale frame of the night sky, and in it ${names} ${framed.length === 1 ? 'stands' : 'stand'}, low and bright.${planet}`;
      return 'Everything is dark but the single doorway, a tall pale frame of the night sky, with a few stars scattered in it.';
    }
    return 'There is no light at all here. The dark is complete.';
  }
  const where = LEVEL_WORD[h.level];
  switch (l.tone) {
    case 'sun': return v([
      `Bright daylight falls through the windows${h.level === 0 ? ', greened and shaken by the sea outside' : ''}.`,
      `The windows are full of daylight, and it lies in bright slabs across the floor${h.level === 0 ? ', rippling green' : ''}.`,
      `Sunlight comes in sideways through the tall windows and picks out one statue after another${h.level === 0 ? ', wavering as if underwater' : ''}.`,
    ]);
    case 'overcast': return v([
      `A dull grey light comes through the windows${s.here.cloudHere > 0 ? ' and the cloud inside' : ''}.`,
      'The light is flat and grey, and the statues have no shadows.',
      'Grey daylight, with nothing in it, leaks in at the windows.',
    ]);
    case 'golden': return v(['A wall of the hall blazes with golden light, so bright that the statues on it seem to dissolve.', 'Gold light pours over one wall, and the statues there glow as if lit from inside.']);
    case 'twilight': return l.sunPhase === 'dawn' ? v(['A pale dawn light is growing in the windows.', 'The windows are paling, and the nearest statues are coming up out of the dark.']) : v(['The windows are going dim and blue with dusk.', 'Dusk is gathering in the corners, and the far statues have begun to merge.']);
    case 'moon': return v([`Moonlight lies in long pale bars across the ${where} hall.`, 'Moonlight comes through the windows and lays a silver floor across the stone.', 'A cold white moonlight makes the statues look as if they had just stopped moving.']);
    case 'starlight': return v(['Starlight in the windows is all the light there is, enough to see the great shapes of the statues.', 'There is only starlight, and the statues are tall shapes of a slightly paler dark.']);
    case 'dark': return 'It is dark.';
  }
}

export function waterSentence(h: Hall, s: SceneState): string {
  const t = s.tide;
  if (t.lake) return 'The floor is gone under a still, dark lake, fed by rain, with white lilies at the edges and drowned statues in the deep.';
  if (h.level === 2) return '';
  if (h.level === 0) {
    const pct = Math.round((t.depthDm / (h.heightM * 10)) * 100);
    if (t.depthDm === 0) return 'The sea has drawn back completely; the pavement is bare and strewn with weed, pebbles and shells.';
    return pct > 80 ? 'The hall is nearly full of dark sea, swelling against the ceiling.' : 'The sea fills the lower part of the hall, heaving gently.';
  }
  if (t.depthDm === 0) return '';
  const m = (t.depthDm / 10).toFixed(1);
  const water = t.character ? `${t.character.colour} water, its foam ${t.character.foam},` : 'water';
  const tail = t.joined >= 2 ? ' Several tides have met here, and the water is wild.' : '';
  const trend = t.trend === 'rising' ? ' and rising' : t.trend === 'falling' ? ' and falling' : '';
  if (t.depthDm < 4) return `A skin of ${water} ankle-deep at most, slides over the paving${trend}.${tail}`;
  if (t.depthDm < 9) return `${cap(water)} runs knee-deep across the floor${trend}.${tail}`;
  if (t.depthDm < 16) return `${cap(water)} stands waist-deep and pulls hard at your legs${trend}.${tail}`;
  return `The whole hall is a heaving mass of ${water} ${m} metres deep and higher than your head${trend}.${tail}`;
}

export function weatherSentences(h: Hall, s: SceneState): string[] {
  const out: string[] = [];
  if (h.tags.includes('dark-hall')) return out;
  if (s.here.cloudHere >= 500) out.push('Cold grey cloud fills the hall; statues loom out of it one at a time and vanish.');
  else if (s.here.cloudHere >= 300) out.push('A thin cloud has drifted in, damp and chill, blurring the far walls.');
  if (s.here.fogHere >= 600) out.push('Fog fills the hall, white and still, and the statues stand in it to the waist; the far wall is gone, and every sound is close and soft.');
  else if (s.here.fogHere >= 250) out.push('A thin mist hangs in the air, beading on stone and statue, and the far end of the hall is soft and pale.');
  if (s.here.rainHere >= 600) out.push('Rain falls hard and steadily, and streams run down the walls and the stair.');
  else if (s.here.rainHere >= 200) out.push('A light rain drips down through the dim air.');
  if (s.weather.lightning && (h.level === 2 || h.kind === 'vestibule')) out.push('Lightning flickers along the windows, lighting every statue white.');
  if (s.weather.storm && h.windows.N + h.windows.S + h.windows.E + h.windows.W > 0) out.push('A storm is blowing from the west; the whole House seems to lean into it.');
  return out;
}

export function birdSentence(s: SceneState): string {
  const b = s.birds;
  switch (b.mode) {
    case 'none': return '';
    case 'silent': return b.species.length ? 'Birds sit in every niche, utterly silent, waiting.' : '';
    case 'roosting': return b.species.length ? `Birds are roosting; ${b.species[0]} shift and rustle in the dark.` : '';
    case 'foraging': return b.species.length ? `${cap(b.species.join(' and '))} flit between the statues.${b.season.chicks ? ' Somewhere a brood of fledglings begs shrilly.' : ''}` : '';
    case 'sheltering': return 'Birds have crowded in out of the rain, and chatter from every ledge.';
    case 'murmuration': return 'The air is thick with birds, a smoke of wings swirling and tightening and spreading through the vestibule.';
    case 'nesting': return b.season.fledglings ? 'Young gulls, brown and clumsy, crowd the shoulders and plinths, and the old ones rise screaming if you move.' : b.season.chicks ? 'Gulls nest on shoulders, plinths and heads, with grey downy chicks beneath them, and rise screaming if you move.' : 'Gulls nest on shoulders, plinths and heads, and rise screaming if you move.';
    case 'chick': return 'A pair of enormous white albatrosses tends a growing chick on a tall nest of weed.';
    case 'noisy': return 'Rooks wheel and call from the high statues.';
    case 'passing': return 'Somewhere high over the roof, unseen, geese are calling to one another in the dark.';
    case 'soaring': return b.season.geese ? `${cap(b.species.filter((x) => !x.includes('geese')).join(' and '))} ride the air above the broken roof, and a skein of geese goes over in a long ragged line.` : `${cap(b.species.join(' and '))} ride the air above the broken roof.`;
    case 'shore': return b.season.waders ? 'Gulls and small waders pick along the weed at the foot of the walls.' : 'Gulls pick along the weed at the foot of the walls.';
  }
}

function featureSentences(h: Hall): string[] {
  const out: string[] = [];
  for (const f of h.features) {
    if (!f.occupant) {
      out.push(`There is ${f.note}.`);
      continue;
    }
    switch (f.occupant) {
      case 'skeleton-with-tin': out.push('In an empty niche lies a human skeleton, the long bones tied in a bundle, the skull set to one side, and the small bones in a red biscuit tin on the other. Someone has laid it out with care.'); break;
      case 'ten-skeletons-and-a-monkey': out.push('On the empty plinth in the northernmost alcove lie ten human skeletons side by side, one so old and worn that its bones are little more than pebbles, and the small skeleton of a long-tailed monkey beside them. There is room for four more.'); break;
      case 'child-skeleton': out.push('On an empty plinth sits the skeleton of a small child, knees drawn up, head bowed, with a string of coral beads and fish bones about the neck.'); break;
      case 'wedged-skeleton': out.push('Wedged into the gap behind a plinth are the bones of someone who once sat there with knees drawn up.'); break;
    }
  }
  return out;
}

export interface NamedExit extends Exit {
  /** The destination's name; withheld for places the player has not seen. */
  toName: string;
  index: number;
}

function doorPlace(side: Side, pos: number): string {
  const [lo, hi] = side === 'N' || side === 'S' ? ['west end', 'east end'] : ['south end', 'north end'];
  return pos < 333 ? lo : pos > 667 ? hi : 'middle';
}

export function exitsParagraph(exits: NamedExit[]): string {
  if (exits.length === 0) return 'There is no way out that you can see.';
  const lines = exits.map((e) => {
    const passage = e.corridor ? ', by a long passage' : '';
    return `[${e.index}] ${sideWord(e.side)} wall, ${doorPlace(e.side, e.pos)}${passage}: ${e.toName}`;
  });
  return `Ways out:\n${lines.join('\n')}`;
}

// ---------------------------------------------------------------------------------------------------------------
// Seen statues
// ---------------------------------------------------------------------------------------------------------------

export interface Seen {
  statue: Statue;
  hallLengthM: number;
}

export function locationPhrase(sn: Seen): string {
  const s = sn.statue;
  const f = s.alongM / sn.hallLengthM;
  const ends: Record<Side, [string, string]> = { N: ['west', 'east'], S: ['west', 'east'], E: ['south', 'north'], W: ['south', 'north'] };
  const where = f < 0.2 ? `near the ${ends[s.wall][0]} end` : f > 0.8 ? `near the ${ends[s.wall][1]} end` : 'near the middle';
  const up = s.baseM < 1.5 ? '' : `, about ${Math.round(s.baseM)} metres up`;
  return `on the ${SIDE_WORD[s.wall]} wall, ${where}${up}`;
}

/** The same, in a sentence-friendly form for prose: "against the south wall, near the middle". */
export function placeInProse(sn: Seen): string {
  return locationPhrase(sn).replace(/^on the/, 'against the');
}

export function seenParagraph(seen: Seen[], hall: Hall): string {
  if (seen.length === 0) return '';
  const lines = seen.map((sn, i) => {
    const label = sn.statue.canonId ? lowerFirst(sn.statue.canonLabel as string) : lowerFirst(describeStatue(hall, sn.statue)).replace(/\.$/, '');
    const short = shorten(withArticle(label), 150);
    return `[${i + 1}] ${short}, ${locationPhrase(sn)}`;
  });
  return `You can make out:\n${lines.join('\n')}`;
}

const lowerFirst = (s: string): string => s.charAt(0).toLowerCase() + s.slice(1);

/** Names of statues in the book's notes begin with the thing itself ("Old man holding ..."): say them as a person would. */
export function withArticle(label: string): string {
  const t = lowerFirst(label.replace(/\.$/, ''));
  if (/^(a|an|the|two|three|four|five|six|seven|eight|nine|ten|some|many|several|scholars|statues|figures|children|pairs?)\b/i.test(t)) return t;
  return `${/^[aeiou]/i.test(t) ? 'an' : 'a'} ${t}`;
}

/** Cut a long line at a clause boundary rather than in the middle of a word. */
export function shorten(s: string, max: number): string {
  if (s.length <= max) return s;
  const cut = Math.max(s.lastIndexOf(', ', max), s.lastIndexOf('; ', max));
  return `${s.slice(0, cut > max * 0.5 ? cut : s.lastIndexOf(' ', max))}...`;
}

/** Hand-written descriptions for the most important canon statues. Our own wording; the others fall back to the notes. */
const CANON_TEXT: Record<string, string> = {
  'ST-BEEHIVE-WOMAN': 'A woman two or three times your height, carrying a beehive on her arm. Marble bees the size of your thumb cover the hive and her hands. One of them crawls over her left eye, and the sight of it makes your skin prickle.',
  'ST-HORNED-GIANTS': 'A huge figure, far larger than anything else in the hall, comes out of the wall at the waist. The horned head is thrown forward, the arms swept back to push, every muscle swollen. The face is contorted with effort. It looks unfinished, as though the figure were still straining free of the stone, and the effort may never end. Its back is hollowed against the wall into a marble pocket, big enough to shelter in.',
  'ST-FATHER-THORN': 'A father sits in a niche with his little son on his lap, gently drawing a thorn from the child\'s foot. Of all the statues here it is the gentlest.',
  'ST-DOGFOX': 'An aged dog-fox sits upright like a schoolmaster, teaching two squirrels and two satyrs; other small creatures listen at the edges. It is an unexpectedly funny statue.',
  'ST-ANGEL-ROSE': 'An angel caught in a rose bush, its wings tangled in thorny stone stems. Behind it there is a hollow, big enough to hide a bag in.',
  'ST-MOON-CROWD': 'This is not a statue so much as a crowd: pairs with their arms around each other, a man pulling himself forward by his neighbour\'s shoulder, a child holding its father\'s hand, a dog on its hind legs begging for attention. At the front a young man holds up a banner, his face full of joy. They are all turned toward the doorway.',
  'ST-MINOTAURS': 'A minotaur of enormous size, its great horns thrust out over the floor, its animal face solemn and impossible to read.',
  'ST-TRAMPLED-MAN': 'A man flung backward beneath a rearing centaur, his great hands thrown up with the palms open and the fingers curled in agony. He thrusts far out from the wall, over the edge of a long gash in the floor.',
};

export function statueDetail(hall: Hall, sn: Seen): string {
  const s = sn.statue;
  const parts: string[] = [];
  if (s.canonId) {
    const info = (canonStatues as { id: string; attributes: string[]; meaning: string | null }[]).find((c) => c.id === s.canonId);
    const prose = CANON_TEXT[s.canonId];
    if (prose && !s.canonLabel?.startsWith('Minotaur ')) parts.push(prose);
    else if (prose) parts.push(`${cap(s.canonLabel as string)}. ${prose}`);
    else {
      parts.push(`${cap(s.canonLabel as string)}.`);
      if (info && info.attributes.length) parts.push(`${cap(info.attributes.join('; '))}.`);
    }
    if (info?.meaning) parts.push(`It seems to stand for ${info.meaning}.`);
  } else {
    parts.push(describeStatue(hall, s));
    parts.push(`It stands about ${s.heightM.toFixed(1)} metres tall on a plinth carved with ${s.mark}.`);
  }
  parts.push(`It is ${locationPhrase(sn)}.`);
  const c = s.condition;
  const bits: string[] = [];
  if (c.shellfish) bits.push('shells have crusted over the lower part');
  else if (c.seaweed) bits.push('weed hangs from it in rags');
  if (c.waterWorn) bits.push('falling water has worn it smooth');
  if (c.droppings) bits.push('birds have streaked it white');
  if (c.broken) bits.push('it is cracked and partly fallen');
  if (c.coral) bits.push('coral has grown over it');
  if (bits.length) parts.push(`${cap(bits.join('; '))}.`);
  return parts.join(' ');
}

// ---------------------------------------------------------------------------------------------------------------
// Sound
// ---------------------------------------------------------------------------------------------------------------

const BEARING_PHRASE = { ahead: 'ahead of you', right: 'to your right', left: 'to your left', behind: 'behind you' } as const;

/** What is heard through a doorway, in a few words. */
function portalWhat(p: Portal): string {
  const bits: string[] = [];
  if (p.tide.kind === 'booming') bits.push('the boom of waves');
  else if (p.tide.kind === 'approach') bits.push('a low thudding, like a tide coming');
  const b = p.birds;
  if (b.perMinute > 0) {
    bits.push(b.mode === 'nesting' ? 'the screaming of gulls' : b.mode === 'noisy' ? 'rooks cawing' : b.mode === 'murmuration' ? 'a rush of wings'
      : b.mode === 'chick' ? 'a strange clacking and whirring' : b.mode === 'roosting' ? 'rustling birds' : 'birdsong');
  }
  if (p.falls > 0.06) bits.push('the splash of falling water');
  if (p.rain > 0.06) bits.push('the patter of rain');
  return bits.slice(0, 2).join(' and ');
}

export function portalSentences(a: AudioScene): string[] {
  return a.portals.slice(0, 3).map((p) => `Through the ${SIDE_WORD[p.side]} door, ${BEARING_PHRASE[p.bearing]}, comes ${portalWhat(p)}.`);
}

type Pick = <T>(variants: readonly T[]) => T;

/** Everything that could be said about what is heard here, each in one of a few ways. The caller chooses among them. */
export function soundBits(a: AudioScene, s: SceneState, v: Pick): string[] {
  const bits: string[] = [];
  if (a.hush) bits.push('The silence here is unusual and deep. No sea, no wind; only the occasional drip.');
  else if (a.dark) bits.push('It is very quiet. A cold breath of air moves in the dark.');
  else {
    if (a.sea.gain >= 0.7) bits.push(v(['The sea is all around you, a heavy rolling roar.', 'The sea fills the hall with a deep, rolling roar, on every side.', 'You are inside the sound of the sea; it comes from everywhere at once.']));
    else if (a.sea.gain >= 0.3) bits.push(v(['Beneath the floor the sea breathes, a slow surge and drag against the walls of a thousand chambers.', 'Far under your feet the sea moves in its chambers, with a slow pulse you feel more than hear.', 'The sea is a steady breathing beneath the floor.']));
    else if (a.sea.gain >= 0.1) bits.push(v(['The sea is only a faint murmur, far below.', 'Somewhere very far down, the sea murmurs.', 'The sea is barely there: a hush at the bottom of the quiet.']));
  }
  switch (a.tide.kind) {
    case 'approach': bits.push(`Somewhere below there is a low thudding, growing: a tide is coming${a.tide.character ? `, with ${a.tide.character}` : ''}.`); break;
    case 'booming':
      if (s.tide.depthDm < 4) bits.push(`Water hisses and slaps across the pavement and around the doorways${a.tide.character ? `: ${a.tide.character}` : ''}.`);
      else bits.push(`Waves strike the walls in turn, boom after boom, and the floor shudders${a.tide.character ? `: ${a.tide.character}` : ''}.`);
      break;
    case 'submerged': bits.push('The water has closed over you and the world has gone strangely silent.'); break;
    case 'none': break;
  }
  if (a.thunder > 0.2) bits.push(v(['Thunder rolls somewhere far above, slow and heavy, and dies away along the walls.', 'A long low rumble of thunder comes down through the building.']));
  if (a.falls.gain > 0) bits.push(v(['Fresh water trickles and splashes over stone somewhere nearby.', 'Water runs down a wall close by, with a bright, broken sound.', 'You can hear a thread of fresh water falling.']));
  if (a.rain.gain > 0.3 && a.rain.onWater >= 0.6) bits.push(v(['Rain patters on the water all around you.', 'Rain pocks the water in a thousand small drops, and the whole hall hisses with it.']));
  else if (a.rain.gain > 0.3) bits.push(v(['Rain drums on the pavement.', 'Rain beats on the stone, and the whole hall hisses with it.']));
  else if (a.rain.gain > 0) bits.push(v(['A fine rain patters.', 'Rain whispers somewhere outside the windows.']));
  if (a.wind.whistle > 0.1) bits.push(v(['Wind sings through hollows in the statues, a thin shifting whistle.', 'A thin whistling comes and goes among the statues as the wind finds its hollows.']));
  else if (a.wind.gain > 0.25) bits.push(v(['Wind moans through the vestibule.', 'The wind moves through the great room with a low moan.']));
  const b = a.birds;
  if (b.perMinute > 0) {
    if (b.mode === 'nesting') bits.push(b.season.chicks ? 'Gulls scream and clatter, and beneath it runs the thin, endless peeping of chicks.' : b.season.fledglings ? 'Gulls scream and clatter, and young ones answer with cracked, wavering cries.' : 'Gulls scream and clatter.');
    else if (b.mode === 'murmuration') bits.push('A rush and rustle of thousands of wings.');
    else if (b.mode === 'chick') bits.push('A strange clacking and whirring: the albatrosses.');
    else if (b.mode === 'noisy') bits.push('Rooks caw.');
    else if (b.mode === 'sheltering') bits.push('Birds chatter on every ledge.');
    else if (b.mode === 'roosting') bits.push('Soft rustles of roosting birds.');
    else if (b.mode === 'soaring') bits.push((b.season.swifts ? v(['Gulls cry high overhead.', 'The thin screams of swifts come and go above the roof.']) : 'Gulls cry high overhead.') + (b.season.geese ? ' Now and then a skein of geese honks its way across.' : ''));
    else if (b.mode === 'passing') bits.push('Far overhead, geese call to one another as they pass.');
    else if (b.mode === 'shore') bits.push(b.season.waders ? 'Gulls call over the wet stones, and a small bird pipes.' : 'Gulls call over the wet stones.');
    else bits.push(v(b.season.songbirds ? ['Small birds twitter and flutter.', 'A blackbird sings somewhere among the statues.', 'There is a flutter and twitter of small birds.'] : ['Small birds twitter and flutter.', 'There is a flutter and twitter of small birds.', 'A blackbird scolds, once, from somewhere among the statues.']));
  } else if (b.mode === 'silent' && s.hall.level === 1 && !a.hush) bits.push('There are no birdsong or wingbeats.');
  bits.push(...portalSentences(a));
  if (s.outside) bits.push(outsideSentence(s.outside, s.hall));
  if (bits.length === 0) bits.push('You hear almost nothing: the echo of your own breathing.');
  return bits;
}

export function soundParagraph(a: AudioScene, s: SceneState): string {
  // stable: the same wording for the same hall and hour
  const seed = hashInts(Math.floor(s.t / 3_600_000), s.hall.x, s.hall.y, s.hall.level, 0x5047);
  let i = 0;
  const v: Pick = (variants) => variants[(seed + i++) % variants.length] as never;
  return soundBits(a, s, v).join(' ');
}

// ---------------------------------------------------------------------------------------------------------------
// The whole hall
// ---------------------------------------------------------------------------------------------------------------

/** What the hint of the outside is like, in our own words. Never explained. */
export function outsideSentence(o: OutsideNow, _h?: Hall): string {
  const from = o.event.corner ? 'the south-east corner, in the shadow between the two minotaurs' : `the ${SIDE_WORD[o.event.wall]} wall`;
  switch (o.event.kind) {
    case 'draught': return `A cold draught creeps out of ${from}, across your ankles, smelling of rain and metal. It is not a smell of the House.`;
    case 'voices': return `For a few seconds, faint sounds that are almost voices murmur out of ${from}, in no words you can follow, and are gone.`;
    case 'traffic': return `A low, steady rushing comes and goes in ${from}, like nothing the House has ever made.`;
    case 'wrapper': return `A crumpled scrap of wrapper skitters across the pavement from ${from}, and is gone before you can reach it.`;
  }
}

/** Where a relic lies, in words. */
function relicPlace(r: Relic): string {
  if (!r.wall) return 'on the pavement';
  if (r.kind === 'old-sleeping-bag') return `under the ${SIDE_WORD[r.wall]} wall's great stair`;
  return `on the ${SIDE_WORD[r.wall]} wall`;
}

export function relicsParagraph(relics: Relic[], startNumber: number): string {
  if (relics.length === 0) return '';
  const lines = relics.map((r, i) => `[${startNumber + i}] ${r.label}, ${relicPlace(r)}`);
  return `Left behind by someone, long ago:\n${lines.join('\n')}`;
}

const NUMWORD = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'] as const;
const BIGWORDS = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
const numWord = (n: number): string => NUMWORD[n] ?? BIGWORDS[n] ?? String(n);
/** "14 or so" reads as "fourteen or so": a person does not say digits. */
const wordy = (s: string): string => s.replace(/\b(\d{1,2}) or so\b/g, (_, d) => `${numWord(Number(d))} or so`);
const listOf = (xs: string[]): string => (xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const capFirst = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
const pickBy = <T,>(rand: Rand, xs: readonly T[]): T => xs[Math.min(xs.length - 1, Math.floor(rand() * xs.length))] as T;

/**
 * What earlier visitors left, told as something you notice, not as a list: where it lies and what it is, in a sentence or two.
 * Nothing is numbered; you look at it closer by naming it ("examine the sleeping bag").
 */
export function relicsProse(relics: Relic[], rand: Rand): string {
  if (relics.length === 0) return '';
  const out: string[] = [];
  const bag = relics.find((r) => r.kind === 'old-sleeping-bag');
  const rest = relics.filter((r) => r !== bag);
  let others = rest;
  if (bag) {
    const near = rest.filter((r) => r.kind === 'litter' && r.where.startsWith('caught'));
    others = rest.filter((r) => !near.includes(r));
    const aside = near.length ? ` ${pickBy(rand, [`Caught against it are ${listOf(near.map((r) => r.thing))}.`, `${capFirst(listOf(near.map((r) => r.thing)))} ${near.length > 1 ? 'have' : 'has'} blown in against it, and stayed.`])}` : '';
    out.push(`${pickBy(rand, [
      `${capFirst(bag.where)} lies ${bag.thing}, left behind long ago by someone who slept here and did not take it with them.`,
      `Someone once made a bed ${bag.where}; all that is left of it is ${bag.thing}.`,
    ])}${aside}`);
  }
  // what the tide has left or shifted is not "long ago": the water did it, and will again
  const tidal = others.filter((r) => r.kind === 'flotsam' || r.where.includes('the water left it'));
  others = others.filter((r) => !tidal.includes(r));
  for (const r of tidal) out.push(pickBy(rand, [`${capFirst(r.where)}, lies ${wordy(r.thing)}.`, `${capFirst(wordy(r.thing))} lies ${r.where}.`]));
  // the rest, by where they lie
  const byPlace = new Map<string, Relic[]>();
  for (const r of others) {
    const where = r.where || (r.wall ? `on the ${SIDE_WORD[r.wall]} wall` : 'on the pavement');
    byPlace.set(where, [...(byPlace.get(where) ?? []), r]);
  }
  for (const [where, rs] of byPlace) {
    const things = rs.map((r) => wordy(r.thing));
    const plural = rs.length > 1 || /(scraps|strokes|or so)/.test(things[0] as string);
    if (rs.length === 1) {
      out.push(pickBy(rand, [
        `${capFirst(where)} ${plural ? 'lie' : 'lies'} ${things[0]}, left by someone a very long time ago.`,
        `You notice ${things[0]} ${where}; it has been there a very long time.`,
        `Someone left ${things[0]} ${where}, long ago.`,
      ]));
    } else {
      out.push(pickBy(rand, [
        `${capFirst(where)} someone has left ${listOf(things)}, long ago.`,
        `Long ago, ${listOf(things)} were left ${where}.`,
      ]));
    }
  }
  return out.join(' ');
}

/**
 * Where the doors lead, said as a person would say it on walking in: that there are doors, and roughly where, not how many in each
 * wall. The count comes when you look in a direction ("look north"); until then a hall has "a great many doors, in every direction".
 */
export function exitsProse(h: Hall, exits: NamedExit[], rand: Rand): string {
  if (exits.length === 0) return 'You can see no way out.';
  const sides: Side[] = [];
  const count = new Map<Side, number>();
  for (const e of exits) { if (!count.has(e.side)) sides.push(e.side); count.set(e.side, (count.get(e.side) ?? 0) + 1); }
  const words = (s: Side): string => sideWord(s).replace(' wall', '');
  const stair = h.kind === 'vestibule' && h.stairs.length > 0
    ? ` ${pickBy(rand, [`The great staircase leaves the ${SIDE_WORD[h.stairs[0]!.wall]} wall, going up and down.`, `A great staircase rises from the ${SIDE_WORD[h.stairs[0]!.wall]} wall, and goes down as well.`])}`
    : '';
  const total = exits.length;
  let main: string;
  if (total === 1) {
    main = pickBy(rand, [`The only way on is a door in the ${words(sides[0] as Side)} wall.`, `There is a single door, in the ${words(sides[0] as Side)} wall.`]);
  } else if (total <= 3) {
    main = `There ${total === 2 ? 'are two doors' : 'are three doors'}, ${listOf(sides.map((s) => `${(count.get(s) as number) === 1 ? 'one' : numWord(count.get(s) as number)} in the ${words(s)} wall`))}.`;
  } else if (sides.length === 4) {
    main = total >= 10
      ? pickBy(rand, ['Doors open in every direction, more than you could easily count.', 'There are doors in all four walls, a great many of them.', 'Door after door opens in every wall.'])
      : pickBy(rand, ['Doors open in every wall.', 'There are doors on every side.', 'Each wall has its doors.']);
  } else {
    main = pickBy(rand, [`Doors open to the ${listOf(sides.map(words))}.`, `The ways on lie ${listOf(sides.map((s) => `to the ${words(s)}`))}.`, `There are doors in the ${listOf(sides.map(words))} walls.`]);
  }
  return `${main}${stair}`;
}

/**
 * Looking out in one direction: the doors in that wall counted and placed (this is where numbers belong, as when someone gives
 * you directions: "the third door"), what can be seen through the nearest, and what else is on that wall.
 */
export function directionProse(h: Hall, side: Side, doors: NamedExit[], vista: { next: string | null; halls: number; passage: boolean }, onWall: string[], rand: Rand): string {
  const w = `${SIDE_WORD[side]} wall`;
  const place = (e: NamedExit): string => {
    const lo = side === 'N' || side === 'S' ? 'west' : 'south';
    const hi = side === 'N' || side === 'S' ? 'east' : 'north';
    return e.pos < 250 ? `near the ${lo} end` : e.pos > 750 ? `near the ${hi} end` : e.pos < 450 ? `a little toward the ${lo}` : e.pos > 550 ? `a little toward the ${hi}` : 'in the middle';
  };
  const out: string[] = [];
  if (doors.length === 0) {
    out.push(`There is no door in the ${w}; it is a blank face of statues and stone.`);
  } else {
    const n = doors.length;
    if (n === 1) out.push(pickBy(rand, [`A single door opens in the ${w}, ${place(doors[0] as NamedExit)}.`, `The ${w} has one door, ${place(doors[0] as NamedExit)}.`]));
    else if (n === 2) out.push(`Two doors open in the ${w}: one ${place(doors[0] as NamedExit)}, the other ${place(doors[1] as NamedExit)}.`);
    else if (n <= 6) out.push(`${capFirst(numWord(n))} doors open along the ${w}: ${listOf(doors.map(place))}.`);
    else out.push(`A long row of doors, ${n} of them, runs along the ${w}.`);
    if (vista.next) {
      const near = n === 1 ? 'it' : 'the one nearest the middle';
      if (vista.passage) out.push(`Through ${near} a long passage runs away, a hall's length or more, before it opens into ${vista.next}.`);
      else if (vista.halls >= 10) out.push(`Looking through ${near}, you see a great vista of halls, doorway beyond doorway, receding until the eye gives up.`);
      else if (vista.halls >= 4) out.push(`Through ${near} you see ${vista.next}, and beyond it several more halls, one doorway after another.`);
      else if (vista.halls >= 2) out.push(`Through ${near} lies ${vista.next}, and beyond it a hall or two more.`);
      else out.push(`Through ${near} lies ${vista.next}, and beyond it only another wall of statues.`);
    }
  }
  out.push(...onWall);
  return out.join(' ');
}

/** The statues near you, as something said of what the eye falls on, not a numbered list. */
export function seenProse(seen: Seen[], hall: Hall): string {
  if (seen.length === 0) return '';
  const bits = seen.slice(0, 6).map((sn) => {
    const label = sn.statue.canonId ? withArticle(sn.statue.canonLabel as string) : withArticle(describeStatue(hall, sn.statue, true));
    return `${shorten(label, 140)}, ${locationPhrase(sn)}`;
  });
  return `Near you, the eye falls on ${bits.map((b, i) => (i === 0 ? b : `${['and then', 'then', 'and', 'and beside it', 'and past that'][Math.min(i - 1, 4)]} ${b}`)).join('; ')}.`;
}

export function describeHall(h: Hall, s: SceneState, audio: AudioScene, exits: NamedExit[], seen: Seen[], relics: Relic[] = [], flourishes: readonly Flourish[] = [], numbered = false, heading?: string): string[] {
  const lvl = LEVEL_WORD[h.level];
  const out: string[] = [];
  out.push(heading ?? `${h.name}\nThe ${lvl} level.`);
  out.push(`${sizeSentence(h)} ${statuesParagraph(h, s)}`);
  out.push(structureParagraph(h));
  if (flourishes.length > 0) out.push(`Above the statues the building does stranger things. ${flourishes.map((f) => f.text).join(' ')}`);
  const fixed = new Rng(hashInts(s.t > 0 ? Math.floor(s.t / 2_700_000) : 0, h.x, h.y, h.level, 0x91a5));
  const rnd: Rand = () => fixed.u32() / 4294967296;
  const sky = skyLines(h, s, rnd)[0];
  const sea = seaLines(h, s, rnd)[0];
  const env = [lightSentence(h, s), sky ?? '', waterSentence(h, s), sea ?? '', ...weatherSentences(h, s), birdSentence(s), ...featureSentences(h)].filter(Boolean);
  out.push(env.join(' '));
  out.push(soundParagraph(audio, s));
  if (numbered) {
    // the reference form: numbered, for typing "examine 3" and "go 2"
    const sp = seenParagraph(seen, h);
    if (sp) out.push(sp);
    const rp = relicsParagraph(relics, seen.length + 1);
    if (rp) out.push(rp);
    out.push(exitsParagraph(exits));
  } else {
    const r = new Rng(hashInts(s.t > 0 ? Math.floor(s.t / 2_700_000) : 0, h.x, h.y, h.level, 0x91a9));
    const rr: Rand = () => r.u32() / 4294967296;
    const sp = seenProse(seen, h);
    if (sp) out.push(sp);
    const rp = relicsProse(relics, rr);
    if (rp) out.push(rp);
    out.push(exitsProse(h, exits, rr));
  }
  return out.filter(Boolean);
}

/** A time of day as a person says it: "about a quarter past nine in the morning". */
export function timeInWords(minuteOfDay: number): string {
  const q = Math.round(minuteOfDay / 15) % 96; // quarter hours
  let h = Math.floor(q / 4);
  const part = q % 4;
  const names = ['twelve', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven'];
  const period = (hh: number): string => (hh < 4 ? 'at night' : hh < 12 ? 'in the morning' : hh < 17 ? 'in the afternoon' : hh < 21 ? 'in the evening' : 'at night');
  if (q === 0) return 'midnight';
  if (q === 48) return 'noon';
  if (part === 3) h += 1; // "a quarter to ten"
  const hh = h % 24;
  const say = names[hh % 12] as string;
  const prefix = part === 0 ? '' : part === 1 ? 'a quarter past ' : part === 2 ? 'half past ' : 'a quarter to ';
  return `${prefix}${say} ${period(hh)}`;
}

export function skyParagraph(s: SceneState): string {
  const { sunrise, sunset } = sunTimes(s.clock.dayOfYear);
  const m = s.moon;
  const wind = s.weather.windSpeed > 600 ? 'a strong wind' : s.weather.windSpeed > 250 ? 'a steady wind' : 'a light wind';
  const weather = s.weather.precip === 'snow' ? 'It is snowing' : s.weather.precip === 'rain' ? 'It is raining' : s.weather.cloud > 600 ? 'The sky is overcast' : 'The sky is clear';
  const moon = m.up
    ? `The ${m.phase} moon is up${m.illumination > 800 ? ', bright' : m.illumination < 200 ? ', a thin sliver' : ''}.`
    : `The moon, ${m.phase}, is below the horizon.`;
  return [
    `It is about ${timeInWords(s.clock.minuteOfDay)}, in ${s.clock.season === 'autumn' ? 'autumn' : s.clock.season}.`,
    `The sun rose at ${timeInWords(sunrise)} and will set at ${timeInWords(sunset)}.`,
    moon,
    `Outside, ${weather.charAt(0).toLowerCase()}${weather.slice(1)}, with ${wind} from the ${s.weather.windDir}.`,
  ].join(' ');
}

// ---------------------------------------------------------------------------------------------------------------
// A glance: what a person would actually say on walking into a place
// ---------------------------------------------------------------------------------------------------------------

/** A random source that is the same for the same hall at about the same time, and differs from visit to visit. */
export function glanceRand(h: Hall, s: SceneState, looks = 0): Rand {
  const r = new Rng(hashInts(Math.floor(s.t / 2_700_000), h.x, h.y, h.level, 0x91a7 + looks));
  return () => r.u32() / 4294967296;
}

/** How big the statues are, said once for a hall, and only when it is worth saying: nobody remarks on what is ordinary. */
export function statueScaleLine(h: Hall): string {
  switch (h.sizeClass) {
    case 'life': return '';
    case 'small': return 'The statues here are small, a little shorter than you are, and you could almost touch the faces.';
    case 'large': return 'The statues here are very large, two or three times your height, and look down at you from their plinths.';
    case 'huge': return 'The statues here are huge, as tall as houses; you could walk between the feet of one.';
    case 'colossal': return 'The statues here are colossal, bigger than any building you have stood in.';
  }
}

interface Item { weight: number; group: string; key: string; text: string }

function exitsBrief(h: Hall, exits: NamedExit[]): string {
  if (exits.length === 0) return 'You can see no way out.';
  const by = new Map<Side, number>();
  for (const e of exits) by.set(e.side, (by.get(e.side) ?? 0) + 1);
  const bits = [...by].map(([side, n]) => (n === 1 ? sideWord(side).replace(' wall', '') : `${sideWord(side).replace(' wall', '')} (${n} doors)`));
  const list = bits.length === 1 ? bits[0] : `${bits.slice(0, -1).join(', ')} and ${bits[bits.length - 1]}`;
  const stair = h.kind === 'vestibule' && h.stairs.length > 0 ? ' A great staircase goes up and down.' : '';
  return `Doors lead ${list}.${stair}`;
}

export type GlanceMode = 'first' | 'return' | 'again';

/** What the glances have already said: about this hall, and lately about anywhere. */
export interface GlanceMemo {
  /** Keys of what has been said about this hall. */
  told: ReadonlySet<string>;
  mode: GlanceMode;
  /** What kind of statues the last hall had ("large|solemn"), so that "much the same" can be said instead of the whole again. */
  lastChar: string;
  /** Keys of the last few dozen things said anywhere: nothing is said again in the next few halls. */
  recent: ReadonlySet<string>;
  /** The heading to give the hall, and what to call it in a sentence ("the Third Western Hall"): what you believe, which may not be true. */
  heading?: string;
  nameFor?: string;
  /** Things you have named that are here, as lines to say (only when you know where you are). */
  named?: { key: string; text: string }[];
}

const AGAIN_LEAD = ['Looking about you again, ', 'Another look round: ', 'You look about once more. ', 'Taking in more of it, '];
const BACK_LEAD = (nameFor: string): string => `You are back in ${nameFor}.`;
const SAME_AS_BEFORE = ['The statues are much as in the last hall.', 'Statues again, in the same ranks.', 'The same company of statues, in the same tiers.'];

/**
 * The few things worth saying about a place: how big it feels, two or three striking things chosen from all there is (a strange
 * piece of building, a notable statue, the sky or the sea, a bird, the water), the sound, and where the doors lead. Nothing
 * already said about this hall, or in the last few halls, is said again unless asked to be repeated: asking to look again brings
 * new things, as a person would find them, and says so when there is nothing more worth noticing. `look closely` gives the whole.
 *
 * Returns the paragraphs and the keys of what was said, so the caller can remember them.
 */
export function glanceHall(
  h: Hall, s: SceneState, audio: AudioScene, exits: NamedExit[], seen: Seen[], relics: Relic[], flourishes: readonly Flourish[],
  rand: Rand, memo: GlanceMemo,
): { paras: string[]; said: string[]; sound: string; char: string } {
  const { told, mode, recent } = memo;
  const out: string[] = [];
  const said: string[] = [];
  let sound = '';
  const char = `${h.sizeClass}|${h.mood}`;
  const v: Pick = (xs) => xs[Math.floor(rand() * xs.length)] as never;
  const fresh = (key: string): boolean => !told.has(key) && !recent.has(key);

  if (mode === 'first') {
    out.push(memo.heading ?? `${h.name}\nThe ${LEVEL_WORD[h.level]} level.`);
    if (char === memo.lastChar && rand() < 0.7) {
      // the same sort of statues as the last hall: a person would not describe them all over again
      out.push(`${sizeSentence(h)} ${rand() < 0.5 ? v(SAME_AS_BEFORE) : ''}`.trim());
    } else {
      const n = countWord(h.slotCount);
      const count = h.mood === 'crowd'
        ? v([`${n} statues fill the walls`, `The walls are packed with statues, ${n.toLowerCase()} of them`])
        : v([`${n} statues cover the walls in tiers`, `The walls are tiered with statues, ${n.toLowerCase()} of them`, `${n} figures stand in tiers up the walls`, `Statues crowd every wall: ${n.toLowerCase()}`]);
      // life-sized is ordinary and goes unsaid; anything else is said here, once, for the whole hall
      const sizePhrase = h.sizeClass === 'life' ? '' : `, ${SIZE_PHRASE[h.sizeClass]}`;
      out.push(`${sizeSentence(h)} ${count}${sizePhrase}. ${v(MOOD_SENTENCE[h.mood])}`);
    }
    said.push('scale:said');
  } else if (mode === 'return') {
    out.push(BACK_LEAD(memo.nameFor ?? `the ${h.name}`));
  }

  const items: Item[] = [];
  for (const nm of memo.named ?? []) if (fresh(nm.key)) items.push({ weight: 12, group: 'named', key: nm.key, text: nm.text });
  for (const f of flourishes) if (fresh(f.id)) items.push({ weight: 4, group: 'building', key: f.id, text: f.text });
  const canon = seen.filter((sn) => sn.statue.canonId);
  // one of each of the book's statues at a time (eight minotaurs are not all described in one breath)
  const seenCanon = new Set<string>();
  for (const sn of canon.filter((c) => !seenCanon.has(c.statue.canonId as string) && !!seenCanon.add(c.statue.canonId as string)).slice(0, 3)) {
    const key = `st:${sn.statue.id}`;
    if (fresh(key)) items.push({ weight: 8, group: 'statue', key, text: v([
      `Among the statues you notice ${withArticle(sn.statue.canonLabel as string)}, ${placeInProse(sn)}.`,
      `Your eye is drawn to ${withArticle(sn.statue.canonLabel as string)}, ${placeInProse(sn)}.`,
      `Standing out from the rest is ${withArticle(sn.statue.canonLabel as string)}, ${placeInProse(sn)}.`,
    ]) });
  }
  const plain = seen.filter((sn) => !sn.statue.canonId && fresh(`st:${sn.statue.id}`));
  if (plain.length > 0) {
    const sn = plain[Math.floor(rand() * plain.length)] as Seen;
    items.push({ weight: 2, group: 'statue', key: `st:${sn.statue.id}`, text: v([
      `Your eye is caught by ${lowerFirst(describeStatue(h, sn.statue, true)).replace(/\.$/, '')}, ${placeInProse(sn)}.`,
      `${capFirst(placeInProse(sn))} stands ${lowerFirst(describeStatue(h, sn.statue, true)).replace(/\.$/, '')}.`,
      `Near you is ${lowerFirst(describeStatue(h, sn.statue, true)).replace(/\.$/, '')}, ${placeInProse(sn)}.`,
    ]) });
  }
  const add = (group: string, lines: string[]): void => { for (const l of lines) if (fresh(`${group}:${l}`)) items.push({ weight: 1, group, key: `${group}:${l}`, text: l }); };
  add('sky', skyLines(h, s, rand));
  add('sea', seaLines(h, s, rand));
  add('birds', birdLines(h, s, rand));
  add('plants', plantLines(h, s, rand));
  const water = waterSentence(h, s);
  if (water && fresh(`water:${water.slice(0, 30)}`)) items.push({ weight: 1, group: 'water', key: `water:${water.slice(0, 30)}`, text: water });
  const light = lightSentence(h, s, v);
  if (light && fresh(`light:${s.light.tone}`)) items.push({ weight: 1, group: 'light', key: `light:${s.light.tone}`, text: light });
  add('weather', weatherSentences(h, s));
  // what the hall itself holds (an empty niche, a niche with its occupant) is always worth saying
  for (const f of featureSentences(h)) if (fresh(`feature:${f.slice(0, 30)}`)) items.push({ weight: 9, group: 'feature', key: `feature:${f.slice(0, 30)}`, text: f });
  // the theme is a guess about an ordinary hall; the book's own places are not described by it
  if (h.mood !== 'violent' && h.mood !== 'crowd' && h.tags.length === 0) add('theme', [THEME_SENTENCE[h.theme]]);
  // the size of the statues is said once, in the hall's first glance; it is not said again
  const scale = statueScaleLine(h);
  if (scale && mode !== 'first' && !told.has('scale:said')) add('scale', [scale]);

  // Each kind of thing has its own pull, however many ways there are of saying it: the sky or the sea when they are there,
  // the birds, a striking statue, the building's strangeness. Spread a group's pull over its items.
  const PULL: Record<string, number> = { named: 14, building: 10, statue: 8, sky: 11, sea: 11, birds: 12, plants: 4, water: 4, light: 3, weather: 3, theme: 1, scale: 3, feature: 9 };
  const size = new Map<string, number>();
  for (const i of items) size.set(i.group, (size.get(i.group) ?? 0) + 1);
  for (const i of items) i.weight = (PULL[i.group] ?? 2) / (size.get(i.group) as number);
  const want = h.kind === 'vestibule' ? 4 : 3;
  const chosen: Item[] = [];
  const groups = new Map<string, number>();
  let pool = items.slice();
  // A hall that has one of the book's own statues always mentions it the first time: it is what the place is known for.
  if (mode === 'first') {
    const notable = items.find((i) => i.group === 'statue' && i.key.startsWith('st:') && i.weight >= 2 && canon.some((c) => `st:${c.statue.id}` === i.key));
    if (notable) { chosen.push(notable); groups.set('statue', 1); pool = pool.filter((p) => p !== notable); }
    for (const f of items.filter((i) => i.group === 'feature')) { chosen.push(f); groups.set('feature', (groups.get('feature') ?? 0) + 1); pool = pool.filter((p) => p !== f); }
  }
  while (chosen.length < want && pool.length > 0) {
    const total = pool.reduce((a2, i) => a2 + i.weight, 0);
    let r = rand() * total;
    let at = 0;
    for (; at < pool.length; at++) { r -= (pool[at] as Item).weight; if (r <= 0) break; }
    const it = pool[Math.min(at, pool.length - 1)] as Item;
    chosen.push(it);
    groups.set(it.group, (groups.get(it.group) ?? 0) + 1);
    // no more than two of a kind, and never the same thing twice
    pool = pool.filter((p) => p !== it && ((groups.get(p.group) ?? 0) < 2));
  }
  // in the order you would see them: the building first, then what moves in it
  const order = ['named', 'building', 'theme', 'scale', 'statue', 'feature', 'sky', 'light', 'weather', 'water', 'sea', 'birds'];
  chosen.sort((a2, b2) => order.indexOf(a2.group) - order.indexOf(b2.group));
  if (chosen.length) {
    const body = chosen.map((c) => c.text).join(' ');
    const lead = AGAIN_LEAD[Math.floor(rand() * AGAIN_LEAD.length)] as string;
    out.push(mode === 'again' ? `${lead}${lead.endsWith(', ') ? lowerFirst(body) : body}` : body);
    for (const c of chosen) said.push(c.key);
  } else if (mode === 'again') {
    out.push('You have taken in the main things about this place; there is nothing new that stands out. You could look closely, or move on.');
  }
  if (s.outside && fresh(`out:${s.outside.id}`)) { out.push(outsideSentence(s.outside, h)); said.push(`out:${s.outside.id}`); }
  if (mode !== 'again') {
    // one thing heard, and the weather or the tide before the ever-present sea; the same line is not said hall after hall
    const bits = soundBits(audio, s, v);
    const noteworthy = bits.length > 1 && rand() < 0.75 ? bits.slice(1) : bits;
    const heard = noteworthy[Math.floor(rand() * noteworthy.length)] as string;
    const key = `sound:${heard.slice(0, 40)}`;
    if (heard && fresh(key)) { out.push(heard); said.push(key); sound = heard; }
  }
  const rp = mode === 'first' ? relicsProse(relics, rand) : '';
  if (rp) out.push(rp);
  if (mode !== 'again') out.push(exitsProse(h, exits, rand));
  return { paras: out.filter(Boolean), said, sound, char };
}
