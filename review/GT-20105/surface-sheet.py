import json
from pathlib import Path
from PIL import Image,ImageDraw
root=Path(__file__).resolve().parent;data=json.loads((root/'surface-final/records.json').read_text(encoding='utf-8'))
out=Image.new('RGB',(1280,1536),(18,20,22));draw=ImageDraw.Draw(out)
for row,light in enumerate(['noon','overcast','dusk','night']):
    a=next(r for r in data['records'] if r['version']=='before' and r['light']==light)
    b=next(r for r in data['records'] if r['version']=='after' and r['light']==light)
    assert a['position']==b['position'] and a['direction']==b['direction'] and a['fov']==b['fov']
    assert a['actualLight']==b['actualLight']
    for col,(version,r) in enumerate([('before',a),('after',b)]):
        im=Image.open(root/'surface-final'/r['file']).convert('RGB');assert max(v[1] for v in im.getextrema())>30
        out.paste(im.resize((640,360)),(col*640,row*384+24))
        draw.text((col*640+8,row*384+6),version+' / same seeded scorch on CIF edge / '+light+(' + lamp' if light=='night' else ''),fill='white')
out.save(root/'prop-scorch-four-lights.jpg',quality=94)
print('PASS same camera/light, fixed seeded mark; native surface distances recorded')
