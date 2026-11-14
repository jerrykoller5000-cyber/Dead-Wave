# sheet2.py <out> <title> <rows: label=dir/prefix ...> views light bright
import sys
from PIL import Image, ImageDraw, ImageFont, ImageEnhance
out, title, rows, views, light, bright = sys.argv[1], sys.argv[2], sys.argv[3].split(';'), sys.argv[4].split(','), sys.argv[5], float(sys.argv[6])
CW, CH = 360, 400
font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 18); small = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 14)
names = {'game': '3P camera (crop, as played)', 'gz': '3P camera direction, zoomed', 'back': 'back', 'sideP': 'side, gun hand', 'sideN': 'side, off hand', 'front': 'front', 'top': 'top', 'q34': '3/4 back, gun side', 'q34n': '3/4 back, off side', 'cs': 'close side, gun hand', 'csn': 'close side, off hand', 'cb': 'close back'}
S = Image.new('RGB', (130 + CW * len(views), 70 + CH * len(rows)), (24, 24, 24)); dr = ImageDraw.Draw(S)
dr.text((10, 8), title, fill=(240, 220, 120), font=font)
for j, v in enumerate(views): dr.text((130 + j * CW + 6, 44), names.get(v, v), fill=(220, 220, 220), font=small)
for i, r in enumerate(rows):
    lab, pre = r.split('=')
    y = 68 + i * CH
    dr.text((6, y + CH // 2 - 10), lab, fill=(255, 120, 90) if 'BEFORE' in lab else (120, 230, 120), font=font)
    for j, v in enumerate(views):
        try: im = Image.open(f'{pre}-{v}-{light}.png').convert('RGB')
        except Exception: continue
        c = im.crop((640-80, 375-89, 640+80, 375+89)) if v == 'game' else im.crop((640-270, 360-300, 640+270, 360+300))
        c = c.resize((CW, CH), Image.LANCZOS)
        if bright != 1: c = ImageEnhance.Brightness(c).enhance(bright)
        S.paste(c, (130 + j * CW, y))
S.save(out, quality=88); print(out, S.size)
