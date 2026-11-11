from pathlib import Path
from PIL import Image, ImageDraw


root = Path(__file__).resolve().parent
lights = ('noon', 'overcast', 'dusk', 'night')
sheet = Image.new('RGB', (1136, 452), '#20242b')
draw = ImageDraw.Draw(sheet)
for col, light in enumerate(lights):
    x = 8 + 282 * col
    draw.text((x, 6), light.title(), fill='white')
    for row, (name, label) in enumerate((('original-props', 'Original shared case'), ('props', 'Revised pistol / Wasp'))):
        y = 25 + row * 212
        draw.text((x, y), label, fill='#d6dee7')
        with Image.open(root / 'after' / f'{name}-{light}.jpg') as image:
            # The specimen stage has sky in both upper corners and both cases
            # cover the middle of the frame. Reject a stale cut or a faded prop.
            for u in (160, 1100):
                red, green, blue = image.getpixel((u, 115))
                assert blue > red + 40 and blue > green + 15, (name, light, 'camera')
            for u in (450, 820):
                red, green, blue = image.getpixel((u, 430))
                assert blue < red + 15, (name, light, 'missing sampled case')
            tile = image.crop((290, 96, 964, 590)).resize((265, 194), Image.Resampling.LANCZOS)
        sheet.paste(tile, (x, y + 15))
sheet.save(root / 'ejected-cases.jpg', quality=94)
print('PASS eight framed pairs, both props visible')
