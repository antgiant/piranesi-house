# Measure footstep recordings (and renders) step by step: where each footfall is, how sharp its start is, how fast it dies, where its energy sits,
# and how pitched it is; plus the steps' spacing and the sound between them.   python steps.py <skip_s> file.wav ...
import sys, numpy as np
from scipy import signal
from scipy.io import wavfile
skip = float(sys.argv[1])
for name in sys.argv[2:]:
    sr, x = wavfile.read(name); x = x.astype(float) / (32768 if x.dtype == np.int16 else 1)
    m = (x.mean(axis=1) if x.ndim > 1 else x)[int(sr * skip):]
    hp = signal.sosfilt(signal.butter(4, [80, 12000], 'bandpass', fs=sr, output='sos'), m)
    n = int(sr * 0.002); k = len(hp) // n
    e = 10 * np.log10((hp[:k * n] ** 2).reshape(k, n).mean(axis=1) + 1e-18)
    floor = np.percentile(e, 20); thr = max(floor + 14, e.max() - 30)
    pk, _ = signal.find_peaks(e, height=thr, distance=int(0.12 / 0.002))
    print(f'== {name.split("/")[-1]}: {len(m)/sr:.1f} s, rms {20*np.log10(m.std()):.1f} dB, noise floor {floor:.0f} dB (2 ms frames), events {len(pk)} (>{thr:.0f} dB)')
    if len(pk) > 2:
        gaps = np.diff(pk) * 0.002; print(f'   spacing: median {np.median(gaps):.2f} s, p10 {np.percentile(gaps,10):.2f}, p90 {np.percentile(gaps,90):.2f}; level spread p10-p90 {np.percentile(e[pk],90)-np.percentile(e[pk],10):.1f} dB')
    rows = []
    for p in pk[:60]:
        a = max(0, p - 15); seg = hp[p * n - 60 * n // 4 if p * n > 60 * n // 4 else 0:(p + 100) * n]
        # rise: time from 10 dB below peak (before) to the peak, in ms; decay: time to fall 20 dB after the peak
        pre = e[max(0, p - 40):p + 1]; rise = (len(pre) - 1 - np.argmax(pre > e[p] - 20)) * 2 if (pre > e[p] - 20).any() else 0
        post = e[p:p + 200]; dec = (np.argmax(post < e[p] - 20) if (post < e[p] - 20).any() else len(post)) * 2
        seg = hp[p * n: p * n + int(sr * 0.08)]
        if len(seg) < 256: continue
        f, P = signal.welch(seg, sr, nperseg=min(1024, len(seg)))
        cen = (f * P).sum() / P.sum(); peakf = f[np.argmax(P[(f > 100)] ) + np.searchsorted(f, 100)] if (f > 100).any() else 0
        flat = np.exp(np.mean(np.log(P[(f > 100) & (f < 10000)] + 1e-20))) / np.mean(P[(f > 100) & (f < 10000)])
        rows.append((rise, dec, cen, peakf, flat))
    if rows:
        r = np.array(rows); q = lambda c: np.percentile(r[:, c], [10, 50, 90]).round(0).astype(int).tolist()
        print(f'   per step: rise-to-peak ms {q(0)}, fall by 20 dB ms {q(1)}, centroid Hz {q(2)}, strongest Hz {q(3)}, flatness {np.median(r[:,4]):.2f} (1 = noise, 0 = a tone)')
    f, P = signal.welch(m, sr, nperseg=16384); cent = [62, 125, 250, 500, 1000, 2000, 4000, 8000]
    lv = [10 * np.log10(P[(f >= c / 2 ** .5) & (f < c * 2 ** .5)].sum() + 1e-20) for c in cent]
    print('   whole file, octave dB rel 1 kHz:', [round(v - lv[4], 1) for v in lv], '; centroid', int((f * P).sum() / P.sum()), 'Hz')
