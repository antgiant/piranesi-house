# Measure a recording or an engine render: level, octave bands, swell period and depth, narrow resonances, comb (effect) detector, stereo
# correlation by band, impulsive events, and a spectrogram PNG.   python analyse.py <name> <outdir>   reads <outdir>/../wav/<name>.wav
# Needs numpy, scipy, matplotlib (python3 -m venv v && v/bin/pip install numpy scipy matplotlib).
import sys, json, numpy as np
from scipy import signal
from scipy.io import wavfile
import matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt

name = sys.argv[1]; outdir = sys.argv[2]
sr, x = wavfile.read(f'{outdir}/../wav/{name}.wav')
x = x.astype(np.float64)
if x.ndim == 1: x = x[:, None]
ch = x.shape[1]; n = x.shape[0]; dur = n / sr
mono = x.mean(axis=1)
db = lambda v: 20*np.log10(np.maximum(v, 1e-12))
R = {'name': name, 'dur_s': round(dur,1), 'channels': ch}
R['rms_dbfs'] = round(db(np.sqrt(np.mean(mono**2))),1)
R['peak_dbfs'] = round(db(np.abs(x).max()),1)
# short-term loudness (1 s) distribution
w = sr
st = np.array([np.sqrt(np.mean(mono[i:i+w]**2)) for i in range(0, n-w, w//2)])
R['st_rms_dbfs_p5_p50_p95'] = [round(db(np.percentile(st,p)),1) for p in (5,50,95)]
# octave bands relative level (from Welch PSD)
f, P = signal.welch(mono, sr, nperseg=16384, noverlap=8192)
tot = P.sum()
bands = [(22,44),(44,88),(88,177),(177,355),(355,710),(710,1420),(1420,2840),(2840,5680),(5680,11360),(11360,22720)]
R['octave_band_db_rel_total'] = {f'{int((a*b)**.5)}Hz': round(10*np.log10(P[(f>=a)&(f<b)].sum()/tot+1e-15),1) for a,b in bands}
# spectral centroid and 95% rolloff
cs = np.cumsum(P)/tot
R['centroid_hz'] = int((f*P).sum()/tot); R['rolloff95_hz'] = int(f[np.searchsorted(cs,0.95)])
# wave envelope: band 100-1500 Hz, 0.2 s windows
sos = signal.butter(4,[100,1500],'bandpass',fs=sr,output='sos'); bp = signal.sosfilt(sos, mono)
hop = int(sr*0.05); win = int(sr*0.2)
env = np.array([np.sqrt(np.mean(bp[i:i+win]**2)) for i in range(0, n-win, hop)]); envdb = db(env)
R['envelope_depth_db_p10_p90'] = [round(np.percentile(envdb,10),1), round(np.percentile(envdb,90),1)]
e = envdb - envdb.mean(); ac = signal.correlate(e, e, 'full')[len(e)-1:]; ac /= ac[0]
lag_lo, lag_hi = int(2/0.05), int(30/0.05)
if len(ac) > lag_hi:
    pk, _ = signal.find_peaks(ac[lag_lo:lag_hi], prominence=0.05)
    R['wave_period_s_candidates'] = [(round((p+lag_lo)*0.05,1), round(float(ac[p+lag_lo]),2)) for p in pk[:4]]
# resonance: peaks in LTAS (fine resolution) over the local 1/6-octave trend
f2, P2 = signal.welch(mono, sr, nperseg=32768, noverlap=16384)
L = 10*np.log10(P2+1e-20)
sel = (f2>=40)&(f2<=3000)
fs_, Ls = f2[sel], L[sel]
# smooth in log-frequency: moving median over +-1/6 octave
trend = np.array([np.median(Ls[(fs_>=ff/2**(1/6))&(fs_<=ff*2**(1/6))]) for ff in fs_])
pk, pr = signal.find_peaks(Ls-trend, prominence=4, distance=3)
peaks = sorted([(round(float(fs_[i]),1), round(float((Ls-trend)[i]),1)) for i in pk], key=lambda t:-t[1])[:10]
R['strongest_narrow_peaks_hz_dbabove_trend'] = peaks
# do those peaks hold still? per 8 s segment, frequency of the local max near each
seg = int(sr*8); nseg = n//seg
stab = []
for (pf,_) in peaks[:6]:
    fr = []
    for k in range(nseg):
        ff, PP = signal.welch(mono[k*seg:(k+1)*seg], sr, nperseg=16384, noverlap=8192)
        m = (ff>=pf*0.97)&(ff<=pf*1.03)
        if m.any(): fr.append(ff[m][np.argmax(PP[m])])
    if len(fr)>=3:
        cents = 1200*np.log2(np.array(fr)/np.median(fr)); stab.append((pf, round(float(np.std(cents)),1)))
R['peak_freq_wander_cents_std_across_segments'] = stab
# comb / flanger detector: periodicity in the log-spectrum along linear frequency
sel2 = (f2>=100)&(f2<=6000); ls = L[sel2]; ls = ls - np.convolve(ls, np.ones(61)/61, 'same')
c = np.abs(np.fft.rfft(ls*np.hanning(len(ls)))); q = np.fft.rfftfreq(len(ls), d=(f2[1]-f2[0]))  # q in seconds
m = (q>0.0005)&(q<0.03); qi = np.argmax(c[m]); R['comb_strongest_delay_ms'] = round(float(q[m][qi]*1000),2); R['comb_strength_x_median'] = round(float(c[m][qi]/np.median(c[m])),1)
# stereo
if ch == 2:
    L_, R_ = x[:,0], x[:,1]
    out = {}
    for lo,hi in [(100,400),(400,1500),(1500,5000),(5000,16000)]:
        s2 = signal.butter(4,[lo,hi],'bandpass',fs=sr,output='sos'); a=signal.sosfilt(s2,L_); b=signal.sosfilt(s2,R_)
        den = np.sqrt((a**2).mean()*(b**2).mean()); out[f'{lo}-{hi}'] = {'corr': round(float((a*b).mean()/den),2), 'LR_db': round(float(db(np.sqrt((a**2).mean()))-db(np.sqrt((b**2).mean()))),1)}
    R['stereo'] = out
# onsets and decay (drips / plops): 1-4 kHz envelope at 5 ms
sos = signal.butter(4,[1000,4000],'bandpass',fs=sr,output='sos'); hp = signal.sosfilt(sos, mono)
h5 = int(sr*0.005); e5 = np.sqrt(np.convolve(hp**2, np.ones(h5)/h5, 'valid')[::h5]); e5db = db(e5)
floor = np.percentile(e5db, 20); ons = []
i = 6
while i < len(e5db)-70:
    if e5db[i] - e5db[i-6] > 14 and e5db[i] > floor + 18:
        pkk = i + np.argmax(e5db[i:i+10]); seg_ = e5db[pkk:pkk+60]
        t = np.arange(len(seg_))*0.005
        m_ = seg_ > (seg_[0]-35)
        if m_.sum() > 6:
            sl = np.polyfit(t[m_][:40], seg_[m_][:40], 1)[0]; ons.append((pkk*0.005, sl))
        i = pkk + 60
    else: i += 1
if len(ons) >= 3:
    sls = np.array([-s for _,s in ons if s<0]); R['impulsive_events'] = {'count': len(ons), 'per_minute': round(len(ons)/dur*60,1), 'decay_db_per_s_median': round(float(np.median(sls)),0), 'equiv_T60_s': round(float(60/np.median(sls)),2)}
# plots
fig, ax = plt.subplots(3,1, figsize=(12,10), gridspec_kw={'height_ratios':[3,1.4,1.2]})
fx, tx, S = signal.spectrogram(mono[:int(sr*min(dur,60))], sr, nperseg=4096, noverlap=3072)
im = ax[0].pcolormesh(tx, fx, 10*np.log10(S+1e-14), vmin=-110, vmax=-40, shading='auto'); ax[0].set_yscale('symlog', linthresh=200); ax[0].set_ylim(30, 16000); ax[0].set_title(f'{name}  (first 60 s)'); ax[0].set_ylabel('Hz')
ax[1].semilogx(f2[1:], L[1:]); ax[1].set_xlim(30,16000); ax[1].set_ylabel('long-term spectrum dB'); ax[1].grid(alpha=.3)
for pf,_ in peaks[:6]: ax[1].axvline(pf, color='r', alpha=.3)
ax[2].plot(np.arange(len(envdb))*0.05, envdb); ax[2].set_xlim(0, min(dur,120)); ax[2].set_ylabel('100-1500 Hz level dB'); ax[2].set_xlabel('s')
plt.tight_layout(); plt.savefig(f'{outdir}/{name}.png', dpi=80); plt.close()
json.dump(R, open(f'{outdir}/{name}.json','w'), indent=1)
print(json.dumps(R))
