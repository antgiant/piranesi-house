#!/usr/bin/env python3
# Turn the measured calls of many recordings (library.py) into the call library the game plays (numbers only, no recording): for each kind of call, a set of VOICES (one per recording: a bird's own
# spectrum, in third octaves) each with several REAL calls (pitch contour, loudness contour, length, roughness), plus the gaps between calls and the number in a bout, pooled.
# Only calls that pass the filters of that kind are kept: filters that remove what the pitch tracker gets wrong (a call at half or double the true pitch, or noise it took for a call).
#   build_lib.py <pkl_dir> <out.json>
import sys, os, json, pickle, numpy as np

def unwarp(v, ap):
    """The analysis spreads the rise to the pitch's apex over four points and the fall over eight (so that medians keep a sharp peak). One real call is better kept in its own time: put the twelve points back at their true places and resample evenly."""
    ap = min(0.95, max(0.05, float(ap))); t = [ap * i / 4 for i in range(4)] + [ap + (1 - ap) * j / 7 for j in range(8)]
    return np.interp(np.linspace(0, 1, 12), t, v)
d, out = sys.argv[1], sys.argv[2]
# kind: (pickle, test for one call, min calls for a voice, calls kept for a voice, voices kept)
KINDS = {
  'gullMew':       ('gull',      lambda c, f0: 0.12 <= c['dur'] <= 0.7 and 900 <= f0 <= 1800 and 22 <= c['hnr'] <= 58, 5, 6, 14),
  'gullNote':      ('gull',      lambda c, f0: 0.05 <= c['dur'] < 0.12 and 850 <= f0 <= 1500 and 22 <= c['hnr'] <= 58, 5, 6, 8),
  # the low, rough calls that make much of a colony (labelled alarm and flight calls on Xeno-canto): a pitch of 550 to 1300 Hz and a roughness of 5 dB and more. A first library left them out (a filter of 900 Hz and 22 dB, meant to drop what the tracker
  # gets wrong) and the colony had none of its most common calls.
  # (the four 'm' recordings are very clean single birds at one metre with a shotgun microphone, Cornell Macaulay Library, from the owner's own copies: they come first)
  'gullAlarm':     (('galarm', 'mac'), lambda c, f0: 0.05 <= c['dur'] <= 0.6 and 550 <= f0 <= 1900 and 5 <= c['hnr'] <= 50, 6, 6, 14),
  'gullFlight':    ('gflight',   lambda c, f0: 0.05 <= c['dur'] <= 0.45 and 550 <= f0 <= 1300 and 5 <= c['hnr'] <= 45, 6, 6, 14),
  # the rhythmic low clucking ("choking"): the pulses of regular trains (4 to 5 a second, five to twelve long, 0.085 s each, near 650 Hz) found in recordings tagged duet, displaying, domination and the like
  'gullChoke':     ('choke',     lambda c, f0: 0.04 <= c['dur'] <= 0.3 and 450 <= f0 <= 1500 and c['hnr'] >= 5, 4, 5, 12),
  # the thin, high, pure call (3.2 to 5.6 kHz) that begging young give, strong and lower in juveniles: the stand-alone high tones of a winter flock with first-winter birds (ML547765491, not the harmonics of the clucking calls) and of the begging recordings
  'gullThin':      (('f6solo', 'beghi'), lambda c, f0: 0.08 <= c['dur'] <= 0.9 and 3200 <= f0 <= 5600 and c['hnr'] >= 13, 4, 6, 12),
  'rookCaw':       ('rook',      lambda c, f0: 0.15 <= c['dur'] <= 0.9 and 250 <= f0 <= 700 and c['hnr'] >= 2, 5, 6, 12),
  'sparrowChirp':  ('sparrow',   lambda c, f0: 0.05 <= c['dur'] <= 0.26 and 2600 <= f0 <= 5200 and 14 <= c['hnr'] <= 50, 6, 6, 12),
  'blackbirdTink': ('blackbird', lambda c, f0: 0.02 <= c['dur'] <= 0.12 and c['hnr'] >= 8, 6, 6, 10),
  'buzzardMew':    ('buzzard',   lambda c, f0: 0.3 <= c['dur'] <= 0.9 and 2000 <= f0 <= 3300 and c['hnr'] >= 15, 3, 5, 10),
  'owlScreech':    ('owl',       lambda c, f0: 0.4 <= c['dur'] <= 2.4 and 1500 <= f0 <= 2700, 1, 1, 12),
  'gullBeg':       ('beg',       lambda c, f0: 0.08 <= c['dur'] <= 0.8 and 1200 <= f0 <= 2800 and c['hnr'] >= 5 and c.get('am') is not None, 4, 6, 12),
  'albatrossWhirr': ('albwhirr', lambda c, f0: 0.5 <= c['dur'] <= 2.6 and c.get('am') is not None and c['am'][1] >= 0.3 and 8 <= c['am'][0] <= 70, 1, 3, 10),
}
res = {}
for kind, (pk, ok, minc, keep, vmax) in KINDS.items():
    srcs = pk if isinstance(pk, tuple) else (pk,); lib = {}
    for one in srcs:
        p = f'{d}/{one}.pkl'
        if os.path.exists(p): lib.update(pickle.load(open(p, 'rb')))
    if not lib: continue
    voices = []
    for rid, calls in lib.items():
        good = [c for c in calls if ok(c, float(np.median(c['f0']))) and c.get('jump', 1.0) <= 1.7]  # (a jump of nearly two between neighbouring frames of the pitch is the tracker changing octave, not a bird)
        if len(good) < minc: continue
        sel = good if len(good) <= keep else [good[int(i)] for i in np.linspace(0, len(good) - 1, keep)]  # spread through the recording
        H = np.median(np.array([c['H'] for c in good]), axis=0); N = np.median(np.array([c['N'] for c in good]), axis=0); ref = H.max(); H = np.maximum(H - ref, -118); N = np.maximum(N - ref, -118)  # relative to the loudest tonal band
        gaps = []; ts = sorted(c['a'] for c in calls)
        for u, v in zip(ts, ts[1:]):
            if v - u < 3.0: gaps.append(v - u)
        voices.append({'id': rid, 'n': len(good) + (1000 if str(rid).startswith('m') and str(rid)[1:].isdigit() else 0), 'H': H.round(0).astype(int).tolist(), 'N': N.round(0).astype(int).tolist(), 'gaps': gaps,
                       'calls': [{'dur': round(c['dur'], 3), 'apex': 0.364, 'hnr': round(float(c['hnr']), 1), 'bright': c.get('bright', [0, 0, 0]), **({'am': c['am']} if c.get('am') else {}), 'f0': [int(round(v)) for v in unwarp(c['f0'], c['apex'])], 'env': [round(float(v), 1) for v in unwarp(c['env'], c['apex'])]} for c in sel]})
    voices.sort(key=lambda v: -v['n']); voices = voices[:vmax]
    gaps = [g for v in voices for g in v['gaps']]
    res[kind] = {'gap': [round(float(np.percentile(gaps, q)), 2) for q in (10, 50, 90)] if len(gaps) >= 5 else None, 'voices': [{k: v[k] for k in ('id', 'H', 'N', 'calls')} for v in voices]}
    print(f"{kind:14s} {len(voices):2d} voices, {sum(len(v['calls']) for v in voices):3d} calls, gap {res[kind]['gap']}, f0 medians {sorted(int(np.median(c['f0'])) for v in voices for c in v['calls'])[::max(1, len(voices))][:8]}")
json.dump(res, open(out, 'w'))
