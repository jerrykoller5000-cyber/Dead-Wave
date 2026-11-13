from PIL import Image,ImageChops,ImageDraw
from pathlib import Path
import json
p=Path('review/GT-20105/paint-band');out=Image.new('RGB',(1280,4*400),'#101214');d=ImageDraw.Draw(out);rows=[]
for i,light in enumerate(['noon','overcast','dusk','night']):
 a=Image.open(p/(light+'-clean.png')).convert('RGB');b=Image.open(p/(light+'-marked.png')).convert('RGB')
 diff=ImageChops.difference(a,b);roi=diff.crop((500,240,780,480));count=sum(max(v)>8 for v in roi.getdata());assert count>40,(light,count)
 rows.append({'light':light,'changedCenterPixelsAbove8':count,'differenceBounds':diff.getbbox()})
 for j,(im,label) in enumerate([(a,'clean'),(b,'marked')]):
  out.paste(im.resize((640,360)),(j*640,i*400+40));d.text((j*640+8,i*400+10),light+' / '+label+' / native impact at paint-band height',fill='white')
out.save('review/GT-20105/paint-band-four-lights.jpg',quality=92)
(p/'pixels.json').write_text(json.dumps(rows,indent=2),encoding='utf8')
print('PASS paint-band visible four lights',json.dumps(rows))
