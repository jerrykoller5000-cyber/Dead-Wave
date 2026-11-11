from pathlib import Path
from tempfile import NamedTemporaryFile
from PIL import Image, ImageDraw

folder = Path(__file__).resolve().parent
lights = ('noon', 'overcast', 'dusk', 'night')

def sheet(name, views, crop, width, height):
    step = height + 24
    output = Image.new('RGB', (4 * (width + 8) + 8, 28 + 2 * len(views) * step), '#20242b')
    labels = ImageDraw.Draw(output)
    for column, light in enumerate(lights):
        labels.text((8 + column * (width + 8), 6), light.title(), fill='white')
    y = 24
    for view, description in views:
        for phase in ('before', 'after'):
            labels.text((8, y), f'{description} / {phase}', fill='#d6dee7')
            for column, light in enumerate(lights):
                with Image.open(folder / phase / f'{view}-{light}.jpg') as frame:
                    tile = frame.crop(crop)
                    tile.thumbnail((width, height), Image.Resampling.LANCZOS)
                    output.paste(tile, (8 + column * (width + 8), y + 16))
            y += step
    with NamedTemporaryFile(dir=folder, suffix='.jpg', delete=False) as target:
        output.save(target, format='JPEG', quality=95)
    Path(target.name).replace(folder / name)

sheet('round-case-pairs.jpg', [('props', 'Incoming prop and ejected case')], (175, 70, 990, 575), 330, 215)
sheet('reload-pairs.jpg', [('open', 'Three remaining'), ('palm', 'Incoming prop at the eye')],
      (400, 210, 1148, 648), 300, 182)
