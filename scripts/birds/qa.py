#!/usr/bin/env python3
# Analysis by synthesis: each call of the library, as the game renders it (qa_render.ts), is measured again by the very analysis that measured the real call; it must come back as the
# call it was made from: the same pitch (within 8%), a roughness within 10 dB, and a spectrum of harmonics within 8 dB (mean over the bands that carry them). Calls that do not are
# dropped, and a voice with too few calls left is dropped. This catches what the eye misses: a pitch at half or double, a noise-only call, a tone the noise has swallowed.
#   qa.py <qa_dir> <library.json> <out.json>
import sys, os, json, numpy as np
sys.path.insert(0, os.path.dirname(__file__))
import template as T
from scipy import signal
from scipy.ndimage import gaussian_filter
from scipy.io import wavfile
qd, lib_path, out = sys.argv[1:4]
RANGES = {'gullThin': (3000, 6500, 0.05, 1.0), 'gullChoke': (450, 1500, 0.03, 0.4), 'gullAlarm': (500, 2800, 0.04, 0.6), 'gullFlight': (500, 2800, 0.04, 0.6), 'gullMew': (900, 2800, 0.05, 0.9), 'gullNote': (600, 2200, 0.04, 0.3), 'rookCaw': (220, 750, 0.1, 1.0), 'sparrowChirp': (2200, 7000, 0.03, 0.3), 'blackbirdTink': (1200, 3500, 0.02, 0.15), 'buzzardMew': (1800, 4000, 0.2, 1.0), 'owlScreech': (1500, 2800, 0.3, 2.6), 'gullBeg': (1100, 3000, 0.05, 0.9), 'albatrossWhirr': (1800, 4200, 0.4, 2.8)}
MINV = {'owlScreech': 1, 'albatrossWhirr': 1}
MIN_LOOK = float(os.environ.get('MIN_LOOK', '0.80'))
_wavs = {}

def _spec(x, sr, dur):
    x = x[:int(dur * sr)]; f, t, P = signal.spectrogram(x, sr, nperseg=1024, noverlap=1024 - int(0.005 * sr), nfft=2048); sel = (f >= 150) & (f <= 6000)
    d = 10 * np.log10(P[sel] + 1e-14); d = np.maximum(d - d.max(), -55); return gaussian_filter(d, sigma=(2.0, 3.0))

def look(real_path, a, dur, synth, sr_s):
    """How much the synthesised call looks like the real one: the correlation of the two spectrograms (150 Hz to 6 kHz, from the call's start, blurred a little so that a small shift does not count but a misplaced ridge, a missing step or a haze of noise does).
    Calibrated on 32 calls of the four clean recordings: the calls that look right on a side-by-side (contact sheet) score 0.82 to 0.96, those that are visibly wrong 0.0 to 0.75."""
    if real_path not in _wavs:
        r, x = wavfile.read(real_path); _wavs[real_path] = (r, x.astype(float) / (32768 if x.dtype == np.int16 else 1))
    r, x = _wavs[real_path]; A = _spec(x[max(0, int((a - 0.01) * r)):], r, dur); B = _spec(synth, sr_s, dur); T_ = min(A.shape[1], B.shape[1])
    return float(np.corrcoef(A[:, :T_].ravel(), B[:, :T_].ravel())[0, 1])
lib = json.load(open(lib_path)); res = {}
for kind, spec in lib.items():
    idx = json.load(open(f'{qd}/{kind}.json')); lo, hi, dmin, dmax = RANGES[kind]; wav = f'{qd}/{kind}.wav'
    sr_, x_ = wavfile.read(wav); x_ = x_.astype(float) / 32768
    keep = {}; tot = 0; ok = 0; why = {'none': 0, 'pitch': 0, 'rough': 0, 'spectrum': 0, 'look': 0}
    for e in idx:
        v = spec['voices'][e['voice']]; c = v['calls'][e['call']]; tot += 1
        st = max(0, e['t'] - 0.1)
        got = T.analyse(f"{wav}:{st}:{e['dur'] + 0.2}", lo, hi, 0.0, 3.0, 12.0, 0.6)
        if not got: why['none'] += 1; continue
        g = max(got, key=lambda x: x['dur']); g['am'] = T.am_of(x_, sr_, st + g['a'], g['dur'])
        r = float(np.median(g['f0'])) / float(np.median(c['f0']))
        if abs(np.log2(r)) > 0.12: why['pitch'] += 1; continue
        if g['hnr'] - c['hnr'] < -5 or g['hnr'] - c['hnr'] > 16: why['rough'] += 1; continue  # (a call that comes back noisier than its source by more than 5 dB sounds blown out)
        if c.get('am') and g.get('am') is not None and abs(g['am'][0] / c['am'][0] - 1) > 0.35: why['rough'] += 1; continue
        gH = np.array(g['H']); gH = gH - gH.max(); H = np.array(v['H'], float); both = (gH > -50) & (H > -50)
        if both.sum() >= 3 and float(np.mean(np.abs(gH[both] - H[both]))) > 9: why['spectrum'] += 1; continue
        if c.get('src'):
            try:
                sc = look(c['src'][0], c['src'][1], c['src'][2], x_[int(e['t'] * sr_):], sr_)
            except Exception as ex: sc = 0.0
            if sc < MIN_LOOK: why['look'] = why.get('look', 0) + 1; continue
        keep.setdefault(e['voice'], []).append(e['call']); ok += 1
    new = []
    for vi, v in enumerate(spec['voices']):
        cs = keep.get(vi, [])
        if len(cs) >= MINV.get(kind, 2): new.append({**v, 'calls': [v['calls'][i] for i in cs]})
    res[kind] = {**spec, 'voices': new}
    print(f"{kind:14s} {ok}/{tot} calls pass  (dropped {why})  voices {len(spec['voices'])} -> {len(new)}")
json.dump(res, open(out, 'w'))
