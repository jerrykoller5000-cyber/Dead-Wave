import json
from pathlib import Path
from PIL import Image,ImageDraw
root=Path(__file__).resolve().parent;data=json.loads((root/'flash-paired/records.json').read_text(encoding='utf-8'))
for gun,view in [('pistol','hip'),('pistol','held-right'),('m4','hip')]:
    out=Image.new('RGB',(1920,2352),(18,20,22));draw=ImageDraw.Draw(out)
    for row,light in enumerate(['noon','overcast','dusk','night']):
        a=next(r for r in data['records'] if r['gun']==gun and r['view']==view and r['light']==light and r['version']=='before')
        b=next(r for r in data['records'] if r['gun']==gun and r['view']==view and r['light']==light and r['version']=='after')
        assert a['camera']==b['camera'] and a['actualLight']==b['actualLight']
        assert a['opacity']==b['opacity'] and a['flashT']==b['flashT'] and a['shots']==b['shots']
        for col,r in enumerate((a,b)):
            im=Image.open(root/'flash-paired'/r['file']).convert('RGB');assert max(v[1] for v in im.getextrema())>30
            out.paste(im.resize((960,540)),(col*960,row*588+48))
            draw.text((col*960+8,row*588+6),r['version']+' / '+gun+' / '+view+' / '+light,fill='white')
            draw.text((col*960+8,row*588+24),'Same native fired pose and camera; legacy sphere vs production gas plume; native fade retained.',fill='white')
    out.save(root/f'flash-{gun}-{view}-four-lights.jpg',quality=94)
print('PASS 3four-light sheets,12exact camera/light/opacity/shot-phase pairs')
