# Rain statistics for real hourly records and (if model_rain.json is there) for the game's weather, with identical definitions:
# wet hours, spells (consecutive wet hours), rain events (wet hours joined across gaps of up to six dry hours) of 12/24/48/72/96/120 hours or more a year,
# runs of rainy days, and wet-hour share by season.   python3 stats.py <dir>   (needs numpy)
import json, glob, numpy as np, datetime as dt
def episodes(wet, gap=6):
    """merge wet hours separated by <= gap dry hours into rain events; return (start, end) hour indices"""
    idx = np.flatnonzero(wet)
    if len(idx) == 0: return []
    ev = []; s = idx[0]; p = idx[0]
    for i in idx[1:]:
        if i - p - 1 > gap: ev.append((s, p + 1)); s = i
        p = i
    ev.append((s, p + 1)); return ev
def spells(wet):
    out = []; run = 0
    for v in wet:
        if v: run += 1
        elif run: out.append(run); run = 0
    if run: out.append(run)
    return out
def stats(name, mm, thresh, start=dt.datetime(2014, 1, 1), scale=1.0):
    mm = np.asarray(mm, float) * scale; n = len(mm); years = n / 8766
    wet = mm >= thresh
    months = np.array([(start + dt.timedelta(hours=int(i))).month for i in range(0, n, 1)]) if n < 200000 else None
    season = {'DJF': [12, 1, 2], 'MAM': [3, 4, 5], 'JJA': [6, 7, 8], 'SON': [9, 10, 11]}
    sp = np.array(spells(wet)); ev = episodes(wet); dur = np.array([e - s for s, e in ev])
    perYear = lambda h: (dur >= h).sum() / years
    # rain days (>= 1 mm per day) and runs of them
    days = mm[: n // 24 * 24].reshape(-1, 24).sum(1); rd = days >= 1.0
    runs = []; r = 0
    for v in rd:
        if v: r += 1
        elif r: runs.append(r); r = 0
    if r: runs.append(r)
    runs = np.array(runs)
    # the "drenching" long events: wet most of the time, how hard
    long_ev = [(s, e) for s, e in ev if e - s >= 48]
    inside = [(wet[s:e].mean(), mm[s:e][wet[s:e]].mean() if wet[s:e].any() else 0) for s, e in long_ev]
    seas = {k: wet[np.isin(months, v)].mean() for k, v in season.items()} if months is not None else {}
    print(f"{name:<26} wet h {wet.mean()*100:5.1f}%  rain-days {rd.mean()*100:4.1f}%  spells median {np.median(sp):4.1f}h p90 {np.percentile(sp,90):4.1f}h max {sp.max():3d}h | events/yr >=12h {perYear(12):5.1f} >=24h {perYear(24):5.1f} >=48h {perYear(48):4.1f} >=72h {perYear(72):4.1f} >=96h {perYear(96):4.1f} >=120h {perYear(120):4.1f} | longest event {dur.max():3d}h | rain-day runs >=3: {(runs>=3).sum()/years:4.1f}/yr >=5: {(runs>=5).sum()/years:4.1f}/yr")
    if inside: print(f"{'':<26} events >=48h: wet {np.mean([a for a,b in inside])*100:3.0f}% of their hours, {np.mean([b for a,b in inside]):4.2f} mm/h when wet" + (f" | wet-hour share by season {', '.join(f'{k} {v*100:.0f}%' for k,v in seas.items())}" if seas else ''))
    elif seas: print(f"{'':<26} wet-hour share by season {', '.join(f'{k} {v*100:.0f}%' for k,v in seas.items())}")
import sys
base = (sys.argv[1] if len(sys.argv) > 1 else '.') + '/'  # the directory fetch.sh wrote to (and model_rain.json, if you want the model compared)
print("REAL (10 years of hourly precipitation, 2014-2023; wet hour = 0.1 mm or more)")
for f in ['derbyshire_author_home', 'nottingham', 'whitby_ne_coast', 'liverpool_nw_coast', 'plymouth_sw_coast', 'keswick_wet_lakes', 'miami_subtropical']:
    stats(f, json.load(open(base + f + '.json'))['hourly']['precipitation'], 0.1)
import os
if os.path.exists(base + 'model_rain.json'):
    print("\nTHE GAME'S WEATHER (10 years; wet hour = rain >= 0.02 of 1)")
    for k, v in json.load(open(base + 'model_rain.json')).items(): stats('model ' + k, np.array(v) / 1000.0, 0.02)
