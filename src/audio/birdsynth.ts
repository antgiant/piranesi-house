// One bird call, made from a template measured on real recordings (design/birds.md, scripts/birds/template.py). A template is a few dozen numbers: the pitch contour of the call
// (the fundamental, 12 points across it), its loudness along it, the spectrum of its tonal part and of its noisy part (dB in third octaves), and how long it lasts and how much
// that varies. The call is a harmonic series that follows the contour, each harmonic as loud as the tonal spectrum says at its own frequency, plus noise shaped by the noise
// spectrum, all under the loudness contour; every call is a little different (pitch, length, contour) as every real one is. Pure, so it is tested without a browser.

export type Rng = () => number;

export interface CallTemplate {
  /** Median duration in seconds, and its 10th and 90th percentile. */
  dur: number;
  durRange: [number, number];
  /** Where in the call the pitch peaks (0..1): the contour's fifth point is the apex, and the points before and after are spread across the time before and after it. */
  apex?: number;
  /** How clean the voice is, in dB: the harmonics' peaks above the valleys between them (a real gull about 34; a pure tone 70). The noise is never lower than this below the harmonics. */
  hnr?: number;
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
  /** A sharp sound (a bill clap, a tick): not a call with a contour but a broadband impulse that rings: the resonances (Hz, dB) and how fast they and the impulse die (seconds). */
  click?: { modes: [number, number][]; ringTau: number; impulseTau: number };
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
  if (i >= spec.length - 1) return Math.max(-90, (spec[spec.length - 1] ?? -90) - 12 * (x - (spec.length - 1))); // above the last measured band: falling away, not held
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
    const dbN = Math.max(levelAt(tpl.N, tpl.bands, hz / pitchScale), tpl.hnr ? levelAt(tpl.H, tpl.bands, hz / pitchScale) - tpl.hnr : -90);
    const g = Math.pow(10, dbN / 20) * Math.sqrt(1 / Math.max(1, hz)); // a flat third-octave level per band means a falling density per hertz
    const ph = rng() * 2 * Math.PI;
    re[k] = g * Math.cos(ph); im[k] = g * Math.sin(ph); re[m - k] = re[k]!; im[m - k] = -im[k]!;
  }
  fft(re, im, true);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = re[i]!;
  return out;
}

/** The noise gain that gives a call the wanted harmonic-to-valley ratio: the call is measured with the noise at one, as the measurement of the real calls was made (a 1024-sample Hann window in the middle of the call, harmonics against the midpoints between them), and the noise scaled by the difference. */
function noiseForHnr(sr: number, tone: Float32Array, noise: Float32Array, f0s: Float32Array, env: Float32Array, target: number): number {
  const n = tone.length, W = 1024, c = Math.max(0, Math.min(n - W, (n >> 1) - (W >> 1)));
  const f0 = f0s[n >> 1]!; if (!(f0 > 0)) return 0.5;
  const spectrum = (x: Float32Array): ((hz: number) => number) => {
    const re = new Float64Array(W), im = new Float64Array(W);
    for (let i = 0; i < W; i++) re[i] = x[c + i]! * env[c + i]! * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (W - 1)));
    fft(re, im, false);
    return (hz: number): number => { const b = Math.round((hz * W) / sr); return re[b]! * re[b]! + im[b]! * im[b]!; };
  };
  // the peaks from the tonal part alone and the valleys from the noise alone: the glide of the tone smears its own valleys (the real calls' valleys are the bird's noise), so they must not be mixed
  const tp = spectrum(tone), np_ = spectrum(noise);
  const peaks: number[] = [], valleys: number[] = [];
  for (let h = 1; h <= 8; h++) {
    if (h * f0 > Math.min(sr * 0.4, 9000)) break;
    let pk = 0; for (let d = -0.03; d <= 0.0301; d += 0.01) pk = Math.max(pk, tp(h * f0 * (1 + d)));
    const vs: number[] = []; for (let d = 0.4; d <= 0.601; d += 0.05) vs.push(np_((h + d) * f0)); vs.sort((a, b) => a - b);
    peaks.push(10 * Math.log10(pk + 1e-20)); valleys.push(10 * Math.log10((vs[vs.length >> 1] ?? 0) + 1e-20));
  }
  if (!peaks.length) return 0.5;
  const have = peaks.reduce((a, b, i) => a + b - valleys[i]!, 0) / peaks.length; // dB, with the noise at one
  return Math.pow(10, (have - target) / 20); // a cleaner call needs less noise, a noisier more
}

/** A sharp sound: a broadband impulse (a fraction of a millisecond, to the top of the spectrum) that sets the cavity ringing at its resonances, which die within a few milliseconds. */
function renderClick(sr: number, tpl: CallTemplate & { click: NonNullable<CallTemplate['click']> }, rng: Rng, pitch: number): Float32Array {
  const c = tpl.click, n = Math.floor(sr * Math.max(0.012, Math.min(0.045, 8 * c.ringTau)));
  const out = new Float32Array(n);
  const modes = c.modes.map(([f, db]) => ({ f: f * pitch * (1 + (rng() - 0.5) * 0.05), a: Math.pow(10, (db + (rng() - 0.5) * 3) / 20), ph: rng() * 6.28 }));
  const tau = c.ringTau * (1 + (rng() - 0.5) * 0.2);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    let s = (rng() * 2 - 1) * Math.exp(-t / Math.max(0.00015, c.impulseTau)) * 0.9; // the impulse itself, white
    for (const m of modes) s += 1.3 * m.a * Math.sin(2 * Math.PI * m.f * t + m.ph) * Math.exp(-t / tau);
    out[i] = s;
  }
  let peak = 0; for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(out[i]!));
  if (peak > 0) for (let i = 0; i < n; i++) out[i] = out[i]! / peak;
  return out;
}

/** Render one call: `sr` samples a second; peak amplitude about 1. */
export function renderCall(sr: number, tpl: CallTemplate, rng: Rng = Math.random, opts: { duration?: number; pitch?: number } = {}): Float32Array {
  if (tpl.click) return renderClick(sr, tpl as CallTemplate & { click: NonNullable<CallTemplate['click']> }, rng, opts.pitch ?? 1);
  const dur = opts.duration ?? Math.min(tpl.durRange[1], Math.max(tpl.durRange[0], tpl.dur * Math.exp(0.18 * gauss(rng))));
  const n = Math.max(64, Math.floor(dur * sr));
  const scale = (opts.pitch ?? 1) * Math.exp(Math.min(2, Math.max(-2, gauss(rng))) * tpl.f0Spread);
  // a slow wobble of the contour, different for each call
  const w1 = (rng() - 0.5) * 0.08, w2 = (rng() - 0.5) * 0.06, ph = rng() * 6.28;
  const tone = new Float32Array(n), env = new Float32Array(n), f0s = new Float32Array(n);
  const hasTone = Math.max(...tpl.H) > -60;
  const phases = new Float64Array(40);
  const amPhase = rng() * 6.28;
  const noise = shapedNoise(sr, n, tpl, rng, scale);
  let phi = 0;
  for (let i = 0; i < n; i++) {
    const ul = i / (n - 1);
    // time on the contour's own axis: its fifth point of twelve is the apex (4/11 of the way along)
    const ap = Math.min(0.9, Math.max(0.05, tpl.apex ?? 4 / 11)), u = ul < ap ? (4 / 11) * (ul / ap) : 4 / 11 + (7 / 11) * ((ul - ap) / (1 - ap));
    const f0 = interp(tpl.f0, u) * scale * (1 + w1 * Math.sin(ph + 9 * u) + w2 * (u - 0.5));
    f0s[i] = f0;
    let e = Math.pow(10, interp(tpl.env, u) / 20);
    if (tpl.am) e *= 1 - tpl.am[1] * 0.5 * (1 - Math.cos(2 * Math.PI * tpl.am[0] * (i / sr) + amPhase));
    env[i] = e;
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
    tone[i] = s;
  }
  // the noise level: whatever makes the voice as clean as the measured one (peaks over valleys, `hnr`), found by measuring this very call
  let kNoise = 0.5;
  if (hasTone && tpl.hnr && n >= 1024) kNoise = noiseForHnr(sr, tone, noise, f0s, env, tpl.hnr);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = (tone[i]! + noise[i]! * kNoise) * env[i]!;
  // a short fade at each end so nothing clicks, then normalise
  // a smooth start and end: a call that starts or stops at full level is heard as a thump at its start and as cut off at its end (the recordings rise over some 10 ms and die away over a few tens)
  const fadeIn = Math.min(n >> 2, Math.max(Math.floor(0.006 * sr), Math.min(Math.floor(0.015 * sr), Math.floor(0.12 * n))));
  const fadeOut = Math.min(n >> 1, Math.max(Math.floor(0.012 * sr), Math.min(Math.floor(0.06 * sr), Math.floor(0.3 * n))));
  let peak = 0;
  for (let i = 0; i < n; i++) {
    if (i < fadeIn) out[i] = out[i]! * 0.5 * (1 - Math.cos((Math.PI * i) / fadeIn));
    if (i >= n - fadeOut) out[i] = out[i]! * 0.5 * (1 - Math.cos((Math.PI * (n - 1 - i)) / fadeOut));
    peak = Math.max(peak, Math.abs(out[i]!));
  }
  if (peak > 0) for (let i = 0; i < n; i++) out[i] = out[i]! / peak;
  return out;
}
