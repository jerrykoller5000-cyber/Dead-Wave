from PIL import Image,ImageDraw,ImageFont
from pathlib import Path
import json
r=Path(__file__).resolve().parent
a=json.loads((r/'fittings/flamer/before-heat-binding/records.json').read_text());b=json.loads((r/'fittings/flamer/after-heat-binding/records.json').read_text())
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',18)
sheet=Image.new('RGB',(1600,1260),(20,23,27));d=ImageDraw.Draw(sheet)
d.text((10,6),'GT-20106 / flamer existing nozzle heat binding / cold pair | hot pair / BEFORE | AFTER',font=font,fill='white')
d.text((10,31),'Same native eye camera, space, exposure and heat; no nozzle geometry change. Four stage lights.',font=font,fill='white')
for i,light in enumerate(['noon','overcast','dusk','night']):
 y=65+i*295
 for k,name in enumerate(['heat-cold','heat-hot']):
  ar=next(x for x in a['records']if x['name']==name and x['light']==light);br=next(x for x in b['records']if x['name']==name and x['light']==light)
  assert ar['camera']==br['camera'] and ar['space']==br['space'] and ar['exposure']==br['exposure']
  assert ar['heatBarrel'] is None and br['heatBarrel']=='flamerNozzle'
  assert abs(ar['heat']-br['heat'])<1e-9
  d.text((k*800+8,y),name+' / '+light+' / heat '+str(round(ar['heat'],3)),font=font,fill='white')
  for j,phase in enumerate(['before','after']):
   im=Image.open(r/'fittings/flamer'/(phase+'-heat-binding')/(name+'-'+light+'.png')).convert('RGB').crop((350,150,1150,620));im.thumbnail((400,265));tile=Image.new('RGB',(400,265),(12,15,18));tile.paste(im,((400-im.width)//2,(265-im.height)//2));sheet.paste(tile,(k*800+j*400,y+24))
sheet.save(r/'flamer-nozzle-heat-four-lights.jpg',quality=95)
print('PASS exact camera/space/exposure/heat; native resolver null before, flamerNozzle after;8+8 four-light shots.')
