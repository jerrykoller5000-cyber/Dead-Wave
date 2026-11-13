import json
from pathlib import Path
from PIL import Image,ImageDraw
root=Path(__file__).resolve().parent
before=json.loads((root/'scorch/before-lamp/records.json').read_text(encoding='utf-8'))
after=json.loads((root/'scorch/after-lamp/records.json').read_text(encoding='utf-8'))
assert before['probe']['char']==1 and before['probe']['dummy']['markCount']==0
assert after['probe']['char']==0 and after['probe']['dummy']['markCount']==1
assert after['probe']['dummy']['hits']==0 and after['probe']['dummy']['damage']==0
out=Image.new('RGB',(1280,1536),(18,20,22));draw=ImageDraw.Draw(out)
for row,light in enumerate(['noon','overcast','dusk','night']):
    a=next(r for r in before['records'] if r['light']==light)
    b=next(r for r in after['records'] if r['light']==light)
    assert max(abs(a['camera'][k]-b['camera'][k]) for k in a['camera'])<1e-6
    assert a['actualLight']==b['actualLight']
    for col,(version,r) in enumerate([('before-lamp',a),('after-lamp',b)]):
        im=Image.open(root/'scorch'/version/r['file']).convert('RGB')
        assert max(v[1] for v in im.getextrema())>30
        out.paste(im.resize((640,360)),(col*640,row*384+24))
        draw.text((col*640+8,row*384+6),version.replace('-lamp','')+' / native flame contact / '+light+(' + task lamp' if light=='night' else ''),fill='white')
out.save(root/'dummy-scorch-four-lights.jpg',quality=94)
print('PASS same camera/light incl night lamp; flat mark1->0, curved mark0->1, hits0/damage0')
