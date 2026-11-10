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
                crop = (215, 105, 1015, 555) if gun == "m4" else (260, 134, 940, 516)
            else:
                crop = (590, 290, 1152, 607) if gun == "m4" else (550, 305, 1010, 564)
            tile = source.crop(crop).resize((width, height), Image.Resampling.LANCZOS)
            canvas.paste(tile, (8 + col * (width + 8), y + 15))
canvas.save(folder / 'finish-pairs.jpg', quality=94)
if gun == 'm4':
    optics = ('rmr', 'prism', 'acog')
    panel = Image.new('RGB', (3*360+32, 225), '#20242b')
    labels = ImageDraw.Draw(panel)
    for column, kind in enumerate(optics):
        left = 8+column*368
        labels.text((left, 6), kind.upper(), fill='white')
        with Image.open(folder / 'after' / ('optic-'+kind+'.jpg')) as source:
            source.thumbnail((360, 202), Image.Resampling.LANCZOS)
            panel.paste(source, (left, 20))
    panel.save(folder / 'optic-finishes.jpg', quality=94)

    if (folder / 'riser' / 'optic-rmr.jpg').exists():
        pair = Image.new('RGB', (928, 286), '#20242b')
        labels = ImageDraw.Draw(pair)
        for column, (phase, title) in enumerate((('after', 'Factory-black riser'), ('riser', 'Riser with M81 finish'))):
            x = 8 + column * 460
            labels.text((x, 6), title, fill='white')
            with Image.open(folder / phase / 'optic-rmr.jpg') as shot:
                shot.thumbnail((452, 255), Image.Resampling.LANCZOS)
                pair.paste(shot, (x, 23))
        pair.save(folder / 'riser-pair.jpg', quality=94)

lights = ('noon', 'overcast', 'dusk', 'night')
if (folder / 'lights' / 'camo-night.jpg').exists():
    canvas = Image.new('RGB', (4*320+40, 2*195+28), '#20242b')
    draw = ImageDraw.Draw(canvas)
    for col, light in enumerate(lights):
        left = 8+col*328
        draw.text((left, 6), light, fill='white')
        for row, finish in enumerate(('factory', 'camo')):
            with Image.open(folder / 'lights' / (finish+'-'+light+'.jpg')) as source:
                crop = (590,290,1152,607) if gun == 'm4' else (550,305,1010,564)
                tile = source.crop(crop).resize((320,180),Image.Resampling.LANCZOS)
                y = 20+row*197
                draw.text((left,y),finish,fill='white')
                canvas.paste(tile,(left,y+14))
    canvas.save(folder / 'eye-four-lights.jpg',quality=94)
