from pathlib import Path
from PIL import Image, ImageDraw
import sys

catalog = Path(__file__).resolve().parents[1]
root = catalog / sys.argv[1]
lights = ('noon', 'overcast', 'dusk', 'night')


def compare(filename, columns, styles, size):
    w,h = size
    sheet = Image.new('RGB', (8+len(columns)*(w+8),25+2*len(styles)*(h+23)), '#22272d')
    draw = ImageDraw.Draw(sheet)
    for i,col in enumerate(columns):
        draw.text((8+i*(w+8),5),col.title(),fill='white')
    y = 25
    for label,prefix,pattern,crop in styles:
        for phase in ('before','after'):
            draw.text((8,y),label+' / '+phase,fill='#dce5ec')
            for i,col in enumerate(columns):
                with Image.open(root/(prefix+phase)/(pattern.format(col)+'.jpg')) as im:
                    tile = im.crop(crop) if crop else im.copy()
                tile.thumbnail((w,h),Image.Resampling.LANCZOS)
                sheet.paste(tile,(8+i*(w+8),y+16))
            y += h+23
    sheet.save(root/filename,quality=94)


compare('eye-pairs.jpg',lights,[
    ('Hip','','hip-{}',(370,380,1260,720)),('Aim','','aimed-{}',(280,310,1010,720)),
    ('Reload','','reload-{}',(390,190,1270,720))],(280,166))
compare('model-pairs.jpg',lights,[('Side','model-','side-{}',None),('Rear quarter','model-','rear3-{}',None)],(290,164))
compare('fittings-pairs.jpg',('default','rmr','drum'),[('Fittings','','fitted-{}',(185,100,1110,695))],(345,222))
