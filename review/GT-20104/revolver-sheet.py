from pathlib import Path
from PIL import Image,ImageDraw
import json,math
root=Path(__file__).parent
before=json.loads((root/'revolver/before/records.json').read_text(encoding='utf-8'))['records']
after=json.loads((root/'revolver/after/records.json').read_text(encoding='utf-8'))['records']
max_position=0;max_direction=0;max_fov=0
for a in after:
 b=next(x for x in before if (x['pose'],x['view'],x['light'])==(a['pose'],a['view'],a['light']))
 max_position=max(max_position,math.dist([a['camera'][k] for k in ['x','y','z']],[b['camera'][k] for k in ['x','y','z']]))
 max_direction=max(max_direction,math.dist([a['camera'][k]-a['camera'][q] for k,q in [('tx','x'),('ty','y'),('tz','z')]],[b['camera'][k]-b['camera'][q] for k,q in [('tx','x'),('ty','y'),('tz','z')]]))
 max_fov=max(max_fov,abs(a['camera']['fov']-b['camera']['fov']))
assert max_position<1e-5 and max_direction<1e-7 and max_fov<1e-7
lights=['noon','overcast','dusk','night']
def sheet(name,columns,folder,tile=400):
 image=Image.new('RGB',(len(columns)*tile,4*245),(16,18,21));draw=ImageDraw.Draw(image)
 for row,light in enumerate(lights):
  for col,(version,key) in enumerate(columns):
   p=folder(version,key,light)
   im=Image.open(p).convert('RGB');assert im.size==(1280,720)
   assert im.convert('L').getextrema()[1]>35,('Black image',p)
   im.thumbnail((tile,225));image.paste(im,(col*tile,row*245+20))
   draw.text((col*tile+6,row*245+5),version+' / '+key+' / '+light,fill='white')
 image.save(root/name,quality=95)
columns=lambda *views:[(version,view)for view in views for version in ['before','after']]
game=lambda version,key,light:root/'revolver'/version/(key+'-'+light+'.png')
sheet('revolver-four-lights.jpg',columns('rest-hip','rest-held-right'),game)
sheet('revolver-aim-rack-four-lights.jpg',columns('rest-aimed','rest-rack'),game)
sheet('revolver-reload-four-lights.jpg',columns('empty-open-hip','empty-open-held-right'),game)
macro=lambda version,key,light:root/'revolver/macros'/(version+'-'+key+'-'+light+'.png')
sheet('revolver-details-four-lights.jpg',columns('hammer','cylinder-rear','cylinder-front'),macro)
proof={'gameplayPairs':24,'maxCameraPositionDelta':max_position,'maxCameraDirectionDelta':max_direction,'maxFovDelta':max_fov,'nativeSize':[1280,720],'beforeScale':before[0]['scale'],'afterScale':after[0]['scale'],'indexMetadataNormalizedAfterPhotos':True}
(root/'revolver-photo-proof.json').write_text(json.dumps(proof,indent=2)+'\n',encoding='utf-8')
print('PASS 24 native gameplay pairs, matched actual cameras/directions/FOV; four contact sheets created')
print(json.dumps(proof))
