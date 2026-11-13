from PIL import Image,ImageDraw,ImageChops
from pathlib import Path
import json
root=Path('review/GT-20104');p=root/'live-native';r=json.loads((p/'records.json').read_text(encoding='utf8'));lights=['noon','overcast','dusk','night'];phases=[.05,.76,.96]
for view in ['hip','held-right']:
 out=Image.new('RGB',(1920,4*410),'#101214');d=ImageDraw.Draw(out)
 for i,l in enumerate(lights):
  for j,u in enumerate(phases):
   row=next(v for v in r['records'] if v['view']==view and v['light']==l and v['fraction']==u);im=Image.open(p/row['file']).convert('RGB');assert im.getextrema()[0][1]>40
   out.paste(im.resize((640,360)),(j*640,i*410+50))
   caption=f'{view} / {l} / reload {u:.2f} / world {row["worldTravel"]*1000:.1f} gun mm'
   if view=='hip':caption+=f' / eye {row["eyeTravel"]*1000:.1f}'
   d.text((j*640+7,i*410+7),caption,fill='white');d.text((j*640+7,i*410+27),'Native sampled view; pose/camera reset at each sample. Night: existing flashlight.',fill='#bbc6d0')
 out.save(root/('pistol-native-'+view+'-four-lights.jpg'),quality=93)
q=root/'world-native-macro';m=json.loads((q/'records.json').read_text(encoding='utf8'));out=Image.new('RGB',(1920,4*320),'#101214');d=ImageDraw.Draw(out);pixels=[]
for i,l in enumerate(lights):
 for k,v in enumerate(['right','port-top']):
  row=next(x for x in m['records'] if x['view']==v and x['light']==l)
  a=Image.open(q/row['before']).convert('RGB');b=Image.open(q/row['after']).convert('RGB');diff=ImageChops.difference(a,b);n=sum(max(z)>8 for z in diff.getdata());pixels.append({'light':l,'view':v,'changedPixelsAbove8':n,'bbox':diff.getbbox()});assert n>40,(l,v,n)
  for j,(im,label) in enumerate([(a,'BEFORE fixed barrel reconstruction'),(b,'AFTER native CB331')]):
   x=(k*2+j)*480;out.paste(im.resize((480,270)),(x,i*320+50));d.text((x+6,i*320+7),v+' / '+l+' / '+label,fill='white');d.text((x+6,i*320+27),'World rack .130 / body hidden for geometry inspection',fill='#bbc6d0')
out.save(root/'pistol-world-barrel-four-lights.jpg',quality=93);(q/'pixels.json').write_text(json.dumps(pixels,indent=2),encoding='utf8')
print('PASS native context sheets and same-camera macro pairs',json.dumps(pixels))
