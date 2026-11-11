from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parent
lights = ('noon','overcast','dusk','night')


def compare(output, prefix, rows, columns, max_size):
    w, h = max_size
    out = Image.new('RGB', (8+len(columns)*(w+8), 25+2*len(rows)*(h+24)), '#20242b')
    draw = ImageDraw.Draw(out)
    for col, name in enumerate(columns):
        draw.text((8+col*(w+8),5), name.title(), fill='white')
    y = 25
    for label, pattern, crop in rows:
        for phase in ('before','after'):
            draw.text((8,y), f'{label} / {phase}', fill='#d6dee7')
            for col, name in enumerate(columns):
                with Image.open(root / (prefix+phase) / (pattern.format(name)+'.jpg')) as im:
                    tile = im.crop(crop) if crop else im.copy()
                    tile.thumbnail((w,h), Image.Resampling.LANCZOS)
                out.paste(tile,(8+col*(w+8),y+16))
            y += h+24
    out.save(root/output,quality=95)


compare('eye-pairs.jpg','',[
    ('Hip','hip-{}',(740,344,1280,705)), ('Aimed cover','aimed-{}',(510,338,774,547)),
    ('Reload','reload-{}',(675,175,1270,650))],lights,(270,210))
compare('model-pairs.jpg','model-',[('Side','side-{}',None),('Rear quarter','rear3-{}',None)],
        lights,(300,169))
compare('fittings-pairs.jpg','',[('Armory fittings','fitted-{}',None)],
        ('standard','extended','light'),(355,200))
