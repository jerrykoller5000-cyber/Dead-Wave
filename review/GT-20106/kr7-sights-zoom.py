from PIL import Image,ImageDraw,ImageFont
from pathlib import Path
import json
root=Path(__file__).resolve().parent
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',20);small=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',17)
sheet=Image.new('RGB',(1880,1710),(20,23,27));d=ImageDraw.Draw(sheet)
d.text((12,8),'GT-20106 KR-7 / native aimed eye / emissive front + two rear tritium faces',font=font,fill='white')
d.text((12,38),'Original BEFORE / revised AFTER. Same camera, four lights. Right crops are 5x nearest-pixel zooms, no painted pixels.',font=small,fill='white')
summary=[]
for row,light in enumerate(['noon','overcast','dusk','night']):
 y=78+row*400
 for col,phase in enumerate(['before','after-sights-v2']):
  im=Image.open(root/'kr7'/phase/('aimed-'+light+'.png')).convert('RGB')
  context=im.crop((470,285,830,650));context.thumbnail((580,360))
  sheet.paste(context,(col*580+(580-context.width)//2,y+28))
  zoom=im.crop((600,340,675,395)).resize((375,275),Image.Resampling.NEAREST)
  sheet.paste(zoom,(1160+col*360,y+58))
  d.text((col*580+10,y),light+' / '+('BEFORE' if col==0 else 'AFTER'),font=font,fill='white')
  d.text((1160+col*360+8,y),'5x '+('before' if col==0 else 'after'),font=font,fill='white')
  green=[(x,z) for z in range(340,395) for x in range(600,675) if (lambda c:c[1]>100 and c[1]>1.3*c[0] and c[1]>1.2*c[2])(im.getpixel((x,z)))]
  summary.append(dict(light=light,phase=phase,greenPixels=len(green)))
sheet.save(root/'kr7-tritium-aimed-zoom-four-lights.jpg',quality=96)
(root/'kr7-tritium-pixels.json').write_text(json.dumps(summary,indent=2))
print(summary)
