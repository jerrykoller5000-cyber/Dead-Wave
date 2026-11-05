"""Pair the locked AG-225 baseline with GP-20021 first-person captures."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / 'qa/2026-11-03-AG-225/stills'
OUT = Path(__file__).resolve().parent
GUNS = ('launcher', 'aa12', 'shotgun', 'flamer')
SIZE = (640, 360)
FONT = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 18)

for light in ('noon', 'dusk'):
    sheet = Image.new('RGB', (SIZE[0] * 2, (SIZE[1] + 28) * len(GUNS)), '#171a1e')
    draw = ImageDraw.Draw(sheet)
    for row, gun in enumerate(GUNS):
        for col, (label, path) in enumerate((
            ('Before · AG-225', BASE / f'{gun}-hip-{light}.jpg'),
            ('After · GP-20021', OUT / f'{gun}-{light}.jpg'),
        )):
            image = Image.open(path).convert('RGB').crop((960, 540, 1920, 1080)).resize(SIZE, Image.Resampling.LANCZOS)
            x, y = col * SIZE[0], row * (SIZE[1] + 28)
            sheet.paste(image, (x, y + 28))
            draw.text((x + 8, y + 4), f'{gun.upper()}  {label}  {light}', fill='#f1e8c6', font=FONT)
    path = OUT / f'before-after-{light}.jpg'
    sheet.save(path, quality=92)
    print(path)
