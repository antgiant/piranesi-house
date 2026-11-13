# Measure wind recordings and renders alike: spectrum in octave bands, how deeply and how fast it gusts, and how tonal it is (moans and whistles).
#   python wind.py <skip_seconds> a.wav b.wav ...
import sys, collections, numpy as np
from scipy import signal
from scipy.io import wavfile
skip = float(sys.argv[1])
for name in sys.argv[2:]:
    sr, x = wavfile.read(name)
    x = x.astype(float) / (32768 if x.dtype == np.int16 else 1)
    if x.ndim == 1: x = np.stack([x, x], 1)
    x = x[int(sr * skip):]; m = x.mean(axis=1)
    f, P = signal.welch(m, sr, nperseg=16384); tot = P.sum()
    cent = [62, 125, 250, 500, 1000, 2000, 4000, 8000]
    print(f'== {name.split("/")[-1]}: rms {20*np.log10(m.std()):.1f} dB, L/R corr {np.corrcoef(x[:,0], x[:,1])[0,1]:.2f}, centroid {int((f*P).sum()/tot)} Hz')
    print('   octave dB', [round(10 * np.log10(P[(f >= c / 2**.5) & (f < c * 2**.5)].sum() + 1e-20), 1) for c in cent])
    def env(lo, hi, win=0.25):
        y = signal.sosfilt(signal.butter(4, [lo, hi], 'bandpass', fs=sr, output='sos'), m); n = int(sr * win)
        return 20 * np.log10(np.sqrt(np.convolve(y**2, np.ones(n) / n, 'valid')[::n // 2]) + 1e-9)
    print('   gust depth (p5-p95 dB) by band', {f'{lo}-{hi}': round(float(np.percentile(e, 95) - np.percentile(e, 5)), 1) for lo, hi in [(60, 200), (200, 600), (600, 1500), (1500, 4000)] for e in [env(lo, hi)]})
    e = env(200, 1500); e = e - e.mean(); ac = np.correlate(e, e, 'full')[len(e) - 1:]; ac /= ac[0]
    print('   envelope autocorr at 0.5/1/2/4/8 s', [round(float(ac[int(s / 0.125)]), 2) for s in (0.5, 1, 2, 4, 8) if int(s / 0.125) < len(ac)])
    f2, t2, S = signal.spectrogram(m, sr, nperseg=8192, noverlap=4096); S = 10 * np.log10(S + 1e-20)
    ex = S - np.apply_along_axis(lambda c: signal.medfilt(c, 41), 0, S); band = (f2 > 150) & (f2 < 3000)
    strong = ex[band].max(axis=0) > 12; pk = f2[band][np.argmax(ex[band], axis=0)]
    print(f'   tonal frames {100*strong.mean():.0f}%; peak Hz percentiles', [int(v) for v in np.percentile(pk[strong], [5, 25, 50, 75, 95])] if strong.any() else '-',
          'common', collections.Counter((pk[strong] // 50 * 50).astype(int)).most_common(4))
