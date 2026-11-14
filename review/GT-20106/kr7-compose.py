from PIL import Image,ImageDraw,ImageFont
from pathlib import Path
root=Path(__file__).resolve().parent
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',21)
small=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',17)
groups={
 'fore-end':[('muzzle',(460,240,960,490)),('rear',(360,200,1050,570))],
 'eye-sights':[('hip',(700,330,1280,720)),('aimed',(440,290,900,720))],
 'magazines':[('guard-standard',(450,240,900,610)),('guard-extended',(450,240,900,610))],
 'underside':[('below-extended',(300,160,1050,640))],

}
for group,views in groups.items():
 w=520;h=340
 sheet=Image.new('RGB',(w*2*len(views),90+4*(h+30)),(20,23,27));d=ImageDraw.Draw(sheet)
 d.text((12,8),'GT-20106 KR-7 / '+group+' / BEFORE left, AFTER right in each view pair',font=font,fill='white')
 d.text((12,36),'Native eye views; inspection rotation labelled in records. Recorded camera, light and exposure matched.',font=small,fill='white')
 for row,light in enumerate(['noon','overcast','dusk','night']):
  y=70+row*(h+30)
  for col,(view,crop) in enumerate(views):
   d.text((col*w*2+8,y),view+' / '+light,font=small,fill='white')
   for side,phase in enumerate(['before','after']):
    im=Image.open(root/'kr7'/phase/(view+'-'+light+'.png')).convert('RGB').crop(crop)
    im.thumbnail((w,h))
    tile=Image.new('RGB',(w,h),(12,15,18));tile.paste(im,((w-im.width)//2,(h-im.height)//2))
    sheet.paste(tile,(col*w*2+side*w,y+25))
 sheet.save(root/('kr7-'+group+'-four-lights.jpg'),quality=95)
sheet=Image.new('RGB',(1280,1650),(20,23,27));d=ImageDraw.Draw(sheet)
d.text((12,10),'GT-20106 KR-7 / CURRENT reload context only / actual V.info.reloadU asserted',font=font,fill='white')
d.text((12,42),'Old timer-only reload comparison rejected. No before/after motion or full reload clearance claim.',font=small,fill='white')
for row,light in enumerate(['noon','overcast','dusk','night']):
 for col,view in enumerate(['reload-carry','reload-seat']):
  y=80+row*390
  im=Image.open(root/'kr7'/'after'/(view+'-'+light+'.png')).convert('RGB');im.thumbnail((640,360))
  sheet.paste(im,(col*640,y+20));d.text((col*640+8,y),view+' / '+light,font=small,fill='white')
sheet.save(root/'kr7-reload-current-four-lights.jpg',quality=95)
print('Four KR7 comparison sheets plus current-only reload context composed; old timer-only comparison retained/rejected.')
