from pathlib import Path
import sys
from PIL import Image, ImageDraw

gun = sys.argv[1]
folder = Path(__file__).resolve().parent / gun
states = ('factory', 'camo', 'restored')
width, height = 360, 205
canvas = Image.new('RGB', (3 * width + 32, 4 * (height + 23) + 32), '#20242b')
draw = ImageDraw.Draw(canvas)
for i, label in enumerate(('Factory', 'Camo', 'Factory restored')):
    draw.text((8 + i * (width + 8), 6), label, fill='white')
for row, (angle, phase) in enumerate((('side','before'),('side','after'),('eye','before'),('eye','after'))):
    y = 25 + row * (height + 23)
    draw.text((8, y), phase.capitalize() + ' / ' + angle, fill='#e6edf4')
    for col, state in enumerate(states):
        with Image.open(folder / phase / (angle + '-' + state + '.jpg')) as source:
            if angle == 'side':
                crop = (260, 134, 940, 516)
            else:
                crop = (550, 305, 1010, 564)
            tile = source.crop(crop).resize((width, height), Image.Resampling.LANCZOS)
            canvas.paste(tile, (8 + col * (width + 8), y + 15))
canvas.save(folder / 'finish-pairs.jpg', quality=94)
