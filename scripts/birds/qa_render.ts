// Render every call of the library (birdlib.ts) as the game would, into one WAV per kind with a gap after each, and write an index of where each call is: for the round-trip check in qa.py.
//   npx tsx scripts/birds/qa_render.ts <out_dir>
import { writeFileSync } from 'node:fs';
import { LIB } from '../../src/audio/birdlib';
import { CALLS } from '../../src/audio/birdcalls';
import { libTemplate, renderCall } from '../../src/audio/birdsynth';
const out = process.argv[2]!, sr = 44100;
let seed = 11; const rng = (): number => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
for (const [kind, voices] of Object.entries(LIB)) {
  const parts: Float32Array[] = [], index: { voice: number; call: number; t: number; dur: number }[] = []; let t = 0;
  voices.forEach((v, vi) => v.calls.forEach((c, ci) => {
    const tpl = libTemplate((CALLS as Record<string, { bands: number[] }>)[kind]!.bands, v, c);
    const x = renderCall(sr, tpl, rng); parts.push(x, new Float32Array(Math.floor(sr * 0.5))); index.push({ voice: vi, call: ci, t, dur: x.length / sr }); t += x.length / sr + 0.5;
  }));
  const n = parts.reduce((a, p) => a + p.length, 0), b = Buffer.alloc(44 + n * 2);
  b.write('RIFF'); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  let o = 44; for (const p of parts) for (const v of p) { b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v * 0.6)) * 32767), o); o += 2; }
  writeFileSync(`${out}/${kind}.wav`, b); writeFileSync(`${out}/${kind}.json`, JSON.stringify(index));
}
