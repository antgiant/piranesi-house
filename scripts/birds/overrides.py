#!/usr/bin/env python3
# Corrections made by hand to a measured template where the automatic pitch tracker is known to be wrong, with the measurement that justifies each.
# Run after build.py (build.py does it itself), then gen_ts.py.   python overrides.py
import json, os
P = os.path.join(os.path.dirname(__file__), 'templates.json')
# gullBeg (second version): the pure arch played as a dentist's drill. A recorded begging call is a pulsing arch, not a steady tone (a fast flutter in its level, about 14 a second, deep),
# so it has that flutter (`am`) and the first, wrong, 1.3 kHz fundamental idea is dropped.
# gullBeg (first version): the tracker locked onto octave jumps (a fall from 2.7 to 1.5 kHz, then a jump to 4.5 kHz), which played as a steep sweep through the whole range.
# The strongest ridge of clean begging calls (XC845872, Essex, 0-5 s) is an arch: up to about 4.9 kHz in 0.4 s, level for ~0.3 s, then falling to 2.1 kHz.
OVERRIDES = {
  'gullBeg': {'f0': [3000, 3800, 4500, 4900, 4950, 4900, 4600, 4500, 4200, 3400, 2800, 2200], 'hnr': None, 'am': [14.0, 0.7], 'apex': 0.4, 'dur': 0.5, 'durRange': [0.3, 0.75]},
}
# sparrowChirp: the measured noise includes the broadband clicks that sit among the chirps in the recording, so the synthesised chirp came out hissy (an aerosol spray, to the
# listener). The noise is lowered by 10 dB and the roughness target raised to 32 dB (a recorded chirp is a narrow tonal sweep with little between its harmonics).
SHIFT_N = {'sparrowChirp': (-10.0, 32.0)}
def apply(tpls):
    for base, (dn, hnr) in SHIFT_N.items():
      for k in [k for k in tpls if k == base or k.startswith(base + '_')]:
        if tpls[k].get('hnr') != hnr: tpls[k]['N'] = [round(v + dn, 1) if v > -100 else v for v in tpls[k]['N']]; tpls[k]['hnr'] = hnr
    for k, v in OVERRIDES.items():
        if k in tpls:
            v = dict(v); fill = v.pop('H_fill', None); tpls[k].update(v)
            if tpls[k].get('hnr', 0) is None: tpls[k].pop('hnr')
            if fill: tpls[k]['H'] = [float(fill.get(str(b), h)) for b, h in zip(tpls[k]['bands'], tpls[k]['H'])]
    return tpls
if __name__ == '__main__':
    t = json.load(open(P)); json.dump(apply(t), open(P, 'w'), indent=1); print('patched', ', '.join(OVERRIDES))
