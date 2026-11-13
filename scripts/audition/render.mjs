// Render the real AudioEngine offline (Chromium via Playwright) to a 32-bit float stereo WAV, level untouched, so a sound can be measured
// and listened to without playing the game. The random source is seeded, so two renders differ only in what you changed.
//
//   node scripts/audition/render.mjs <outdir> <name> <old|new> <seaGain> <lowpassHz> <swellSec> <reverbWet> <secs> [solo] [sceneJson]
//
//   solo       comma list of sea layers to keep (sub,body,roar,hiss,crack); others are silenced. Empty for all.
//   sceneJson  overrides merged into the AudioScene, e.g. '{"rain":{"gain":0.6,"onWater":1}}'; add "_patterOnly":1 to hear only the rain on water.

import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(ROOT);
const { chromium } = require('playwright');
const [, , outDir, name, model, gain, low, swell, wet, secs, solo, extra] = process.argv;
// bundle the engine for the page (esbuild comes with vite)
const tmp = mkdtempSync(`${tmpdir()}/audition-`);
writeFileSync(`${tmp}/entry.ts`, `import { AudioEngine } from '${ROOT}src/audio/engine';\n(window as any).AudioEngine = AudioEngine;\n`);
execFileSync(`${ROOT}node_modules/.bin/esbuild`, [`${tmp}/entry.ts`, '--bundle', '--format=iife', `--outfile=${tmp}/engine.js`, '--log-level=error']);
const code = readFileSync(`${tmp}/engine.js`, 'utf8');
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent('<html></html>');
await page.addScriptTag({ content: code });
const r = await page.evaluate(async ([model, gain, low, swell, wet, secs, solo, extra]) => {
  const SR = 48000;
  let seed = 12345; Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const OAC = window.OfflineAudioContext;
  window.AudioContext = class extends OAC { constructor() { super(2, SR * secs, SR); this.__t = 0; Object.defineProperty(this, 'currentTime', { get: () => this.__t }); Object.defineProperty(this, 'state', { get: () => 'running' }); } resume() { return Promise.resolve(); } };
  const e = new window.AudioEngine();
  e.seaModel = model;
  const base = { reverb: { decaySec: 4, wet, dampHz: 6000 }, sea: { gain, lowpassHz: low, swellSec: swell }, tide: { kind: 'none', gain: 0, character: null, strikeEverySec: 12 }, falls: { gain: 0 }, rain: { gain: 0, onWater: 0 }, wind: { gain: 0, whistle: 0 }, birds: { mode: 'none', perMinute: 0, loudness: 0.5, species: [], season: {} }, muffle: 0, hush: false, dark: false, surface: 'marble', space: 'large', thunder: 0, portals: [], beds: [], outside: null };
  const ov = extra ? JSON.parse(extra) : {}; delete ov._patterOnly;
  e.setScene({ ...base, ...ov });
  await e.start();
  const ctx = e.ctx;
  const only = extra && JSON.parse(extra)._patterOnly;
  if (only) { e.rainGain.gain.cancelScheduledValues(0); e.rainGain.gain.setValueAtTime(0, 0); }
  if (solo) for (const [k, layer] of Object.entries(e.sea.layers)) if (!solo.split(',').includes(k)) for (const m of layer.master) { m.gain.cancelScheduledValues(0); m.gain.setValueAtTime(0, 0); }
  for (let t = 0; t < secs - 0.01; t += 0.2) { ctx.__t = t; if (!only) e.tickEvents(); }
  ctx.__t = 0;
  const b = await ctx.startRendering();
  return { L: Array.from(b.getChannelData(0)), R: Array.from(b.getChannelData(1)), sr: SR, waves: e.sea ? e.sea.waveCount : null };
}, [model, +gain, +low, +swell, +wet, +secs, solo ?? '', extra ?? '']);
const n = r.L.length, buf = Buffer.alloc(44 + n * 8);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 8, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(3, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(r.sr, 24); buf.writeUInt32LE(r.sr * 8, 28); buf.writeUInt16LE(8, 32); buf.writeUInt16LE(32, 34); buf.write('data', 36); buf.writeUInt32LE(n * 8, 40);
for (let i = 0; i < n; i++) { buf.writeFloatLE(r.L[i], 44 + i * 8); buf.writeFloatLE(r.R[i], 48 + i * 8); }
writeFileSync(`${outDir}/${name}.wav`, buf);
console.log(name, 'waves', r.waves);
await browser.close();
