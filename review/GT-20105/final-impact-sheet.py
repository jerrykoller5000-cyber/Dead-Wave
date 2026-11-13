import json
from pathlib import Path
from PIL import Image, ImageDraw
root=Path(__file__).resolve().parent
data=json.loads((root/'impacts-final/records.json').read_text(encoding='utf-8'))
out=Image.new('RGB',(1280,1536),(18,20,22));draw=ImageDraw.Draw(out)
for row,light in enumerate(['noon','overcast','dusk','night']):
    for col,version in enumerate(['before','after']):
        rec=next(r for r in data['records'] if r['version']==version and r['light']==light)
        im=Image.open(root/'impacts-final'/rec['file']).convert('RGB')
        assert max(e[1] for e in im.getextrema())>30,'black frame'
        out.paste(im.resize((640,360)),(col*640,row*384+24))
        draw.text((col*640+8,row*384+6),version+' / native projectile impacts / '+light,fill='white')
out.save(root/'impact-final-four-lights.jpg',quality=94)
print('PASS paired final impact sheet; native light values and source hashes in impacts-final/records.json')
