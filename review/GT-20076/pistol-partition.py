"""Compare the outer surface of Jerry's original pistol frame through its rear joint."""
from pathlib import Path
import json
import sys
import numpy as np

path=Path(__file__).parent/'visible-repairs/pistol/clear-tang-cheek-after/frame-partition.json'
data=json.loads(path.read_text(encoding='utf-8'))
y,z=np.mgrid[-.02109:.0072:.00025,-.10109:-.025:.00025]
def skin(mesh):
    top=np.full(z.shape,-np.inf)
    for a,b,c in np.array(data[mesh]['position']).reshape((-1,3,3)):
        tri=(b[1]-c[1])*(a[2]-c[2])+(c[2]-b[2])*(a[1]-c[1])
        if abs(tri)<1e-13: continue
        u=((b[1]-c[1])*(z-c[2])+(c[2]-b[2])*(y-c[1]))/tri
        v=((c[1]-a[1])*(z-c[2])+(a[2]-c[2])*(y-c[1]))/tri
        inside=(u>=-1e-8)&(v>=-1e-8)&(u+v<=1+1e-8)
        x=u*a[0]+v*b[0]+(1-u-v)*c[0]
        top[inside]=np.maximum(top[inside],x[inside])
    return top
if '--verify-final' in sys.argv:
    # This finer sample includes the unchanged grip behind the joint.
    y,z=np.mgrid[-.02117:.0078:.000125,-.10117:-.025:.000125]
    grip=skin('grip')
    original=np.maximum.reduce((skin('tang'),skin('cover'),grip))
    data=json.loads(path.with_name('frame-authoring.json' if '--authoring' in sys.argv else 'frame-curve.json').read_text(encoding='utf-8'))
    final=np.maximum.reduce((skin('tang'),skin('cover'),grip))
    old_mask=np.isfinite(original);new_mask=np.isfinite(final)
    common=old_mask&new_mask;d=original[common]-final[common]
    stats={'sampleSpacing':.000125,'occupiedBefore':int(old_mask.sum()),'occupiedAfter':int(new_mask.sum()),
           'lost':int((old_mask&~new_mask).sum()),'added':int((new_mask&~old_mask).sum()),
           'maxLoss':float(d.max()),'maxExpansion':float(-d.min()),'overHalfModelMm':int((d>.0005).sum())}
    print(stats)
    path.with_name('frame-authoring-comparison.json' if '--authoring' in sys.argv else 'frame-skin-comparison.json').write_text(json.dumps(stats,indent=2)+'\n',encoding='utf-8')
    assert stats['lost']==stats['added']==0 and stats['maxExpansion']<.000001 and stats['maxLoss']<.0015
    sys.exit(0)
grip=skin('grip')
rear=np.maximum(skin('tang'),grip);fore=np.maximum(skin('cover'),grip)
outer=np.maximum(rear,fore);valid=np.isfinite(outer)
lost_a=~np.isfinite(rear[valid]);lost_b=~np.isfinite(fore[valid])
loss_a=outer[valid]-np.maximum(rear[valid],0);loss_b=outer[valid]-np.maximum(fore[valid],0)
best=None
for slope in np.linspace(-4.5,-.75,151):
    key=(z-slope*y)[valid]
    order=np.argsort(key);key=key[order]
    lost=lost_b.sum()+np.cumsum(lost_a[order].astype(int)-lost_b[order].astype(int))
    loss=loss_b.sum()+np.cumsum(loss_a[order]-loss_b[order])
    eligible=np.nonzero((key>-.095)&(key<-.055)&(np.r_[np.diff(key),0]>1e-8))[0]
    i=eligible[np.lexsort((loss[eligible],lost[eligible]))[0]]
    score=(int(lost[i]),float(loss[i]))
    if best is None or score<best[0]:best=(score,(key[i]+key[i+1])/2,slope)
print('Best straight join:',best)
for yi in range(0,y.shape[0],5):
    rowvalid=valid[yi]
    if not np.any(rowvalid):continue
    w=outer[yi,rowvalid];r=rear[yi,rowvalid];f=fore[yi,rowvalid];zs=z[yi,rowvalid]
    lost=(~np.isfinite(f)).sum()+np.cumsum((~np.isfinite(r)).astype(int)-(~np.isfinite(f)).astype(int))
    dr=w-np.maximum(r,0);df=w-np.maximum(f,0);loss=df.sum()+np.cumsum(dr-df)
    i=np.lexsort((loss,lost))[0]
    print(f'y={y[yi,0]:.5f} seam={zs[i]:.5f} holes={lost[i]} skin={loss[i]:.8f}')
