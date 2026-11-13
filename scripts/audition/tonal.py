import sys, numpy as np
from scipy.io import wavfile
def peaky(path, skip=0, dur=40, frame_ms=8):
    sr,x=wavfile.read(path); m=(x.mean(axis=1) if x.ndim>1 else x)[int(sr*skip):int(sr*(skip+dur))].astype(np.float64)
    n=int(sr*frame_ms/1000); win=np.hanning(n); hop=n//2
    lo,hi=int(1500*n/sr),int(min(9000,sr/2-300)*n/sr)
    vals=[]
    for i in range(0,len(m)-n,hop):
        sp=np.abs(np.fft.rfft(m[i:i+n]*win))**2
        b=sp[lo:hi]
        if b.sum()<=0: continue
        vals.append(10*np.log10((b.max()+1e-20)/(np.median(b)+1e-20)))
    v=np.array(vals); return float(np.mean(v)), float(np.percentile(v,90))
if __name__=='__main__':
    for spec in sys.argv[1:]:
        path,skip=spec.split(':'); a,p=peaky(path,float(skip)); print(f'{path.split("/")[-1]:<36} peak/median (8 ms frames, 1.5-9 kHz): mean {a:5.1f} dB   p90 {p:5.1f} dB')
