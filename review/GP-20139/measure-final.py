from pathlib import Path
from PIL import Image
import numpy as np,json,sys,csv
root=Path('review/GP-20139')/sys.argv[1]
record=json.loads((root/'records.json').read_text(encoding='utf8'));rows=[]
for item in record['rows']:
 frames=np.stack([np.asarray(Image.open(root/frame['file']).convert('RGB'),dtype=np.int16) for frame in item['frames']]);spread=(frames.max(axis=0)-frames.min(axis=0)).max(axis=2)
 for region,cut in [('full',(0,0,1280,720)),('lower-half',(0,360,1280,360))]:
  x,y,w,h=cut;s=spread[y:y+h,x:x+w];row={k:item[k] for k in ['view','light','kind']};row.update(region=region,pixels=int(s.size))
  for threshold in [16,24,32,48,64,96]:row[f'gt{threshold}']=int((s>threshold).sum())
  rows.append(row)
 # A binary measurement visualization, not a retouched gameplay photo.
 mask=np.zeros((*spread.shape,3),dtype=np.uint8);mask[spread>32]=[255,0,255];Image.fromarray(mask).save(root/(item['view']+'-'+item['light']+'-'+item['kind']+'-flags32.png'))
(root/'pixel-measures.json').write_text(json.dumps({'metric':record['metric'],'regions':{'full':[0,0,1280,720],'lower-half':[0,360,1280,360]},'rows':rows},indent=2),encoding='utf8')
with (root/'pixel-measures.csv').open('w',newline='',encoding='utf8') as f:
 writer=csv.DictWriter(f,fieldnames=list(rows[0]));writer.writeheader();writer.writerows(rows)
for r in rows:
 if r['region']=='lower-half':print(r['view'],r['light'],r['kind'],'gt32',r['gt32'],'gt64',r['gt64'])