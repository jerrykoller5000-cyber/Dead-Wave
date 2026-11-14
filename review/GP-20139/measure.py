from pathlib import Path
from PIL import Image
import numpy as np,json,sys,csv
root=Path('review/GP-20139')/(sys.argv[1] if len(sys.argv)>1 else 'audit')
rows=[]
for view in ['southA','eastA','medicalA']:
 for variant in ['normal','no-paint','no-offset','raised-10mm','aniso16','no-depth-test']:
  files=[root/f'{view}-{variant}-{i}.png' for i in range(3)]
  if not all(p.exists() for p in files):continue
  frames=np.stack([np.array(Image.open(p).convert('RGB'),dtype=np.int16) for p in files])
  spread=(frames.max(axis=0)-frames.min(axis=0)).max(axis=2)
  row={'view':view,'variant':variant,'pixels':int(spread.size)}
  for threshold in [16,24,32,48,64,96]:row[f'gt{threshold}']=int((spread>threshold).sum())
  rows.append(row)
(root/'pixel-measures.json').write_text(json.dumps({'metric':'max per-channel RGB range across3rawframes at camera dx=-.002,0,+.002m; no registration; edge shimmer included; sensitivity curve fixed before comparisons','rows':rows},indent=2),encoding='utf8')
if rows:
 with (root/'pixel-measures.csv').open('w',newline='',encoding='utf8') as f:
  writer=csv.DictWriter(f,fieldnames=list(rows[0]));writer.writeheader();writer.writerows(rows)
 for row in rows:print(row['view'],row['variant'],'gt32',row['gt32'],'gt64',row['gt64'])