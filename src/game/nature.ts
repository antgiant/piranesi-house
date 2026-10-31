// What a visitor notices of the living and changing world around the building: the sky from the upper halls, the sea and what
// lives in it from the lower ones and the flooded middle ones, and the birds, who are everywhere. Each function gives a handful of
// short things that could be said right now; the caller picks one or two, as a person would, rather than all of them.
// Pure functions of the scene and a random source.

import type { SceneState } from '../sim/scene';
import { sunTimes } from '../sim/time';
import type { Hall } from '../world/hall';
import { hashInts } from '../world/rng';
import type { Rand } from './wander';

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
const pick = <T,>(rand: Rand, xs: readonly T[]): T => xs[Math.min(xs.length - 1, Math.floor(rand() * xs.length))] as T;

function windWord(s: SceneState): string | null {
  const w = s.weather;
  if (w.windSpeed > 600) return `a hard wind from the ${w.windDir} drags at the cloud`;
  if (w.windSpeed > 250) return `a steady wind from the ${w.windDir} pushes the cloud along`;
  return null;
}

/** The sky as seen from the upper halls, where the roof is half gone: changes with the hour, the cloud, the rain and the moon. */
export function skyLines(h: Hall, s: SceneState, rand: Rand): string[] {
  if (h.level !== 2) return [];
  const w = s.weather;
  const out: string[] = [];
  const phase = s.light.sunPhase;
  const mins = s.clock.minuteOfDay;
  const { sunrise, sunset } = sunTimes(s.clock.dayOfYear);
  const dayFrac = Math.max(0, Math.min(1, (mins - sunrise) / Math.max(1, sunset - sunrise)));
  const wind = windWord(s);

  const inCloud = s.here.cloudHere >= 500;
  if (inCloud) {
    out.push('Cloud has come in through the openings and stands in the hall in slow grey walls, so that the far statues come and go.');
    out.push('The cloud is inside the hall with you, cold and wet on the face, and every sound is soft.');
    out.push('A bank of cloud lies along the floor and rises as you watch, taking the lower tiers of statues into itself, one by one.');
  }
  if (w.lightning) out.push('Lightning shivers behind the cloud, and for an instant every statue stands out white and flat, as if cut from paper.');
  if (w.storm) out.push('Black cloud tears across the gap overhead, fast and low, and the roof timbers creak.');
  if (w.precip === 'rain') out.push(pick(rand, ['Rain falls through the open roof in long grey threads, and the statues shine with it.', 'Rain comes down through the broken roof and runs off every outstretched arm in a thread.', 'The roof is open, and the rain simply comes in, as if the hall were a courtyard.']));
  if (w.precip === 'snow') out.push(pick(rand, ['Snow comes down through the open roof in big slow flakes, and lies on every shoulder.', 'Snow turns in the air above the hall, and settles, and the hall grows quieter with each minute.']));
  if (inCloud) return out;
  if (phase === 'dawn') {
    out.push(pick(rand, ['The sky in the gap is going the colour of the inside of a shell, pearl at the edges and a faint pink in the middle.', 'Dawn is coming up behind the cloud: a thin line of gold along the roof edge, and the stars going out one by one.']));
  } else if (phase === 'dusk') {
    out.push(pick(rand, ['The sky above the roof is barred with orange and violet, and the first star is out.', 'Dusk has turned the high cloud the colour of a dying fire, and the hall below it has gone blue.']));
  } else if (phase === 'night') {
    if (w.cloud < 500) {
      out.push(pick(rand, ['Stars crowd the gap in the roof, more than you could count, and the great statues are only shapes against them.', 'The sky above the open roof is black and full of stars, very close.']));
      if (s.moon.up) out.push(`The moon, ${s.moon.phase}, stands over the broken roof and lays a pale light on the ${h.xExtent > h.yExtent ? 'east-west' : 'north-south'} length of the hall.`);
    } else {
      out.push('The sky is a dark roof of cloud, lit faintly from above where the moon is.');
    }
  } else if (w.cloud < 250) {
    out.push(pick(rand, [
      dayFrac < 0.35 ? 'The morning sun comes in low through the gap, and every statue wears a long shadow.' : dayFrac > 0.65 ? 'The evening sun comes in low from the other side, and the shadows have turned the other way.' : 'The sky between the roof beams is a deep clean blue, and the noon sun stands almost overhead.',
      'The sky is a clear hard blue, and a thin high cloud is the only thing in it.',
    ]));
  } else if (w.cloud < 650) {
    out.push(pick(rand, ['Broken cloud crosses the gap, and its shadows cross the floor one after another, slowly.', 'White cloud drifts by overhead, and the light on the statues comes and goes, like breath.']));
  } else if (w.precip === 'none') {
    out.push(pick(rand, ['A low grey roof of cloud lies just above the building, even and shadowless, and the light is the colour of pewter.', 'The sky has come down to the rafters in a soft grey, and the horizon is gone.']));
  }
  if (wind && !w.storm) out.push(`Above the roof, ${wind}.`);
  if (w.frost) out.push('A hem of frost lies along every ledge and rail, and your breath smokes.');
  return out;
}

/** The sea, and what lives in it, in the lower halls (and wherever the water has come into the middle ones). */
export function seaLines(h: Hall, s: SceneState, rand: Rand): string[] {
  const t = s.tide;
  const out: string[] = [];
  const night = s.light.sunPhase === 'night';
  const octopus = hashInts(h.x, h.y, 0x0c70) % 9 === 0;
  if (t.lake) {
    out.push('A fish rises in the lake and leaves a ring of ripples that runs slowly to the statues\' feet.');
    out.push('White water-lilies float at the edge of the lake, their flowers shut or open as the hour decides.');
    out.push('Under the surface, a long way down, a drowned face looks up through the dark.');
    return out;
  }
  if (h.level === 0) {
    const full = t.depthDm > h.heightM * 4;
    if (full) {
      out.push(pick(rand, ['A shoal of small silver fish turns all together, and the whole of it flashes once and is gone.', 'Fish hang in the water round the statues, facing the current, and slide aside as you pass.']));
      out.push('Weed streams out from every outstretched arm, long and dark and slowly moving.');
      out.push(pick(rand, ['A lobster picks its way along a plinth with the slow care of a very old man.', 'Mussels cover the lower tiers in blue-black beds, and between them small crabs go in and out of the shadows.']));
      out.push('A starfish clings to a statue\'s cheek, orange against the grey stone.');
      if (octopus) out.push('An octopus looks out from the hollow of a statue\'s open hand, one eye on you, and changes colour to match the stone as you watch.');
      if (night && s.moon.up) out.push('The fish have gathered in the bars of moonlight that fall through the windows, and hang there in the water like stars.');
      if (h.regions.coral) out.push('Coral has grown over the statues here, in red and white crusts and pale branches; fish go in and out of it like birds.');
    } else if (t.depthDm > 0) {
      out.push('The water is shallow and the floor shows through it: small fish dart between the shells, and a crab sidles away sideways.');
      out.push('Pools lie between the plinths, each with its own small world of weed and darting fish.');
    } else {
      out.push(pick(rand, ['The sea has left the pavement strewn with weed, pebbles and shells, and in every hollow a pool, with a crab in it, or a darting fish.', 'The pavement is wet and bare, and in the pools between the plinths small fish are waiting for the sea to come back.']));
      out.push('Starfish lie on the stones where the water left them, orange and purple.');
    }
    return out;
  }
  if (h.level === 1 && t.depthDm > 0) {
    out.push(pick(rand, ['Small silver fish flicker in the shallows round your feet, carried in on the tide.', 'A crab goes sideways along a plinth with the water, quite unbothered.', 'Weed floats in the water and catches on the statues\' knees.']));
    if (t.depthDm >= 9) out.push('Something large and silver turns slowly under the surface and is gone.');
  }
  return out;
}

/** Birds, at every level, because they are the most common living thing a visitor will see. */
export function birdLines(h: Hall, s: SceneState, rand: Rand): string[] {
  const b = s.birds;
  const out: string[] = [];
  switch (b.mode) {
    case 'foraging':
      out.push(pick(rand, [
        'A sparrow drops onto the shoulder of a statue, looks you over with one eye, and is gone.',
        'A blackbird sings from a high plinth, a short bright phrase, repeated, as if to see whether the hall would answer.',
        'A small flock sweeps along the wall and lands, all at once, on the same statue.',
        'A bird no bigger than a fist is walking along an outstretched arm like a rope-walker.',
        'Two sparrows quarrel in a statue\'s hair, and the stone face looks on with great patience.',
      ]));
      break;
    case 'soaring':
      if (s.here.cloudHere >= 500) {
        out.push(pick(rand, ['Out of the cloud come the cries of gulls, near and then far, though there is nothing to see.', 'Something large passes through the cloud overhead, a dark shape and a rush of wings, and is gone.']));
        break;
      }
      out.push(pick(rand, [
        'Gulls ride the wind above the broken roof, tilting, never once moving their wings.',
        'Swifts scream through the gaps in the roof in tight fast parties, and are away over the edge before you can follow them.',
        'A single gull stands on a roof-beam, white against the sky, and looks down at the hall as if it owned it.',
      ]));
      break;
    case 'shore':
      out.push(pick(rand, [
        'A gull pulls weed from the foot of a wall, looking for something, and flaps up to the ledge with it.',
        'A little wader runs along the edge of the pool in short fits, stops, probes, and runs on.',
      ]));
      break;
    case 'roosting':
      out.push('Birds sit along the ledges with their heads tucked in, and shift and mutter in their sleep.');
      break;
    case 'sheltering':
      out.push('Birds are crowded onto every dry ledge, sparrows and blackbirds and rooks, complaining about the rain.');
      break;
    case 'nesting':
      out.push('A gull on her nest rises with a scream at your passing and settles again, glaring.');
      break;
    case 'noisy':
      out.push('The rooks quarrel in the high statues, and one comes down and walks, bow-legged, across the floor, to see what you are.');
      break;
    case 'murmuration':
      out.push('The birds go up all together and pour across the vestibule like smoke, tightening and loosening, and every statue is for a moment a different shape of shadow.');
      break;
    case 'chick':
      out.push('One of the great white birds on the nest lifts her head and looks at you down a beak like a bone knife.');
      break;
    default:
      break;
  }
  return out;
}
