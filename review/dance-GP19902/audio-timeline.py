import json, pathlib, subprocess
import numpy as np
from scipy import signal
P=pathlib.Path(__file__).resolve().parent
d=np.load(P/'audio-features.npz');t=d['t'];hi=d['high'];bass=d['bass'];rms=d['rms']
# Refine the repeated 1/8-note percussion grid against actual, prominent peaks.
peaks,_=signal.find_peaks(hi,distance=20,prominence=.5)
pt=t[peaks];pe=hi[peaks]
sel=(pt>9)&(pt<70);pt=pt[sel];pe=pe[sel]
origin=9.152;step=60/103.4/2
for _ in range(4):
    idx=np.rint((pt-origin)/step)
    residual=pt-(origin+idx*step)
    good=np.abs(residual)<.075
    step,origin=np.polyfit(idx[good],pt[good],1,w=np.sqrt(pe[good]))
print('fitted source beat origin',origin,'bpm',30/step,'median percussion grid error',np.median(np.abs(pt[good]-(origin+idx[good]*step))))
start=float(origin);duration=60.;bpm=float(30/step);quarter=float(step*2)
beat_times=[]
for n in range(105):
    ts=start+n*quarter
    if ts>start+duration:break
    near=(t>=ts-.065)&(t<=ts+.065)
    loc=np.where(near)[0]
    strength=np.maximum(hi[loc],bass[loc])
    best=loc[np.argmax(strength)]
    beat_times.append({'beat':n,'seconds':round(n*quarter,4),'source_seconds':round(ts,4),'nearby_attack_seconds':round(float(t[best]-start),4),'attack_strength':round(float(strength.max()),3)})
phrases=[]
for n in range(0,104,8):
    a=start+n*quarter;b=min(start+duration,a+8*quarter)
    m=(t>=a)&(t<b)
    phrases.append({'beat':n,'seconds':round(n*quarter,3),'source_seconds':round(a,3),'bars_4_4':2,'mean_energy':round(float(rms[m].mean()),6),'mean_onset':round(float(hi[m].mean()),3)})
ap,_=signal.find_peaks(bass+.35*hi,distance=30,prominence=1.)
accents=[{'seconds':round(float(t[p]-start),3),'source_seconds':round(float(t[p]),3),'strength':round(float(bass[p]+.35*hi[p]),3)}for p in ap if start<=t[p]<start+duration]
accents=sorted(sorted(accents,key=lambda a:a['strength'],reverse=True)[:24],key=lambda a:a['seconds'])
report={'source':'C:/Users/Zero/Desktop/Jerry_Game_Related/Disclaimer/Been Warned.mp3','source_duration_seconds':143.52,'recommended_excerpt':{'source_start_seconds':round(start,6),'duration_seconds':duration,'reason':'Begins on an audible-spectrum percussion attack near full-groove arrival; follows 18.6 seconds of lighter groove with the denser section from about source 27.7 seconds. Source start is computationally estimated, not a verified musical downbeat.'},'bpm':round(bpm,6),'beat_seconds':round(quarter,6),'eighth_seconds':round(step,6),'grid_origin_excerpt_seconds':0,'median_grid_error_seconds':round(float(np.median(np.abs(pt[good]-(origin+idx[good]*step)))),5),'tempo_confidence':'High repeated subdivision confidence; medium musical quarter-note/downbeat confidence. 103.4 BPM is preferred; 69/138 BPM metrical alternatives cannot be eliminated without hearing. Minor tempo drift: original first30s ~103.075, middle ~103.5.','beat_timeline':beat_times,'two_bar_phrase_grid':phrases,'strong_transient_accents':accents,'choreography_suggestion':[{'seconds':0,'move':'Confident intro groove / shoulder pop; show silhouette.'},{'seconds':4.646,'move':'Toprock cross steps, alternating pointing/wave accents.'},{'seconds':9.292,'move':'Heavier toprock with knee bounce and arm sweeps.'},{'seconds':13.938,'move':'Turn, shuffle, prepare drop.'},{'seconds':18.584,'move':'Music becomes denser: decisive drop to six-step floorwork.'},{'seconds':27.876,'move':'Kick-through / CC steps with hand plants.'},{'seconds':37.168,'move':'Power section: windmill/backspin sequence.'},{'seconds':46.460,'move':'Freeze accents, then kip-up.'},{'seconds':55.752,'move':'Final standing hits / confident pose; hold as audio fades.'}],'limitations':['Waveform and spectral analysis only; no claim of perceptual listening.','Phrase markers are repeated 8-beat timing blocks; not verified song section labels.','Strong transients may be bass, snare, hats or scratches; inferred only from frequency bands.']}
(P/'audio-timeline.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
ff=r'C:/Users/Zero/AppData/Roaming/Python/Python314/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe'
subprocess.run([ff,'-v','error','-y','-ss',str(start),'-i',report['source'],'-map','0:a:0','-t','60','-af','afade=t=in:st=0:d=0.045,afade=t=out:st=58.8:d=1.2','-c:a','libmp3lame','-b:a','192k',str(P/'audio-dance-60s.mp3')],check=True)
print(json.dumps({'excerpt_start':start,'bpm':bpm,'beat_seconds':quarter,'phrases':phrases,'strongest_accents':accents[:8]},indent=2))
