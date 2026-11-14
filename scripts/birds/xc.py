#!/usr/bin/env python3
# Search xeno-canto (the public site; its API needs a key) and download recordings, for MEASURING bird calls. Nothing downloaded is ever kept in the repository or shipped:
# they are licensed Creative Commons (mostly non-commercial), so only measurements and a log of the recording numbers are kept (design/birds.md).
#   xc.py search "Turdus merula" song [--cnt "United Kingdom"] [--q A] [--min 8] [--max 45] [-n 3]       # list matching recordings
#   xc.py get <out_dir> "Turdus merula" song [same options] [-n 1]                                       # download the first n into a NEW directory, as <id>.wav, and log them
import re, sys, os, json, argparse, subprocess, urllib.parse
UA = 'curl'
def fetch(url): return subprocess.run(['curl', '-sS', '-m', '60', '-L', url], capture_output=True).stdout
def search(sp, kind, cnt, q, lo, hi):
    qs = f'sp:"{sp}"' + (f' cnt:"{cnt}"' if cnt else '') + (f' q:{q}' if q else '') + (f' type:"{kind}"' if kind else '')
    h = fetch('https://xeno-canto.org/explore?query=' + urllib.parse.quote_plus(qs)).decode('utf8', 'ignore')
    out = []
    for row in re.findall(r'<tr.*?</tr>', h, re.S):
        m = re.search(r'xeno-canto.org/(\d+)', row)
        if not m: continue
        txt = re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', row)).strip()
        d = re.search(r'\b(\d+):(\d\d)\b', txt)
        if not d: continue
        secs = int(d.group(1)) * 60 + int(d.group(2))
        if not (lo <= secs <= hi): continue
        out.append({'id': m.group(1), 'secs': secs, 'row': txt[:260]})
    seen = set(); uniq = []
    for r in out:
        if r['id'] not in seen: seen.add(r['id']); uniq.append(r)
    return uniq
if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('cmd', choices=['search', 'get']); ap.add_argument('rest', nargs='+')
    ap.add_argument('--cnt', default='United Kingdom'); ap.add_argument('--q', default='A'); ap.add_argument('--min', type=int, default=8); ap.add_argument('--max', type=int, default=45); ap.add_argument('-n', type=int, default=3)
    a = ap.parse_args()
    if a.cmd == 'search':
        sp, kind = a.rest[0], (a.rest[1] if len(a.rest) > 1 else '')
        for r in search(sp, kind, a.cnt, a.q, a.min, a.max)[:a.n]: print(r['id'], r['secs'], r['row'])
    else:
        out, sp, kind = a.rest[0], a.rest[1], (a.rest[2] if len(a.rest) > 2 else '')
        os.makedirs(out, exist_ok=True); log = []
        for r in search(sp, kind, a.cnt, a.q, a.min, a.max)[:a.n]:
            path = f"{out}/{r['id']}.wav"
            subprocess.run(['curl', '-sS', '-m', '120', '-L', '-o', path, f"https://xeno-canto.org/{r['id']}/download"])
            print('got', r['id'], os.path.getsize(path), r['row'][:100]); log.append(r)
        with open(f'{out}/log.json', 'a') as f: f.write(json.dumps({'sp': sp, 'type': kind, 'recordings': log}) + '\n')
