# Spectrogram montage of recordings, for looking at the structure of a call before modelling it.   python spec.py out.png fmax_hz "file.wav[:start:dur]" ...
import sys, numpy as np
from scipy import signal
from scipy.io import wavfile
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
out, fmax, items = sys.argv[1], float(sys.argv[2]), sys.argv[3:]
fig, axs = plt.subplots(len(items), 1, figsize=(13, 2.6 * len(items)), squeeze=False)
for ax, it in zip(axs[:, 0], items):
    parts = it.split(':'); name = parts[0]; t0 = float(parts[1]) if len(parts) > 1 else 0; dur = float(parts[2]) if len(parts) > 2 else 12
    sr, x = wavfile.read(name); x = x.astype(float) / (32768 if x.dtype == np.int16 else 1); m = x.mean(axis=1) if x.ndim > 1 else x
    m = m[int(t0 * sr): int((t0 + dur) * sr)]
    f, t, S = signal.spectrogram(m, sr, nperseg=1024, noverlap=896, nfft=2048)
    sel = f <= fmax; db = 10 * np.log10(S[sel] + 1e-14); ax.pcolormesh(t + t0, f[sel] / 1000, db, vmin=db.max() - 70, vmax=db.max() - 5, cmap='magma', shading='auto')
    ax.set_ylabel('kHz'); ax.set_title(name.split('/')[-1] + f'  {t0:.0f}-{t0+dur:.0f} s', fontsize=8)
plt.tight_layout(); plt.savefig(out, dpi=80)
