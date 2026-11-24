from pathlib import Path
import json
from PIL import Image, ImageDraw, ImageFont

root = Path('qa/AG-404/cj-r4')
res = json.loads((root / 'results.json').read_text(encoding='utf8'))
font = ImageFont.truetype('arial.ttf', 18)
hfont = ImageFont.truetype('arialbd.ttf', 24)
fg = '#f4efe6'
bg = '#15181c'

# 1. CJ R4 #1 Glow Pair Sheet (before vs after, frame0 and mid burst)
def make_glow_sheet():
    pw, ph = 800, 450
    sheet = Image.new('RGB', (pw * 2 + 24, ph * 2 + 120), bg)
    d = ImageDraw.Draw(sheet)
    tr = res['r4_1_visual_and_trace']
    d.text((14, 12), f"CJ R4 #1 Minigun 3P Flash Glow (Dark Training, same camera) · 60f muzzle delta: {tr['maxMuzzleDelta']:.6f} m", font=hfont, fill=fg)
    rows = [
        ('BEFORE live 22afb368', root / 'r4-1-before' / 'glow-frame0.png', root / 'r4-1-before' / 'glow-frame-mid.png'),
        ('AFTER fix 51d45eb1', root / 'r4-1-after' / 'glow-frame0.png', root / 'r4-1-after' / 'glow-frame-mid.png'),
    ]
    for r_i, (label, p0, p1) in enumerate(rows):
        y = 56 + r_i * (ph + 44)
        for c_i, (sub, pth) in enumerate([('First firing frame', p0), ('Mid-burst firing frame', p1)]):
            x = 8 + c_i * (pw + 8)
            with Image.open(pth) as im:
                im = im.convert('RGB').resize((pw, ph), Image.Resampling.LANCZOS)
                sheet.paste(im, (x, y))
            d.text((x + 6, y + ph + 6), f'{label} · {sub}', font=font, fill=fg)
    sheet.save(root / 'CJ-R4-1-glow-pair.jpg', format='JPEG', quality=94, subsampling=0)

# 2. CJ R4 #3 Metal Drum Hit Pair Sheet (frames 1, 2, 3, 5 + zoomed crop on drum impact!)
def make_drum_sheet():
    pw, ph = 460, 259
    sheet = Image.new('RGB', (pw * 4 + 40, ph * 2 + 130), bg)
    d = ImageDraw.Draw(sheet)
    b = res['r4_3_drum']['before']['hit']
    a = res['r4_3_drum']['after']['hit']
    d.text((14, 12), f"CJ R4 #3 Metal Drum Hit (30 Hz) · Live 22afb368: {b['newMotesCount']} motes + {b['newDebrisCount']} frag | Copy 25bd1f40: {a['newMotesCount']} motes + {a['newDebrisCount']} frag", font=hfont, fill=fg)
    for r_i, (side, label) in enumerate([('before', f"Live 22afb368 ({b['newMotesCount']} sparks+{b['newDebrisCount']} frag)"),
                                         ('after', f"Copy 25bd1f40 (1 ball+8 sparks+{a['newDebrisCount']} frag)")]):
        y = 58 + r_i * (ph + 48)
        for c_i, fnum in enumerate([1, 2, 3, 5]):
            x = 8 + c_i * (pw + 8)
            pth = root / f'r4-3-{side}' / f'drum-f{fnum}.png'
            with Image.open(pth) as im:
                im = im.convert('RGB')
                # Center crop zoom inset around drum impact (center of 1600x900)
                crop = im.crop((640, 290, 960, 610)).resize((120, 120), Image.Resampling.NEAREST)
                small = im.resize((pw, ph), Image.Resampling.LANCZOS)
                small.paste(crop, (pw - 128, ph - 128))
                sd = ImageDraw.Draw(small)
                sd.rectangle((pw - 129, ph - 129, pw - 8, ph - 8), outline='#ffdd88', width=2)
                sheet.paste(small, (x, y))
            ms = round(fnum * 1000 / 30)
            d.text((x + 6, y + ph + 6), f'{label} · f{fnum} ({ms} ms)', font=font, fill=fg)
    sheet.save(root / 'CJ-R4-3-drum-30hz-pair.jpg', format='JPEG', quality=94, subsampling=0)

make_glow_sheet()
make_drum_sheet()
print('CJR4_SHEETS_OK')
