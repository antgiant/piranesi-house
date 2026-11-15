#!/usr/bin/env python3
# Trim the checked library to the size the game can carry (the JS budget): at most VOICES voices a kind and CALLS calls a voice, the calls spread through what is left.
#   trim_lib.py <in.json> <out.json> [voices=10] [calls=4]
import sys, json, numpy as np
src, out = sys.argv[1], sys.argv[2]; V = int(sys.argv[3]) if len(sys.argv) > 3 else 10; C = int(sys.argv[4]) if len(sys.argv) > 4 else 4
lib = json.load(open(src))
for kind, spec in lib.items():
    vs = spec['voices'][:V]
    for v in vs:
        n = len(v['calls'])
        if n > C: v['calls'] = [v['calls'][int(i)] for i in np.linspace(0, n - 1, C)]
    spec['voices'] = vs
json.dump(lib, open(out, 'w'))
print({k: (len(s['voices']), sum(len(v['calls']) for v in s['voices'])) for k, s in lib.items()})
