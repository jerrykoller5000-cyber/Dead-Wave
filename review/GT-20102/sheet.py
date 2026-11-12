from pathlib import Path
from PIL import Image,ImageDraw
r=Path(__file__).parent
out=Image.new('RGB',(1728,1252),'#1b2027');d=ImageDraw.Draw(out)
for row,light in enumerate(['noon','overcast','dusk','night']):
 for col,phase in enumerate(['before','after']):
  im=Image.open(r/phase/('aimed-'+light+'.png')).convert('RGB');x=col*864;y=row*313
  out.paste(im.resize((480,270)),(x,y+25))
  out.paste(im.crop((592,320,688,392)).resize((384,288),Image.Resampling.NEAREST),(x+480,y+25))
  d.text((x+5,y+6),phase+' aimed | '+light+' ; front post crop x4',fill='white')
out.save(r/'four-lights.jpg',quality=95)
print(r/'four-lights.jpg')
