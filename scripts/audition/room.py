# Measure a room from a recorded impulse (a clap, a pistol shot or a swept-sine impulse response): reverberation time by octave band
# (T20 and the early decay time), how clear it is (C50, C80), when the first reflections arrive and how many come in the first 100 ms, and how the
# tail's spectrum differs from the clap's. Reverse-integrated (Schroeder) energy decay of each band after the loudest onset.   python room.py file.wav ...
import sys, numpy as np
from scipy import signal
from scipy.io import wavfile
BANDS = [125, 250, 500, 1000, 2000, 4000, 8000]
IR_ONSET = '--ir' in sys.argv
def decay(m, sr):
    out = {}
    for c in BANDS:
        lo, hi = c / 2 ** .5, min(c * 2 ** .5, sr / 2 * 0.95)
        y = signal.sosfilt(signal.butter(4, [lo, hi], 'bandpass', fs=sr, output='sos'), m)
        e = y ** 2; on = int(np.argmax(np.abs(m) > 0.001 * np.abs(m).max())) if IR_ONSET else int(np.argmax(np.abs(m)))
        e = e[max(0, on - int(0.002 * sr)):]
        # noise floor: the quietest 10% of the last half; the decay is cut where it meets the floor + 6 dB
        tail = e[len(e) // 2:]; nf = np.percentile(tail, 30) if len(tail) else 0
        seg = np.convolve(e, np.ones(int(0.005 * sr)) / int(0.005 * sr), 'same')
        end = len(e) - 1
        if not IR_ONSET:  # a built impulse response has no noise floor to find
            for i in range(0, len(seg) - 1, int(0.01 * sr)):
                if seg[i] < nf * 4 and i > int(0.05 * sr): end = i; break
        s = np.cumsum(e[:end][::-1])[::-1]; s = 10 * np.log10(s / s[0] + 1e-20); t = np.arange(len(s)) / sr
        def fit(a, b):
            sel = (s <= a) & (s >= b)
            if sel.sum() < 8: return None
            sl = np.polyfit(t[sel], s[sel], 1)[0]; return -60 / sl
        out[c] = (fit(-5, -25), fit(0, -10), end / sr, s, t)
    return out
IR = '--ir' in sys.argv  # a built impulse response, not a clap: measure from sample 0
for name in [a for a in sys.argv[1:] if not a.startswith('--')]:
    sr, x = wavfile.read(name); x = x.astype(float) / (32768 if x.dtype == np.int16 else 2147483648 if x.dtype == np.int32 else 1)
    L = x if x.ndim == 1 else x[:, 0]; m = x if x.ndim == 1 else x.mean(axis=1)
    on = int(np.argmax(np.abs(m) > 0.001 * np.abs(m).max())) if IR else int(np.argmax(np.abs(m)))
    print(f'== {name.split("/")[-1]}: {len(m)/sr:.2f} s, onset at {on/sr:.3f} s' + ('' if x.ndim == 1 else f', L/R correlation after the onset {np.corrcoef(x[on:, 0], x[on:, 1])[0, 1]:.2f}'))
    d = decay(m, sr)
    print('   octave Hz   :', ' '.join(f'{c:>6}' for c in BANDS))
    print('   T20 (s)     :', ' '.join(f'{(d[c][0] if d[c][0] else float("nan")):6.2f}' for c in BANDS))
    print('   EDT (s)     :', ' '.join(f'{(d[c][1] if d[c][1] else float("nan")):6.2f}' for c in BANDS))
    print('   usable (s)  :', ' '.join(f'{d[c][2]:6.2f}' for c in BANDS))
    # clarity and the first reflections, broadband
    e = m[on:] ** 2; t50, t80 = int(0.05 * sr), int(0.08 * sr)
    print(f'   C50 {10*np.log10(e[:t50].sum() / (e[t50:].sum() + 1e-20)):.1f} dB, C80 {10*np.log10(e[:t80].sum() / (e[t80:].sum() + 1e-20)):.1f} dB')
    env = 20 * np.log10(np.abs(signal.hilbert(m[on:on + int(0.15 * sr)])) + 1e-9); env = env - env.max()
    sm = np.convolve(10 ** (env / 10), np.ones(int(0.0005 * sr)) / int(0.0005 * sr), 'same'); sm = 10 * np.log10(sm + 1e-12)
    pk, _ = signal.find_peaks(sm, height=-30, distance=int(0.0015 * sr), prominence=3)
    pk = pk[pk > int(0.001 * sr)]
    print(f'   reflections within -30 dB of the direct sound in the first 100 ms: {np.sum(pk < int(0.1 * sr))}; first at {pk[0]/sr*1000 if len(pk) else float("nan"):.1f} ms, by 20 ms: {np.sum(pk < int(0.02*sr))}, by 50 ms: {np.sum(pk < int(0.05*sr))}')
    f, P = signal.welch(m[on:on + int(0.02 * sr)], sr, nperseg=512); f2, P2 = signal.welch(m[on + int(0.3 * sr):on + int(0.6 * sr)], sr, nperseg=2048) if len(m) > on + int(0.6 * sr) else (None, None)
    if f2 is not None:
        c = lambda ff, PP, a, b: 10 * np.log10(PP[(ff >= a) & (ff < b)].sum() + 1e-20)
        print('   tail (0.3-0.6 s) minus clap (first 20 ms), dB per octave:', {k: round(c(f2, P2, k / 2 ** .5, k * 2 ** .5) - c(f, P, k / 2 ** .5, k * 2 ** .5), 1) for k in [250, 500, 1000, 2000, 4000, 8000]})
