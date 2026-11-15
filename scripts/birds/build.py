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
CLICKS = {'albatrossClap': ['730154:0:5.2', '862222:0:9'], 'sparrowTick': ['791783:0:12'],
          # each of three birds' claps alone (the clack, and its ring, differ a little from bird to bird; the other recordings' "claps" at 0.1 s are the pulses of a whirr)
          'albatrossClap_730154': ['730154:0:9.7'], 'albatrossClap_862222': ['862222:0:9'], 'albatrossClap_209430': ['209430:0:7']}
MODS = {'albatrossWhirr': (1500, 4000, 0.8, 3.0, ['730154:9.7:2.4'], 12, 0.6)}
SPECS.update({k: v for k, v in MODS.items()})
# Individual gulls: one template for each recording (a different bird each), so a colony is made of birds that do not all sound alike.
# Dropped after listening to each in turn: 1032698 and 284200 (a flat, hoarse call), 1093407, 528591 and 896886 (rough and low: a hoarse gull among the others).
# Sparrows dropped after looking at each: 1145371, 1145322, 1089317, 1092252 rendered as a bare block of noise (a hiss) or a pure whistle.
# Each bird's mews measured on its own: pitch, length, roughness, spectrum differ from bird to bird (pitch 950 to 1700 Hz, length 0.16 to 0.5 s, roughness 13 to 43 dB).
INDIVIDUALS = {}  # (replaced by the call library: scripts/birds/library.py, build_lib.py)
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
for base, (lo, hi, dmin, dmax, ids, snr) in INDIVIDUALS.items():  # (sparrows: eight birds of different pitch, 2.7 to 6 kHz, and length, 0.09 to 0.2 s)
    for i in ids:
        t = T.build(base, lo, hi, [W + i + '.wav:0:40'], dmin, dmax, snr, 0.25)
        if t is None or t['n'] < 3 or t['hnr'] < 15: continue
        if not t['gap']: t['gap'] = out[base]['gap']
        if not t['bout']: t['bout'] = out[base]['bout']
        t['name'] = f'{base}_{i}'; out[f'{base}_{i}'] = t; print(f"{base}_{i}: {t['n']} calls dur {t['dur']:.2f} f0 {max(t['f0'])} hnr {t['hnr']}")
if len(sys.argv) > 2:
    os.makedirs(sys.argv[2], exist_ok=True)
    for k, v in out.items(): json.dump(v, open(f'{sys.argv[2]}/{k}.json', 'w'))
import overrides
json.dump(overrides.apply(out), open(os.path.join(os.path.dirname(__file__), 'templates.json'), 'w'), indent=1)
print('wrote', os.path.join(os.path.dirname(__file__), 'templates.json'))
