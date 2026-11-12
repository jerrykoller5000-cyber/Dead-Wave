from pathlib import Path
from PIL import Image, ImageDraw
import sys
root=Path(__file__).parent/'final-visible-2026-11-12'
gun=sys.argv[1]
phases=sys.argv[2:] or ['before','after']
views=['aimed','hip','rack','standard-open','held-left-open','held-right-open']
cellw,cellh=480,295
out=Image.new('RGB',(len(views)*len(phases)*cellw,4*cellh),'#1b2027')
draw=ImageDraw.Draw(out)
for row,light in enumerate(('noon','overcast','dusk','night')):
    for view,pose in enumerate(views):
        for col,phase in enumerate(phases):
            im=Image.open(root/gun/phase/(pose+'-'+light+'.png')).convert('RGB').resize((480,270))
            x=(view*len(phases)+col)*cellw;y=row*cellh
            out.paste(im,(x,y+25));draw.text((x+6,y+6),f'{pose} {phase} | {light}',fill='white')
name='four-lights.jpg' if len(phases)==2 else phases[0]+'-four-lights.jpg'
out.save(root/gun/name,quality=94)
print(root/gun/name)
