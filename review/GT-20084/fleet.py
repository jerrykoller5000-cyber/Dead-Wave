from pathlib import Path
import json
from itertools import product
from math import hypot
from PIL import Image,ImageDraw

root=Path(__file__).resolve().parent
ids=("pistol","revolver","uzi","shotgun","aa12","m4","ak","sniper","launcher","minigun")
lights=("noon","overcast","dusk","night")
summary={}
def project(camera,p):
    b=camera["points"]
    x,y,w=[b[0][i]+sum(q*(b[k+1][i]-b[0][i]) for k,q in enumerate(p)) for i in range(3)]
    if w>0:return (480*(1+x/w),270*(1-y/w))
def read(file):return json.loads(file.read_text(encoding="utf8"))
for id in ids:
    base=root/'before'/id;final=root/'after'/id
    b,a=[read(d/'draws.json') for d in (base,final)]
    assert (a['on'],a['off'])==(b['on'],b['off']),id
    pics=read(final/'switch-pixels.json')
    assert all(pics[k]['changed']>0 for k in lights),id+" no rendered travel"
    motion=read(final/'motion.json')
    assert all(v['moved'] and v['stationary'] and v['reset']<1e-7 and v['otherCopyDrift']<1e-7
               and abs(v['furthest']-motion['travel'])<1e-6 and v['lateral']<1e-6 for v in motion['copies'].values())
    cameras=[read(d/'camera.json') for d in (base,final)]
    drifts=[]
    for p in product((-.08,.08),(-.1,.1),(-.15,.15)):
        x,y=[project(c,p) for c in cameras]
        if x and y:drifts.append(hypot(x[0]-y[0],x[1]-y[1]))
    assert drifts
    summary[id]={'bare':a['off'],'fitted':a['on'],'lamp':a['moduleDraws'],'copies':list(motion['copies']),
                 'axis':motion['axis'],'travel':motion['travel'],'maxEyeDriftPixels':max(drifts),'changedPixels':{k:pics[k]['changed'] for k in lights}}
for light in lights:
    sheet=Image.new('RGB',(640,10*198+20),'#24272a');pen=ImageDraw.Draw(sheet)
    for col,phase in enumerate(('before','after')):pen.text((col*320+5,3),phase.upper()+" / "+light,fill='white')
    for row,id in enumerate(ids):
        y=20+198*row
        pen.text((5,y),id,fill='white')
        for col,phase in enumerate(('before','after')):
            with Image.open(root/phase/id/('hip-'+light+'.jpg')) as frame:sheet.paste(frame.resize((320,180),Image.Resampling.LANCZOS),(320*col,y+16))
    sheet.save(root/('eye-'+light+'.jpg'),quality=94)
sheet=Image.new('RGB',(880,5*178),'#24272a');pen=ImageDraw.Draw(sheet)
for i,id in enumerate(ids):
    x,y=(i%2)*440,(i//2)*178
    pen.text((x+4,y),id+' / rest',fill='white');pen.text((x+224,y),'pressed',fill='white')
    for col,state in enumerate(('rest','pressed')):
        with Image.open(root/'after'/id/('close-noon-'+state+'.png')) as im:
            w,h=im.size
            sheet.paste(im.crop((w//2-110,h//2-80,w//2+110,h//2+80)),(x+220*col,y+17))
sheet.save(root/'switches-noon.jpg',quality=94)
(root/'summary.json').write_text(json.dumps(summary,indent=2)+'\n',encoding='utf8')
print('Ten fitted and bare draw counts unchanged, native visible movement in all 40 light/model combinations, copies',sum(len(s['copies']) for s in summary.values()))
print('Max eye-camera drift in pixels',max(s['maxEyeDriftPixels'] for s in summary.values()))
