import os
from PIL import Image, ImageDraw, ImageFont

DIR = r'C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-31-AG-163'
OUT = os.path.join(DIR, 'sheet.jpg')

PAIRS = [
    ('FOB Day Overview', 'fob-day-old.png', 'fob-day-new.png'),
    ('FOB Night Overview', 'fob-night-old.png', 'fob-night-new.png'),
    ('Guard Post', 'guard-post-old.png', 'guard-post-new.png'),
    ('Sign with Plate', 'sign-plate-old.png', 'sign-plate-new.png'),
    ('HESCO SW1', 'hesco-sw1-old.png', 'hesco-sw1-new.png'),
    ('HESCO SW2', 'hesco-sw2-old.png', 'hesco-sw2-new.png'),
    ('HESCO W', 'hesco-w-old.png', 'hesco-w-new.png'),
    ('HESCO NW', 'hesco-nw-old.png', 'hesco-nw-new.png'),
    ('HESCO NE Breach', 'hesco-ne-breach-old.png', 'hesco-ne-breach-new.png'),
    ('HESCO E', 'hesco-e-old.png', 'hesco-e-new.png'),
    ('Fuel Drums', 'fuel-drums-old.png', 'fuel-drums-new.png'),
    ('Armory Crates', 'armory-crates-old.png', 'armory-crates-new.png'),
    ('Toppled Floodlight', 'toppled-floodlight-old.png', 'toppled-floodlight-new.png'),
    ('Burned Tent Frame', 'burned-tent-old.png', 'burned-tent-new.png'),
    ('Debris Flight', 'debris-flight-old.png', 'debris-flight-new.png'),
    ('Debris Landing', 'debris-landing-old.png', 'debris-landing-new.png'),
    ('Dust Motes', 'dust-old.png', 'dust-new.png'),
    ('Splash Motes', 'splash-old.png', 'splash-new.png'),
    ('Ember Motes', 'embers-old.png', 'embers-new.png'),
    ('Batch Rebuild', 'hesco-broken-blast.png', 'fob-fresh-match.png')
]

TILE_W, TILE_H = 480, 270
HEADER_H = 32
ROW_H = TILE_H + HEADER_H
COLS = 2
WIDTH = COLS * TILE_W + 40
ROWS = len(PAIRS)
HEIGHT = ROWS * ROW_H + 40

canvas = Image.new('RGB', (WIDTH, HEIGHT), (24, 26, 30))
draw = ImageDraw.Draw(canvas)

try:
    font = ImageFont.truetype('arial.ttf', 16)
    font_bold = ImageFont.truetype('arialbd.ttf', 16)
except Exception:
    font = ImageFont.load_default()
    font_bold = font

y_offset = 20
for title, f_old, f_new in PAIRS:
    p_old = os.path.join(DIR, f_old)
    p_new = os.path.join(DIR, f_new)

    label_l = f"{title} (Old 82d75118)" if 'broken' not in f_old else "Blown HESCO (Batch Rebuilt)"
    label_r = f"{title} (New HEAD CL-280)" if 'fresh' not in f_new else "Fresh Match (Batch Whole)"

    draw.text((20, y_offset + 6), label_l, fill=(220, 220, 220), font=font_bold)
    draw.text((20 + TILE_W + 10, y_offset + 6), label_r, fill=(220, 220, 220), font=font_bold)

    for col_idx, p in enumerate([p_old, p_new]):
        x = 20 + col_idx * (TILE_W + 10)
        y = y_offset + HEADER_H
        if os.path.exists(p):
            with Image.open(p) as img:
                thumb = img.convert('RGB').resize((TILE_W, TILE_H), Image.Resampling.LANCZOS)
                canvas.paste(thumb, (x, y))
        else:
            draw.rectangle([x, y, x + TILE_W, y + TILE_H], fill=(40, 40, 40))
            draw.text((x + 20, y + 20), "Missing", fill=(255, 100, 100), font=font)

    y_offset += ROW_H

canvas.save(OUT, quality=88)
print(f"Saved contact sheet to {OUT}")
