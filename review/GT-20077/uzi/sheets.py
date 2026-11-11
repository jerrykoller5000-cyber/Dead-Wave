from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parent
lights = ('noon', 'overcast', 'dusk', 'night')


def compare(name, prefix, poses, size):
    w,h = size
    sheet = Image.new('RGB',(4*(w+8)+8,26+2*len(poses)*(h+22)),'#20242b')
    draw = ImageDraw.Draw(sheet)
    for i,light in enumerate(lights):
        draw.text((8+i*(w+8),6),light.title(),fill='white')
    y = 26
    for pose,crop in poses:
        for phase in ('before','after'):
            draw.text((8,y),f'{pose} / {phase}',fill='#d6dee7')
            for i,light in enumerate(lights):
                with Image.open(root / (prefix+phase) / f'{pose}-{light}.jpg') as im:
                    tile = im.crop(crop)
                    tile.thumbnail(size,Image.Resampling.LANCZOS)
                sheet.paste(tile,(8+i*(w+8),y+15))
            y += h+22
    sheet.save(root/name,quality=95)


compare('eye-pairs.jpg','',[('hip',(735,300,1120,685)),('aimed',(479,279,799,599)),
                            ('reload',(692,209,1147,664))],(235,235))
compare('model-pairs.jpg','model-',[('side',(152,0,825,524)),('rear3',(356,148,659,456))],(312,211))
