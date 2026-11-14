# The envelope of one footfall in three bands (50-300, 300-1500, 1.5-8 kHz), averaged over every isolated step: dB below the step's own peak, from the impact on.
#   python stepenv.py file.wav ...
import sys, numpy as np
from scipy import signal
from scipy.io import wavfile
bands = [(50, 300), (300, 1500), (1500, 8000)]
for name in sys.argv[1:]:
    sr, x = wavfile.read(name); x = x.astype(float) / (32768 if x.dtype == np.int16 else 1); m = x.mean(axis=1) if x.ndim > 1 else x
    E = {}
    for lo, hi in bands:
        y = signal.sosfilt(signal.butter(4, [lo, hi], 'bandpass', fs=sr, output='sos'), m); n = int(sr * 0.004); k = len(y) // n
        E[(lo, hi)] = 10 * np.log10((y[:k * n] ** 2).reshape(k, n).mean(axis=1) + 1e-18)
    tot = 10 * np.log10(sum(10 ** (E[b] / 10) for b in bands))
    pk, _ = signal.find_peaks(tot, height=np.percentile(tot, 15) + 22, distance=int(0.35 / 0.004))
    pk = [p for p in pk if p + 130 < len(tot) and p >= 10 and not any(q > p and q < p + int(0.45 / 0.004) for q in pk)]
    print(f'== {name.split("/")[-1]}: {len(pk)} isolated steps')
    if len(pk) < 3: continue
    ts = [0, 20, 40, 60, 80, 100, 150, 200, 300, 400]
    print('   ms             :', ' '.join(f'{t:4d}' for t in ts))
    for b in bands:
        acc = np.array([E[b][p - 10:p + 130] - E[b][p - 10:p + 130].max() for p in pk])
        mm = np.median(acc, axis=0)
        print('   %5d-%5d Hz :' % b, ' '.join('%4.0f' % mm[10 + int(t / 4)] for t in ts))
