# Build a call template from the calls measured in recordings (scripts/birds/calls.py): the medians, over the chosen calls, of
#   the pitch contour (the fundamental, in Hz, sampled at N points across the call), the loudness along it (dB), the duration,
#   the harmonic layer's spectrum (dB at 1/3-octave bands: what the tonal part carries), the noise layer's (what is left when the harmonics are removed),
#   and how much louder the tonal part is than the noise.
# The result is small (a few dozen numbers a call) and carries no recording: it is what a synthesis needs to make the call again.
#   python template.py name fmin fmax out.json "file.wav:start:dur" ...      each item names a span that holds the calls to use
import sys, json, numpy as np
from scipy import signal
from scipy.io import wavfile
sys.path.insert(0, __file__.rsplit('/', 1)[0])
NPT = 12
BANDS = [round(125 * 2 ** (i / 3)) for i in range(22)]  # 125 Hz .. about 16 kHz, third octaves (the calls reach 10 kHz and more; nothing is cut off)

def load(item):
    parts = item.split(':'); sr, x = wavfile.read(parts[0]); x = x.astype(float) / (32768 if x.dtype == np.int16 else 1)
    m = x.mean(axis=1) if x.ndim > 1 else x
    t0 = float(parts[1]) if len(parts) > 1 else 0.0; dur = float(parts[2]) if len(parts) > 2 else len(m) / sr - t0
    return sr, m[int(t0 * sr): int((t0 + dur) * sr)]

def track_f0(S, f, fmin, fmax, nharm=6):
    db = 10 * np.log10(S + 1e-14); db = np.maximum(db, db.max() - 60) - (db.max() - 60)
    cands = np.geomspace(fmin, fmax, 200); df = f[1] - f[0]; H = np.zeros((len(cands), S.shape[1]))
    for i, c in enumerate(cands):
        for h in range(1, nharm + 1):
            k = int(round(c * h / df))
            if k < len(f) - 1: H[i] += np.maximum(db[k - 1:k + 2].max(axis=0), 0) / np.sqrt(h)
    n = H.shape[1]; D = np.zeros_like(H); B = np.zeros(H.shape, int)
    lam = 2.5 * np.abs(np.arange(len(cands))[:, None] - np.arange(len(cands))[None, :]); D[:, 0] = -H[:, 0]
    for j in range(1, n):
        tot = D[:, j - 1][None, :] + lam; B[:, j] = tot.argmin(axis=1); D[:, j] = -H[:, j] + tot.min(axis=1)
    p = np.zeros(n, int); p[-1] = D[:, -1].argmin()
    for j in range(n - 1, 0, -1): p[j - 1] = B[p[j], j]
    return cands[p]

def third_octave(spec, f):
    out = []
    for c in BANDS:
        sel = (f >= c / 2 ** (1 / 6)) & (f < c * 2 ** (1 / 6)); out.append(10 * np.log10(spec[sel].mean() + 1e-16) if sel.any() else -160.0)
    return np.array(out)

def analyse(item, fmin, fmax, dmin=0.0, dmax=9.0, minsnr=28.0, edgeok=0.25):
    sr, m = load(item); hop = int(sr * 0.005); nper = 1024
    f, t, S = signal.spectrogram(m, sr, nperseg=nper, noverlap=nper - hop, nfft=4096, window='hann')
    band = (f >= fmin) & (f <= min(fmax * 6, sr / 2 * 0.95)); e = 10 * np.log10(S[band].sum(axis=0) + 1e-14)
    floor = np.percentile(e, 20); on = e > floor + 14
    ev = []; i = 0
    while i < len(on):
        if on[i]:
            j = i
            while j < len(on) and (on[j] or np.any(on[j:j + 8])): j += 1
            if (j - i) * 0.005 >= 0.04: ev.append((i, j))
            i = j
        else: i += 1
    f0 = track_f0(S, f, fmin, fmax)
    # the background of this recording, between the calls: a level in each third octave that a call's bands must clear to count
    quiet = np.where(~on)[0]; bg = np.percentile(S[:, quiet], 50, axis=1) if len(quiet) > 20 else np.percentile(S, 20, axis=1)
    bgdb = third_octave(bg, f)
    calls = []
    for a, b in ev:
        if e[a:b].max() - floor < minsnr: continue  # only clear calls
        # trim to the call itself: the frames within 22 dB of its peak (the tail of a call and its echo are not the call)
        pk = e[a:b].max(); strong = np.where(e[a:b] > pk - 18)[0]; loud = np.where(e[a:b] > pk - 6)[0]
        if len(strong) < 6 or len(loud) < 2: continue
        a, b = a + max(strong[0], loud[0] - 3), a + strong[-1] + 1  # from just before the first loud frame, so every call starts at its own onset
        seg = f0[a:b]; env = e[a:b] - e[a:b].max(); frames = S[:, a:b]
        # harmonic mask: within a few bins of each harmonic of this frame's f0
        harm = np.zeros(frames.shape, bool); df = f[1] - f[0]
        for k in range(frames.shape[1]):
            for h in range(1, 40):
                c = seg[k] * h
                if c > sr / 2 * 0.95: break
                kk = int(round(c / df)); w = max(2, int(0.03 * c / df)); harm[max(0, kk - w):kk + w + 1, k] = True
        # the tonal part's level in each third octave: the strong half of the bins on a harmonic; the noise part's: the median of the bins between harmonics (robust to the skirts of the peaks)
        Hh = np.full(len(BANDS), -160.0); Nn = np.full(len(BANDS), -160.0)
        for bi, c in enumerate(BANDS):
            sel = (f >= c / 2 ** (1 / 6)) & (f < c * 2 ** (1 / 6))
            hv = frames[sel][harm[sel]]; nv = frames[sel][~harm[sel]]
            if hv.size > 4:
                hv = np.sort(hv)[hv.size // 2:]; Hh[bi] = 10 * np.log10(hv.mean() + 1e-16)
                if Hh[bi] < bgdb[bi] + 10: Hh[bi] = -160.0  # not above the background: not part of the call
            if nv.size > 4:
                Nn[bi] = 10 * np.log10(np.median(nv) + 1e-16)
                if Nn[bi] < bgdb[bi] + 4: Nn[bi] = -160.0
                else: Nn[bi] = 10 * np.log10(max(10 ** (Nn[bi] / 10) - 10 ** (bgdb[bi] / 10), 1e-16))  # the call's own noise: the background taken away
        Ht, Nt = Hh, Nn
        # a failed pitch track sits on the edge of the range: leave such calls out
        edge = np.mean((seg < fmin * 1.04) | (seg > fmax * 0.96))
        if edge > edgeok: continue
        x_ = np.linspace(0, 1, len(seg)); xs = np.linspace(0, 1, NPT)
        if not (dmin <= (b - a) * 0.005 <= dmax): continue
        calls.append({'dur': (b - a) * 0.005, 'file': item, 'f0': np.interp(xs, x_, seg), 'env': np.interp(xs, x_, np.maximum(env, -50)), 'H': Ht, 'N': Nt, 'a': a * 0.005})
    return calls

def build_click(name, items, lo=2500.0, hi=12000.0):
    """A very short sharp sound (a bill clap, a tick): its envelope (dB across about 12 ms), its spectrum (third octaves), and the intervals between one and the next."""
    envs = []; specs = []; gaps = []; bouts = []
    for it in items:
        sr, m = load(it)
        y = signal.sosfilt(signal.butter(4, [lo, min(hi, sr * 0.45)], 'bandpass', fs=sr, output='sos'), m); e = np.convolve(np.abs(y), np.ones(int(sr * 0.0008)) / int(sr * 0.0008), 'same')
        pk, _ = signal.find_peaks(e, height=e.max() * 0.2, distance=int(0.1 * sr)); times = pk / sr
        for p in pk:
            a0 = p - int(sr * 0.0015)
            if a0 < 0 or a0 + int(sr * 0.04) > len(m): continue
            seg = m[a0:a0 + int(sr * 0.04)]; env = np.sqrt(np.convolve(seg ** 2, np.ones(int(sr * 0.0005)) / int(sr * 0.0005), 'same'))
            idx = np.linspace(0, int(sr * 0.012), 12).astype(int); envs.append(20 * np.log10(env[idx] / env.max() + 1e-6))
            f, P = signal.welch(seg[:int(sr * 0.012)], sr, nperseg=256); specs.append(third_octave(P, f))
        run = 1
        for u, v in zip(times, times[1:]):
            if v - u < 1.2: gaps.append(v - u); run += 1
            else: bouts.append(run); run = 1
        bouts.append(run)
    if not envs: return None
    # the ringing after the click: the strongest resonances in the 2-20 ms after it, and how fast they die
    tails = []; rings = []; hfs = []
    for it in items:
        sr, m = load(it)
        y = signal.sosfilt(signal.butter(4, [lo, min(hi, sr * 0.45)], 'bandpass', fs=sr, output='sos'), m); e = np.convolve(np.abs(y), np.ones(int(sr * 0.0008)) / int(sr * 0.0008), 'same')
        pk, _ = signal.find_peaks(e, height=e.max() * 0.2, distance=int(0.1 * sr))
        ring = signal.sosfilt(signal.butter(4, [1500, 6000], 'bandpass', fs=sr, output='sos'), m); renv = np.abs(signal.hilbert(ring))
        hf = np.convolve(np.abs(signal.sosfilt(signal.butter(4, [7000, min(16000, sr * 0.45)], 'bandpass', fs=sr, output='sos'), m)), np.ones(int(sr * 0.0003)) / int(sr * 0.0003), 'same')
        for p in pk:
            if p < int(sr * 0.003) or p + int(sr * 0.03) > len(m): continue
            tail = m[p + int(sr * 0.003): p + int(sr * 0.02)]; f, P = signal.welch(tail, sr, nperseg=min(512, len(tail)), noverlap=0); tails.append((f, P))
            c = 20 * np.log10(renv[p: p + int(sr * 0.012)] / (renv[p] + 1e-12) + 1e-6); rings.append(c)
            h = 20 * np.log10(hf[p - int(sr * 0.001): p + int(sr * 0.006)] / (hf[p - int(sr * 0.001): p + int(sr * 0.006)].max() + 1e-12) + 1e-6); hfs.append(h)
    f = tails[0][0]; P = 10 * np.log10(np.median(np.array([t[1][:len(f)] for t in tails if len(t[1]) == len(f)]), axis=0) + 1e-20); P = P - P.max()
    pks, _ = signal.find_peaks(P, prominence=3); pks = [i for i in pks if f[i] > 300]; pks = sorted(pks, key=lambda i: -P[i])[:7]
    modes = sorted([[int(f[i]), round(float(P[i]), 1)] for i in pks])
    rc = np.median(np.array([r[:int(sr * 0.012)] for r in rings if len(r) >= int(sr * 0.012)]), axis=0); t_ms = np.arange(len(rc)) / sr * 1000
    k = next((i for i, v in enumerate(rc) if v < -20), len(rc) - 1); ring_tau = max(0.0005, t_ms[k] / 1000 / 2.3)  # -20 dB in 2.3 time constants
    hc = np.median(np.array([h for h in hfs if len(h) == len(hfs[0])]), axis=0); ipk = int(np.argmax(hc)); k2 = next((i for i in range(ipk, len(hc)) if hc[i] < -20), len(hc) - 1); imp_tau = max(0.0001, (k2 - ipk) / sr / 2.3)
    click = {'modes': modes, 'ringTau': round(float(ring_tau), 5), 'impulseTau': round(float(imp_tau), 5)}
    H = np.full(len(BANDS), -160.0); N = np.median(np.array(specs), axis=0); N = N - N.max()
    return {'name': name, 'n': len(envs), 'dur': 0.012, 'durRange': [0.012, 0.012], 'f0': [0] * 12, 'f0Spread': 0.0, 'env': [round(float(v), 1) for v in np.maximum(np.median(np.array(envs), axis=0), -60)],
            'bands': BANDS, 'H': [-160.0] * len(BANDS), 'N': [round(float(v), 1) for v in N], 'click': click, 'gap': [round(float(np.percentile(gaps, q)), 2) for q in (10, 50, 90)] if len(gaps) >= 3 else None, 'bout': [int(np.percentile(bouts, q)) for q in (10, 50, 90)]}

def modulation(name, items):
    """The amplitude modulation of a long call (a whirr): its rate in Hz and its depth 0..1."""
    rates = []; depths = []
    for it in items:
        sr, m = load(it)
        y = signal.sosfilt(signal.butter(4, [800, 5000], 'bandpass', fs=sr, output='sos'), m); env = np.abs(signal.hilbert(y)); env = signal.sosfilt(signal.butter(2, 80, 'low', fs=sr, output='sos'), env)
        env = env[int(0.05 * sr):-int(0.05 * sr)]; env = env / env.mean(); F = np.abs(np.fft.rfft(env - env.mean())); fr = np.fft.rfftfreq(len(env), 1 / sr)
        sel = (fr > 3) & (fr < 40); rates.append(float(fr[sel][np.argmax(F[sel])])); depths.append(float((np.percentile(env, 90) - np.percentile(env, 10)) / (np.percentile(env, 90) + np.percentile(env, 10))))
    return [round(float(np.median(rates)), 1), round(float(np.median(depths)), 2)]

def build(name, fmin, fmax, items, dmin=0.0, dmax=9.0, minsnr=28.0, edgeok=0.25):
    calls = []
    for it in items: calls += analyse(it, fmin, fmax, dmin, dmax, minsnr, edgeok)
    if not calls: return None
    med = lambda k: np.median(np.array([c[k] for c in calls]), axis=0)
    H = med('H'); N = med('N'); ref = H.max()
    # the intervals between one call and the next within a bout (gaps of up to 3 s), by recording
    gaps = []; bouts = []
    for it in sorted(set(c['file'] for c in calls)):
        ts = sorted(c['a'] for c in calls if c['file'] == it); run = 1
        for u, v in zip(ts, ts[1:]):
            g = v - u
            if g < 3.0: gaps.append(g); run += 1
            else: bouts.append(run); run = 1
        bouts.append(run)
    tpl = {'name': name, 'n': len(calls), 'dur': float(np.median([c['dur'] for c in calls])), 'durRange': [float(np.percentile([c['dur'] for c in calls], 10)), float(np.percentile([c['dur'] for c in calls], 90))],
           'f0': [round(float(v)) for v in med('f0')], 'f0Spread': float(np.std(np.log([np.median(c['f0']) for c in calls]))), 'env': [round(float(v), 1) for v in med('env')],
           'bands': BANDS, 'H': [round(float(v - ref), 1) for v in H], 'N': [round(float(v - ref), 1) for v in N],
           'gap': [round(float(np.percentile(gaps, q)), 2) for q in (10, 50, 90)] if len(gaps) >= 3 else None, 'bout': [int(np.percentile(bouts, q)) for q in (10, 50, 90)] if bouts else None}
    # the start of a call: leave out the frames before the voice is really on (the pitch there is the tracker's, not the bird's)
    f0 = tpl['f0']
    if int(np.argmax(f0)) <= 3:  # a call that peaks at its start (a falling one): the rise into it is the tracker settling, not the bird
        top = max(f0[:5]); i = next((k for k, v in enumerate(f0) if v >= 0.92 * top), 0)
        for k in range(i): f0[k] = f0[i]
    return tpl

if __name__ == '__main__':
    name, fmin, fmax, out, items = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), sys.argv[4], sys.argv[5:]
    tpl = build(name, fmin, fmax, items)
    if tpl is None: print('no calls found'); sys.exit(1)
    json.dump(tpl, open(out, 'w'))
    print(f"{name}: {tpl['n']} calls; dur {tpl['dur']:.2f} s ({tpl['durRange'][0]:.2f}-{tpl['durRange'][1]:.2f}); f0 {tpl['f0']} (spread {tpl['f0Spread']:.2f} in ln); gaps {tpl['gap']} bouts {tpl['bout']}")
