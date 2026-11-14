# Measure the calls in a bird recording, one call at a time: where each starts and ends, its pitch contour (the fundamental, tracked by a harmonic sum with a smoothness
# constraint), the loudness along it, how the energy is spread over its harmonics, and how noisy (broadband) it is. Prints a table and writes JSON for the models.
#   python calls.py out.json fmin fmax "file.wav[:start:dur]" ...     (fmin, fmax: the range the fundamental can lie in)
import sys, json, numpy as np
from scipy import signal
from scipy.io import wavfile

def load(name):
    parts = name.split(':'); sr, x = wavfile.read(parts[0]); x = x.astype(float) / (32768 if x.dtype == np.int16 else 1)
    m = x.mean(axis=1) if x.ndim > 1 else x
    t0 = float(parts[1]) if len(parts) > 1 else 0; dur = float(parts[2]) if len(parts) > 2 else len(m) / sr
    return sr, m[int(t0 * sr): int((t0 + dur) * sr)], t0

def f0_track(S, f, fmin, fmax, nharm=6):
    # harmonic sum of log magnitude: for each frame and candidate f0, the sum over harmonics of the (floor-clipped) dB; then Viterbi with a penalty on jumps
    db = 10 * np.log10(S + 1e-14); db = np.maximum(db, db.max() - 60) - (db.max() - 60)  # 0 to 60 dB above the floor
    cands = np.geomspace(fmin, fmax, 220); df = f[1] - f[0]
    H = np.zeros((len(cands), S.shape[1]))
    for i, c in enumerate(cands):
        for h in range(1, nharm + 1):
            k = int(round(c * h / df))
            if k < len(f) - 1: H[i] += np.maximum(db[k - 1:k + 2].max(axis=0), 0) * (1.0 / np.sqrt(h))
    # Viterbi
    n = H.shape[1]; cost = -H; D = np.zeros_like(cost); B = np.zeros(cost.shape, int)
    lam = 2.5 * np.abs(np.arange(len(cands))[:, None] - np.arange(len(cands))[None, :]) ** 1.0
    D[:, 0] = cost[:, 0]
    for j in range(1, n):
        tot = D[:, j - 1][None, :] + lam; B[:, j] = tot.argmin(axis=1); D[:, j] = cost[:, j] + tot.min(axis=1)
    path = np.zeros(n, int); path[-1] = D[:, -1].argmin()
    for j in range(n - 1, 0, -1): path[j - 1] = B[path[j], j]
    return cands[path]

out, fmin, fmax, items = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), sys.argv[4:]
result = []
for it in items:
    sr, m, t0 = load(it)
    hop = int(sr * 0.005); nper = 1024
    f, t, S = signal.spectrogram(m, sr, nperseg=nper, noverlap=nper - hop, nfft=4096, window='hann')
    band = (f >= fmin) & (f <= min(fmax * 6, sr / 2 * 0.95))
    e = 10 * np.log10(S[band].sum(axis=0) + 1e-14); floor = np.percentile(e, 20); thr = floor + 14
    on = e > thr
    # events: runs of frames above the threshold, joined across gaps shorter than 40 ms, at least 40 ms long
    ev = []; i = 0
    while i < len(on):
        if on[i]:
            j = i
            while j < len(on) and (on[j] or (np.any(on[j:j + 8]))): j += 1
            if (j - i) * 0.005 >= 0.04: ev.append((i, j))
            i = j
        else: i += 1
    f0 = f0_track(S, f, fmin, fmax)
    for a, b in ev:
        sl = slice(a, b); seg = f0[sl]; env = e[sl] - e[sl].max()
        # harmonic profile at the median f0: dB of each harmonic relative to the strongest, median over the event's strong frames
        strong = np.where(env > -12)[0]
        prof = []
        for h in range(1, 13):
            vals = []
            for k in strong[::2]:
                c = seg[k] * h
                if c < sr / 2 * 0.95: kk = int(round(c / (f[1] - f[0]))); vals.append(10 * np.log10(S[max(0, kk - 1):kk + 2, a + k].max() + 1e-14))
            prof.append(float(np.median(vals)) if vals else -90.0)
        prof = np.array(prof); prof -= prof.max()
        sub = np.arange(0, len(seg), 2)  # a point every 10 ms
        flat = float(np.median([np.exp(np.mean(np.log(S[(f > fmin) & (f < fmax * 6), a + k] + 1e-20))) / np.mean(S[(f > fmin) & (f < fmax * 6), a + k]) for k in strong[::3]])) if len(strong) else 1.0
        result.append({'file': it.split(':')[0].split('/')[-1], 't': round(t0 + a * 0.005, 3), 'dur': round((b - a) * 0.005, 3), 'f0': [round(float(v), 0) for v in seg[sub]],
                       'env_db': [round(float(v), 1) for v in env[sub]], 'harm_db': [round(float(v), 1) for v in prof], 'flatness': round(flat, 3), 'peak_db': round(float(e[sl].max() - floor), 1)})
json.dump(result, open(out, 'w'))
print(f'{len(result)} calls in {len(items)} recording(s)')
for r in result[:40]:
    print(f"  {r['file']:>12} t={r['t']:6.2f} dur={r['dur']:.2f}  f0 {r['f0'][0]:5.0f} -> {r['f0'][len(r['f0'])//2]:5.0f} -> {r['f0'][-1]:5.0f}  harm(dB) {' '.join('%3.0f' % v for v in r['harm_db'][:8])}  flat {r['flatness']:.2f}  snr {r['peak_db']:.0f}")
