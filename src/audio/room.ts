// The echo of a hall, built from its size (design/room.md). Pure: it makes the left and right impulse responses that the engine's convolver plays, so it
// can be measured and tested without a browser.
//
// What a real room does, as measured on clap recordings of a chapel, a concrete garage, a stone powder room and a cave (see design/room.md):
//   * the first reflections arrive only after the sound has crossed to a surface and back: in a hall tens of metres across and high, a tenth of a second or
//     more after the sound itself, then more and more of them until, at the mixing time, they are one wash;
//   * that wash falls away at a rate that depends on frequency: in a stone room 2 kHz lasts about nine-tenths as long as 1 kHz, 4 kHz about three-quarters and
//     8 kHz about six-tenths (and in a hall the air itself takes the highs away as well: 26 dB a second at 8 kHz, 8 dB a second at 4 kHz).
// So: the early part is an image-source model of the hall as a box (each reflection from its true place and weakened by every wall it touched and the length of
// its path), and the late part is noise in seven octave bands, each falling at its own rate, joined to it where the reflections have become dense.

export interface Room {
  /** Metres. */
  lx: number; ly: number; h: number;
  /** Where the listener stands in the hall, metres from the south-west corner. */
  px: number; py: number;
  /** Seconds for the 1 kHz octave to fall 60 dB. */
  rt: number;
  /** 1 for ordinary stone; less where the highs are damped (cloud, water): multiplies the highs' share. */
  damp?: number;
}

export type Rng = () => number;
export const BANDS = [125, 250, 500, 1000, 2000, 4000, 8000] as const;
/** How long each octave lasts compared with 1 kHz in a stone or concrete room (the median of the measured rooms). */
export const MATERIAL = [1, 1, 1, 1, 0.9, 0.78, 0.58] as const;
/** What the air takes in a decibel a second at each octave (20 degrees, 70% humidity): 343 m/s times the absorption in dB a metre. */
export const AIR_DB_PER_S = [0.13, 0.45, 0.96, 1.7, 3.1, 7.9, 26.3] as const;
const C = 343;
/** How much faster each octave is made to fall, to make up for the leakage between octaves. */
const LEAK = [1, 1, 1, 1, 1.05, 1.2, 1.5] as const;

/** Reverberation time of each octave band: the room's decay (as long as the material lets it) plus the air's, as decay rates add. */
export function bandTimes(room: Pick<Room, 'rt' | 'damp'>): number[] {
  const d = room.damp ?? 1;
  return BANDS.map((_, i) => {
    const hi = i >= 4 ? Math.pow(d, (i - 3) / 2) : 1; // damping bites the highs more
    const rate = 60 / (room.rt * MATERIAL[i]! * hi) + AIR_DB_PER_S[i]!;
    return 60 / rate;
  });
}

/** A second-order low-pass, as a function that filters one sample at a time. */
function lowpass(sr: number, fc: number, q: number): (x: number) => number {
  const w = (2 * Math.PI * fc) / sr, alpha = Math.sin(w) / (2 * q), cosw = Math.cos(w);
  const a0 = 1 + alpha, b0 = (1 - cosw) / 2 / a0, b1 = (1 - cosw) / a0, a1 = (-2 * cosw) / a0, a2 = (1 - alpha) / a0;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  return (x: number): number => { const y = b0 * x + b1 * x1 + b0 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x; y2 = y1; y1 = y; return y; };
}

/** A second-order band-pass (constant skirt gain), as a function that filters one sample at a time. */
export function bandpass(sr: number, fc: number, q: number): (x: number) => number {
  const w = (2 * Math.PI * fc) / sr, alpha = Math.sin(w) / (2 * q), cosw = Math.cos(w);
  const a0 = 1 + alpha, b0 = alpha / a0, b2 = -alpha / a0, a1 = (-2 * cosw) / a0, a2 = (1 - alpha) / a0;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  return (x: number): number => { const y = b0 * x + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x; y2 = y1; y1 = y; return y; };
}

export interface Reflection { t: number; gain: number; order: number }

/**
 * The image sources of a box room for a source at the listener (a little below the ears: the feet, the voice): every reflection to the given order, its delay,
 * and its strength weakened by each surface and by distance (1 at four metres, the engine's reference distance). The direct sound is not included.
 */
export function reflections(room: Room, order = 3, maxT = 0.6): Reflection[] {
  const { lx, ly, h, px, py } = room;
  const zs = 1.0, zl = 1.6; // the source low, the ear high
  const rho = { wall: 0.9, floor: 0.93, ceil: 0.9 };
  const out: Reflection[] = [];
  const maxR = maxT * C;
  for (let ix = -order; ix <= order; ix++) for (let iy = -order; iy <= order; iy++) for (let iz = -order; iz <= order; iz++) {
    const n = Math.abs(ix) + Math.abs(iy) + Math.abs(iz);
    if (n === 0 || n > order) continue;
    // the image of the source in a box: reflect in x by the parity of ix, and so on
    const sx = ix % 2 === 0 ? px + ix * lx : -px + (ix + 1) * lx;
    const sy = iy % 2 === 0 ? py + iy * ly : -py + (iy + 1) * ly;
    const sz = iz % 2 === 0 ? zs + iz * h : -zs + (iz + 1) * h;
    const r = Math.hypot(sx - px, sy - py, sz - zl);
    // the bounce off the floor beside you comes with the direct sound (about the first 15 ms): it is part of how a sound reaches you, not an echo
    if (r > maxR || r < 5) continue;
    // surfaces touched: |ix| and |iy| walls; going up (iz > 0) the path meets the ceiling first, going down the floor first, and they alternate
    const vz = Math.abs(iz), first = Math.ceil(vz / 2), second = Math.floor(vz / 2);
    const nCeil = iz > 0 ? first : second, nFloor = iz > 0 ? second : first;
    const g = Math.pow(rho.wall, Math.abs(ix) + Math.abs(iy)) * Math.pow(rho.floor, nFloor) * Math.pow(rho.ceil, nCeil) * (4 / Math.max(4, r));
    out.push({ t: r / C, gain: g, order: n });
  }
  return out.sort((a, b) => a.t - b.t);
}

/**
 * The impulse responses (left, right) of the room, `sr` samples a second. The wet part only: the engine mixes the sound itself in separately.
 * Seeded, so a hall always sounds the same.
 *
 * Smooth, not a handful of echoes: a hall full of statues, pillars and ledges scatters the sound into thousands of tiny reflections, so what the ear gets from the first
 * moment is a build-up of wash, not discrete repeats (the image-source reflections of the empty box, `reflections`, give the first arrival, but played as impulses they
 * ticked and fluttered like a delay pedal, and the drips and footsteps were choppy and electronic). So the wash starts a little before the first reflection and swells over
 * a tenth of a second or two, in seven octaves that each fall at their own rate.
 */
export function buildImpulse(sr: number, room: Room, rng: Rng = Math.random): [Float32Array, Float32Array] {
  const times = bandTimes(room);
  const maxT = Math.min(12, Math.max(...times) * 1.15 + 0.2);
  const n = Math.floor(sr * maxT);
  // when the sound first comes back (the nearest surface and back), and how long the wash takes to swell to full
  const first = reflections(room, 1, 0.8)[0]?.t ?? 0.05;
  const pre = Math.min(0.03, first * 0.4);
  const rise = Math.min(0.25, Math.max(0.05, first * 0.8));
  const ir: [Float32Array, Float32Array] = [new Float32Array(n), new Float32Array(n)];
  for (let ch = 0; ch < 2; ch++) {
    const buf = ir[ch]!;
    for (let b = 0; b < BANDS.length; b++) {
      // the lows and middles through a broad band-pass with a low-pass above it (smooth, a wash, and a steep top so that the long low octaves do not leak into the short high ones); the highs through two steep band-passes
      const f1 = bandpass(sr, BANDS[b]!, b >= 4 ? 0.9 : b <= 1 ? 0.5 : 0.7), f2 = b >= 4 ? bandpass(sr, BANDS[b]!, 0.9) : lowpass(sr, Math.min(BANDS[b]! * 1.7, sr * 0.45), 0.7);
      const bp = (v: number): number => f2(f1(v));
      // (the octaves overlap, so the long decay of one leaks into the next and lengthens it: the highs are made to fall a little faster to land on the intended times)
      const rate = (6.9078 / times[b]!) * LEAK[b]!; // amplitude: exp(-6.9078 t / T) is 60 dB down at T
      for (let i = 0; i < n; i++) {
        const t = i / sr;
        const x = bp(rng() * 2 - 1);
        if (t < pre) continue;
        const u = Math.min(1, (t - pre) / rise);
        buf[i] = (buf[i] ?? 0) + x * (u * u * (3 - 2 * u)) * Math.exp(-rate * Math.max(0, t - pre - rise * 0.5));
      }
    }
  }
  // a very short fade in, so that nothing clicks
  const f = Math.min(n, 48);
  for (let i = 0; i < f; i++) { ir[0][i] = (ir[0][i] ?? 0) * (i / f); ir[1][i] = (ir[1][i] ?? 0) * (i / f); }
  return ir;
}
