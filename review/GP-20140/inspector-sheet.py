from PIL import Image,ImageDraw
from pathlib import Path
import sys
base=Path('review/GP-20140');stage=sys.argv[1];src=base/stage
files=[f'{beat}-{view}-{light}.png' for beat in ['draw','flick'] for view in ['hands','three'] for light in ['noon','overcast','dusk','night']]
w,h=480,290;sheet=Image.new('RGB',(w*4,h*4),'#202020');draw=ImageDraw.Draw(sheet)
for i,file in enumerate(files):
 im=Image.open(src/file).convert('RGB');im.thumbnail((w,h-20));x=(i%4)*w;y=(i//4)*h;sheet.paste(im,(x,y+20));draw.text((x+6,y+3),file,fill='white')
sheet.save(base/(stage+'-sheet.png'))
