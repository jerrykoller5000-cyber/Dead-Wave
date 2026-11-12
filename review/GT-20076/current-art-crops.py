"""Compare a model-local box in matching before/after frames captured by the crew camera."""
import argparse
from itertools import product
import json
from math import ceil, hypot
from pathlib import Path
from PIL import Image, ImageDraw

p = argparse.ArgumentParser()
for key in ('model', 'before', 'after', 'view', 'name'):
    p.add_argument(key)
p.add_argument('--bounds', nargs=6, type=float, required=True, metavar=('X0','X1','Y0','Y1','Z0','Z1'))
args = p.parse_args()
assert all(getattr(args,k).replace('-','').isalnum() for k in ('model','before','after','view','name'))
root = Path(__file__).parent/'visible-repairs'/args.model
phases = [args.before,args.after]
bases = [json.loads((root/s/'cameras.json').read_text(encoding='utf8'))[args.view]['points'] for s in phases]
bounds = args.bounds
assert all(bounds[i]<bounds[i+1] for i in (0,2,4))
corners = list(product(bounds[:2],bounds[2:4],bounds[4:]))
with Image.open(root/args.before/(args.view+'-noon.png')) as frame:
    width,height = frame.size

def project(basis,point):
    x,y,w = [basis[0][i]+sum(point[j]*(basis[j+1][i]-basis[0][i]) for j in range(3)) for i in range(3)]
    assert w>0
    return ((1+x/w)*width/2,(1-y/w)*height/2)

a,b = [[project(basis,point) for point in corners] for basis in bases]
drift = max(hypot(x-u,y-v) for (x,y),(u,v) in zip(a,b))
assert drift<1,(args.view,'current artwork projection differs',drift)
xs,ys = zip(*(a+b))
w,h = max(166,ceil(max(xs)-min(xs))+42),max(110,ceil(max(ys)-min(ys))+30)
left = max(0,min(width-w,round((min(xs)+max(xs)-w)/2)))
top = max(0,min(height-h,round((min(ys)+max(ys)-h)/2)))
assert all(left<=x<=left+w and top<=y<=top+h for x,y in a+b)
dh = round(430*h/w)
sheet = Image.new('RGB',(860,4*(dh+20)),'#262b30')
pen = ImageDraw.Draw(sheet)
for col,phase in enumerate(phases):
    for row,light in enumerate(('noon','overcast','dusk','night')):
        x,y=col*430,row*(dh+20)
        pen.text((x+6,y+4),('Before' if col==0 else 'After')+'  /  '+args.view+'  /  '+light,fill='white')
        with Image.open(root/phase/(args.view+'-'+light+'.png')) as frame:
            assert frame.size==(width,height)
            sheet.paste(frame.crop((left,top,left+w,top+h)).resize((430,dh),Image.Resampling.LANCZOS),(x,y+20))
sheet.save(root/(args.name+'.jpg'),quality=94)
print(args.view, 'current bounds', (left,top,w,h), 'maximum projected drift',drift)
