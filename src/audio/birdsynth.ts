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
  /**
   * A second voice (biphonation: the two sides of a gull's syrinx sounding at once): a second set of harmonics near `ratio` times the pitch, `db` below the first, between `from` and `to`
   * (0..1 of the call). Measured on 250 gull calls: about half have a ridge that is not a harmonic of the pitch, at 1.4 to 1.5 times it, 9 to 11 dB down, in a fifth to a quarter of the call.
   */
  second?: { ratio: number; db: number; from: number; to: number };
  /** How the brightness changes through the call (dB, in the first, middle and last third, from the harmonics above the third): a real call loses its high harmonics before it ends. */
  bright?: [number, number, number];
  /** The wavering of the pitch, measured on the real call: rate (Hz) and depth (peak, percent of the pitch). Gull calls waver slowly (6 to 13 a second); the depth measured (1 to 4%) includes the tracker's own error, so a quarter of it, at most 0.6%, is played: the full depth looked and sounded far wavier than the real lines, and a fast flutter sounds like a vibrating plate. */
  vib?: [number, number];
  /** The level (dB, re the strongest) of each of the first harmonics as measured on the call itself, one by one: real calls are not smooth in this (the second harmonic may be the strongest, or every other one weak); beyond them the band spectrum carries on. */
  harm?: number[];
  /** What to add to the measured harmonics' levels to put them on the band spectrum's scale (the first strongest harmonic, set by the band spectrum). */
  harmOff?: number;
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
  // the call itself, then a short tail: a real call holds its level to near the end, falls 10 to 15 dB in the last tenth of a second and stops (measured on 32 clean calls: -10, -10, -16, -25, then -58 in 20 ms steps),
  // and a synthesis that ends at the last measured point stops a little early: the end falls on for 50 ms (45 dB). (A longer tail, tried at first, rang on as a held tone after each call.)
  const nBody = Math.max(64, Math.floor(dur * sr)), nTail = Math.floor(0.05 * sr), n = nBody + nTail;
  const scale = (opts.pitch ?? 1) * Math.exp(Math.min(2, Math.max(-2, gauss(rng))) * tpl.f0Spread);
  // a slow wobble of the contour, different for each call
  const w1 = tpl.vib ? 0 : (rng() - 0.5) * 0.08, w2 = tpl.vib ? 0 : (rng() - 0.5) * 0.06, ph = rng() * 6.28;
  const tone = new Float32Array(n), env = new Float32Array(n), f0s = new Float32Array(n);
  const hasTone = Math.max(...tpl.H) > -60;
  const phases = new Float64Array(40);
  const amPhase = rng() * 6.28;
  const noise = shapedNoise(sr, n, tpl, rng, scale);
  let phi = 0, phi2 = 0;
  const br = tpl.bright, vibRate = tpl.vib ? 2 * Math.PI * tpl.vib[0] : 0, vibDepth = tpl.vib ? Math.min(0.006, 0.25 * tpl.vib[1] / 100) : 0, vibPh = rng() * 6.28;
  for (let i = 0; i < n; i++) {
    const ul = Math.min(1, i / (nBody - 1)), tg = i < nBody ? 1 : Math.pow(10, (-45 * ((i - nBody) / nTail)) / 20);
    // time on the contour's own axis: its fifth point of twelve is the apex (4/11 of the way along)
    const ap = Math.min(0.9, Math.max(0.05, tpl.apex ?? 4 / 11)), u = ul < ap ? (4 / 11) * (ul / ap) : 4 / 11 + (7 / 11) * ((ul - ap) / (1 - ap));
    const f0 = interp(tpl.f0, u) * scale * (1 + w1 * Math.sin(ph + 9 * u) + w2 * (u - 0.5)) * (1 + vibDepth * Math.sin(vibRate * (i / sr) + vibPh));
    f0s[i] = f0;
    let e = Math.pow(10, interp(tpl.env, u) / 20) * tg;
    if (tpl.am) e *= 1 - tpl.am[1] * 0.5 * (1 - Math.cos(2 * Math.PI * tpl.am[0] * (i / sr) + amPhase));
    env[i] = e;
    let s = 0;
    if (hasTone && f0 > 0) {
      phi += (2 * Math.PI * f0) / sr;
      if (tpl.second) {
        const sc = tpl.second, w = sc.to - sc.from;
        const g = ul < sc.from || ul > sc.to ? 0 : Math.sin((Math.PI * (ul - sc.from)) / Math.max(1e-3, w)) ** 2; // swells in and out
        phi2 += (2 * Math.PI * f0 * sc.ratio * (1 + 0.03 * Math.sin(40 * ul + ph))) / sr;
        if (g > 0) for (let k = 1; k <= 4; k++) { const hz = k * f0 * sc.ratio; if (hz > sr * 0.45) break; const db = levelAt(tpl.H, tpl.bands, hz / scale); if (db > -60) s += g * Math.pow(10, (db + sc.db) / 20) * Math.sin(k * phi2); }
      }
      for (let k = 1; k <= 40; k++) {
        const hz = k * f0; if (hz > sr * 0.45) break;
        let db = tpl.harm && k <= tpl.harm.length ? tpl.harm[k - 1]! + (tpl.harmOff ?? 0) : levelAt(tpl.H, tpl.bands, hz / scale);
        if (db <= -60) continue;
        if (br && k >= 3) db += ul < 0.5 ? br[0] + (br[1] - br[0]) * (ul / 0.5) : br[1] + (br[2] - br[1]) * ((ul - 0.5) / 0.5);
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
  const fadeIn = Math.min(n >> 2, Math.max(Math.floor(0.004 * sr), Math.min(Math.floor(0.008 * sr), Math.floor(0.08 * n))));
  const fadeOut = Math.min(n >> 2, Math.floor(0.008 * sr)); // (the tail does the dying away)
  let peak = 0;
  for (let i = 0; i < n; i++) {
    if (i < fadeIn) out[i] = out[i]! * 0.5 * (1 - Math.cos((Math.PI * i) / fadeIn));
    if (i >= n - fadeOut) out[i] = out[i]! * 0.5 * (1 - Math.cos((Math.PI * (n - 1 - i)) / fadeOut));
    peak = Math.max(peak, Math.abs(out[i]!));
  }
  if (peak > 0) for (let i = 0; i < n; i++) out[i] = out[i]! / peak;
  return out;
}

/**
 * Fill the bands of a measured spectrum that came out empty. The analysis drops a band that does not clear the recording's own background (by 10 dB for the tone, 4 dB for the noise), which in a noisy
 * recording takes the lows and the highs of the call along with the background, and leaves a call with nothing below its pitch and little above 8 kHz: heard as a call that has been processed. A gap
 * between measured bands is joined across in dB; beyond the last measured band the level falls on (`up` dB a band) and below the first it falls away (`down` dB a band), as the measured calls themselves do.
 */
export function fillBands(v: number[], up: number, down: number, floor = -118): number[] {
  const ok = v.map((x) => x > -100), first = ok.indexOf(true), last = ok.lastIndexOf(true);
  if (first < 0) return v;
  const out = v.slice();
  for (let i = 0; i < v.length; i++) {
    if (ok[i]) continue;
    if (i < first) out[i] = down >= 99 ? floor : Math.max(floor, (v[first] as number) - down * (first - i));
    else if (i > last) out[i] = Math.max(floor, (v[last] as number) - up * (i - last));
    else { let a = i - 1; while (!ok[a]) a--; let b = i + 1; while (!ok[b]) b++; out[i] = (v[a] as number) + ((v[b] as number) - (v[a] as number)) * ((i - a) / (b - a)); }
  }
  return out;
}

/**
 * The ends of a measured loudness contour. The analysis keeps the frames within 18 dB of the peak, so its first point is not as loud as a real call's start nor its last as quiet as its stop: on 32 clean calls the level
 * is -6 dB at the start (median), holds near -2 to -4 through the body, is -26 dB at 0.8 of the call and -43 at 0.9. The first point is raised to -6 and the last two lowered to -16 and -24.
 */
/**
 * The first frames of a call are where the pitch tracker is least sure (the onset is noisy and the harmonics not yet settled): its first points often start far below or above where the call then sits,
 * and a synthesis plays that as a streak across the spectrum at the start of the call (in some 12 of 32 clean calls) that the real call does not have. The first two points are set to the third unless they agree with it.
 */
export function steadyOnset(f0: number[]): number[] {
  const f = f0.slice(), ref = f[2] ?? f[0] ?? 0;
  for (let i = 0; i < 2; i++) if (ref > 0 && Math.abs((f[i] ?? ref) / ref - 1) > 0.08) f[i] = ref;
  return f;
}

export function shapeEnds(env: number[]): number[] {
  const e = env.slice(); e[0] = Math.max(e[0]!, -6); e[10] = Math.min(e[10]!, -16); e[11] = Math.min(e[11]!, -24); return e;
}

/** A call made by one real bird of the library: its voice's spectrum and one of its measured calls (length, roughness, 12 pitch points, 12 loudness points). */
export function libTemplate(bands: number[], voice: { H: number[]; N: number[] }, call: number[]): CallTemplate {
  const dur = call[0]!;
  // two layouts: the pitch in 24 points (44 numbers, or 46 with a pulse rate and depth) and the older 12 (32 or 34)
  const wide = call.length >= 44, nf = wide ? 24 : 12, o = 3 + nf + 12;
  return { dur, durRange: [dur * 0.94, dur * 1.06], apex: call[1]!, hnr: call[2]!, f0: wide ? steadyOnset(call.slice(3, 3 + nf)) : call.slice(3, 3 + nf), f0Spread: 0.015, env: shapeEnds(call.slice(3 + nf, 3 + nf + 12)), bands, H: fillBands(voice.H, 4, 99), N: fillBands(voice.N, 2.5, 1.5), bright: [call[o] ?? 0, call[o + 1] ?? 0, call[o + 2] ?? 0], vib: [call[o + 3] ?? 0, call[o + 4] ?? 0], ...(call.length > o + 5 ? { am: [call[o + 5]!, call[o + 6]!] as [number, number] } : {}) };
}
