#!/usr/bin/env python3
"""Find the isolated calls in a recording and run gull_resynth on each one; print a score table and the summary.

usage: python3 -I scripts/birds/gull_batch.py REC.wav OUTDIR
REC.wav is kept outside the repository. Calls are found from the 600 to 6000 Hz envelope (5 ms), kept when 0.25 to 1.5 s
long and at least 0.25 s from the neighbours, then each is trimmed to where it is within 20 dB of its own peak.
Lesson: convert envelope indices to time with the real hop (samples / sr); using a rounded 5 ms drifted by 0.1 s at 46 s
and made late calls look wrong when the synthesis was fine.
"""
import os
import statistics
import sys
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gull_resynth as G


def find_calls(x, sr):
    sos = butter(4, [600, 6000], 'bp', fs=sr, output='sos')
    e = np.abs(sosfilt(sos, x))
    h = int(0.005 * sr)
    dt = h / sr
    env = np.sqrt(np.convolve(e ** 2, np.ones(h) / h, 'same'))[::h]
    on = env > 0.05 * np.percentile(env, 99)
    segs, i = [], 0
    while i < len(on):
        if on[i]:
            j = i
            while j < len(on) and (on[j] or on[j:j + 20].any()):
                j += 1
            segs.append((i * dt - 0.01, j * dt))
            i = j
        else:
            i += 1
    segs = [s for s in segs if 0.25 < s[1] - s[0] < 1.5]
    out = []
    for a, b in segs:
        i0, i1 = int(max(a, 0) / dt), int(b / dt) + 1
        seg = env[i0:i1]
        ok = np.where(seg >= 0.10 * seg.max())[0]
        out.append(((i0 + ok[0]) * dt - dt, (i0 + ok[-1]) * dt + dt))
    total = len(x) / sr
    return [s for k, s in enumerate(out) if s[0] > 0.5 and s[1] < total - 0.5
            and (k == 0 or s[0] - out[k - 1][1] > 0.25) and (k == len(out) - 1 or out[k + 1][0] - s[1] > 0.25)]


if __name__ == '__main__':
    rec, outdir = sys.argv[1:3]
    sr, x = wavfile.read(rec)
    x = x.astype(float) / 32768 if x.dtype == np.int16 else x.astype(float)
    scores = []
    for n, (a, b) in enumerate(find_calls(x, sr)):
        try:
            sc = G.main(rec, a - 0.1, b + 0.15, a, b, os.path.join(outdir, 'call_%02d' % n))
            scores.append(sc)
            print('call %02d  %.2f-%.2f s  look %.3f' % (n, a, b, sc), flush=True)
        except Exception as ex:    # a call outside the pitch search range (750 to 1700 Hz) can fail
            print('call %02d  %.2f-%.2f s  FAILED %r' % (n, a, b, ex))
    if scores:
        print('%d calls, median %.3f, >=0.9: %d, 0.75 to 0.9: %d, <0.75: %d' % (
            len(scores), statistics.median(scores), sum(s >= .9 for s in scores),
            sum(.75 <= s < .9 for s in scores), sum(s < .75 for s in scores)))
