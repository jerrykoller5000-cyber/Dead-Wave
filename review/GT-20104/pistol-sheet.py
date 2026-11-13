from pathlib import Path
from PIL import Image,ImageDraw
import json
root=Path(__file__).parent
folder=root/'mechanism-final'
data=json.loads((folder/'records.json').read_text(encoding='utf-8'))
assert data['reviewOnlyPose'] and data['productionMotionPending']
for travel,label in [(0,'closed'),(.07,'open')]:
 sheet=Image.new('RGB',(1600,4*245),(16,18,21));draw=ImageDraw.Draw(sheet)
 for row,light in enumerate(['noon','overcast','dusk','night']):
  for col,(version,view) in enumerate([('before','side'),('candidate','side'),('before','three'),('candidate','three')]):
   p=folder/(version+'-'+str(travel)+'-'+view+'-'+light+'.png')
   im=Image.open(p).convert('RGB');assert im.size==(1280,720)
   assert im.convert('L').getextrema()[1]>35
   im.thumbnail((400,225));sheet.paste(im,(col*400,row*245+20))
   draw.text((col*400+7,row*245+5),version+' '+view+' '+light,fill='white')
 sheet.save(root/('pistol-'+label+'-four-lights.jpg'),quality=95)
print('PASS two viewed model-contract sheets, native32frames; production motion remains pending')
