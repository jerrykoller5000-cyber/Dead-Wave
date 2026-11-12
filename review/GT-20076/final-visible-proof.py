from pathlib import Path
import json,hashlib
from PIL import Image,ImageChops,ImageStat
root=Path(__file__).parent/'final-visible-2026-11-12'
report={'guns':{},'modelChanges':{},'note':'No model edit. Hip native idle breathing phase may vary. Third-person actor/camera replays recorded matrices.'}
side=Path('studio/weapon-sidearms.js').read_bytes()
report['modelChanges']['sidearmsUnchanged']=side==(root/'before-weapon-sidearms.js.txt').read_bytes()
def breacher(t):
 return t.split('export function makeAa12Model',1)[1].split('const shotgunFinishes',1)[0]
long=Path('studio/weapon-longarms.js').read_text(encoding='utf8')
old=(root/'before-weapon-longarms.js.txt').read_text(encoding='utf8')
report['modelChanges']['breacherUnchanged']=breacher(long)==breacher(old)
assert all(report['modelChanges'].values()),'An owned model changed during the witness review: inspect before reporting'
report['sidearmsSha256']=hashlib.sha256(side).hexdigest()
report['breacherSha256']=hashlib.sha256(('export function makeAa12Model'+breacher(long)).encode()).hexdigest()
for gun in ['pistol','revolver','uzi','aa12']:
 a=json.loads((root/gun/'before/cameras.json').read_text())
 b=json.loads((root/gun/'after/cameras.json').read_text())
 rec={'images':{},'projectionMaxAbsDifference':{},'imageMaxRgbDifference':{},'reloadFractions':{}}
 for phase in ['before','after']:
  files=list((root/gun/phase).glob('*.png'));assert len(files)==32,(gun,phase,len(files))
  for f in files:
   with Image.open(f) as im:assert im.size==(1280,720)
  rec['images'][phase]=len(files)
  rr=json.loads((root/gun/phase/'reloads.json').read_text())
  assert len(rr)==8 and set(r['fraction'] for r in rr)=={.25,.55}
  rec['reloadFractions'][phase]=[{'fraction':r['fraction'],'light':r['light'],'round':r['round']} for r in rr]
 for view in a:
  d=max(abs(a[view]['points'][j][k]-b[view]['points'][j][k]) for j in range(4) for k in range(3))
  rec['projectionMaxAbsDifference'][view]=d
  if view!='hip':assert d<1e-9,(gun,view,d)
  for light in ['noon','overcast','dusk','night']:
   name=view+'-'+light+'.png'
   im=ImageChops.difference(Image.open(root/gun/'before'/name).convert('RGB'),Image.open(root/gun/'after'/name).convert('RGB'))
   rec['imageMaxRgbDifference'][name]=max(v[1] for v in im.getextrema())
 report['guns'][gun]=rec
dest=root/'final-proof.json';dest.write_text(json.dumps(report,indent=2)+'\n',encoding='utf8')
print('PASS four guns x 32 before + 32 after images, native1280x720')
print('PASS aimed/rack/standard/held-side recorded projections match <1e-9')
print('PASS sidearms and Breacher model source unchanged')
print('Hip projected frame variation:',{g:r['projectionMaxAbsDifference']['hip'] for g,r in report['guns'].items()})
print(dest)
