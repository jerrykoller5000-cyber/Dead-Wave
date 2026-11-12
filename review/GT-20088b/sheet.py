from itertools import product
from pathlib import Path
from math import hypot
import json
from PIL import Image,ImageDraw

root=Path(__file__).parent
folders=[root.parent/'GT-20076/visible-repairs/revolver/clear-rotating-frame-before',root/'after']
cameras=[json.loads((f/'cameras.json').read_text(encoding='utf8')) for f in folders]
corners=list(product((-.009,.009),(-.060,.001),(-.002,.080)))
def position(b,p):
    x,y,w=[b[0][i]+sum(p[j]*(b[j+1][i]-b[0][i]) for j in range(3)) for i in range(3)]
    assert w>0
    return ((1+x/w)*480,(1-y/w)*270)
def region(view,w,h):
    ab=[[position(c[view]['points'],p) for p in corners] for c in cameras]
    drift=max(hypot(x-u,y-v) for (x,y),(u,v) in zip(*ab))
    assert drift<1,(view,drift)
    xs,ys=zip(*(ab[0]+ab[1]))
    left=max(0,min(960-w,round((min(xs)+max(xs)-w)/2)))
    top=max(0,min(540-h,round((min(ys)+max(ys)-h)/2)))
    assert all(left<=x<=left+w and top<=y<=top+h for x,y in ab[0]+ab[1])
    return (left,top,left+w,top+h),drift
sheet=Image.new('RGB',(4*330,4*211+22),'#22282d');pen=ImageDraw.Draw(sheet)
for group,(view,w,h) in enumerate([('hip',350,197),('held-right',138,78)]):
    bounds,drift=region(view,w,h);print(view,'max projected guard drift px',drift,'crop',bounds)
    for col,(phase,folder) in enumerate(zip(('Before','After'),folders)):
        x=330*(2*group+col)
        pen.text((x+5,4),phase+'  |  '+('Eye' if group==0 else 'Held right'),fill='white')
        for row,light in enumerate(('noon','overcast','dusk','night')):
            y=22+row*211
            pen.text((x+6,y+3),light,fill='#ddd')
            with Image.open(folder/(view+'-'+light+'.png')) as frame:
                sheet.paste(frame.crop(bounds).resize((330,186),Image.Resampling.LANCZOS),(x,y+21))
sheet.save(root/'guard-four-lights.jpg',quality=95)
