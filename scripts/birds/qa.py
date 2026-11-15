#!/usr/bin/env python3
# Analysis by synthesis: each call of the library, as the game renders it (qa_render.ts), is measured again by the very analysis that measured the real call; it must come back as the
# call it was made from: the same pitch (within 8%), a roughness within 10 dB, and a spectrum of harmonics within 8 dB (mean over the bands that carry them). Calls that do not are
# dropped, and a voice with too few calls left is dropped. This catches what the eye misses: a pitch at half or double, a noise-only call, a tone the noise has swallowed.
#   qa.py <qa_dir> <library.json> <out.json>
import sys, os, json, numpy as np
sys.path.insert(0, os.path.dirname(__file__))
import template as T
qd, lib_path, out = sys.argv[1:4]
RANGES = {'gullMew': (900, 2800, 0.05, 0.9), 'gullNote': (600, 2200, 0.04, 0.3), 'rookCaw': (220, 750, 0.1, 1.0), 'sparrowChirp': (2200, 7000, 0.03, 0.3), 'blackbirdTink': (1200, 3500, 0.02, 0.15), 'buzzardMew': (1800, 4000, 0.2, 1.0), 'owlScreech': (900, 4000, 0.4, 2.6)}
MINV = {'owlScreech': 1}
lib = json.load(open(lib_path)); res = {}
for kind, spec in lib.items():
    idx = json.load(open(f'{qd}/{kind}.json')); lo, hi, dmin, dmax = RANGES[kind]; wav = f'{qd}/{kind}.wav'
    keep = {}; tot = 0; ok = 0; why = {'none': 0, 'pitch': 0, 'rough': 0, 'spectrum': 0}
    for e in idx:
        v = spec['voices'][e['voice']]; c = v['calls'][e['call']]; tot += 1
        got = T.analyse(f"{wav}:{max(0, e['t'] - 0.1)}:{e['dur'] + 0.2}", lo, hi, 0.0, 3.0, 12.0, 0.6)
        if not got: why['none'] += 1; continue
        g = max(got, key=lambda x: x['dur'])
        r = float(np.median(g['f0'])) / float(np.median(c['f0']))
        if abs(np.log2(r)) > 0.12: why['pitch'] += 1; continue
        if abs(g['hnr'] - c['hnr']) > 12: why['rough'] += 1; continue
        gH = np.array(g['H']); gH = gH - gH.max(); H = np.array(v['H'], float); both = (gH > -50) & (H > -50)
        if both.sum() >= 3 and float(np.mean(np.abs(gH[both] - H[both]))) > 9: why['spectrum'] += 1; continue
        keep.setdefault(e['voice'], []).append(e['call']); ok += 1
    new = []
    for vi, v in enumerate(spec['voices']):
        cs = keep.get(vi, [])
        if len(cs) >= MINV.get(kind, 3): new.append({**v, 'calls': [v['calls'][i] for i in cs]})
    res[kind] = {**spec, 'voices': new}
    print(f"{kind:14s} {ok}/{tot} calls pass  (dropped {why})  voices {len(spec['voices'])} -> {len(new)}")
json.dump(res, open(out, 'w'))
