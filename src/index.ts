export { createWorld, WORLD_VERSION, type World, type WorldOptions } from './world/world';
export * from './world/layout';
export { getHall, hallId, wallGrids, type Hall, type HallTag, type SizeClass, type Feature, type Stair, type WallGrid } from './world/hall';
export { slotAt, hallSlots, hallStatues, canonLocations } from './world/slots';
export { describeStatue, signature, workshopMark, type Slot, type Statue, type Condition } from './world/statues';
export { regionsAt, DROWNED, CORAL, type Regions } from './world/regions';
export { ordinalWord, parseOrdinal } from './world/words';
