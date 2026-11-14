from PIL import Image,ImageDraw,ImageFont
from pathlib import Path
import json
r=Path(__file__).resolve().parent
d=r/'fittings/flamer/before-trigger-audit'
rows=json.loads((d/'records.json').read_text())['records']
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',18)
sheet=Image.new('RGB',(1600,460),(20,23,27));draw=ImageDraw.Draw(sheet)
draw.text((10,6),'GT-20106 / current flamer guard / C1 proposed pad centre (0,-.072,-.133); no blade moved',font=font,fill='white')
for i,light in enumerate(['noon','overcast','dusk','night']):
 a=next(x for x in rows if x['light']==light)
 im=Image.open(d/a['file']).convert('RGB')
 x,y,z=a['targetPixel'];px=(x*.5+.5)*1280;py=(-y*.5+.5)*720
 ann=ImageDraw.Draw(im);ann.ellipse((px-8,py-8,px+8,py+8),outline=(255,100,60),width=2)
 im=im.crop((440,170,840,570))
 sheet.paste(im,(i*400,55));draw.text((i*400+8,34),light+' / circle is QA annotation',font=font,fill='white')
sheet.save(r/'flamer-proposed-trigger-target-four-lights.jpg',quality=95)
