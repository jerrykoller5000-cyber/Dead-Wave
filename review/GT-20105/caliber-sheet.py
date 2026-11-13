import json
from pathlib import Path
from PIL import Image,ImageDraw
root=Path(__file__).resolve().parent;data=json.loads((root/'impacts-caliber/records.json').read_text(encoding='utf-8'))
for distance in (5,10):
    out=Image.new('RGB',(1920,2352),(18,20,22));draw=ImageDraw.Draw(out)
    for row,light in enumerate(['noon','overcast','dusk','night']):
        for col,version in enumerate(['before','after']):
            r=next(r for r in data['records'] if r['version']==version and r['distance']==distance and r['light']==light)
            im=Image.open(root/'impacts-caliber'/r['file']).convert('RGB');assert max(v[1] for v in im.getextrema())>30
            out.paste(im.resize((960,540)),(col*960,row*588+48))
            draw.text((col*960+8,row*588+6),f'{version} / {distance} m / FOV 60 / {light}'+(' + existing task lamp' if light=='night' else ''),fill='white')
            draw.text((col*960+8,row*588+24),'Rows: handgun, rifle, slug. Small cluster right: 8 buck pellets. Native projectile metadata.',fill='white')
    out.save(root/f'impacts-caliber-{distance}m-four-lights.jpg',quality=94)
print('PASS 5m and10m caliber four-light sheets, no black captures')
