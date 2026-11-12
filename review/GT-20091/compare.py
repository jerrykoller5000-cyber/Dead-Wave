"""Compare the actual sight-on frame with its hidden-marker control at the eye."""
import json
from pathlib import Path
from math import hypot
import numpy as np
from PIL import Image, ImageDraw

root = Path(__file__).parent
records = {p: json.loads((root/p/'review.json').read_text(encoding='utf-8')) for p in ('before','after')}
point = records['after']['geometry']['world']['position']

def project(camera, size, position=point):
    basis = camera['points']
    u,v,w = [basis[0][i] + sum(x*(basis[j+1][i]-basis[0][i]) for j,x in enumerate(position)) for i in range(3)]
    return (1+u/w)*size[0]/2,(1-v/w)*size[1]/2

def frame(phase, name):
    return Image.open(root/phase/(name+'.png')).convert('RGB')

result = {}
for view in ('hip','aimed'):
    lit = ('noon','overcast','dusk','night','dark-room') if view=='aimed' else ('noon','overcast','dusk','night')
    sheet = Image.new('RGB',(960,len(lit)*272),'#25272c')
    labels = ImageDraw.Draw(sheet)
    for row,light in enumerate(lit):
        name = view+'-'+light
        before, after, hidden = frame('before',name), frame('after',name), frame('after',name+'-hidden')
        assert before.size == after.size == hidden.size
        centres = [project(records[p]['shots'][view]['camera'],after.size) for p in ('before','after')]
        drift = hypot(centres[0][0]-centres[1][0],centres[0][1]-centres[1][1])
        assert drift < 1, (name,drift)
        x,y = map(round,centres[1])
        roi = (x-12,y-12,x+13,y+13)
        on, off = [np.asarray(im.crop(roi),dtype=np.int16) for im in (after,hidden)]
        r,g,b = on.transpose(2,0,1)
        green = (g>105) & (g-r>30) & (g-b>25) & (g-off[:,:,1]>12)
        yy,xx = np.where(green)
        delta = np.max(np.abs(on-off),axis=2)
        changed = delta>12
        dy,dx = np.ogrid[:25,:25]
        surround = (dx-12)**2+(dy-12)**2>36
        bright = on[green].tolist()
        result[name] = {'screen':centres[1],'cameraDriftPx':drift,'visibleGreenPixels':len(xx),
            'pixelsChangedWithin25pxSquare':int(changed.sum()),'largestSurroundChange':int(delta[surround].max()),
            'centreRGB':on[12,12].tolist(), 'bounds': [int(xx.min()-12),int(yy.min()-12),int(xx.max()-12),int(yy.max()-12)] if len(xx) else None,
            'brightest': max(bright,key=lambda c:c[1]) if bright else None}
        for col,img in enumerate((before,after)):
            offset=(col*480,row*272)
            labels.text((offset[0]+8,offset[1]+5),('Before' if col==0 else 'After')+'  /  '+view+'  /  '+light,fill='white')
            # Each image uses identical framing and integer magnification.
            crop = img.crop((x-120,y-62,x+120,y+62)).resize((480,248),Image.Resampling.NEAREST)
            sheet.paste(crop,(offset[0],offset[1]+24))
    sheet.save(root/(view+'-four-lights.jpg'),quality=96)
(root/'pixel-proof.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
for name,record in result.items():
    print(name, record['visibleGreenPixels'],record['bounds'],record['brightest'],flush=True)
def sight_picture():
    aimed = records['after']['shots']['aimed']['camera']
    resolution = frame('after','aimed-noon').size
    def screen(x,y,z):
        return project(aimed,resolution,(x,y,z))
    top = screen(0,.1244,.318)
    ears = [screen(s*.0048,.122,-.05) for s in (-1,1)]
    inner = [screen(s*.0031,.122,-.05) for s in (-1,1)]
    dot = screen(*point)
    level = top[1]-sum(s[1] for s in ears)/2
    centre = dot[0]-sum(s[0] for s in ears)/2
    assert abs(level)<.5 and abs(centre)<.1
    proof = json.loads((root/'after/sight-line.json').read_text(encoding='utf-8'))
    assert proof['markerSamples']>=17 and not proof['covered'], proof.get('covered')
    return {'postTopPx':top,'rearEarCentresPx':ears,'innerEdgesPx':inner,'dotCentrePx':dot,
            'topLevelErrorPx':level,'lateralCentreErrorPx':centre,'visibleFaceSamples':proof['markerSamples']}
(root/'aimed-alignment.json').write_text(json.dumps(sight_picture(),indent=2)+'\n',encoding='utf-8')
for name,r in result.items():
    assert 2 <= r['visibleGreenPixels'] <= 50, (name,r)
    assert all(abs(p)<=6 for p in r['bounds']), (name,'outside the post',r)
    assert r['largestSurroundChange']<=2, (name,'surround changed',r)
