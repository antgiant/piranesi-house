// Render a walk across a real hall through the real world, director and engine (offline, Chromium via Playwright), to hear the soundscape follow you.
//
//   node scripts/audition/walk.mjs <outdir> <name> <follow|static> [seed] [seconds] [falls|stairs|leaks] [mute]
//   mute: comma list of parts to silence, to find what a sound is: wind, birds, leaks, stairs, falls, beds, portals, sea, rain, tide, outside
//
// It finds a hall with a fall and doors that carry sound, sets you at the far wall and walks you toward the fall (at a brisk 2.2 m/s so a
// huge hall fits the clip). `follow` gives the director your place each second; `static` is the old hall-wide sound, the same all the way.
// Scenarios: `falls` (default): toward a fall; `stairs`: toward the great stair while a tide drains back down it, in rainy weather if there is any;
// `leaks`: along a line that passes a leak, in wet weather. Prints the hall, the path, and how the fall's level and direction change along it. Writes a 32-bit float stereo WAV.
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(ROOT);
const { chromium } = require('playwright');
const [, , outDir, name, mode = 'follow', seed = 'the-house', secsArg = '70', scenario = 'falls', muteArg = ''] = process.argv;
const tmp = mkdtempSync(`${tmpdir()}/walk-`);
writeFileSync(`${tmp}/entry.ts`, `
import { AudioEngine } from '${ROOT}src/audio/engine';
import { audioFor } from '${ROOT}src/audio/director';
import { createWorld } from '${ROOT}src/world/world';
import { getHall } from '${ROOT}src/world/hall';
import { sceneAtWorldTime } from '${ROOT}src/sim/scene';
import { MS } from '${ROOT}src/sim/time';
import { nearestOnWall, wallPoint, headingOfMove } from '${ROOT}src/audio/pose';
import { vestibuleCell } from '${ROOT}src/world/layout';
import { leaksOf } from '${ROOT}src/world/leaks';
import { hydrologyAt } from '${ROOT}src/sim/hydrology';
Object.assign(window as any, { AudioEngine, audioFor, createWorld, getHall, sceneAtWorldTime, MS, nearestOnWall, wallPoint, headingOfMove, vestibuleCell, leaksOf, hydrologyAt });
`);
execFileSync(`${ROOT}node_modules/.bin/esbuild`, [`${tmp}/entry.ts`, '--bundle', '--format=iife', `--outfile=${tmp}/walk.js`, '--log-level=error']);
const code = readFileSync(`${tmp}/walk.js`, 'utf8');
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent('<html></html>');
await page.addScriptTag({ content: code });
const r = await page.evaluate(async ([mode, seed, secs, scenario, muteArg]) => {
  const mute = new Set(muteArg.split(',').filter(Boolean));
  let rs = 12345; Math.random = () => { rs = (Math.imul(rs, 1664525) + 1013904223) >>> 0; return rs / 4294967296; };
  const w = createWorld(seed);
  const shortOf = (p, q, d) => { const vx = q.x - p.x, vy = q.y - p.y, len = Math.hypot(vx, vy) || 1; return { x: q.x - (vx / len) * d, y: q.y - (vy / len) * d }; };
  let pick = null, far, end, extra = {};
  if (scenario === 'stairs') {
    // a vestibule whose tide is draining back down its stair (the wettest such moment found)
    let best = -1;
    for (let n = 1; n <= 24; n++) {
      const v = vestibuleCell(w, n); if (!v) continue;
      const h = getHall(w, v.x, v.y, 1); if (!h.stairs.length) continue;
      for (let t = MS.hour; t < 60 * MS.day; t += 20 * MS.min) {
        const sc = sceneAtWorldTime(w, v.x, v.y, 1, t, { forecast: false });
        if (sc.tide.depthDm > 3 && sc.tide.depthDm < 12 && sc.tide.trend === 'falling') { /* draining through the shallows, not over your head */ const score = 20 - Math.abs(sc.tide.depthDm - 7) + 40 * hydrologyAt(w, t).streams; if (score > best) { best = score; pick = { x: v.x, y: v.y, t }; } }
      }
    }
    if (!pick) return { error: 'no draining vestibule' };
    const h = getHall(w, pick.x, pick.y, 1), st = h.stairs[0], at = wallPoint(h, st.wall, st.pos);
    const cx = h.xExtent / 2, cy = h.yExtent / 2;
    far = { x: Math.max(2, Math.min(h.xExtent - 2, 2 * cx - at.x)), y: Math.max(2, Math.min(h.yExtent - 2, 2 * cy - at.y)) };
    end = shortOf(far, at, 5);
    extra = { stair: { wall: st.wall, pos: st.pos }, tideDm: sceneAtWorldTime(w, pick.x, pick.y, 1, pick.t, { forecast: false }).tide.depthDm };
  } else if (scenario === 'leaks') {
    // an ordinary big hall with no fall, at the wettest moment found, along a line that passes 3 m from its busiest leak
    let bestD = -1;
    for (let x = -14; x < 14; x++) for (let y = -14; y < 14; y++) {
      const h = getHall(w, x, y, 1);
      if (h.falls || h.regions.drowned || h.tags.includes('dark-hall') || h.xExtent < 120 || h.stairs.length) continue;
      for (let t = 20 * MS.day; t < 200 * MS.day; t += 6 * MS.hour) { const d = hydrologyAt(w, t).dripping; if (d > bestD) { bestD = d; pick = { x, y, t }; } }
      if (pick) break;
    }
    if (!pick) return { error: 'no suitable hall' };
    const h = getHall(w, pick.x, pick.y, 1);
    const lk = leaksOf(w, h).slice().sort((a, b) => b.perMin - a.perMin)[0];
    const a0 = { x: Math.max(3, lk.x - 38), y: Math.max(3, Math.min(h.yExtent - 3, lk.y + 3)) }, a1 = { x: Math.min(h.xExtent - 3, lk.x + 38), y: a0.y };
    far = a0; end = a1;
    extra = { leak: { x: Math.round(lk.x), y: Math.round(lk.y), z: +lk.z.toFixed(1), pitch: Math.round(lk.pitch) }, dripping: +bestD.toFixed(2) };
  } else {
    // a hall with a fall, where something is also heard through a doorway
    for (let x = -14; x < 14 && !pick; x++) for (let y = -14; y < 14 && !pick; y++) {
      const h = getHall(w, x, y, 1);
      if (!h.falls || h.xExtent < 110) continue;
      for (let t = MS.hour; t < 6 * MS.day; t += 2 * MS.hour) {
        const a = audioFor(w, sceneAtWorldTime(w, x, y, 1, t), { facing: 'N' });
        if (a.portals.length > 0 && a.falls.gain > 0.2) { pick = { x, y, t }; break; }
      }
    }
    if (!pick) return { error: 'no suitable hall' };
    const h = getHall(w, pick.x, pick.y, 1), f = h.falls;
    const mid = wallPoint(h, f.wall, (f.from + f.to) / 2);
    const cx = h.xExtent / 2, cy = h.yExtent / 2;
    far = { x: Math.max(2, Math.min(h.xExtent - 2, 2 * cx - mid.x)), y: Math.max(2, Math.min(h.yExtent - 2, 2 * cy - mid.y)) };
    end = shortOf(far, mid, 6);
  }
  const h = getHall(w, pick.x, pick.y, 1);
  const speed = 2.2, dist = Math.hypot(end.x - far.x, end.y - far.y);
  const walkS = Math.min(secs - 6, dist / speed);
  const SR = 48000;
  const OAC = window.OfflineAudioContext;
  window.AudioContext = class extends OAC { constructor() { super(2, SR * secs, SR); this.__t = 0; Object.defineProperty(this, 'currentTime', { get: () => this.__t }); Object.defineProperty(this, 'state', { get: () => 'running' }); } resume() { return Promise.resolve(); } };
  const e = new AudioEngine();
  const heading = headingOfMove(far, end, 0);
  const sceneAt = (sec) => {
    const u = Math.max(0, Math.min(1, sec / walkS));
    const pose = { x: far.x + (end.x - far.x) * u, y: far.y + (end.y - far.y) * u, heading };
    const a = mode === 'follow' ? audioFor(w, sceneAtWorldTime(w, pick.x, pick.y, 1, pick.t + sec * 1000), { pose, facing: 'N' }) : audioFor(w, sceneAtWorldTime(w, pick.x, pick.y, 1, pick.t), { facing: 'N' });
    if (mute.has('wind')) a.wind = { gain: 0, whistle: 0 };
    if (mute.has('birds')) { a.birds = { ...a.birds, perMinute: 0 }; for (const p of a.portals) p.birds = { ...p.birds, perMinute: 0 }; }
    if (mute.has('leaks')) a.leaks = [];
    if (mute.has('stairs')) a.stairs = { ...a.stairs, flow: 0 };
    if (mute.has('falls')) a.falls = { ...a.falls, gain: 0 };
    if (mute.has('beds')) a.beds = [];
    if (mute.has('portals')) a.portals = [];
    if (mute.has('sea')) a.sea = { ...a.sea, gain: 0 };
    if (mute.has('rain')) { a.rain = { gain: 0, onWater: 0 }; }
    if (mute.has('tide')) a.tide = { ...a.tide, kind: 'none', gain: 0 };
    if (mute.has('outside')) a.outside = null;
    if (mute.has('thunder')) a.thunder = 0;
    return { a, pose };
  };
  e.setScene(sceneAt(0).a);
  await e.start();
  const ctx = e.ctx, log = [];
  for (let t = 0; t < secs - 0.01; t += 0.2) {
    ctx.__t = t;
    if (Math.abs(t - Math.round(t)) < 0.01) { const s = sceneAt(t); e.setScene(s.a); if (Math.round(t) % 10 === 0) log.push({ t: Math.round(t), wind: +s.a.wind.gain.toFixed(2), whistle: +s.a.wind.whistle.toFixed(2), birds: s.a.birds.mode + ':' + s.a.birds.perMinute, rainG: +s.a.rain.gain.toFixed(2), sea: +s.a.sea.gain.toFixed(2), tide: s.a.tide.kind, stairs: +s.a.stairs.flow.toFixed(2), leaks: s.a.leaks.length, fall: +s.a.falls.gain.toFixed(3), az: s.a.falls.az === undefined ? null : Math.round(s.a.falls.az), bearing: s.a.falls.bearing, portals: s.a.portals.map((p) => `${p.bearing}${p.az === undefined ? '' : '@' + Math.round(p.az)}:${p.loudness.toFixed(2)}`) }); }
    e.tickEvents();
  }
  ctx.__t = 0;
  const b = await ctx.startRendering();
  return { calls: e.stats().calls, hall: { x: pick.x, y: pick.y, size: [Math.round(h.xExtent), Math.round(h.yExtent)], falls: h.falls, ...extra }, path: { far, end, dist: Math.round(dist), walkS: Math.round(walkS) }, log, L: Array.from(b.getChannelData(0)), R: Array.from(b.getChannelData(1)), sr: SR };
}, [mode, seed, +secsArg, scenario, muteArg]);
if (r.error) { console.error(r.error); process.exit(1); }
const n = r.L.length, buf = Buffer.alloc(44 + n * 8);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 8, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(3, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(r.sr, 24); buf.writeUInt32LE(r.sr * 8, 28); buf.writeUInt16LE(8, 32); buf.writeUInt16LE(32, 34); buf.write('data', 36); buf.writeUInt32LE(n * 8, 40);
for (let i = 0; i < n; i++) { buf.writeFloatLE(r.L[i], 44 + i * 8); buf.writeFloatLE(r.R[i], 48 + i * 8); }
writeFileSync(`${outDir}/${name}.wav`, buf);
console.log(JSON.stringify({ hall: r.hall, path: r.path, birdCallsAndThunder: r.calls }));
for (const l of r.log) console.log(JSON.stringify(l));
await browser.close();
