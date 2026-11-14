# Average spectrogram of one footfall: every isolated step in a recording, aligned on its onset, then averaged: the shape of a single step in time and frequency.
#   python stepspec.py out.png file.wav [file.wav ...]   (one panel for each file)
import sys, numpy as np
from scipy import signal
from scipy.io import wavfile
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
out, files = sys.argv[1], sys.argv[2:]
fig, axs = plt.subplots(1, len(files), figsize=(5.2 * len(files), 4.2), squeeze=False)
for ax, name in zip(axs[0], files):
    sr, x = wavfile.read(name); x = x.astype(float) / (32768 if x.dtype == np.int16 else 1); m = x.mean(axis=1) if x.ndim > 1 else x
    hp = signal.sosfilt(signal.butter(4, 60, 'highpass', fs=sr, output='sos'), m)
    n = int(sr * 0.002); k = len(hp) // n
    e = 10 * np.log10((hp[:k * n] ** 2).reshape(k, n).mean(axis=1) + 1e-18)
    pk, _ = signal.find_peaks(e, height=np.percentile(e, 15) + 22, distance=int(0.3 / 0.002))
    pk = [p for p in pk if p > 10 and p * n + int(sr * 0.2) < len(hp) and not any(q > p and q < p + int(0.25 / 0.002) for q in pk)]
    nper, hop = int(sr * 0.004), int(sr * 0.001)
    acc = None
    for p in pk:
        # onset: the first frame within 12 dB of this step's peak, a little before the peak
        i0 = max(0, p * n - int(sr * 0.02))
        seg = hp[i0: p * n + int(sr * 0.2)]
        f, t, S = signal.spectrogram(seg, sr, nperseg=nper, noverlap=nper - hop, window='hann', nfft=1024)
        S = S / (S.max() + 1e-30)
        acc = S if acc is None else (acc[:, :min(acc.shape[1], S.shape[1])] + S[:, :min(acc.shape[1], S.shape[1])])
    if acc is None: ax.set_title(name.split('/')[-1] + ' (no steps)'); continue
    acc = acc / len(pk); db = 10 * np.log10(acc + 1e-12)
    sel = (f > 80) & (f < 12000)
    ax.pcolormesh((t - 0.02) * 1000, f[sel], db[sel], vmin=-55, vmax=-5, cmap='magma', shading='auto'); ax.set_yscale('log')
    ax.set_xlim(-10, 150); ax.set_xlabel('ms from the step'); ax.set_ylabel('Hz'); ax.set_title(f'{name.split("/")[-1]} ({len(pk)} steps)', fontsize=9)
plt.tight_layout(); plt.savefig(out, dpi=110)
