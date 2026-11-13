from PIL import Image,ImageDraw,ImageFont,ImageChops
from pathlib import Path
import json
root=Path(__file__).resolve().parent
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',22)
small=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',18)
out=[]
for producer,folder in [('eye-off','pair-cg4-sheets-v2'),('world-off','pair-cg4-sheets-v3')]:
 data=json.loads((root/folder/'records.json').read_text())
 for angle in ['port','port-top']:
  rows=[r for r in data['records'] if r['producer']==producer and r['angle']==angle]
  assert len(rows)==4
  sheet=Image.new('RGB',(1600,1750),(20,23,27));d=ImageDraw.Draw(sheet)
  d.text((20,12),f'CG-4 / {producer} / {angle} / native reload u=.88; own slide=.13',font=font,fill='white')
  d.text((20,45),'Geometry inspection: other meshes hidden; eye space rotated. Same camera/light in each pair.',font=small,fill='white')
  d.text((20,72),'BEFORE: reconstructed old fixed barrel only',font=font,fill=(255,200,125))
  d.text((820,72),'AFTER: actual landed CG-4',font=font,fill=(170,240,180))
  for i,r in enumerate(rows):
   a=Image.open(root/folder/r['before']).convert('RGB');b=Image.open(root/folder/r['after']).convert('RGB')
   crop=(260,190,1060,580) if producer=='world-off' else (240,160,1040,550)
   aa=a.crop(crop);bb=b.crop(crop)
   diff=ImageChops.difference(aa,bb)
   n=sum(any(x>8 for x in px) for px in diff.getdata())
   assert n>80,(producer,angle,r['light'],n)
   y=110+i*410
   sheet.paste(aa,(0,y+20));sheet.paste(bb,(800,y+20))
   d.text((20,y),r['light']+' / changed pixels >8: '+str(n),font=small,fill='white')
   out.append(dict(producer=producer,angle=angle,light=r['light'],changedPixels=n))
  name='paired-'+producer+'-'+angle+'-four-lights.jpg'
  sheet.save(root/name,quality=94)
(root/'pair-cg4-picture-summary.json').write_text(json.dumps(out,indent=2),encoding='utf8')
print('PASS16 non-empty visual comparisons; four labelled sheets')
