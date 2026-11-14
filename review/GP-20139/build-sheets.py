from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
root=Path('review/GP-20139');font=ImageFont.load_default(size=19)
for view in ['jerryA','jerryB']:
 sheet=Image.new('RGB',(1280,1600),'#14191d');d=ImageDraw.Draw(sheet);d.text((12,8),f'GP-20139 {view}: BEFORE | AFTER (overview; raw1280x720 frames retained)',font=font,fill='white')
 for i,light in enumerate(['noon','overcast','dusk','night']):
  y=40+i*390;d.text((12,y),light+' | matched camera and light; paint height unchanged',font=font,fill='#e9c85a')
  for j,stage in enumerate(['before2','after']):
   image=Image.open(root/stage/f'{view}-{light}-move-1.png').convert('RGB').resize((640,360),Image.Resampling.LANCZOS);sheet.paste(image,(j*640,y+28))
 sheet.save(root/f'{view}-four-lights-before-after.png')