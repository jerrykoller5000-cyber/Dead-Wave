import json, math
from pathlib import Path
from PIL import Image, ImageDraw
root=Path(__file__).resolve().parent
a=json.loads((root/'impacts/before/records.json').read_text(encoding='utf-8'))
b=json.loads((root/'impacts/after/records.json').read_text(encoding='utf-8'))
out=Image.new('RGB',(1280,4*384),(18,20,22));draw=ImageDraw.Draw(out)
proof=[]
for row,key in enumerate(['noon','overcast','dusk','night']):
    aa=next(r for r in a['records'] if r['light']==key)
    bb=next(r for r in b['records'] if r['light']==key)
    err=max(abs(aa['camera'][k]-bb['camera'][k]) for k in aa['camera'])
    assert err<1e-6,(key,err)
    proof.append({'light':key,'cameraMaxDelta':err,'beforeMarks':aa['marks'],'afterMarks':bb['marks']})
    for col,(phase,r) in enumerate([('before',aa),('after',bb)]):
        im=Image.open(root/'impacts'/phase/r['file']).convert('RGB')
        assert im.getextrema()[0][1]>20,'black capture'
        out.paste(im.resize((640,360)),(col*640,row*384+24))
        draw.text((col*640+8,row*384+6),phase+' / eight live projectile impacts / '+key,fill='white')
out.save(root/'impacts-four-lights.jpg',quality=94)
(root/'impact-photo-proof.json').write_text(json.dumps(proof,indent=2),encoding='utf-8')
print('PASS four paired actual cameras;8before/8after marks;no black frames; impacts-four-lights.jpg')
