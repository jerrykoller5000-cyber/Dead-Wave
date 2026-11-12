import json
from itertools import product
from math import dist
from pathlib import Path
from PIL import Image, ImageDraw

root=Path(__file__).parent
before,after=[json.loads((root/phase/'landmark.json').read_text()) for phase in ('before','after')]
assert before['current']==after['old']=='59f3fedc'
assert after['faces']==before['faces'] and after['copies']==before['copies']
for b,a in zip(before['widths'],after['widths']):
    assert a['y']==b['y']
    assert abs(a['guardGap']-b['guardGap']-.015)<1e-7
    assert abs(a['strapGap']-b['strapGap']+.015)<1e-7
    assert a['strapGap']>0
cameras=[json.loads((root/phase/'cameras.json').read_text()) for phase in ('before','after')]
drift={}
for view in ('hip','held-right-open','side'):
    if view=='side':
        assert all(dist(cameras[0][view][k],cameras[1][view][k])<1e-7 for k in ('aim','eye'))
    else:
        def project(cam,p):
            basis=cam[view]['points']
            x,y,w=[basis[0][i]+sum(p[j]*(basis[j+1][i]-basis[0][i]) for j in range(3)) for i in range(3)]
            return (480*(1+x/w),270*(1-y/w))
        drift[view]=max(dist(*(project(cam,p) for cam in cameras)) for p in product((-.03,.03),(-.11,-.04),(-.16,.08)))
        assert drift[view]<1
    sheet=Image.new('RGB',(1280,4*383),'#20252a');draw=ImageDraw.Draw(sheet)
    for column,phase in enumerate(('before','after')):
        for row,light in enumerate(('noon','overcast','dusk','night')):
            x=column*640;y=row*383
            draw.text((x+8,y+5),phase.capitalize()+' | GW-4 | '+view+' | '+light,fill='white')
            with Image.open(root/phase/(view+'-'+light+'.png')) as pic:
                sheet.paste(pic.resize((640,360),Image.Resampling.LANCZOS),(x,y+23))
    sheet.save(root/(view+'-four-lights.jpg'),quality=94)
print('All six contact heights moved exactly .015 local. Projection drift in pixels:',drift)
