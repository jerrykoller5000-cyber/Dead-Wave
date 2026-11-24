from pathlib import Path
import json
from PIL import Image, ImageDraw, ImageFont

font = ImageFont.truetype('arial.ttf', 16)
hfont = ImageFont.truetype('arialbd.ttf', 22)

def build_sheet(out_path, title, before_dir, after_dir, btag, atag, items):
    # items: list of (filename, label), 2 rows per 3 items
    pw, ph = 620, 349
    chunks = [items[i:i+3] for i in range(0, len(items), 3)]
    cols = max(len(c) for c in chunks)
    W = cols * (pw + 12) + 16
    H = len(chunks) * 2 * (ph + 34) + 64
    sheet = Image.new('RGB', (W, H), '#15181c')
    d = ImageDraw.Draw(sheet)
    d.text((14, 12), title, font=hfont, fill='#f4efe6')
    for bi, chunk in enumerate(chunks):
        for si, (folder, stag) in enumerate([(before_dir, btag), (after_dir, atag)]):
            row = bi * 2 + si
            y = 52 + row * (ph + 34)
            for ci, (fname, lbl) in enumerate(chunk):
                x = 12 + ci * (pw + 12)
                with Image.open(folder / fname) as im:
                    im = im.convert('RGB').resize((pw, ph), Image.Resampling.LANCZOS)
                    sheet.paste(im, (x, y))
                d.text((x + 6, y + ph + 5), f'{stag} · {lbl}', font=font, fill='#f4efe6')
    sheet.save(out_path, format='JPEG', quality=93, subsampling=0)

# 1. Razor coil + posts
rroot = Path('review/CH-3/razor/native')
rs = json.loads((rroot / 'summary.json').read_text(encoding='utf8'))
build_sheet(
    rroot / 'CH-3-razor-native-pair.jpg',
    f"CH-3 #4 Razor Coil + Posts (1920x1080 WebGPU) · Live {rs['liveMd5'][:8]} vs Copy {rs['copyMd5'][:8]}",
    rroot / 'before', rroot / 'after', 'LIVE 2b1d1690', 'COPY da70f7d9',
    [
        ('c19-on.png', 'C19 Close (Lamps ON)'),
        ('fence-3q-4m-on.png', 'Fence 3/4 4m (Lamps ON)'),
        ('post-top-close-on.png', 'Post Top Close (Lamps ON)'),
        ('c19-off.png', 'C19 Close (Lamps OFF)'),
        ('fence-3q-4m-off.png', 'Fence 3/4 4m (Lamps OFF)'),
        ('post-top-close-off.png', 'Post Top Close (Lamps OFF)'),
    ]
)

# 2. CIF light bar + back board
croot = Path('review/CH-3/cif/native')
cs = json.loads((croot / 'summary.json').read_text(encoding='utf8'))
build_sheet(
    croot / 'CH-3-cif-native-pair.jpg',
    f"CH-3 #5p1 CIF Light Bar + Back Board (1920x1080 WebGPU) · Live {cs['liveMd5'][:8]} vs Copy {cs['copyMd5'][:8]}",
    croot / 'before', croot / 'after', 'LIVE 98117f1f', 'COPY 2dc7d589',
    [
        ('hq-front-day.png', 'HQ CIF Front (Day)'),
        ('hq-lookup-day.png', 'HQ Looking Up (Day)'),
        ('hq-lockdown-night.png', 'HQ Night Lockdown (Red)'),
        ('train-c09a-off.png', 'Training C09a (Lamps OFF)'),
        ('train-lookup-off.png', 'Training Looking Up (Lamps OFF)'),
    ]
)

# 3. Containment gun wall bracket
groot = Path('review/CH-3/gun/native')
gs = json.loads((groot / 'summary.json').read_text(encoding='utf8'))
build_sheet(
    groot / 'CH-3-gun-native-pair.jpg',
    f"CH-3 #5p2 Containment Gun Bracket (1920x1080 WebGPU) · Live {gs['liveMd5'][:8]} vs Copy {gs['copyMd5'][:8]}",
    groot / 'before', groot / 'after', 'LIVE f9e683d7', 'COPY d617dd32',
    [
        ('c25-on.png', 'C25 Gun Bracket (Lamps ON)'),
        ('bracket-close-on.png', 'Bracket Tight Close (ON)'),
        ('firing-on.png', 'Containment Firing (ON)'),
        ('c25-off.png', 'C25 Gun Bracket (Lamps OFF)'),
        ('bracket-close-off.png', 'Bracket Tight Close (OFF)'),
        ('firing-off.png', 'Containment Firing (OFF)'),
    ]
)

print('CH3_3PROPS_SHEETS_OK')
