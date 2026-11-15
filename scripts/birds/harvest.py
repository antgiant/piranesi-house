#!/usr/bin/env python3
# Collect many recordings of one species for MEASURING (nothing downloaded is kept in the repository): several searches (quality A and B, call types, countries), the distinct
# recordings from them, each downloaded to <out>/<id>.wav (mono, 44.1 kHz), and a log of the numbers and credits in <out>/log.json.
#   harvest.py <out_dir> "Genus species" [--types call,alarm call] [--cnt "United Kingdom,Netherlands,..."] [--min 5] [--max 90] [--limit 30]
import sys, os, json, argparse, subprocess
sys.path.insert(0, os.path.dirname(__file__))
import xc
ap = argparse.ArgumentParser(); ap.add_argument('out'); ap.add_argument('sp')
ap.add_argument('--types', default=''); ap.add_argument('--cnt', default=',United Kingdom,Netherlands,Germany,France,Sweden,Ireland'); ap.add_argument('--min', type=int, default=5); ap.add_argument('--max', type=int, default=90); ap.add_argument('--limit', type=int, default=30)
a = ap.parse_args(); os.makedirs(a.out, exist_ok=True)
seen = {}
for kind in (a.types.split(',') if a.types else ['']):
    for cnt in a.cnt.split(','):
        for q in ('A', 'B'):
            try:
                for r in xc.search(a.sp, kind, cnt, q, a.min, a.max):
                    seen.setdefault(r['id'], r)
            except Exception as e: print('search failed', kind, cnt, q, e)
ids = list(seen)[:a.limit]
print(len(seen), 'found,', len(ids), 'to get')
for i in ids:
    path = f'{a.out}/{i}.wav'
    if os.path.exists(path) and os.path.getsize(path) > 1000: continue
    tmp = path + '.src'
    subprocess.run(['curl', '-sS', '-m', '120', '-L', '-o', tmp, f'https://xeno-canto.org/{i}/download'])
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', tmp, '-ac', '1', '-ar', '44100', path]); os.path.exists(tmp) and os.remove(tmp)
json.dump([seen[i] for i in ids], open(f'{a.out}/log.json', 'w'), indent=1)
print('done', a.out)
