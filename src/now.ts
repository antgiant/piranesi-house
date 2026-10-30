// Describe a place at a moment. Usage:
//   npm run now -- "Ninth Vestibule" [--at 2027-03-01T12:00:00Z] [--level 0|1|2] [--seed text] [--join]
import { createWorld, getHall, parseCellName, sceneAtWorldTime, worldTime, defaultSimConfig, formatClock, nextJoin, REAL_ZERO_MS, type Level } from './index';

const args = process.argv.slice(2);
const flag = (n: string) => args.indexOf(n);
const val = (n: string, d: string) => (flag(n) >= 0 ? (args[flag(n) + 1] as string) : d);
const skip = new Set(['--at', '--level', '--seed']);
const name = args.filter((a, i) => !a.startsWith('--') && !skip.has(args[i - 1] ?? '')).join(' ') || 'First Vestibule';

const world = createWorld(val('--seed', 'the-house'));
const cell = parseCellName(world, name);
if (!cell) { console.error(`No such place: ${name}`); process.exit(1); }
const level = Number(val('--level', '1')) as Level;
const join = nextJoin(world, worldTime(defaultSimConfig, Date.now()));
const t = flag('--join') >= 0 ? join : worldTime(defaultSimConfig, Date.parse(val('--at', new Date().toISOString())));
const s = sceneAtWorldTime(world, cell.x, cell.y, level, t);
const h = getHall(world, cell.x, cell.y, level);

console.log(`${h.name} (${['Lower', 'Middle', 'Upper'][level]} level)   ${formatClock(s.clock)}`);
console.log(`  sky: ${s.light.sunPhase}, moon ${s.moon.phase} (${(s.moon.illumination / 10).toFixed(0)}% lit, ${s.moon.up ? 'up' : 'down'}); light ${s.light.level / 10}% ${s.light.tone}${s.light.moonInDoorway ? ' (moon in the doorway)' : ''}`);
console.log(`  weather: ${(s.weather.tempTenths / 10).toFixed(1)}C, cloud ${s.weather.cloud / 10}%, wind ${s.weather.windDir} ${s.weather.windSpeed / 10}%${s.weather.storm ? ' STORM' : ''}, ${s.weather.precip}${s.weather.lightning ? ', lightning' : ''}${s.weather.frost ? ', frost' : ''}`);
console.log(`  here: cloud ${s.here.cloudHere / 10}%, rain ${s.here.rainHere / 10}%${s.here.streams ? ', streams down the walls' : ''}`);
const tide = s.tide;
console.log(`  water: ${tide.lake ? 'still freshwater lake' : tide.depthDm === 0 ? 'dry' : `${(tide.depthDm / 10).toFixed(1)} m, ${tide.trend}`}${tide.sources.length ? ` from ${tide.sources.join('+')}` : ''}${tide.character ? ` (${tide.character.colour}, ${tide.character.foam})` : ''}${tide.joined >= 2 ? `  [${tide.joined} tides joined]` : ''}`);
if (s.nextTide) console.log(`  next tide: in ${Math.round((s.nextTide.startMs - t) / 60000)} min, peak ${(s.nextTide.peakDm / 10).toFixed(1)} m from ${s.nextTide.sources.join('+')}`);
console.log(`  birds: ${s.birds.mode}${s.birds.species.length ? ` (${s.birds.species.join(', ')})` : ''}, loudness ${s.birds.loudness / 10}%`);
console.log(`  next great join of three tides: ${formatClock(sceneAtWorldTime(world, 0, 0, 1, join).clock)}`);
void REAL_ZERO_MS;
