// Door-graph pathfinding. Used by tests now, by navigation, audio portals and the map later.
import type { Cell, Level } from './layout';
import { SIDES, cellKey, wallDoors } from './layout';
import type { World } from './world';

/** Fewest rooms entered when walking through ordinary doors (corridors excluded), or null if not reachable. */
export function shortestRooms(world: World, from: Cell, to: Cell, level: Level = 1, limit = 60): number | null {
  if (from.x === to.x && from.y === to.y) return 0;
  const seen = new Set<string>([cellKey(from.x, from.y)]);
  let frontier: Cell[] = [from];
  for (let d = 1; d <= limit; d++) {
    const next: Cell[] = [];
    for (const c of frontier) {
      for (const side of SIDES) {
        const doors = wallDoors(world, c.x, c.y, side, level).filter((x) => x.corridor === 0);
        if (doors.length === 0) continue;
        const n = doors[0]!.to;
        const k = cellKey(n.x, n.y);
        if (seen.has(k)) continue;
        if (n.x === to.x && n.y === to.y) return d;
        seen.add(k);
        next.push(n);
      }
    }
    frontier = next;
  }
  return null;
}
