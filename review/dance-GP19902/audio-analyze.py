import json, subprocess, pathlib
import numpy as np
from scipy import signal

ROOT = pathlib.Path(__file__).resolve().parent
FFMPEG = r'C:/Users/Zero/AppData/Roaming/Python/Python314/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe'
SOURCE = r'C:/Users/Zero/Desktop/Jerry_Game_Related/Disclaimer/Been Warned.mp3'
sr = 22050
p = subprocess.run([FFMPEG,'-v','error','-i',SOURCE,'-map','0:a:0','-ac','1','-ar',str(sr),'-f','f32le','pipe:1'],capture_output=True,check=True)
y = np.frombuffer(p.stdout,dtype='<f4')
hop=220
freq,t,z=signal.stft(y,sr,nperseg=1024,noverlap=1024-hop,boundary=None)
mag=np.abs(z)
log=np.log1p(mag*100)
flux=np.maximum(0,np.diff(log,axis=1,prepend=log[:,:1]))
bands={}
for name,lo,hi in [('all',20,10000),('bass',35,220),('mid',220,2200),('high',2200,10000)]:
    env=np.mean(flux[(freq>=lo)&(freq<hi)],axis=0)
    env=signal.convolve(env,signal.windows.gaussian(7,1),mode='same')
    bg=signal.convolve(env,np.ones(101)/101,mode='same')
    env=np.maximum(env-.55*bg,0)
    env/=max(np.percentile(env,95),1e-6)
    bands[name]=env
env=bands['all']; dt=hop/sr
acf=signal.correlate(env-env.mean(),env-env.mean(),mode='full',method='fft')[len(env)-1:]
peaks,_=signal.find_peaks(acf)
peaks=peaks[(peaks*dt>.3)&(peaks*dt<1)]
rank=peaks[np.argsort(acf[peaks])[-12:][::-1]]
tempo_candidates=[{'bpm':round(60/(k*dt),3),'acf':round(float(acf[k]/acf[0]),4)} for k in rank]
print('duration',len(y)/sr,'tempo candidates',tempo_candidates)

# Search frequency and beat-phase against positive onsets; evaluate all-grid and bass-grid.
def grid_fit(a,b, minbpm=75,maxbpm=145):
    sel=(t>=a)&(t<b)
    tt=t[sel]; e=env[sel]
    out=[]
    for bpm in np.arange(minbpm,maxbpm,.025):
        angle=tt*bpm/60*2*np.pi
        c=np.sum(e*np.exp(1j*angle))
        out.append((abs(c)/sum(e),bpm,float(np.angle(c)%(2*np.pi)/(2*np.pi)*60/bpm)))
    out.sort(reverse=True)
    return [{'strength':float(s),'bpm':float(b),'offset':float(o)} for s,b,o in out[:8]]
whole=grid_fit(4,140)
chunks=[{'start':a,'end':min(a+30,len(y)/sr),'fit':grid_fit(a,min(a+30,len(y)/sr))[0]} for a in range(0,140,20)]
print('whole',whole[:3]);print('chunks',chunks)
np.savez_compressed(ROOT/'audio-features.npz',t=t,**bands,rms=np.sqrt(np.mean(np.abs(z)**2,axis=0)))
result={'source':SOURCE,'duration':len(y)/sr,'analysis_sr':sr,'hop_seconds':dt,'tempo_candidates':tempo_candidates,'whole_grid':whole,'chunk_grids':chunks,'method':'22.05k mono STFT spectral-flux positive onset envelope. Fourier onset grid fit, no perceptual listening performed.'}
(ROOT/'audio-analysis.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
