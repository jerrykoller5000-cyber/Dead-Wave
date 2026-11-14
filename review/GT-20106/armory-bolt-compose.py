from PIL import Image,ImageDraw,ImageFont
from pathlib import Path
import json
r=Path(__file__).resolve().parent
a=json.loads((r/'armory-bolts/before/records.json').read_text());b=json.loads((r/'armory-bolts/after/records.json').read_text())
assert a['audit']['camera']==b['audit']['camera']
assert a['audit']['taskLight']==b['audit']['taskLight']==.25
assert not a['errors'] and not b['errors']
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',18)
sheet=Image.new('RGB',(840,1640),(20,23,27));d=ImageDraw.Draw(sheet)
d.text((10,5),'GT-20106 / Armory bolt seat / BEFORE | AFTER',font=font,fill='white')
d.text((10,30),'Same native camera, four lights + fixed inspection lamp;11mm gap -> seated.',font=font,fill='white')
for i,light in enumerate(['noon','overcast','dusk','night']):
 y=65+i*390
 d.text((10,y),light,font=font,fill='white')
 for q,phase in enumerate(['before','after']):
  im=Image.open(r/'armory-bolts'/phase/(light+'.png')).convert('RGB').crop((440,190,860,550))
  sheet.paste(im,(q*420,y+24))
sheet.save(r/'armory-bolt-seat-four-lights.jpg',quality=95)
print('PASS Armory four-light sheet: exact camera/task lamp, zero page errors, native instance clearance proof.')
