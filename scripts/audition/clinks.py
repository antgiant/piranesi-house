import sys, numpy as np
from scipy import signal
from scipy.io import wavfile
def clinks(path, skip=0, dur=40):
    sr,x=wavfile.read(path); m=(x.mean(axis=1) if x.ndim>1 else x)[int(sr*skip):int(sr*(skip+dur))]
    hp=signal.sosfilt(signal.butter(4,[1500,min(9000,sr/2-200)],'bandpass',fs=sr,output='sos'),m)
    w=int(sr*0.002); r=np.sqrt(np.convolve(hp**2,np.ones(w)/w,'valid')[::w]); d=20*np.log10(r+1e-9)   # 2 ms level, dB
    med=signal.medfilt(d, 51)   # ~100 ms running median = the wash the clink must stand out from
    ex=d-med
    pk,_=signal.find_peaks(ex, height=9, distance=12)   # >=9 dB over the wash, at least 24 ms apart
    ps=ex[pk]
    return len(pk)/(len(d)*0.002), (float(np.mean(ps)) if len(ps) else 0), float(np.percentile(d,50))
if __name__=='__main__':
    for spec in sys.argv[1:]:
        path,skip=spec.split(':'); c,h,_=clinks(path,float(skip)); print(f'{path.split("/")[-1]:<36} clinks/s {c:5.2f}   mean height {h:4.1f} dB')
