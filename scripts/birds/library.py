#!/usr/bin/env python3
# Measure every clear call in a directory of recordings of one species (made by harvest.py) and keep them as a library of REAL individual calls (numbers only),
# grouped by recording (one recording is one bird, or a few), not averaged: a colony is then a set of birds that each have their own voice, and each call is one that a real bird made.
#   library.py <wav_dir> <out.pkl> fmin fmax dmin dmax minsnr edgeok [max_secs]
import sys, os, glob, pickle, numpy as np
sys.path.insert(0, os.path.dirname(__file__))
import template as T
from scipy.io import wavfile
d, out = sys.argv[1], sys.argv[2]; fmin, fmax, dmin, dmax, snr, edge = map(float, sys.argv[3:9]); maxs = float(sys.argv[9]) if len(sys.argv) > 9 else 60
lib = {}
for f in sorted(glob.glob(d + '/*.wav')):
    id = os.path.basename(f)[:-4]
    try: calls = T.analyse(f'{f}:0:{maxs}', fmin, fmax, dmin, dmax, snr, edge)
    except Exception as e: print(id, 'failed', e); continue
    sr_, x_ = wavfile.read(f); x_ = x_.astype(float) / (32768 if x_.dtype == np.int16 else 1)
    for c in calls: c['id'] = id; c['am'] = T.am_of(x_, sr_, c['a'], c['dur'])
    if calls: lib[id] = calls
    print(id, len(calls), 'calls', ' dur', np.round(np.median([c['dur'] for c in calls]), 2) if calls else '', ' f0', int(np.median([np.median(c['f0']) for c in calls])) if calls else '', flush=True)
pickle.dump(lib, open(out, 'wb'))
print('recordings with calls', len(lib), 'calls', sum(len(v) for v in lib.values()))
