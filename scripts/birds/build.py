#!/usr/bin/env python3
# Build every call template (scripts/birds/template.py) from the recordings in a directory (made by xc.py: <xeno-canto number>.wav, mono 44.1 kHz) and write src/audio/birdcalls.ts.
# The output holds numbers only (a few dozen for each call, medians over several calls and recordings): no recording, and no part of one, is kept.
#   python build.py <wav_dir> [<template_json_dir>]
import sys, json, os
sys.path.insert(0, os.path.dirname(__file__))
import template as T
W = sys.argv[1] + '/'
# name: (fmin, fmax, min dur, max dur, [recording number:start:length, ...], Xeno-canto numbers)
SPECS = {
  'gullMew':     (900, 2500, 0.15, 0.7,  ['1184281:0.5:2', '1184281:7:2', '483105:0:25', '804205:0:15']),
  'gullNote':    (600, 2200, 0.08, 0.3,  ['1029296:1.8:13']),
  'gullBeg':     (1500, 5500, 0.3, 0.9,  ['845875:0:13']),
  'rookCaw':     (180, 480, 0.2, 0.8,    ['949915:0:18', '1100510:0:2.4', '840813:16:3'], 10, 0.6),
  'sparrowChirp':(2200, 7000, 0.03, 0.3, ['791783:0:12', '459144:10:12']),
  'buzzardMew':  (1800, 4000, 0.25, 0.9, ['1002995:0:12', '1156614:0:30']),
  'owlScreech':  (1000, 3000, 0.6, 2.0,  ['1098022:2.5:2.5', '1182233:3:2']),
  'blackbirdTink':(1200, 3500, 0.02, 0.12, ['904743:1.4:2.2', '904743:7.3:1.2', '904743:14:1.5']),
}
# very short sharp sounds (clicks), and long calls with an amplitude modulation (a whirr)
CLICKS = {'albatrossClap': ['730154:0:5.2', '862222:0:9'], 'sparrowTick': ['791783:0:12']}
MODS = {'albatrossWhirr': (1500, 4000, 0.8, 3.0, ['730154:9.7:2.4'], 12, 0.6)}
SPECS.update({k: v for k, v in MODS.items()})
out = {}
for name, spans in CLICKS.items():
    tpl = T.build_click(name, [W + s_.split(':')[0] + '.wav:' + ':'.join(s_.split(':')[1:]) for s_ in spans])
    if tpl: out[name] = tpl; print(f"{name:14s} {tpl['n']:3d} clicks  gap {tpl['gap']} bout {tpl['bout']}  env {tpl['env']}")
for name, spec in SPECS.items():
    lo, hi, dmin, dmax, spans = spec[:5]; snr = spec[5] if len(spec) > 5 else 28.0; edge = spec[6] if len(spec) > 6 else 0.25
    tpl = T.build(name, lo, hi, [W + s_.split(':')[0] + '.wav:' + ':'.join(s_.split(':')[1:]) for s_ in spans], dmin, dmax, snr, edge)
    if tpl is None: print('!! no calls for', name); continue
    if name in MODS: tpl['am'] = T.modulation(name, [W + s_.split(':')[0] + '.wav:' + ':'.join(s_.split(':')[1:]) for s_ in spec[4]])
    out[name] = tpl; print(f"{name:14s} {tpl['n']:3d} calls  dur {tpl['dur']:.2f} ({tpl['durRange'][0]:.2f}-{tpl['durRange'][1]:.2f})  f0 {tpl['f0'][0]}..{max(tpl['f0'])}..{tpl['f0'][-1]}  gap {tpl['gap']} bout {tpl['bout']}")
if len(sys.argv) > 2:
    os.makedirs(sys.argv[2], exist_ok=True)
    for k, v in out.items(): json.dump(v, open(f'{sys.argv[2]}/{k}.json', 'w'))
json.dump(out, open(os.path.join(os.path.dirname(__file__), 'templates.json'), 'w'), indent=1)
print('wrote', os.path.join(os.path.dirname(__file__), 'templates.json'))
