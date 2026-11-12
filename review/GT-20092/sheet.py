from itertools import product
import json
from pathlib import Path
from math import hypot
from PIL import Image,ImageDraw

root=Path(__file__).parent
folders=[root/'before',root/'after']
cameras=[json.loads((d/'cameras.json').read_text(encoding='utf-8')) for d in folders]
corners=list(product((-.016,.016),(-.152,-.083),(-.123,-.016)))
def project(b,p):
    x,y,w=[b[0][i]+sum(v*(b[j+1][i]-b[0][i]) for j,v in enumerate(p)) for i in range(3)]
    return ((1+x/w)*480,(1-y/w)*270)
for view in ('hip','held-right-open','held-left-open'):
    ab=[[project(c[view]['points'],v) for v in corners] for c in cameras]
    drift=max(hypot(x-a,y-b) for (x,y),(a,b) in zip(*ab))
    assert drift<1,(view,drift)
    xs,ys=zip(*(ab[0]+ab[1]))
    if view=='hip':
        crop=(0,0,960,540)
        width,height=640,360
    else:
        w,h=150,95
        left=max(0,min(960-w,round((min(xs)+max(xs)-w)/2)))
        top=max(0,min(540-h,round((min(ys)+max(ys)-h)/2)))
        assert min(xs)>=left and max(xs)<=left+w and min(ys)>=top and max(ys)<=top+h
        crop=(left,top,left+w,top+h)
        width,height=450,285
    sheet=Image.new('RGB',(width*2,(height+22)*4),'#23272d')
    pen=ImageDraw.Draw(sheet)
    for row,light in enumerate(('noon','overcast','dusk','night')):
        for col,folder in enumerate(folders):
            x,y=col*width,row*(height+22)
            pen.text((x+5,y+4),folder.name+'  /  '+view+'  /  '+light,fill='white')
            with Image.open(folder/(view+'-'+light+'.png')) as src:
                sheet.paste(src.crop(crop).resize((width,height),Image.Resampling.LANCZOS),(x,y+22))
    sheet.save(root/(view+'-four-lights.jpg'),quality=95)
    print(view,drift,crop)

detail=Image.new('RGB',(1200,4*360),'#23272d')
labels=ImageDraw.Draw(detail)
for row,light in enumerate(('noon','overcast','dusk','night')):
    for col,phase in enumerate(('before','after')):
        x,y=col*600,row*360
        labels.text((x+6,y+3),phase+'  /  unobstructed side  /  '+light,fill='white')
        with Image.open(root/'detail'/(phase+'-'+light+'.png')) as frame:
            detail.paste(frame.resize((600,338),Image.Resampling.LANCZOS),(x,y+20))
detail.save(root/'side-detail-four-lights.jpg',quality=95)
