from pathlib import Path
from PIL import Image, ImageDraw

folder = Path(__file__).resolve().parent
lights = ('noon', 'overcast', 'dusk', 'night')


def sheet(name, views, crop, size):
    w, h = size
    out = Image.new('RGB', (4*(w+8)+8, 25+2*len(views)*(h+24)), '#20242b')
    labels = ImageDraw.Draw(out)
    for column, light in enumerate(lights):
        labels.text((8+column*(w+8), 5), light.title(), fill='white')
    y = 24
    for view, description in views:
        for phase in ('before', 'after'):
            labels.text((8, y), description+' / '+phase, fill='#d6dee7')
            for column, light in enumerate(lights):
                with Image.open(folder / phase / f'{view}-{light}.jpg') as image:
                    tile = image.crop(crop)
                    tile.thumbnail(size, Image.Resampling.LANCZOS)
                    out.paste(tile, (8+column*(w+8), y+16))
            y += h+24
    out.save(folder / name, quality=95)


sheet('round-case-pairs.jpg', [('props','Incoming, retained, spent')], (240, 65, 1064, 624), (329, 224))
sheet('reload-pairs.jpg', [('empty','Three spent'), ('palm','Two retained'), ('loader','Five incoming')],
      (600, 303, 943, 568), (284, 220))
