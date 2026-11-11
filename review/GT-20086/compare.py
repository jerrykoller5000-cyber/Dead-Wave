from pathlib import Path
import json
from PIL import Image,ImageDraw,ImageChops

root=Path(__file__).resolve().parent
phases=('before','after')
lights=('noon','overcast','dusk','night')
def load(phase,file):
    return json.loads((root/phase/file).read_text(encoding='utf8'))
def changed_pixels(a,b):
    r,g,b = ImageChops.difference(a.convert('RGB'),b.convert('RGB')).split()
    histogram = ImageChops.lighter(ImageChops.lighter(r,g),b).histogram()
    return sum(histogram[1:])

result={}
close=Image.new('RGB',(3*330,4*260),'#21272b')
eye=Image.new('RGB',(880,4*271),'#21272b')
for row,light in enumerate(lights):
    for col,(phase,state) in enumerate((('before','rest'),('after','rest'),('after','pressed'))):
        im=Image.open(root/phase/('close-'+light+'-'+state+'.png')).convert('RGB')
        crop=im.crop((330,135,660,370))
        close.paste(crop,(col*330,row*260+25))
        ImageDraw.Draw(close).text((col*330+6,row*260+4),light+'   '+phase+'   '+state,fill='white')
    old=Image.open(root/'before'/('close-'+light+'-rest.png'))
    new=Image.open(root/'after'/('close-'+light+'-rest.png'))
    pressed=Image.open(root/'after'/('close-'+light+'-pressed.png'))
    box=(390,175,585,368)
    result[light]={'restChange':changed_pixels(old.crop(box),new.crop(box)),'pressChange':changed_pixels(new.crop(box),pressed.crop(box))}
    assert result[light]['pressChange']>0
    for col,phase in enumerate(phases):
        im=Image.open(root/phase/('eye-'+light+'.jpg'))
        im.thumbnail((440,246))
        eye.paste(im,(col*440,row*271+25))
        ImageDraw.Draw(eye).text((col*440+6,row*271+4),light+'   '+phase,fill='white')
close.save(root/'pad-four-lights.jpg',quality=94)
eye.save(root/'eye-four-lights.jpg',quality=94)
old,new=(load(s,'motion.json') for s in phases)
assert old['axis']==new['axis'] and old['travel']==new['travel']
for k in old['copies']:
    a,b=(x['copies'][k] for x in (old,new))
    assert all(abs(v-t)<1e-8 for v,t in zip([b['rest'][i]-a['rest'][i] for i in range(3)],[0,-.002,0]))
    assert a['moved']==b['moved'] and a['stationary']==b['stationary']
(root/'comparison.json').write_text(json.dumps({'pixels':result,'copies':list(new['copies'])},indent=2)+'\n',encoding='utf8')
print(result)
