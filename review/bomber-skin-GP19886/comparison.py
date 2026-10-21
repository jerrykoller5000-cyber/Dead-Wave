from PIL import Image,ImageDraw,ImageFont
from pathlib import Path
p=Path('review/bomber-skin-GP19886')
out=Image.new('RGB',(1600,680),'#20272a')
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',26)
d=ImageDraw.Draw(out)
for i,label in enumerate(['before','after']):
    im=Image.open(p/(label+'-front.png')).convert('RGB').resize((800,640))
    out.paste(im,(i*800,40));d.text((i*800+24,6),label.capitalize(),fill='white',font=font)
out.save(p/'bomber-skin-comparison.png')
