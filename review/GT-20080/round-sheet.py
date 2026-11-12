from pathlib import Path
from PIL import Image, ImageDraw
root=Path(__file__).parent/'pistol-live'
sheet=Image.new('RGB',(1440,4*295),'#1b2027')
draw=ImageDraw.Draw(sheet)
for row,light in enumerate(('noon','overcast','dusk','night')):
    for col,(title,name) in enumerate((('Before top round','magazine-before-'),('Live 9 mm round','magazine-after-'),('Native reload 35%','reload-0.35-'))):
        image=Image.open(root/(name+light+'.png')).convert('RGB').resize((480,270))
        x,y=col*480,row*295
        sheet.paste(image,(x,y+25))
        draw.text((x+6,y+6),title+' | '+light,fill='white')
sheet.save(root/'before-after-four-lights.jpg',quality=94)
print(root/'before-after-four-lights.jpg')
