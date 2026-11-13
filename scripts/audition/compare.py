# Compare renders of the same sound at different settings (e.g. a fall at three flows), by the cues that tell "more of it" from "closer":
# level, spectral centroid, energy by band in absolute dB, the share of low and high energy, audible clinks and short-term tonality.
#   python compare.py <skip_seconds> name1.wav name2.wav ...
import sys, numpy as np
from scipy import signal
from scipy.io import wavfile
skip = float(sys.argv[1]); names = sys.argv[2:]
cent = [62, 125, 250, 500, 1000, 2000, 4000, 8000]
print(f"{'':<22}{'rms':>7} {'centroid':>9}   " + ' '.join(f'{c:>6}' for c in cent) + "   LF(60-250)  HF(2-10k)  clinks/s")
for n in names:
    sr, x = wavfile.read(n); m = (x.mean(axis=1) if x.ndim > 1 else x)[int(sr*skip):].astype(np.float64)
    f, P = signal.welch(m, sr, nperseg=16384); tot = P.sum()
    lv = [10*np.log10(P[(f >= c/2**.5) & (f < c*2**.5)].sum() + 1e-20) for c in cent]
    lf = 10*np.log10(P[(f >= 60) & (f < 250)].sum() + 1e-20); hf = 10*np.log10(P[(f >= 2000) & (f < 10000)].sum() + 1e-20)
    # clinks
    hp = signal.sosfilt(signal.butter(4, [1500, 8000], 'bandpass', fs=sr, output='sos'), m); w = int(sr*0.002)
    d = 10*np.log10(np.convolve(hp**2, np.ones(w)/w, 'valid')[::w] + 1e-18); ex = d - signal.medfilt(d, 51)
    pk, _ = signal.find_peaks(ex, height=9, distance=12)
    print(f"{n.split('/')[-1][:21]:<22}{20*np.log10(m.std()):7.1f} {int((f*P).sum()/tot):9d}   " + ' '.join(f'{v:6.1f}' for v in lv) + f"   {lf:9.1f}  {hf:9.1f}  {len(pk)/(len(d)*0.002):7.2f}")
