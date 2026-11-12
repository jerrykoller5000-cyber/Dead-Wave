from pathlib import Path
from PIL import Image, ImageDraw
import sys
root=Path(__file__).parent/'final-visible-2026-11-12'
guns=sys.argv[1:] or ['pistol','revolver','uzi','aa12']
lights=['noon','overcast','dusk','night']
groups={'four-lights':['aimed','hip','rack','standard-open'],'held-sides':['held-left-open','held-right-open'],'reloads':['reload-0.25','reload-0.55']}
for gun in guns:
 for name,views in groups.items():
  w,h=400,250
  sheet=Image.new('RGB',(8*w,len(views)*h),'#1b2027');draw=ImageDraw.Draw(sheet)
  for row,view in enumerate(views):
   for col,light in enumerate(lights):
    for n,phase in enumerate(['before','after']):
     im=Image.open(root/gun/phase/(view+'-'+light+'.png')).convert('RGB').resize((w,225))
     x=(col*2+n)*w;y=row*h
     sheet.paste(im,(x,y+25));draw.text((x+5,y+6),f'{gun} {view} {phase} | {light}',fill='white')
  dest=root/gun/(name+'.jpg');sheet.save(dest,quality=95);print(dest)
