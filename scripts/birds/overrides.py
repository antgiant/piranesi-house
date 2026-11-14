#!/usr/bin/env python3
# Corrections made by hand to a measured template where the automatic pitch tracker is known to be wrong, with the measurement that justifies each.
# Run after build.py (build.py does it itself), then gen_ts.py.   python overrides.py
import json, os
P = os.path.join(os.path.dirname(__file__), 'templates.json')
# gullBeg: the tracker locked onto octave jumps (a fall from 2.7 to 1.5 kHz, then a jump to 4.5 kHz), which played as a steep sweep through the whole range.
# The strongest ridge of clean begging calls (XC845872, Essex, 0-5 s) is an arch: up to about 4.9 kHz in 0.4 s, level for ~0.3 s, then falling to 2.1 kHz.
OVERRIDES = {
  'gullBeg': {'f0': [3000, 3800, 4500, 4900, 4950, 4900, 4600, 4500, 4200, 3400, 2800, 2200], 'apex': 0.4, 'dur': 0.9, 'durRange': [0.6, 1.2]}  # no `hnr`: the harmonics are sparse here and the calibration puts the noise far too high,
}
# sparrowChirp: the measured noise includes the broadband clicks that sit among the chirps in the recording, so the synthesised chirp came out hissy (an aerosol spray, to the
# listener). The noise is lowered by 10 dB and the roughness target raised to 32 dB (a recorded chirp is a narrow tonal sweep with little between its harmonics).
SHIFT_N = {'sparrowChirp': (-10.0, 32.0)}
def apply(tpls):
    for k, (dn, hnr) in SHIFT_N.items():
        if k in tpls: tpls[k]['N'] = [round(v + dn, 1) if v > -100 else v for v in tpls[k]['N']]; tpls[k]['hnr'] = hnr
    for k, v in OVERRIDES.items():
        if k in tpls: tpls[k].update(v); tpls[k].pop('hnr', None) if 'hnr' not in v else None
    return tpls
if __name__ == '__main__':
    t = json.load(open(P)); json.dump(apply(t), open(P, 'w'), indent=1); print('patched', ', '.join(OVERRIDES))
