from PIL import Image,ImageDraw,ImageFont
from pathlib import Path
import json,sys
root=Path(__file__).resolve().parent
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',20);small=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',16)
for weapon in (sys.argv[1:] or ['pistol','uzi']):
 before=json.loads((root/'magazines'/weapon/'before'/'records.json').read_text());after=json.loads((root/'magazines'/weapon/'after'/'records.json').read_text())
 for prefix in ['side','back','below','hip','reload']:
  w=410;h=460
  sheet=Image.new('RGB',(w*4,80+4*(h+28)),(20,23,27));d=ImageDraw.Draw(sheet)
  d.text((12,7),'GT-20106 / '+weapon+' magazines / standard pair then extended pair: BEFORE / AFTER',font=font,fill='white')
  d.text((12,34),'Same recorded eye camera and exposure. Side/back/below: other meshes hidden for geometry inspection.',font=small,fill='white')
  for row,light in enumerate(['noon','overcast','dusk','night']):
   y=66+row*(h+28)
   for variant,suffix in enumerate(['standard','extended']):
    name=prefix+'-'+suffix
    a=next(r for r in before['records'] if r['name']==name and r['light']==light);b=next(r for r in after['records'] if r['name']==name and r['light']==light)
    assert a['camera']==b['camera'] and a['space']==b['space'] and a['exposure']==b['exposure']
    if prefix=='reload':assert abs(a['viewReloadU']-.25)<1e-6 and abs(b['viewReloadU']-.25)<1e-6
    d.text((variant*w*2+8,y),suffix+' / '+light,font=small,fill='white')
    crop=(400,90,850,650) if prefix in ['side','back'] else (330,140,850,660) if prefix=='below' else (700,300,1280,720) if prefix=='hip' else (400,200,1280,720)
    for side,phase in enumerate(['before','after']):
     im=Image.open(root/'magazines'/weapon/phase/(name+'-'+light+'.png')).convert('RGB').crop(crop)
     im.thumbnail((w,h));tile=Image.new('RGB',(w,h),(12,15,18));tile.paste(im,((w-im.width)//2,(h-im.height)//2))
     sheet.paste(tile,(variant*w*2+side*w,y+23))
  sheet.save(root/(weapon+'-mag-'+prefix+'-four-lights.jpg'),quality=95)
print('Magazine sheets: camera/view-space/exposure exact, actual reload fraction asserted.')
