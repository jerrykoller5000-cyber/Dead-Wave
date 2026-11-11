import json
from pathlib import Path
from statistics import median
from tempfile import NamedTemporaryFile
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parent
lights = ('noon','overcast','dusk','night')
def save(image, name):
    with NamedTemporaryFile(dir=root,suffix='.jpg',delete=False) as tmp:
        image.save(tmp,'JPEG',quality=95)
    Path(tmp.name).replace(root/name)

def cropsheet(gun, finish):
    out = Image.new('RGB',(4*245+8,2*260+25),'#20252a')
    labels=ImageDraw.Draw(out)
    for c,light in enumerate(lights):
        x=8+c*245;labels.text((x,5),light.title(),fill='white')
        for n,phase in enumerate(('before','after')):
            y=24+n*260;labels.text((x,y),phase.title()+' / '+finish,fill='white')
            with Image.open(root/phase/f'{gun}-{finish}-aimed-{light}.png') as src:
                tile=src.crop((506,342,774,611)).resize((235,235),Image.Resampling.LANCZOS)
                out.paste(tile,(x,y+18))
    save(out,gun+'-'+finish+'-glare.jpg')

for gun in ('revolver','ak'):
    for finish in ('factory','m81'):cropsheet(gun,finish)
results={}
for gun in ('revolver','ak'):
    results[gun]={}
    for phase in ('before','after'):
        with Image.open(root/phase/f'{gun}-factory-aimed-noon.png') as img:
            if gun=='revolver':coords=[(x,y) for x in range(603,678) for y in range(479,507)]
            else:coords=[(x,y) for x in range(610,671) for y in range(433,496) if 21.5<((x-640)**2+(y-464)**2)**.5<24.0]
            vals=sorted(.2126*r+.7152*g+.0722*b for r,g,b in (img.getpixel(p)[:3] for p in coords))
            results[gun][phase]={'pixels':len(vals),'median':round(median(vals),1),'p95':round(vals[int(.95*(len(vals)-1))],1)}
with NamedTemporaryFile(dir=root,mode='w',encoding='utf8',newline='\n',delete=False) as tmp:
    json.dump(results,tmp,indent=2);tmp.write('\n')
Path(tmp.name).replace(root/'noon-luma.json')
print(json.dumps(results))

out=Image.new('RGB',(3*323+8,2*221+32),'#20252a');labels=ImageDraw.Draw(out)
original=root.parents[2]/'qa/2026-11-11-AG-294/ak'
for col,(title,rack,hip,offset) in enumerate([
        ('AG-294 / ACOG',original/'rack-m81-fitted.png',original/'fitted-eye-noon.png',0),
        ('Current / ACOG',root/'after/ak-acog-rack.png',root/'after/ak-acog-hip.png',0),
        ('Current / RMR',root/'after/ak-rmr-rack.png',root/'after/ak-rmr-hip.png',-26)]):
    x=8+323*col;labels.text((x,5),title,fill='white')
    for row,(image,box,label) in enumerate([(rack,(453+offset,382,703+offset,537),'Rack'),
                                         (hip,(510,270,1050,655),'At the eye')]):
        y=25+row*221;labels.text((x,y),label,fill='white')
        with Image.open(image) as src:
            tile=src.crop(box);tile.thumbnail((315,196),Image.Resampling.LANCZOS)
            out.paste(tile,(x,y+17))
save(out,'ak-fitted-angles.jpg')
