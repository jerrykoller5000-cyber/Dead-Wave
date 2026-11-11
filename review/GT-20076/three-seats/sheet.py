from pathlib import Path
from PIL import Image, ImageDraw

folder=Path(__file__).resolve().parent
lights=('noon','overcast','dusk','night')
sheet=Image.new('RGB',(4*255+10,4*194+34),'#20242b')
ink=ImageDraw.Draw(sheet)
for col,light in enumerate(lights):
    ink.text((8+col*255,8),light.capitalize(),fill='white')
rows=[('m4','GW-4','before'),('m4','GW-4','after'),('revolver','Revolver','before'),('revolver','Revolver','after')]
for row,(id,label,phase) in enumerate(rows):
    y=30+row*194
    ink.text((8,y),label+'  /  '+phase,fill='#d8dfe6')
    for col,light in enumerate(lights):
        with Image.open(folder/phase/(id+'-angle-'+light+'.jpg')) as src:
            crop=(286,120,635,356) if id=='m4' else (296,192,645,428)
            tile=src.crop(crop)
            tile.thumbnail((248,173),Image.Resampling.LANCZOS)
        sheet.paste(tile,(8+col*255,y+17))
sheet.save(folder/'four-light-pairs.jpg',quality=95)
