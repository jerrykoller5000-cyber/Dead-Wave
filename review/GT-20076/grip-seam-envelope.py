from pathlib import Path
import json,numpy as np
root=Path(__file__).parent/'visible-repairs/pistol'
y,z=np.mgrid[-.042113:.00653:.000085,-.089127:.055:.000085]
def skin(o):
 out=np.full(y.shape,-np.inf)
 for a,b,c in np.array(o['position']).reshape((-1,3,3)):
  det=(b[1]-c[1])*(a[2]-c[2])+(c[2]-b[2])*(a[1]-c[1])
  if abs(det)<1e-13:continue
  yi=np.where((y[:,0]>=min(a[1],b[1],c[1])-1e-9)&(y[:,0]<=max(a[1],b[1],c[1])+1e-9))[0]
  zi=np.where((z[0]>=min(a[2],b[2],c[2])-1e-9)&(z[0]<=max(a[2],b[2],c[2])+1e-9))[0]
  if not len(yi) or not len(zi):continue
  sl=np.s_[yi[0]:yi[-1]+1,zi[0]:zi[-1]+1]
  yy,zz=y[sl],z[sl]
  u=((b[1]-c[1])*(zz-c[2])+(c[2]-b[2])*(yy-c[1]))/det
  v=((c[1]-a[1])*(zz-c[2])+(a[2]-c[2])*(yy-c[1]))/det
  valid=(u>=-1e-8)&(v>=-1e-8)&(u+v<=1+1e-8)
  out[sl]=np.maximum(out[sl],np.where(valid,u*a[0]+v*b[0]+(1-u-v)*c[0],-np.inf))
 return out
def surfaces(tag):
 d=json.loads((root/('clear-grip-seam-'+tag)/'seam.json').read_text(encoding='utf8'))
 return {k:skin(d[k]) for k in ('cover','grip','tang')}
old=surfaces('before');now=surfaces('after')
a=np.maximum.reduce(list(old.values()));b=np.maximum.reduce(list(now.values()))
orig=np.isfinite(a);final=np.isfinite(b);shared=orig&final
delta=b[shared]-a[shared];peak=np.argmax(-delta);record={'original':int(orig.sum()),'final':int(final.sum()),'lost':int((orig&~final).sum()),'gained':int((~orig&final).sum()),'maxOut':float(delta.max()),'maxIn':float(-delta.min()),'peakZY':[float(z[shared][peak]),float(y[shared][peak])],'overPointFive':int((delta<-.0005).sum())}
print(record)
for name in ('cover','grip'):
 # Contact-side artwork that already formed the old exterior.
 mask=shared&np.isfinite(old[name])&(np.abs(np.where(np.isfinite(old[name]),old[name],-1)-np.where(orig,a,-2))<1e-8)
 diff=b[mask]-a[mask]
 record[name]={'samples':int(mask.sum()),'recession':float(-diff.min()),'expansion':float(diff.max())}
 print(name,record[name])
def grip_vertices(phase):
 data=json.loads((root/('clear-grip-seam-'+phase)/'seam.json').read_text(encoding='utf8'))['grip']
 return np.column_stack([np.array(data[k]).reshape((-1,size)) for k,size in [('position',3),('normal',3),('uv',2)]])
original_grip=grip_vertices('before')
lower=np.unique(original_grip[original_grip[:,1]<-.04011],axis=0)
final_grip=grip_vertices('after')
error=max(np.abs(final_grip-v).max(axis=1).min() for v in lower)
record['lowerGrip']={'originalSamples':len(lower),'maxComponentError':float(error)}
assert record['lost']==0 and record['gained']==0 and record['maxOut']<1e-7,record
assert record['maxIn']<.0011 and error<1e-7,record
(root/'clear-grip-seam-after'/'skin-profile.json').write_text(json.dumps(record,indent=2)+'\n',encoding='utf8')
