// Print a hall. Usage:
//   npm run hall -- "Ninth Vestibule" [--level 0|1|2] [--seed text] [--no-dead] [--statues N]
//   npm run hall -- --xy -2 1
import { createWorld, getHall, parseCellName, hallStatues, describeStatue, SIDES, type Level } from './index';

const args = process.argv.slice(2);
const flag = (n: string) => args.indexOf(n);
const val = (n: string, d: string) => (flag(n) >= 0 ? (args[flag(n) + 1] as string) : d);

const world = createWorld(val('--seed', 'the-house'), { showDead: flag('--no-dead') < 0 });
const level = Number(val('--level', '1')) as Level;
let x: number;
let y: number;
if (flag('--xy') >= 0) {
  x = Number(args[flag('--xy') + 1]);
  y = Number(args[flag('--xy') + 2]);
} else {
  const name = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1]?.startsWith('--') && a !== name0())).join(' ');
  const c = parseCellName(world, name || 'First Vestibule');
  if (!c) { console.error(`No such place: ${name}`); process.exit(1); }
  x = c.x; y = c.y;
}
function name0() { return ''; }

const h = getHall(world, x, y, level);
const lvl = ['Lower', 'Middle', 'Upper'][level];
console.log(`${h.name}  (${h.kind}, ${lvl} level, cell ${x},${y})`);
console.log(`  ${h.xExtent} m west-east x ${h.yExtent} m south-north, ${h.heightM} m high; long axis ${h.orientation}; ${h.courtyardSides}-sided courtyard`);
console.log(`  mood ${h.mood}, theme ${h.theme}, statues ${h.sizeClass} (about ${(h.statueHeightDm / 10).toFixed(1)} m)`);
console.log(`  tide reach ${(h.tideReachDm / 10).toFixed(1)} m; derelict ${h.regions.derelict}%; tags: ${h.tags.join(', ') || 'none'}`);
console.log(`  windows ${SIDES.map((s) => `${s}${h.windows[s]}`).join(' ')}; doors ${SIDES.map((s) => `${s}${h.doors[s].length}`).join(' ')}`);
for (const s of SIDES) for (const d of h.doors[s]) {
  const to = getHall(world, d.to.x, d.to.y, level).name;
  console.log(`    ${s} wall @${d.pos}: ${d.corridor ? `corridor (${d.corridor}) to ` : ''}${to}`);
}
for (const st of h.stairs) console.log(`  stair ${st.name} on ${st.wall} wall @${st.pos}`);
for (const f of h.features) console.log(`  feature ${f.id}: ${f.note}${f.occupant ? ` [${f.occupant}]` : ''}`);
const statues = hallStatues(world, h);
console.log(`  ${statues.length} statues of ${h.slotCount} slots`);
const canon = statues.filter((s) => s.canonId);
for (const s of canon) console.log(`  * canon ${s.canonId} on ${s.wall} wall, ${s.alongM.toFixed(0)} m along, ${s.baseM} m up: ${describeStatue(h, s)}`);
const n = Number(val('--statues', '6'));
for (const s of statues.filter((s) => !s.canonId).slice(0, n)) console.log(`  - ${s.wall}${s.tier}.${s.slot}: ${describeStatue(h, s)}`);
