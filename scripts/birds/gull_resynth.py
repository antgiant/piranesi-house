#!/usr/bin/env python3
"""Gull call: measure ONE call from a recording and resynthesise it from a small set of curves (prototype, offline).

usage: python3 -I scripts/birds/gull_resynth.py REC.wav T0 T1 CS CE OUTDIR
  REC.wav  a recording kept OUTSIDE the repository (licences: nothing here is derived by copying; only numbers are measured)
  T0 T1    window to cut (seconds), CS CE  start/end of the call inside it
Writes OUTDIR/real.wav, synth.wav, compare.png and prints the look score (correlation of blurred spectrograms,
150 Hz to 6 kHz; 0.82 to 0.96 matched the eye in earlier work, under 0.75 was visibly wrong).

Model (source plus noise, no neural part). Two time scales: a slow one (23 ms window) for pitch and spectrum shape, and a fine
one (5.8 ms window, 0.7 ms hop) for loudness and noise, so a rasp, a pop and a closing click are events, not blur.
  f0(t)         knots chosen where needed (about 8 for a simple call, 40 for a wavy one), pchip; steps kept; the pitch is found by
                Viterbi over harmonic-sum salience (jumps allowed at a cost); the last 20 frames re-tracked so the end dive survives
  harmonics     k = 1..12 at k*f0 (to 12 kHz: the real lines go that high): log amplitudes reduced to rank 3, then pchip through the knots
  second voice  a period-doubled voice at f0/2 (lines at 0.5, 1.5 ... 9.5 times f0), only while its 1.5*f0 line stands out
  line level    a gain (real line level / synth line level, measured every 0.7 ms) stored as a few dB knots with straight lines
                between them: this is what keeps the pop to full level (about 2 ms) and the collapse at the end
  noise         per 0.7 ms frame, 24 bands from 250 Hz to 12 kHz, from what is left once the lines (and, while the pitch moves, their
                smear) are masked out; a low percentile, so leakage cannot inflate it. Units are true amplitudes: no fudge factor,
                the final level correction comes out at 0.94 to 1.08
  gate          2 ms attack; the noise may run 30 ms past the call end (the closing sound)
"""
import sys
import numpy as np
from scipy.io import wavfile
from scipy.signal import stft, istft
from scipy.ndimage import gaussian_filter, uniform_filter1d, median_filter
from scipy.interpolate import PchipInterpolator

NF, HOP = 1024, 128
K, NK, NOISE = 12, 12, 1.0
RANK = int(__import__('os').environ.get('RANK', '3'))
STEP_REFINE = __import__('os').environ.get('STEP_REFINE', '1') == '1'  # place each pitch step where the new lines overtake the old (fine analysis)
ONSET_TRACK = __import__('os').environ.get('ONSET_TRACK', '1') == '1'   # follow the pitch through the first 65 ms on the fine analysis
SUB = float(__import__('os').environ.get('SUB', '2.0'))   # how many noise-medians a line peak must exceed to count as tone
NF2, HOP2 = 256, 32                                          # the fine analysis: 5.8 ms window, 0.7 ms hop


def para(m, i):
    """Parabolic peak position and height around bin i (log domain)."""
    if i <= 0 or i >= len(m) - 1:
        return float(i), m[i]
    a, b, c = np.log(m[i - 1] + 1e-12), np.log(m[i] + 1e-12), np.log(m[i + 1] + 1e-12)
    d = a - 2 * b + c
    if d > -1e-6:                                      # flat or not a peak: no interpolation (it blows up)
        return float(i), m[i]
    p = float(np.clip(0.5 * (a - c) / d, -1, 1))
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

    def spec2(sig):                                   # the fine analysis: 5.8 ms window, 0.7 ms hop
        return stft(sig, sr, window='hann', nperseg=NF2, noverlap=NF2 - HOP2, boundary=None, padded=False)

    f2, t2, Z2 = spec2(ref)
    M2 = np.abs(Z2)
    df2 = f2[1]
    on, off = int(np.argmin(abs(t - (CS - T0)))), int(np.argmin(abs(t - (CE - T0))))

    # ---- f0: harmonic-sum salience over h1..h4, followed outward from the middle of the call
    cand = np.arange(750, 1700, 2.0)
    LAM, JUMP = 0.04, 14.0                             # cost per candidate step (2 Hz) when gliding; flat cost of a jump
    S = np.array([sum(np.log(np.interp(cand * k, f, M[:, j]) + 1e-6) * (1.0 if k < 3 else 0.7) for k in (1, 2, 3, 4))
                  for j in range(len(t))]).T
    def viterbi(Sx, lam, jump):
        """Best path through a salience matrix (candidates x frames): gliding costs lam per candidate step, a jump a flat cost."""
        ic = np.arange(Sx.shape[0])
        nc = len(ic)
        D = -Sx[:, 0].copy()
        back = np.zeros(Sx.shape, int)
        for q in range(1, Sx.shape[1]):
            fw = np.minimum.accumulate(D - lam * ic) + lam * ic                      # best predecessor at or below i
            fwi = np.maximum.accumulate(np.where(D - lam * ic <= fw, ic, 0))
            bw = (np.minimum.accumulate((D + lam * ic)[::-1])[::-1]) - lam * ic     # at or above i
            bwi = np.minimum.accumulate(np.where((D + lam * ic) <= (bw + lam * ic), ic, nc - 1)[::-1])[::-1]
            use_f = fw <= bw
            glide, gi = np.where(use_f, fw, bw), np.where(use_f, fwi, bwi)
            am = int(np.argmin(D))
            take_j = D[am] + jump < glide
            D = -Sx[:, q] + np.where(take_j, D[am] + jump, glide)
            back[:, q] = np.where(take_j, am, gi)
        path = np.zeros(Sx.shape[1], int)
        path[-1] = int(np.argmin(D))
        for q in range(Sx.shape[1] - 1, 0, -1):
            path[q - 1] = back[path[q], q]
        return path

    # the onset (first ONSET s): a smooth glide, no jumps, on a middle window (11.6 ms); the 23 ms window cannot see a
    # 50 ms sweep and the 5.8 ms one cannot resolve the lines
    ONSET = 0.055
    j0 = int(np.argmin(abs(t - (t[on] + ONSET))))
    f3, t3, Z3 = stft(ref, sr, window='hann', nperseg=512, noverlap=512 - 64, boundary=None, padded=False)
    M3 = np.abs(Z3)
    w0, w1 = int(np.argmin(abs(t3 - t[on]))), int(np.argmin(abs(t3 - t[j0])))
    cand2 = np.arange(800, 1500, 4.0)
    wts = (1.0, 1.0, 0.8, 0.6)
    S2 = np.array([sum(w * np.log(np.interp(cand2 * k, f3, M3[:, q]) + 1e-6) for k, w in enumerate(wts, 1))
                   for q in range(w0, w1 + 1)]).T
    f0_onset = cand2[viterbi(S2, 0.05, 1e9)]
    f0 = np.zeros(len(t))
    pth = viterbi(S[:, j0:off + 1], LAM, JUMP)
    f0[j0:off + 1] = cand[pth]
    f0[on:j0] = np.interp(t[on:j0], t3[w0:w1 + 1], f0_onset)
    if not ONSET_TRACK:                                # the older behaviour: hold the first reliable value
        f0[on:j0] = f0[j0]
    f0[:on] = f0[on]
    f0[off + 1:] = f0[off]
    cur = int(round(f0[off - 20] / df))               # end of the call: follow the peak itself, it flicks down
    for j in range(off - 20, off + 1):
        a = cur - (2 if j < off - 14 else 5)
        cur = a + int(np.argmax(M[a:cur + (3 if j < off - 14 else 6), j]))
        f0[j] = para(M[:, j], cur)[0] * df
    # a step's time: the Viterbi path may jump anywhere the old and new pitch score alike (the old note fading, the new not yet
    # there). Put it where, at 0.7 ms resolution, the lines of the new pitch overtake those of the old one.
    def lines_at(fp, jj):
        return sum(M2[max(int(round(k * fp / df2)) - 1, 0):int(round(k * fp / df2)) + 2, jj].max() for k in (1, 2, 3, 4))

    raw = median_filter(f0, 3)
    jumps = [j for j in range(j0 + 2, off - 1) if abs(raw[j + 1] - raw[j]) > 0.06 * raw[j]]   # after the onset
    done_until = -1
    for j in (jumps if STEP_REFINE else []):
        if j <= done_until:
            continue
        before, after = f0[max(j - 10, on):max(j - 3, on + 1)], f0[j + 8:min(j + 14, off + 1)]
        if len(before) == 0 or len(after) == 0:       # a step right at the end of the call (the end dive): leave it to the tracker
            continue
        fa, fb = float(np.median(before)), float(np.median(after))
        if abs(fb - fa) < 0.06 * fa:
            continue
        if np.ptp(before) > 0.03 * fa or np.ptp(after) > 0.03 * fb:   # not steady on both sides: a glide, not a step
            continue
        tj = t[j]
        w0, w1 = int(np.argmin(abs(t2 - (tj - 0.09)))), int(np.argmin(abs(t2 - (tj + 0.09))))
        d = np.array([lines_at(fb, q) - lines_at(fa, q) for q in range(w0, w1)])
        k_ = next((q for q in range(4, len(d) - 4) if (d[q:q + 4] > 0).all() and (d[q - 4:q] < 0).all()), None)   # old dominates, then new
        if k_ is not None:
            tstar = t2[w0 + k_]
            lo_j, hi_j = int(np.argmin(abs(t - (tj - 0.09)))), int(np.argmin(abs(t - (tj + 0.09))))
            for q in range(lo_j, hi_j + 1):
                f0[q] = fa if t[q] < tstar else fb
            done_until = hi_j
            print('step at %.3f s (the tracker had %.3f): %.0f -> %.0f Hz' % (tstar + T0, tj + T0, fa, fb))
    f0 = median_filter(f0, 3)
    f0s = f0.copy()                                   # smooth within each stretch, never across a step
    steps = [j for j in range(on, off) if abs(f0[j + 1] - f0[j]) > 0.06 * f0[j]]
    bounds = [on] + [j + 1 for j in steps] + [off + 1]
    for u, v in zip(bounds[:-1], bounds[1:]):
        f0s[u:v] = uniform_filter1d(f0[u:v], 5, mode='nearest') if v - u > 4 else f0[u:v]
    f0s[off - 12:off + 1] = f0[off - 12:off + 1]
    f0s[:on] = f0s[on]
    f0s[off + 1:] = f0s[off]

    # ---- harmonic amplitudes at k*f0
    H = np.zeros((K, len(t)))
    for j in range(on, off + 1):
        for k in range(1, K + 1):
            fc = k * f0s[j]
            if fc >= 12000:
                continue
            i = int(round(fc / df))
            w = max(2, int(0.025 * fc / df))
            a = max(i - w, 0)
            H[k - 1, j] = para(M[:, j], a + int(np.argmax(M[a:i + w + 1, j])))[1]
    H = uniform_filter1d(H, 3, axis=1)

    # ---- second voice: a period-doubled voice at f0/2, i.e. lines at 0.5, 1.5, 2.5 ... times f0 (the "halftone" lines
    #      that stand out clearly in the onset). Measured only in frames where the 1.5*f0 line clearly stands out.
    NS = 10
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
                RH[m, j] = para(M[:, j], a2 + int(np.argmax(M[a2:i2 + w2 + 1, j])))[1] if fc < 12000 else 0
    RH = gaussian_filter(RH, (0, 1.5))

    # ---- reduce to curves: pitch on knots, harmonic log-amplitudes rank 2 and pchip through the same knots
    cs = np.arange(on, off + 1)
    forced = {on, on + 6, on + 14, off - 8, off - 4, off}
    for j in steps:                                   # a step is two neighbouring knots
        forced |= {max(j - 1, on), j, j + 1, min(j + 2, off)}
    kn = sorted(forced)
    while len(kn) < 70:                               # add a knot where the curve is worst until within 1.2 percent
        cur_c = PchipInterpolator(kn, f0s[kn])(cs)
        err = np.abs(cur_c - f0s[on:off + 1]) / f0s[on:off + 1]
        if err.max() < 0.012:
            break
        kn = sorted(set(kn) | {int(cs[np.argmax(err)])})
    kn = np.array(kn)
    print('knots', len(kn), 'steps', len(steps))
    f0s[on:off + 1] = PchipInterpolator(kn, f0s[kn])(cs)
    L = np.log(H[:, on:off + 1] + 1e-4 * H.max())
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
    for k in range(1, K + 1):                          # scipy's STFT shows a sine of amplitude A as A/2
        y += track(H[k - 1]) * 2 * (k * F0 < sr / 2) * np.sin(k * ph + 0.3 * k)
    for m in range(NS):                                # lines at (m+0.5)*f0: phase is half the f0 phase times (2m+1)
        y += track(RH[m]) * 2 * ((m + 0.5) * F0 < sr / 2) * np.sin((m + 0.5) * ph + 0.7 * (m + 1))
    # ---- fine layer 1: loudness of the lines at 0.7 ms (the long window smears a pop over 30 ms). Gain = real / synth line level
    f0_2 = np.interp(t2, t, f0s)
    j_on, j_off = int(np.argmin(abs(t2 - (CS - T0 - 0.004)))), int(np.argmin(abs(t2 - (CE - T0 + 0.004))))
    R2 = np.interp(t2, t, R.astype(float)) > 0.5
    slope = np.abs(np.gradient(f0_2, t2)) * (NF2 / sr)     # Hz the pitch moves during one analysis window

    def line_level(M2x, subtract_noise):
        lev = np.zeros(len(t2))
        for j in range(j_on, j_off + 1):
            tot = 0.0
            for k in range(1, K + 1):
                fc = k * f0_2[j]
                if fc >= 12000:
                    break
                i = int(round(fc / df2))
                pk = M2x[max(i - 1, 0):i + 2, j].max()
                if subtract_noise:
                    lo_, hi_ = int(max(fc - 0.45 * f0_2[j], 0) / df2), int((fc + 0.45 * f0_2[j]) / df2) + 1
                    nb = np.r_[M2x[lo_:max(i - 2, lo_), j], M2x[i + 3:hi_, j]]
                    nz_ = 1.55 * np.percentile(nb, 25) if len(nb) else 0.0
                    pk = np.sqrt(max(pk ** 2 - (SUB * nz_) ** 2, 0.0))
                tot += pk ** 2
            lev[j] = np.sqrt(tot)
        return lev

    Lr = line_level(M2, True)
    _, _, Zt = spec2(y)
    Lt = line_level(np.abs(Zt), False)
    gdb = 20 * np.log10(np.clip(median_filter(Lr, 3) / (Lt + 1e-9), 0.05, 5.0) + 1e-9)
    seg_ = np.arange(j_on, j_off + 1)
    gk = [seg_[0], seg_[-1]]                           # the level correction as a few knots (dB, straight lines between)
    while len(gk) < 80:
        err = np.abs(np.interp(seg_, gk, gdb[gk]) - gdb[seg_])
        if err.max() < 1.5:
            break
        gk = sorted(set(gk) | {int(seg_[np.argmax(err)])})
    print('level knots', len(gk))
    gain = np.zeros(len(t2))
    gain[j_on:j_off + 1] = 10 ** (np.interp(seg_, gk, gdb[gk]) / 20)
    y = y * np.interp(tt, t2, gain)

    # ---- fine layer 2: noise (the rasp before the pop, the click at the end) from what is left once the lines are masked
    edges = np.geomspace(250, 12000, 25)
    cent = np.sqrt(edges[:-1] * edges[1:])
    n0, n1 = int(np.argmin(abs(t2 - (CS - T0 - 0.01)))), int(np.argmin(abs(t2 - (CE - T0 + 0.03))))
    E2 = np.zeros((len(cent), len(t2)))
    for j in range(n0, n1 + 1):
        c0 = f0_2[min(max(j, j_on), j_off)]
        mask = np.ones(len(f2), bool)
        for k in range(1, 30):
            for r in ((k, k - 0.5) if R2[j] else (k,)):
                mask &= ~(np.abs(f2 - r * c0) < max(2.2 * df2, min(0.08 * r * c0 + r * slope[j], 0.22 * c0)))   # never wider than the gap between halftone lines
        v = np.full(len(cent), np.nan)
        for b in range(len(cent)):
            sel = (f2 >= edges[b]) & (f2 < edges[b + 1]) & mask
            if sel.any():
                v[b] = 1.55 * np.percentile(M2[sel, j], 25)   # low percentile: smeared line leakage cannot inflate it
        ok_ = ~np.isnan(v)
        E2[:, j] = np.interp(np.log(cent), np.log(cent[ok_]), v[ok_]) if ok_.sum() > 1 else 0
    # the 5.8 ms window leaks energy from strong lines into the gaps between them, which reads as a noise floor 10 dB too high
    # where the real call is clean. In the steady body use the long window (better isolation) as a ceiling; keep the fine
    # estimate for the onset rasp and the end sound, where its time resolution is the point.
    E1 = np.zeros((len(cent), len(t)))
    for j in range(max(on - 2, 0), min(off + 3, len(t))):
        c0 = f0s[min(max(j, on), off)]
        mask = np.ones(len(f), bool)
        for k in range(1, 30):
            for r in ((k, k - 0.5) if R[j] else (k,)):
                mask &= ~(np.abs(f - r * c0) < max(3 * df, min(0.04 * r * c0, 0.2 * c0)))
        for b in range(len(cent)):
            sel = (f >= edges[b]) & (f < edges[b + 1]) & mask
            E1[b, j] = 1.55 * np.percentile(M[sel, j], 25) if sel.any() else np.nan
    body = (t2 > CS - T0 + 0.07) & (t2 < CE - T0 - 0.05)
    for b in range(len(cent)):
        ok_ = ~np.isnan(E1[b])
        if ok_.sum() > 1:
            ceil = np.sqrt(NF / NF2) * 1.3 * np.interp(t2, t[ok_], E1[b][ok_])      # long-window magnitudes are smaller by sqrt(NF2/NF)
            E2[b] = np.where(body, np.minimum(E2[b], ceil), E2[b])
    g = np.random.default_rng(2).standard_normal(n)
    _, _, Gn = spec2(g)
    rms_g = np.sqrt(np.mean(np.abs(Gn) ** 2))             # unit white noise: every bin has this rms
    for j in range(min(Gn.shape[1], E2.shape[1])):
        Gn[:, j] *= np.interp(np.log(np.maximum(f2, 1)), np.log(cent), E2[:, j], left=0, right=0) / rms_g * NOISE
    _, nz = istft(Gn, sr, window='hann', nperseg=NF2, noverlap=NF2 - HOP2, boundary=False)
    nz = np.pad(nz, (0, max(0, n - len(nz))))[:n]
    gate = np.clip((tt + T0 - CS) / 0.002, 0, 1) * np.clip((CE + 0.03 - (tt + T0)) / 0.004, 0, 1)
    y = (y + nz) * gate
    body = slice(int((CS - T0) * sr), int((CE - T0) * sr))
    lvl = np.sqrt(np.mean(ref[body] ** 2) / np.mean(y[body] ** 2))
    print('level correction %.2f' % lvl)
    y *= lvl

    # ---- look score and a contact sheet
    _, _, Zb = spec(y)
    m = min(Z.shape[1], Zb.shape[1])
    fl, fh = int(150 / df), int(6000 / df)
    A = 20 * np.log10(np.abs(Z[fl:fh, :m]) + 1e-9)
    B = 20 * np.log10(np.abs(Zb[fl:fh, :m]) + 1e-9)
    top = A.max()
    A, B = (gaussian_filter(np.maximum(v, top - 70), (1.5, 3)) for v in (A, B))
    score = float(np.corrcoef(A.ravel(), B.ravel())[0, 1])
    print('look score %.3f' % score)
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
    plt.close(fig)
    return score


if __name__ == '__main__':
    r, *v, o = sys.argv[1:]
    main(r, *map(float, v), o)
