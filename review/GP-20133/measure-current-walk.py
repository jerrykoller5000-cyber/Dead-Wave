from pathlib import Path
from PIL import Image
import numpy as np,json,csv
root=Path('review/GP-20133/walk-current');r=json.loads((root/'records.json').read_text(encoding='utf8'));rows=[]
for item in r['rows']:
 a=np.stack([np.asarray(Image.open(root/f['file']).convert('RGB'),dtype=np.int16) for f in item['frames']]);spread=(a.max(axis=0)-a.min(axis=0)).max(axis=2)
 for region,cut in [('full',(0,0,1280,720)),('lower-half',(0,360,1280,360))]:
  x,y,w,h=cut;s=spread[y:y+h,x:x+w];row={k:item[k] for k in ['view','light','kind','variant']};row.update(region=region,pixels=int(s.size))
  for t in [16,24,32,48,64,96]:row['gt'+str(t)]=int((s>t).sum())
  rows.append(row)
 mask=np.zeros((*spread.shape,3),dtype=np.uint8);mask[spread>32]=[255,0,255];Image.fromarray(mask).save(root/(item['view']+'-'+item['light']+'-'+item['kind']+'-'+item['variant']+'-flags32.png'))
comparisons=[]
for a in rows:
 if a['variant']!='before':continue
 b=next(x for x in rows if x['variant']=='live' and all(x[k]==a[k] for k in ['view','light','kind','region']))
 comparisons.append({k:a[k] for k in ['view','light','kind','region']}|{'before32':a['gt32'],'live32':b['gt32'],'changePct32':100*(b['gt32']/a['gt32']-1) if a['gt32'] else None,'before64':a['gt64'],'live64':b['gt64']})
(root/'pixel-measures.json').write_text(json.dumps({'metric':r['metric'],'rows':rows,'comparisons':comparisons},indent=2),encoding='utf8')
with (root/'pixel-measures.csv').open('w',newline='',encoding='utf8') as f:
 w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
for x in comparisons:
 if x['region']=='lower-half':print(x)

historical=json.loads(Path('review/GP-20142/pixel-measures.json').read_text(encoding='utf8'))
matched=[]
for row in rows:
 if row['variant']!='live':continue
 old=next(x for x in historical['rows'] if x['variant']=='before' and all(x[k]==row[k] for k in ['view','light','kind','region']))
 matched.append({k:row[k] for k in ['view','light','kind','region']}|{'historicalMissingShadow32':old['gt32'],'currentLive32':row['gt32']})
(root/'historical-comparison.json').write_text(json.dumps({'caveat':r['baselineCaveat'],'rows':matched},indent=2),encoding='utf8')
print('source stable',r['indexHash']==r.get('endIndexHash'),'errors',r.get('errors'),'failure',r.get('failure'))
print('sun caster calls by light',{k:sorted(set(f['actual']['drawnSunCasterCalls'] for row in r['rows'] if row['light']==k for f in row['frames'])) for k in ['noon','overcast','dusk','night']})
