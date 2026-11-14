from PIL import Image,ImageDraw,ImageFont
from pathlib import Path
import json
r=Path(__file__).resolve().parent
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',18)
for weapon,cases in [('flamer',['hip','trigger-audit']),('minigun',['hip','drum-front-standard']),('uzi',['hip-standard','side-standard'])]:
 base=r/'packing'/weapon if weapon=='uzi' else r/'fittings'/weapon
 dirs=[base/p if weapon=='uzi' else base/(p+'-packing') for p in ['before','after']]
 rows=[json.loads((d/'records.json').read_text())['records'] for d in dirs]
 sheet=Image.new('RGB',(1600,1020),(20,23,27));draw=ImageDraw.Draw(sheet)
 draw.text((12,8),'GT-20106 / '+weapon+' / fixed artwork batching / same eye camera, four lights',font=font,fill='white')
 draw.text((12,34),'Before | After, each view. Details, control pivots and hand contacts retained.',font=font,fill='white')
 for lightrow,light in enumerate(['noon','overcast','dusk','night']):
  y=78+lightrow*235
  for view,c in enumerate(cases):
   pair=[[x for x in a if x['name']==c and x['light']==light][0] for a in rows]
   assert pair[0]['camera']==pair[1]['camera'] and pair[0]['space']==pair[1]['space']
   for phase in [0,1]:
    im=Image.open(dirs[phase]/pair[phase]['file']).convert('RGB');im.thumbnail((400,225));x=(view*2+phase)*400
    sheet.paste(im,(x,y));draw.text((x+6,y+2),c+' '+light+' '+['BEFORE','AFTER'][phase],font=font,fill='white')
 sheet.save(r/(weapon+'-fixed-batches-four-lights.jpg'),quality=94)
 print(weapon+' fixed-batch sheet saved')
