from PIL import Image,ImageDraw
from pathlib import Path
import json
root=Path(__file__).parent
lights=['noon','overcast','dusk','night']
sheet=Image.new('RGB',(1280,4*215),(20,22,25)); draw=ImageDraw.Draw(sheet)
rows=[]
for row,light in enumerate(lights):
 for col,(phase,view) in enumerate((('before','side'),('after','side'),('before','three'),('after','three'))):
  base=root/('before-native' if phase=='before' else 'after-verified')/(view+'-'+light)
  meta=json.loads(base.with_suffix('.json').read_text(encoding='utf-8'))
  assert meta['inspect']['display']['light']==light
  before=json.loads((root/'before-native'/(view+'-'+light+'.json')).read_text(encoding='utf-8'))
  assert meta['cam']==before['cam'],(phase,view,light)
  assert meta['boxSize']==before['boxSize']
  im=Image.open(base.with_suffix('.png')).convert('RGB');assert im.size==(1280,720)
  assert max(im.convert('L').getextrema())>30,('Black capture',phase,view,light)
  im.thumbnail((320,360))
  x=col*320;y=row*215
  sheet.paste(im,(x,y+25))
  draw.text((x+8,y+7),phase.upper()+' '+view+' / '+light,fill='white')
  rows.append({'phase':phase,'view':view,'light':light,'cameraMatched':True,'lightMatched':True,'renderer':meta['renderer']})
sheet.save(root/'four-lights.jpg',quality=94)
(root/'proof.json').write_text(json.dumps({'pairs':rows,'cameraAndBoundsIdentical':True,'nativeSize':[1280,720]},indent=2)+'\n',encoding='utf-8')
print('PASS 8 matched before/after cameras and bounds; all 16 actual inspector light presets; native 1280x720')
