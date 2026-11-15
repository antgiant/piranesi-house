#!/usr/bin/env python3
"""Gull call: measure ONE call from a recording and resynthesise it from a small set of curves (prototype, offline).

usage: python3 -I scripts/birds/gull_resynth.py REC.wav T0 T1 CS CE OUTDIR
  REC.wav  a recording kept OUTSIDE the repository (licences: nothing here is derived by copying; only numbers are measured)
  T0 T1    window to cut (seconds), CS CE  start/end of the call inside it
Writes OUTDIR/real.wav, synth.wav, compare.png and prints the look score (correlation of blurred spectrograms,
150 Hz to 6 kHz; 0.82 to 0.96 matched the eye in earlier work, under 0.75 was visibly wrong).

Model (source plus noise, no neural part):
  f0(t)         12 knots, pchip; held through the noisy onset; the last 20 frames re-tracked so the end flick survives
  harmonics     k = 1..8 at k*f0: log amplitudes reduced to rank 2 over the call, then pchip through the same knots
  second voice  a period-doubled voice at f0/2 (lines at 0.5, 1.5 ... 5.5 times f0), only while its 1.5*f0 line stands out
  residual      noise in 27 log-spaced bands from what is left once the harmonic and second-voice lines are masked out,
                times NOISE (the measured level was too hazy through the body of the call)
  gate          2 ms attack, 4 ms release (real calls stop within a few ms)
"""
import sys
import numpy as np
from scipy.io import wavfile
from scipy.signal import stft, istft
from scipy.ndimage import gaussian_filter, uniform_filter1d
from scipy.interpolate import PchipInterpolator

NF, HOP = 1024, 128
K, NK, RANK, NOISE = 8, 12, 2, 0.4
ONSET_NOISE = float(__import__('os').environ.get('ONSET_NOISE', '0.5'))   # extra factor on the noise in the first 70 ms


def para(m, i):
    """Parabolic peak position and height around bin i (log domain)."""
    if i <= 0 or i >= len(m) - 1:
        return float(i), m[i]
    a, b, c = np.log(m[i - 1] + 1e-12), np.log(m[i] + 1e-12), np.log(m[i + 1] + 1e-12)
    p = 0.5 * (a - c) / (a - 2 * b + c)
    return i + p, np.exp(b - 0.25 * (a - c) * p)


def main(rec, T0, T1, CS, CE, out):
    sr, x = wavfile.read(rec)
    x = x.astype(float) / 32768 if x.dtype == np.int16 else x.astype(float)
    if x.ndim > 1:
        x = x.mean(1)
    ref = x[int(T0 * sr):int(T1 * sr)]
    n = len(ref)

    def spec(s):
        return stft(s, sr, window='hann', nperseg=NF, noverlap=NF - HOP, boundary=None, padded=False)

    f, t, Z = spec(ref)
    M = np.abs(Z)
    df = f[1]
    on, off = int(np.argmin(abs(t - (CS - T0)))), int(np.argmin(abs(t - (CE - T0))))

    # ---- f0: harmonic-sum salience over h1..h4, followed outward from the middle of the call
    cand = np.arange(750, 1700, 2.0)
    S = np.array([sum(np.log(np.interp(cand * k, f, M[:, j]) + 1e-6) * (1.0 if k < 3 else 0.7) for k in (1, 2, 3, 4))
                  for j in range(len(t))]).T
    f0 = np.zeros(len(t))
    mid = (on + off) // 2
    i0 = int(np.argmax(S[:, mid]))
    for rng in (range(mid, on - 1, -1), range(mid, off + 1)):
        cur = i0
        for j in rng:
            a = max(cur - 30, 0)
            cur = a + int(np.argmax(S[a:cur + 31, j]))
            f0[j] = cand[cur]
    f0[on:on + 12] = f0[on + 12]                      # the onset is noise: hold the first reliable value
    f0[:on] = f0[on]
    f0[off + 1:] = f0[off]
    cur = int(round(f0[off - 20] / df))               # end of the call: follow the peak itself, it flicks down
    for j in range(off - 20, off + 1):
        a = cur - (2 if j < off - 14 else 5)
        cur = a + int(np.argmax(M[a:cur + (3 if j < off - 14 else 6), j]))
        f0[j] = para(M[:, j], cur)[0] * df
    f0s = uniform_filter1d(f0, 5)
    f0s[off - 12:off + 1] = f0[off - 12:off + 1]
    f0s[:on] = f0s[on]
    f0s[off + 1:] = f0s[off]

    # ---- harmonic amplitudes at k*f0
    H = np.zeros((K, len(t)))
    for j in range(on, off + 1):
        for k in range(1, K + 1):
            fc = k * f0s[j]
            if fc >= 8000:
                continue
            i = int(round(fc / df))
            w = max(2, int(0.025 * fc / df))
            a = max(i - w, 0)
            H[k - 1, j] = para(M[:, j], a + int(np.argmax(M[a:i + w + 1, j])))[1]
    H = uniform_filter1d(H, 3, axis=1)

    # ---- second voice: a period-doubled voice at f0/2, i.e. lines at 0.5, 1.5, 2.5 ... times f0 (the "halftone" lines
    #      that stand out clearly in the onset). Measured only in frames where the 1.5*f0 line clearly stands out.
    NS = 6
    R = np.zeros(len(t), bool)
    RH = np.zeros((NS, len(t)))
    for j in range(max(on - 2, 0), off + 1):
        c = 1.5 * f0s[j]
        i = int(round(c / df))
        w = int(0.1 * c / df)
        seg = M[i - w:i + w + 1, j]
        if seg.max() > 5 * np.median(seg) and abs((i - w + int(np.argmax(seg))) * df / c - 1) < 0.04:
            R[j] = True
            for m in range(NS):
                fc = (m + 0.5) * f0s[j]
                i2 = int(round(fc / df))
                w2 = max(2, int(0.02 * fc / df))
                a2 = max(i2 - w2, 0)
                RH[m, j] = para(M[:, j], a2 + int(np.argmax(M[a2:i2 + w2 + 1, j])))[1] if fc < 8000 else 0
    RH = gaussian_filter(RH, (0, 1.5))

    # ---- residual noise envelope: what is left once the lines are masked out
    edges = np.geomspace(200, 7500, 28)
    cent = np.sqrt(edges[:-1] * edges[1:])
    E = np.zeros((len(cent), len(t)))
    for j in range(max(on - 6, 0), min(off + 7, len(t))):
        c0 = f0s[min(max(j, on), off)]
        mask = np.ones(len(f), bool)
        for k in range(1, 12):
            for r in ((k, k - 0.5) if R[j] else (k,)):
                mask &= ~(np.abs(f - r * c0) < 0.05 * r * c0 + df)
        for b in range(len(cent)):
            sel = (f >= edges[b]) & (f < edges[b + 1]) & mask
            E[b, j] = np.sqrt(np.mean(M[sel, j] ** 2)) if sel.any() else 0
    E = gaussian_filter(E, (0.7, 1.0))

    # ---- reduce to curves: pitch on knots, harmonic log-amplitudes rank 2 and pchip through the same knots
    cs = np.arange(on, off + 1)
    kn = np.unique(np.round(np.r_[on, on + 6, on + 14, np.linspace(on + 24, off - 12, NK - 6), off - 8, off - 4, off]).astype(int))
    f0s[on:off + 1] = PchipInterpolator(kn, f0s[kn])(cs)
    L = np.log(H[:, on:off + 1] + 1e-6)
    mu = L.mean(1, keepdims=True)
    U, Sv, Vt = np.linalg.svd(L - mu, full_matrices=False)
    Hr = H.copy()
    Hr[:, on:off + 1] = np.exp(mu + (U[:, :RANK] * Sv[:RANK]) @ Vt[:RANK])
    for k in range(K):
        Hr[k, on:off + 1] = PchipInterpolator(kn, Hr[k, kn])(cs)
    H = Hr

    # ---- synthesis
    tt = np.arange(n) / sr

    def track(v):
        return np.interp(tt, t, v)

    F0 = track(f0s)
    ph = 2 * np.pi * np.cumsum(F0) / sr
    y = np.zeros(n)
    for k in range(1, K + 1):                          # a Hann STFT shows a sine of amplitude A as A*NF/4
        y += track(H[k - 1]) * 4 / NF * (k * F0 < sr / 2) * np.sin(k * ph + 0.3 * k)
    for m in range(NS):                                # lines at (m+0.5)*f0: phase is half the f0 phase times (2m+1)
        y += track(RH[m]) * 4 / NF * ((m + 0.5) * F0 < sr / 2) * np.sin((m + 0.5) * ph + 0.7 * (m + 1))
    g = np.random.default_rng(2).standard_normal(n)
    _, _, G = spec(g)
    for j in range(min(G.shape[1], E.shape[1])):
        G[:, j] *= np.interp(f, cent, E[:, j], left=0, right=0) / np.sqrt(NF / 2 * 0.375 * 0.5) * NOISE
    G[:, E.shape[1]:] = 0
    _, nz = istft(G, sr, window='hann', nperseg=NF, noverlap=NF - HOP, boundary=False)
    nz = np.pad(nz, (0, max(0, n - len(nz))))[:n]
    gate = np.clip((tt + T0 - CS) / 0.002, 0, 1) * np.clip((CE - (tt + T0)) / 0.004, 0, 1)
    nz = nz * np.where(tt + T0 < CS + 0.07, ONSET_NOISE, 1.0)
    y = (y + nz) * gate
    body = slice(int((CS - T0) * sr), int((CE - T0) * sr))
    y *= np.sqrt(np.mean(ref[body] ** 2) / np.mean(y[body] ** 2))

    # ---- look score and a contact sheet
    _, _, Zb = spec(y)
    m = min(Z.shape[1], Zb.shape[1])
    fl, fh = int(150 / df), int(6000 / df)
    A = 20 * np.log10(np.abs(Z[fl:fh, :m]) + 1e-9)
    B = 20 * np.log10(np.abs(Zb[fl:fh, :m]) + 1e-9)
    top = A.max()
    A, B = (gaussian_filter(np.maximum(v, top - 70), (1.5, 3)) for v in (A, B))
    print('look score %.3f' % np.corrcoef(A.ravel(), B.ravel())[0, 1])
    import os
    os.makedirs(out, exist_ok=True)
    wavfile.write(os.path.join(out, 'real.wav'), sr, (np.clip(ref, -1, 1) * 32767).astype(np.int16))
    wavfile.write(os.path.join(out, 'synth.wav'), sr, (np.clip(y, -1, 1) * 32767).astype(np.int16))
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    fig, ax = plt.subplots(2, 1, figsize=(13, 8))
    for a, s, nm in zip(ax, (ref, y + 1e-5 * np.random.default_rng(3).standard_normal(n)), ('real', 'synth')):
        a.specgram(s, NFFT=1024, Fs=sr, noverlap=900, cmap='magma', vmin=-120, vmax=-45, xextent=(T0, T1))
        a.set_ylim(0, 6000)
        a.set_title(nm)
    plt.tight_layout()
    plt.savefig(os.path.join(out, 'compare.png'), dpi=70)


if __name__ == '__main__':
    r, *v, o = sys.argv[1:]
    main(r, *map(float, v), o)
