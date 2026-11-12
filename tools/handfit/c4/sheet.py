# sheet.py <gun> <out.jpg>: before/after, four lights, the four close cameras (Claude 2's tp-hands views), plus the tinted after
import sys
from PIL import Image, ImageDraw, ImageFont
g, out = sys.argv[1], sys.argv[2]
V = ('left', 'right', 'top', 'front-low'); W, H = 360, 304
rows = []
for L in ('noon', 'overcast', 'dusk', 'night'):
    rows.append((f'BEFORE (PC tree, interim) · {L}', [f'/home/claude/c9/p0/tp-{g}-{v}-{L}-before.png' for v in V]))
    rows.append((f'AFTER (TP_FIT, trial hold) · {L}', [f'/home/claude/c9/p1/tp-{g}-{v}-{L}-after.png' for v in V]))
rows.append(('AFTER, tinted (firing blue, support red) · noon', [f'/home/claude/c9/p1/tp-{g}-{v}-tint-after.png' for v in V]))
try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 15)
except Exception: font = ImageFont.load_default()
S = Image.new('RGB', (W * 4, 30 + len(rows) * (H + 22)), (20, 20, 20)); d = ImageDraw.Draw(S)
d.text((8, 6), f'CD-9 third person, {g}: his left, his right, above, front-low (Claude 2\'s tp-hands cameras); cloud render', fill=(255, 255, 255), font=font)
y = 30
for label, files in rows:
    d.text((8, y + 2), label, fill=(255, 210, 80), font=font); y += 22
    for c, f in enumerate(files):
        try: im = Image.open(f).crop((300, 75, 980, 650)).resize((W, H))
        except Exception: im = Image.new('RGB', (W, H), (60, 0, 0))
        S.paste(im, (c * W, y))
    y += H
S.save(out, quality=88); print('wrote', out)
