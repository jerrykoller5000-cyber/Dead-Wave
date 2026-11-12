from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(r'C:/Users/Zero/Desktop/Tiny Trek/review/GP-20111')
ROWS = [
    ('armory-bench', 'Armory bench'),
    ('armory-preview-turned', 'Rotated gun preview'),
    ('armory-swatches', 'Finish swatches'),
    ('cif-card', 'CIF marine turntable'),
]
WIDTH, HEIGHT, PAD, LABEL = 760, 428, 18, 36
sheet = Image.new('RGB', (PAD + 2 * (WIDTH + PAD), PAD + len(ROWS) * (HEIGHT + LABEL + PAD)), (18, 21, 24))
draw = ImageDraw.Draw(sheet)
try:
    font = ImageFont.truetype('C:/Windows/Fonts/consolab.ttf', 16)
except OSError:
    font = ImageFont.load_default()
for row, (slug, title) in enumerate(ROWS):
    y = PAD + row * (HEIGHT + LABEL + PAD)
    for col, phase in enumerate(('before', 'final')):
        x = PAD + col * (WIDTH + PAD)
        draw.text((x, y + 7), f'{"BEFORE" if col == 0 else "AFTER"} · {title}', font=font, fill=(188, 218, 199))
        image = Image.open(ROOT / f'{phase}-{slug}.png').convert('RGB')
        image.thumbnail((WIDTH, HEIGHT), Image.Resampling.LANCZOS)
        sheet.paste(image, (x, y + LABEL))
        draw.rectangle((x, y + LABEL, x + WIDTH - 1, y + LABEL + HEIGHT - 1), outline=(63, 70, 77))
target = ROOT / 'armory-four-row-before-after.jpg'
sheet.save(target, quality=92)
print(target)
