import wave, sys, os, struct, numpy as np, csv
root = r"F:\Sound_Effects\Guns\Real Firearms Sounds"
def read(p):
    with open(p,'rb') as f: data=f.read()
    # parse RIFF manually (handles WAVE_FORMAT_EXTENSIBLE / float)
    if data[:4]!=b'RIFF': raise ValueError('not riff')
    i=12; fmt=None; raw=None
    while i+8<=len(data):
        cid=data[i:i+4]; sz=struct.unpack('<I',data[i+4:i+8])[0]; body=data[i+8:i+8+sz]
        if cid==b'fmt ': fmt=struct.unpack('<HHIIHH',body[:16]); 
        if cid==b'data': raw=body
        i+=8+sz+(sz&1)
    tag,ch,sr,_,_,bits=fmt
    if tag==0xFFFE: tag=struct.unpack('<H',fmt and data[data.find(b'fmt ')+8+24:data.find(b'fmt ')+8+26])[0]
    if tag==3: x=np.frombuffer(raw,dtype='<f4' if bits==32 else '<f8').astype(np.float64)
    elif bits==16: x=np.frombuffer(raw[:len(raw)//2*2],dtype='<i2')/32768.0
    elif bits==24:
        b=np.frombuffer(raw[:len(raw)//3*3],dtype=np.uint8).reshape(-1,3).astype(np.int32); v=b[:,0]|(b[:,1]<<8)|(b[:,2]<<16); v=np.where(v&0x800000,v-0x1000000,v); x=v/8388608.0
    elif bits==32: x=np.frombuffer(raw[:len(raw)//4*4],dtype='<i4')/2147483648.0
    else: raise ValueError('bits %d'%bits)
    x=x[:len(x)//ch*ch].reshape(-1,ch).mean(axis=1); return x,sr,ch
w=csv.writer(open(sys.argv[1],'w',newline='',encoding='utf-8'),delimiter='\t')
w.writerow(['file','sr','ch','dur','peak_db','rms_db','onset','end20','end30','end40','hf_ratio'])
for d,_,fs in os.walk(root):
    for n in fs:
        if not n.lower().endswith('.wav'): continue
        p=os.path.join(d,n)
        try:
            x,sr,ch=read(p)
            pk=np.max(np.abs(x))+1e-12; hop=int(sr*0.01); env=np.sqrt(np.convolve(x*x,np.ones(hop)/hop,'same'))[::hop]+1e-12; ed=20*np.log10(env); mx=ed.max()
            on=np.argmax(np.abs(x)>pk*0.1)/sr
            def endb(db): idx=np.where(ed>mx-db)[0]; return (idx[-1]+1)*hop/sr if len(idx) else len(x)/sr
            X=np.abs(np.fft.rfft(x[:min(len(x),sr*2)])); fr=np.fft.rfftfreq(min(len(x),sr*2),1/sr); hf=X[fr>4000].sum()/(X.sum()+1e-12)
            w.writerow([p.replace(root+'\\',''),sr,ch,round(len(x)/sr,3),round(20*np.log10(pk),1),round(20*np.log10(np.sqrt(np.mean(x*x))+1e-12),1),round(on,3),round(endb(20),3),round(endb(30),3),round(endb(40),3),round(hf,3)])
        except Exception as e: w.writerow([p.replace(root+'\\',''),'ERR',str(e)])
