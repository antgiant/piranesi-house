// One bird call, made from a template measured on real recordings (design/birds.md, scripts/birds/template.py). A template is a few dozen numbers: the pitch contour of the call
// (the fundamental, 12 points across it), its loudness along it, the spectrum of its tonal part and of its noisy part (dB in third octaves), and how long it lasts and how much
// that varies. The call is a harmonic series that follows the contour, each harmonic as loud as the tonal spectrum says at its own frequency, plus noise shaped by the noise
// spectrum, all under the loudness contour; every call is a little different (pitch, length, contour) as every real one is. Pure, so it is tested without a browser.

export type Rng = () => number;

export interface CallTemplate {
  /** Median duration in seconds, and its 10th and 90th percentile. */
  dur: number;
  durRange: [number, number];
  /** The fundamental in Hz, 12 points across the call. */
  f0: number[];
  /** Spread (natural-log standard deviation) of the call's overall pitch from call to call. */
  f0Spread: number;
  /** Loudness along the call, dB below its peak, 12 points. */
  env: number[];
  /** Third-octave centres, from 125 Hz up (the same for every template). */
  bands: number[];
  /** The tonal spectrum and the noise spectrum, dB re the loudest tonal band. */
  H: number[];
  N: number[];
  /** Amplitude modulation, as rate in Hz and depth 0..1 (a whirr), if the call has it. */
  am?: [number, number];
}

const gauss = (r: Rng): number => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());

function interp(points: number[], u: number): number {
  const x = Math.min(1, Math.max(0, u)) * (points.length - 1), i = Math.floor(x), f = x - i;
  return (points[i] ?? 0) * (1 - f) + (points[Math.min(points.length - 1, i + 1)] ?? 0) * f;
}

/** Level in dB of a spectrum given in third octaves, at a frequency (linear in log-frequency; floored at -90). */
function levelAt(spec: number[], bands: number[], hz: number): number {
  if (hz <= (bands[0] ?? 125)) return Math.max(-90, spec[0] ?? -90);
  const x = 3 * Math.log2(hz / (bands[0] ?? 125)), i = Math.floor(x);
  if (i >= spec.length - 1) return Math.max(-90, spec[spec.length - 1] ?? -90);
  const f = x - i;
  return Math.max(-90, (spec[i] ?? -90) * (1 - f) + (spec[i + 1] ?? -90) * f);
}

/** An in-place radix-2 FFT of a complex signal, forward or inverse (n a power of two). */
function fft(re: Float64Array, im: Float64Array, inverse: boolean): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j]!, re[i]!]; [im[i], im[j]] = [im[j]!, im[i]!]; } }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = ((inverse ? 2 : -2) * Math.PI) / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = i + k + len / 2;
        const tr = re[b]! * cr - im[b]! * ci, ti = re[b]! * ci + im[b]! * cr;
        re[b] = re[a]! - tr; im[b] = im[a]! - ti; re[a] = re[a]! + tr; im[a] = im[a]! + ti;
        const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
      }
    }
  }
  if (inverse) for (let i = 0; i < n; i++) { re[i] = re[i]! / n; im[i] = im[i]! / n; }
}

/** Noise with the template's noise spectrum (random phases, shaped in the frequency domain), `n` samples. */
function shapedNoise(sr: number, n: number, tpl: CallTemplate, rng: Rng, pitchScale: number): Float32Array {
  let m = 1; while (m < n) m <<= 1;
  const re = new Float64Array(m), im = new Float64Array(m);
  for (let k = 1; k < m / 2; k++) {
    const hz = (k * sr) / m;
    const g = Math.pow(10, levelAt(tpl.N, tpl.bands, hz / pitchScale) / 20) * Math.sqrt(1 / Math.max(1, hz)); // a flat third-octave level per band means a falling density per hertz
    const ph = rng() * 2 * Math.PI;
    re[k] = g * Math.cos(ph); im[k] = g * Math.sin(ph); re[m - k] = re[k]!; im[m - k] = -im[k]!;
  }
  fft(re, im, true);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = re[i]!;
  return out;
}

/** Render one call: `sr` samples a second; peak amplitude about 1. */
export function renderCall(sr: number, tpl: CallTemplate, rng: Rng = Math.random, opts: { duration?: number; pitch?: number } = {}): Float32Array {
  const dur = opts.duration ?? Math.min(tpl.durRange[1], Math.max(tpl.durRange[0], tpl.dur * Math.exp(0.18 * gauss(rng))));
  const n = Math.max(64, Math.floor(dur * sr));
  const scale = (opts.pitch ?? 1) * Math.exp(Math.min(2, Math.max(-2, gauss(rng))) * tpl.f0Spread);
  // a slow wobble of the contour, different for each call
  const w1 = (rng() - 0.5) * 0.08, w2 = (rng() - 0.5) * 0.06, ph = rng() * 6.28;
  const out = new Float32Array(n);
  const hasTone = Math.max(...tpl.H) > -60;
  const phases = new Float64Array(40);
  const amPhase = rng() * 6.28;
  const noise = shapedNoise(sr, n, tpl, rng, scale);
  let phi = 0;
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1);
    const f0 = interp(tpl.f0, u) * scale * (1 + w1 * Math.sin(ph + 9 * u) + w2 * (u - 0.5));
    let env = Math.pow(10, interp(tpl.env, u) / 20);
    if (tpl.am) env *= 1 - tpl.am[1] * 0.5 * (1 - Math.cos(2 * Math.PI * tpl.am[0] * (i / sr) + amPhase));
    let s = 0;
    if (hasTone && f0 > 0) {
      phi += (2 * Math.PI * f0) / sr;
      for (let k = 1; k <= 40; k++) {
        const hz = k * f0; if (hz > sr * 0.45) break;
        const db = levelAt(tpl.H, tpl.bands, hz / scale);
        if (db <= -60) continue;
        s += Math.pow(10, db / 20) * Math.sin(k * phi + phases[k - 1]!);
      }
    }
    out[i] = (s + noise[i]! * 0.5) * env;
  }
  // a short fade at each end so nothing clicks, then normalise
  const fade = Math.min(n >> 2, Math.floor(0.004 * sr));
  let peak = 0;
  for (let i = 0; i < n; i++) { if (i < fade) out[i] = out[i]! * (i / fade); else if (i >= n - fade) out[i] = out[i]! * ((n - 1 - i) / fade); peak = Math.max(peak, Math.abs(out[i]!)); }
  if (peak > 0) for (let i = 0; i < n; i++) out[i] = out[i]! / peak;
  return out;
}
