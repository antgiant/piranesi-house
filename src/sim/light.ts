import type { Hall } from '../world/hall';
import type { World } from '../world/world';
import { hashInts } from '../world/rng';
import { birdSeason, type BirdSeason } from './seasons';
import { clock, daylightPermille, moon, moonInDoorway, sunTimes, type SunPhase } from './time';
import type { LocalWeather, Weather } from './weather';

export type LightTone = 'sun' | 'overcast' | 'golden' | 'twilight' | 'moon' | 'starlight' | 'dark';

export interface Light {
  /** Interior light, 0..1000. */
  level: number;
  tone: LightTone;
  sunPhase: SunPhase;
  /** Only the 192nd Western Hall: the moon fills the single doorway. */
  moonInDoorway: boolean;
}

export function lightAt(world: World, hall: Hall, t: number, w: Weather, lw: LocalWeather): Light {
  const c = clock(t);
  const day = daylightPermille(c);
  const m = moon(world, t, c);
  const inDoor = hall.tags.includes('dark-hall') && moonInDoorway(world, t);
  if (hall.tags.includes('dark-hall')) {
    return { level: inDoor ? 60 : 0, tone: inDoor ? 'moon' : 'dark', sunPhase: day.phase, moonInDoorway: inDoor };
  }
  // Windows: the sea-grey lower halls are dimmer; cloud dims the upper ones most.
  const cloudDim = Math.min(950, (hall.level === 2 ? w.cloud * 5 / 10 : lw.cloudHere > 0 ? lw.cloudHere * 6 / 10 : w.cloud * 3 / 10) + lw.fogHere * 0.4);
  const sky = Math.floor((day.level * (1000 - cloudDim)) / 1000);
  const windowed = hall.level === 0 ? Math.floor((sky * 6) / 10) : sky;
  // Stars always shine; a bright moon adds to them.
  const night = 25 + (m.up ? Math.floor((m.illumination * 60) / 1000) : 0);
  const level = Math.max(windowed, night);
  const { sunset } = sunTimes(c.dayOfYear);
  let tone: LightTone;
  if (day.phase === 'night') tone = m.up && m.illumination > 300 ? 'moon' : 'starlight';
  else if (day.phase === 'dawn' || day.phase === 'dusk') tone = 'twilight';
  else tone = cloudDim > 350 ? 'overcast' : 'sun';
  if (hall.tags.includes('golden-wall') && day.phase !== 'night' && c.minuteOfDay >= sunset - 150 && c.minuteOfDay <= sunset) tone = 'golden';
  return { level, tone, sunPhase: day.phase, moonInDoorway: false };
}

export type BirdMode = 'none' | 'roosting' | 'foraging' | 'sheltering' | 'silent' | 'murmuration' | 'nesting' | 'chick' | 'noisy' | 'soaring' | 'shore' | 'hunted';

export interface BirdScene {
  mode: BirdMode;
  /** 0..1000 */
  loudness: number;
  species: string[];
  /** Who has arrived, who is singing, who is raising young, by the date. */
  season: BirdSeason;
}

export function birdsAt(hall: Hall, t: number, w: Weather, lw: LocalWeather, light: Light, tideDepthDm = 0, seed = 0): BirdScene {
  const c = clock(t);
  const season = birdSeason(c.dayOfYear);
  const none: BirdScene = { mode: 'none', loudness: 0, species: [], season };
  const night0 = light.sunPhase === 'night';
  // The upper halls are half open to the sky: birds ride the wind above them by day, and go quiet in storms and cloud.
  if (hall.level === 2) {
    if (w.storm || (w.precip !== 'none' && w.rain > 500) || lw.fogHere >= 600) return { mode: 'silent', loudness: 40, species: [], season };
    // (the book has gulls and little else up here; the House is not to feel too alive)
    if (night0) return none;
    // inside the cloud they are heard more than seen
    return { mode: 'soaring', loudness: lw.cloudHere >= 500 ? 90 : 200, species: ['gulls riding the wind'], season };
  }
  // The lower halls, when the sea has drawn back from them, are picked over by shore birds.
  if (hall.level === 0) {
    if (tideDepthDm > hall.heightM * 4 || night0 || w.storm) return none;
    return { mode: 'shore', loudness: 150, species: ['gulls'], season };
  }
  if (hall.level !== 1 || hall.tags.includes('dark-hall') || hall.regions.drowned) return hall.regions.drowned ? { mode: 'silent', loudness: 0, species: [], season } : none;
  const night = light.sunPhase === 'night';
  const { sunset } = sunTimes(c.dayOfYear);
  if (hall.tags.includes('murmuration') && (c.month >= 9 || c.month <= 2) && c.minuteOfDay >= sunset - 60 && c.minuteOfDay <= sunset + 30 && w.cloud < 700 && lw.rainHere < 200) {
    return { mode: 'murmuration', loudness: 500, species: ['small birds, mostly sparrows'], season };
  }
  if (w.storm || lw.cloudHere >= 500 || lw.fogHere >= 600 || (hall.tags.includes('bird-shelter') && w.cloud >= 700)) {
    return { mode: 'silent', loudness: 60, species: hall.tags.includes('bird-shelter') ? ['gathered flocks of every kind'] : [], season };
  }
  if (lw.rainHere >= 300) return { mode: 'sheltering', loudness: 500, species: ['sparrows', 'blackbirds', 'rooks'], season };
  if (hall.tags.includes('albatross-nest')) return { mode: 'chick', loudness: night ? 80 : 400, species: ['albatross pair', 'albatross chick'], season };
  if (hall.tags.includes('gull-colony')) {
    if (season.nesting) {
      const who = season.fledglings ? 'young gulls, mottled brown, testing their wings among the nests' : season.chicks ? 'herring gulls over their downy chicks' : 'herring gulls on their nests';
      return { mode: 'nesting', loudness: night ? 150 : 800, species: [who], season };
    }
    return { mode: 'roosting', loudness: 150, species: ['herring gulls'], season };
  }
  if (hall.tags.includes('rook-flock')) return night ? { mode: 'roosting', loudness: 80, species: ['rooks'], season } : { mode: 'noisy', loudness: 600, species: ['rooks'], season };
  if (night) return { mode: 'roosting', loudness: 60, species: hall.birdPerches ? ['sparrows shifting on their perches'] : [], season };
  // a buzzard, now and then, hunting the little birds in a hall by day (the book has it once, circling; the small birds go still): about one hour in four hundred in a hall with perches
  if (hall.birdPerches && hashInts(seed, 0xb022, hall.x, hall.y, Math.floor(t / 3600000)) % 400 === 0) return { mode: 'hunted', loudness: 120, species: ['a buzzard'], season };
  // just sparrows, a few: the book's little birds (no dawn chorus, no doves, no songbirds on the pavements; blackbirds come only with the floods and the rain)
  return { mode: 'foraging', loudness: hall.birdPerches ? 150 : 60, species: hall.birdPerches ? ['sparrows'] : ['a few sparrows'], season };
}
