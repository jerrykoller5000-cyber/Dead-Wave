from pathlib import Path
from PIL import Image,ImageDraw
base=Path('review/GP-20140')
for view in ['detail','gameplay']:
 for light in ['noon','overcast','dusk','night']:
  sheet=Image.new('RGB',(2000,500),'#202020');d=ImageDraw.Draw(sheet)
  for col,t in enumerate([1,2.5,3.5,5.25,7.5]):
   for row,stage in enumerate(['before-final','after-final']):
    file=f'{view}-{light}-{t}.png';im=Image.open(base/stage/file).convert('RGB');im.thumbnail((400,225));x=col*400;y=row*250;sheet.paste(im,(x,y+22));d.text((x+4,y+4),f'{stage} | {t}s | {light} | {view}',fill='white')
  sheet.save(base/f'proof-{view}-{light}.png')
