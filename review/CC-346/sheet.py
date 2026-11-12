from pathlib import Path
from PIL import Image, ImageDraw
import sys

gun=sys.argv[1]
root=Path(__file__).parent/gun
sheet=Image.new('RGB',(1920,4*210),'#1c2128')
draw=ImageDraw.Draw(sheet)
for row,light in enumerate(('noon','overcast','dusk','night')):
    for view,pose in enumerate(('aimed','hip','rack')):
        for col,phase in enumerate(('before','after')):
            image=Image.open(root/phase/(pose+'-'+light+'.png')).convert('RGB')
            image=image.resize((320,180))
            x=(view*2+col)*320
            y=row*210
            sheet.paste(image,(x,y+25))
            draw.text((x+5,y+6),f'{pose} {phase} | {light}',fill='white')
sheet.save(root/'four-lights.jpg',quality=94)
print(root/'four-lights.jpg')
