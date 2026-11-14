from PIL import Image,ImageDraw,ImageFont
from pathlib import Path
import json,sys
r=Path(__file__).resolve().parent
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',20)
small=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',16)
for weapon in sys.argv[1:]:
 before=json.loads((r/'fittings'/weapon/'before'/'records.json').read_text())
 after=json.loads((r/'fittings'/weapon/'after'/'records.json').read_text())
 if weapon=='flamer':
  groups=[('gauge',['gauge-1','gauge-0.5','gauge-0'],(515,265,770,465)),('hip',['hip'],None)]
 elif weapon=='minigun':
  groups=[(v,['drum-'+v+'-standard','drum-'+v+'-extended'],None) for v in ['front','back','below','side']]+[('hip',['hip'],None)]
 else:
  groups=[('can-'+v,['can-'+v],None) for v in ['side','front']]+[('module-'+v,['module-'+v+'-off','module-'+v+'-on'],None)for v in ['side','front','below']]+[('hip',['hip-off','hip-on'],None)]
 for label,names,crop in groups:
  w=300 if crop else 520
  h=260 if crop else 300
  sheet=Image.new('RGB',(w*2*len(names),72+4*(h+28)),(20,23,27))
  d=ImageDraw.Draw(sheet)
  d.text((10,5),'GT-20106 / '+weapon+' '+label+' / BEFORE | AFTER',font=font,fill='white')
  d.text((10,31),'Same eye camera/space/exposure; rotated inspection hides other meshes. Hip is native context.',font=small,fill='white')
  for j,light in enumerate(['noon','overcast','dusk','night']):
   y=64+j*(h+28)
   for k,name in enumerate(names):
    a=next(x for x in before['records']if x['name']==name and x['light']==light)
    b=next(x for x in after['records']if x['name']==name and x['light']==light)
    assert a['camera']==b['camera'] and a['space']==b['space'] and a['exposure']==b['exposure']
    if weapon=='flamer' and label=='gauge':
     assert abs(a['gaugeAngle']+b['gaugeAngle'])<.01
    d.text((k*2*w+6,y),name+' / '+light,font=small,fill='white')
    for q,phase in enumerate(['before','after']):
     im=Image.open(r/'fittings'/weapon/phase/(name+'-'+light+'.png')).convert('RGB')
     if crop:im=im.crop(crop)
     im.thumbnail((w,h))
     tile=Image.new('RGB',(w,h),(12,15,18))
     tile.paste(im,((w-im.width)//2,(h-im.height)//2))
     sheet.paste(tile,(k*2*w+q*w,y+23))
  sheet.save(r/(weapon+'-'+label+'-four-lights.jpg'),quality=95)
print('PASS fitting sheets, exact camera/view-space/exposure; flamer opposite actual fuel-angle assertions.')
