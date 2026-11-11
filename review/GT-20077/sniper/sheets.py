from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parent
lights = ('noon', 'overcast', 'dusk', 'night')


def compare(name, columns, views, width, height):
    margin, header = 8, 25
    sheet = Image.new('RGB', (margin + len(columns)*(width+margin),
                               header + 2*len(views)*(height+24)), '#22262c')
    draw = ImageDraw.Draw(sheet)
    for n, column in enumerate(columns):
        draw.text((margin+n*(width+margin), 6), column.title(), fill='white')
    y = header
    for label, directory, filename, region in views:
        for phase in ('before', 'after'):
            draw.text((margin,y), label+' / '+phase, fill='#d8dfe8')
            for n, column in enumerate(columns):
                with Image.open(root / (directory+phase) / (filename.format(column)+'.jpg')) as src:
                    tile = src.crop(region) if region else src.copy()
                tile.thumbnail((width,height), Image.Resampling.LANCZOS)
                sheet.paste(tile, (margin+n*(width+margin),y+16))
            y += height+24
    sheet.save(root/name, quality=94)


compare('eye-pairs.jpg', lights, [
    ('Hip', '', 'hip-{}', (700,405,1270,720)),
    ('Reload', '', 'reload-{}', (665,300,1270,720))], 290,205)
compare('scope-pairs.jpg', ('side','front','rear'), [
    ('Issued optic', '', 'scope-{}', (176,119,1105,609))], 340,216)
compare('model-pairs.jpg', lights, [('Side','model-','side-{}',None),
                                     ('Rear quarter','model-','rear3-{}',None)], 290,163)
