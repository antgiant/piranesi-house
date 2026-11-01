// The narrator: prose built from the hall record, the simulation scene and the audio scene. All wording here is our own.
// Every claim comes from data (never invented on the spot), so the text, the sound and the later views cannot disagree.

import type { Flourish } from '../world/flourishes';
import { birdLines, seaLines, skyLines } from './nature';
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
  serene: ['Their faces are calm, as if each were listening to something a long way off.', 'A deep calm is carved into every face.'],
  joyful: ['Many are caught laughing or dancing; the joy in the stone is almost loud.', 'They are mid-laugh, mid-leap, mid-song, and the whole place feels glad.'],
  solemn: ['They stand grave and upright, watching without a flicker.', 'Every figure is weighty and still, as though keeping a vigil.'],
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

export function lightSentence(h: Hall, s: SceneState): string {
  const l = s.light;
  if (h.tags.includes('dark-hall')) {
    return l.moonInDoorway ? 'The full moon stands centred in the single doorway and fills the hall with pale light; the statues seem to have just turned to look at it.' : 'There is no light at all here. The dark is complete.';
  }
  const where = LEVEL_WORD[h.level];
  switch (l.tone) {
    case 'sun': return `Bright daylight falls through the windows${h.level === 0 ? ', greened and shaken by the sea outside' : ''}.`;
    case 'overcast': return `A dull grey light comes through the windows${s.here.cloudHere > 0 ? ' and the cloud inside' : ''}.`;
    case 'golden': return 'A wall of the hall blazes with golden light, so bright that the statues on it seem to dissolve.';
    case 'twilight': return l.sunPhase === 'dawn' ? 'A pale dawn light is growing in the windows.' : 'The windows are going dim and blue with dusk.';
    case 'moon': return `Moonlight lies in long pale bars across the ${where} hall.`;
    case 'starlight': return 'Starlight in the windows is all the light there is, enough to see the great shapes of the statues.';
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
    case 'foraging': return b.species.length ? `${cap(b.species.join(' and '))} flit between the statues.` : '';
    case 'sheltering': return 'Birds have crowded in out of the rain, and chatter from every ledge.';
    case 'murmuration': return 'The air is thick with birds, a smoke of wings swirling and tightening and spreading through the vestibule.';
    case 'nesting': return 'Gulls nest on shoulders, plinths and heads, and rise screaming if you move.';
    case 'chick': return 'A pair of enormous white albatrosses tends a growing chick on a tall nest of weed.';
    case 'noisy': return 'Rooks wheel and call from the high statues.';
    case 'soaring': return `${cap(b.species.join(' and '))} ride the air above the broken roof.`;
    case 'shore': return 'Gulls and small waders pick along the weed at the foot of the walls.';
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
  const up = s.baseM < 1.5 ? 'at floor level' : `about ${Math.round(s.baseM)} metres up`;
  return `on the ${SIDE_WORD[s.wall]} wall, ${where}, ${up}`;
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

export function soundParagraph(a: AudioScene, s: SceneState): string {
  const bits: string[] = [];
  if (a.hush) bits.push('The silence here is unusual and deep. No sea, no wind; only the occasional drip.');
  else if (a.dark) bits.push('It is very quiet. A cold breath of air moves in the dark.');
  else {
    if (a.sea.gain >= 0.7) bits.push('The sea is all around you, a heavy rolling roar.');
    else if (a.sea.gain >= 0.3) bits.push('Beneath the floor the sea breathes, a slow surge and drag against the walls of a thousand chambers.');
    else if (a.sea.gain >= 0.1) bits.push('The sea is only a faint murmur, far below.');
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
  if (a.falls.gain > 0) bits.push('Fresh water trickles and splashes over stone somewhere nearby.');
  if (a.rain.gain > 0.3) bits.push('Rain drums on the pavement.');
  else if (a.rain.gain > 0) bits.push('A fine rain patters.');
  if (a.wind.whistle > 0.1) bits.push('Wind sings through hollows in the statues, a thin shifting whistle.');
  else if (a.wind.gain > 0.25) bits.push('Wind moans through the vestibule.');
  const b = a.birds;
  if (b.perMinute > 0) {
    if (b.mode === 'nesting') bits.push('Gulls scream and clatter.');
    else if (b.mode === 'murmuration') bits.push('A rush and rustle of thousands of wings.');
    else if (b.mode === 'chick') bits.push('A strange clacking and whirring: the albatrosses.');
    else if (b.mode === 'noisy') bits.push('Rooks caw.');
    else if (b.mode === 'sheltering') bits.push('Birds chatter on every ledge.');
    else if (b.mode === 'roosting') bits.push('Soft rustles of roosting birds.');
    else bits.push('Small birds twitter and flutter.');
  } else if (b.mode === 'silent' && s.hall.level === 1 && !a.hush) bits.push('There are no birdsong or wingbeats.');
  bits.push(...portalSentences(a));
  if (s.outside) bits.push(outsideSentence(s.outside, s.hall));
  if (bits.length === 0) bits.push('You hear almost nothing: the echo of your own breathing.');
  return bits.join(' ');
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

export function describeHall(h: Hall, s: SceneState, audio: AudioScene, exits: NamedExit[], seen: Seen[], relics: Relic[] = [], flourishes: readonly Flourish[] = []): string[] {
  const lvl = LEVEL_WORD[h.level];
  const out: string[] = [];
  out.push(`${h.name}\nThe ${lvl} level.`);
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
  const sp = seenParagraph(seen, h);
  if (sp) out.push(sp);
  const rp = relicsParagraph(relics, seen.length + 1);
  if (rp) out.push(rp);
  out.push(exitsParagraph(exits));
  return out.filter(Boolean);
}

export function skyParagraph(s: SceneState): string {
  const { sunrise, sunset } = sunTimes(s.clock.dayOfYear);
  const hm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  const m = s.moon;
  return [
    `It is ${formatClock(s.clock)}.`,
    `The sun rises at ${hm(sunrise)} and sets at ${hm(sunset)} today.`,
    `The moon is ${m.phase}, about ${Math.round(m.illumination / 10)}% lit, and is ${m.up ? 'above the horizon' : 'below the horizon'}.`,
    `Outside, the weather is ${s.weather.precip === 'snow' ? 'snowing' : s.weather.precip === 'rain' ? 'raining' : s.weather.cloud > 600 ? 'overcast' : 'clear'}, with a ${s.weather.windSpeed > 600 ? 'strong' : s.weather.windSpeed > 250 ? 'steady' : 'light'} wind from the ${s.weather.windDir}.`,
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

const AGAIN_LEAD = ['Looking about you again, ', 'Another look round: ', 'You look about once more. ', 'Taking in more of it, '];
const BACK_LEAD = (h: Hall): string => `You are back in the ${h.name}.`;

/**
 * The few things worth saying about a place: how big it feels, two or three striking things chosen from all there is (a strange
 * piece of building, a notable statue, the sky or the sea, a bird, the water), the sound, and where the doors lead. Nothing
 * already said about this hall is said again unless asked to be repeated: asking to look again brings new things, as a person
 * would find them, and says so when there is nothing more worth noticing. `look closely` gives the whole.
 *
 * Returns the paragraphs and the keys of what was said, so the caller can remember them.
 */
export function glanceHall(
  h: Hall, s: SceneState, audio: AudioScene, exits: NamedExit[], seen: Seen[], relics: Relic[], flourishes: readonly Flourish[],
  rand: Rand, told: ReadonlySet<string> = new Set(), mode: GlanceMode = 'first', lastSound = '',
): { paras: string[]; said: string[]; sound: string } {
  const out: string[] = [];
  const said: string[] = [];
  let sound = lastSound;
  if (mode === 'first') {
    out.push(`${h.name}\nThe ${LEVEL_WORD[h.level]} level.`);
    const count = h.mood === 'crowd' ? `${countWord(h.slotCount)} statues fill the walls` : `${countWord(h.slotCount)} statues cover the walls in tiers`;
    // life-sized is ordinary and goes unsaid; anything else is said here, once, for the whole hall
    const sizePhrase = h.sizeClass === 'life' ? '' : `, ${SIZE_PHRASE[h.sizeClass]}`;
    out.push(`${sizeSentence(h)} ${count}${sizePhrase}. ${MOOD_SENTENCE[h.mood][Math.floor(rand() * MOOD_SENTENCE[h.mood].length)]}`);
    said.push('scale:said');
  } else if (mode === 'return') {
    out.push(BACK_LEAD(h));
  }

  const items: Item[] = [];
  const fresh = (key: string): boolean => !told.has(key);
  for (const f of flourishes) if (fresh(f.id)) items.push({ weight: 4, group: 'building', key: f.id, text: f.text });
  const canon = seen.filter((sn) => sn.statue.canonId);
  for (const sn of canon.slice(0, 3)) {
    const key = `st:${sn.statue.id}`;
    if (fresh(key)) items.push({ weight: 8, group: 'statue', key, text: `Among the statues you notice ${withArticle(sn.statue.canonLabel as string)}, ${locationPhrase(sn)}.` });
  }
  const plain = seen.filter((sn) => !sn.statue.canonId && fresh(`st:${sn.statue.id}`));
  if (plain.length > 0) {
    const sn = plain[Math.floor(rand() * plain.length)] as Seen;
    items.push({ weight: 2, group: 'statue', key: `st:${sn.statue.id}`, text: `Your eye is caught by ${lowerFirst(describeStatue(h, sn.statue, true)).replace(/\.$/, '')}, ${locationPhrase(sn)}.` });
  }
  const add = (group: string, lines: string[]): void => { for (const l of lines) if (fresh(`${group}:${l}`)) items.push({ weight: 1, group, key: `${group}:${l}`, text: l }); };
  add('sky', skyLines(h, s, rand));
  add('sea', seaLines(h, s, rand));
  add('birds', birdLines(h, s, rand));
  const water = waterSentence(h, s);
  if (water) add('water', [water]);
  const light = lightSentence(h, s);
  if (light) add('light', [light]);
  add('weather', weatherSentences(h, s));
  // the theme is a guess about an ordinary hall; the book's own places are not described by it
  if (h.mood !== 'violent' && h.mood !== 'crowd' && h.tags.length === 0) add('theme', [THEME_SENTENCE[h.theme]]);
  // the size of the statues is said once, in the hall's first glance; it is not said again
  const scale = statueScaleLine(h);
  if (scale && mode !== 'first' && !told.has('scale:said')) add('scale', [scale]);

  // Each kind of thing has its own pull, however many ways there are of saying it: the sky or the sea when they are there,
  // the birds, a striking statue, the building's strangeness. Spread a group's pull over its items.
  const PULL: Record<string, number> = { building: 10, statue: 8, sky: 11, sea: 11, birds: 12, water: 4, light: 3, weather: 3, theme: 1, scale: 3 };
  const size = new Map<string, number>();
  for (const i of items) size.set(i.group, (size.get(i.group) ?? 0) + 1);
  for (const i of items) i.weight = (PULL[i.group] ?? 2) / (size.get(i.group) as number);
  const want = h.kind === 'vestibule' ? 4 : 3;
  const chosen: Item[] = [];
  const groups = new Map<string, number>();
  let pool = items.slice();
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
  const order = ['building', 'theme', 'scale', 'statue', 'sky', 'light', 'weather', 'water', 'sea', 'birds'];
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
    const heard = soundParagraph(audio, s).split(/(?<=[.!?])\s+/)[0];
    // the same sound is not announced hall after hall: only when it differs from the last thing you were told of
    if (heard && heard !== lastSound && fresh(`sound:${heard}`)) { out.push(heard); said.push(`sound:${heard}`); sound = heard; }
  }
  const rp = mode === 'first' ? relicsParagraph(relics, 1) : '';
  if (rp) out.push(rp);
  if (mode !== 'again') out.push(exitsBrief(h, exits));
  return { paras: out.filter(Boolean), said, sound };
}
