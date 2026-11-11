import os
from PIL import Image, ImageDraw, ImageFont

ROOT = 'C:/Users/Zero/Desktop/Tiny Trek'
SHOTS_DIR = os.path.join(ROOT, 'review/CE-4/shots')
OUT_REV = os.path.join(ROOT, 'review/CE-4/sheet-ce4-hq-ladder.jpg')
OUT_QA = os.path.join(ROOT, 'qa/2026-11-11-CE-4-ladder/sheet-ce4-hq-ladder.jpg')

# Sheet layout:
# Row 1: 1P Eye Climbing Mid across 4 lights (Noon, Overcast, Dusk, Night)
# Row 2: 3P Clean Side View Climbing Mid across 4 lights (Noon, Overcast, Dusk, Night)
# Row 3: Progression: Eye Low, Eye High, Side Low, Side High, Full Overview

LIGHTS = ['noon', 'overcast', 'dusk', 'night']

def load_img(fname):
    p = os.path.join(SHOTS_DIR, fname)
    if os.path.exists(p):
        return Image.open(p)
    return Image.new('RGB', (1280, 720), (30, 30, 30))

try:
    font = ImageFont.truetype('arial.ttf', 20)
    font_title = ImageFont.truetype('arial.ttf', 24)
except Exception:
    font = font_title = ImageFont.load_default()

thumb_w, thumb_h = 580, 326
pad = 14
header_h = 60
label_h = 28

sheet_w = 4 * thumb_w + 5 * pad
sheet_h = header_h + 3 * (thumb_h + label_h + pad) + pad

sheet = Image.new('RGB', (sheet_w, sheet_h), (16, 18, 22))
draw = ImageDraw.Draw(sheet)

title = "CE-4 Part 3: HQ Ladder — 1P Eye & 3P Clean Side View Across 4 Lights (RTX 5080 WebGPU)"
draw.text((pad, 16), title, fill=(240, 240, 245), font=font_title)

# Row 1: 1P Eye
y1 = header_h + pad
for i, lk in enumerate(LIGHTS):
    img = load_img(f'ladder-eye-mid-{lk}.jpg').resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
    x = pad + i * (thumb_w + pad)
    sheet.paste(img, (x, y1))
    draw.rectangle([x, y1 + thumb_h, x + thumb_w, y1 + thumb_h + label_h], fill=(24, 28, 36))
    draw.text((x + 8, y1 + thumb_h + 4), f"1P Eye (Mid-Climb) — {lk.capitalize()}", fill=(220, 225, 235), font=font)

# Row 2: 3P Side
y2 = y1 + thumb_h + label_h + pad
for i, lk in enumerate(LIGHTS):
    img = load_img(f'ladder-side-mid-{lk}.jpg').resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
    x = pad + i * (thumb_w + pad)
    sheet.paste(img, (x, y2))
    draw.rectangle([x, y2 + thumb_h, x + thumb_w, y2 + thumb_h + label_h], fill=(24, 28, 36))
    draw.text((x + 8, y2 + thumb_h + 4), f"3P Clean Side (Mid-Climb) — {lk.capitalize()}", fill=(220, 225, 235), font=font)

# Row 3: Height Progression & Overview
y3 = y2 + thumb_h + label_h + pad
row3_items = [
    ('ladder-eye-low-noon.jpg', '1P Eye — Low (Foot) Noon'),
    ('ladder-eye-high-noon.jpg', '1P Eye — High (Near Roof) Noon'),
    ('ladder-side-low-noon.jpg', '3P Clean Side — Low (Foot) Noon'),
    ('ladder-side-high-noon.jpg', '3P Clean Side — High (Near Roof) Noon'),
]

for i, (fn, lbl) in enumerate(row3_items):
    img = load_img(fn).resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
    x = pad + i * (thumb_w + pad)
    sheet.paste(img, (x, y3))
    draw.rectangle([x, y3 + thumb_h, x + thumb_w, y3 + thumb_h + label_h], fill=(24, 28, 36))
    draw.text((x + 8, y3 + thumb_h + 4), lbl, fill=(220, 225, 235), font=font)

os.makedirs(os.path.dirname(OUT_REV), exist_ok=True)
os.makedirs(os.path.dirname(OUT_QA), exist_ok=True)
sheet.save(OUT_REV, quality=94)
sheet.save(OUT_QA, quality=94)
print(f"Saved {OUT_REV} ({sheet.size})")
