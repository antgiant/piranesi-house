// SceneState: everything a view needs about one place at one moment. Text, audio, map, side-scroller and 3D all read
// this and nothing else about the world's dynamics, so they cannot disagree.

import type { Hall } from '../world/hall';
import { getHall } from '../world/hall';
import type { Level } from '../world/layout';
import type { World } from '../world/world';
import { birdsAt, lightAt, type BirdScene, type Light } from './light';
import { outsideAt, type OutsideNow } from './outside';
import { clock, defaultSimConfig, moon, worldTime, type Clock, type Moon, type SimConfig } from './time';
import { forecast, tideAt, type HallTide, type TideEvent } from './tides';
import { localWeather, weatherAt, type LocalWeather, type Weather } from './weather';

export interface SceneState {
  t: number;
  clock: Clock;
  hall: Hall;
  tide: HallTide;
  /** The next time water will lie on this hall's floor within two hours, if any. */
  nextTide: TideEvent | null;
  weather: Weather;
  here: LocalWeather;
  light: Light;
  moon: Moon;
  birds: BirdScene;
  /** A hint of the world outside, if one is happening in this hall right now (rare). */
  outside: OutsideNow | null;
}

export function sceneAtWorldTime(world: World, x: number, y: number, level: Level, t: number, opts: { forecast?: boolean; outside?: boolean } = {}): SceneState {
  const hall = getHall(world, x, y, level);
  const weather = weatherAt(world, t);
  const here = localWeather(hall, weather);
  const light = lightAt(world, hall, t, weather, here);
  const tide = tideAt(world, hall, t, weather);
  const horizon = opts.forecast === false ? [] : forecast(world, hall, t, 2 * 3_600_000);
  const nextTide = horizon.find((e) => e.endMs > t && !(e.startMs <= t && tide.depthDm > 0)) ?? null;
  return {
    t, clock: clock(t), hall, tide, nextTide, weather, here, light, moon: moon(world, t), birds: birdsAt(hall, t, weather, here, light),
    outside: opts.outside === false ? null : outsideAt(world, hall, t),
  };
}

export function sceneAt(world: World, x: number, y: number, level: Level, realNowMs: number, cfg: SimConfig = defaultSimConfig): SceneState {
  return sceneAtWorldTime(world, x, y, level, worldTime(cfg, realNowMs));
}
