from pathlib import Path
import json
from PIL import Image, ImageDraw, ImageFont

root = Path('review/CH-3/booth/native')
s = json.loads((root / 'summary.json').read_text(encoding='utf8'))
font = ImageFont.truetype('arial.ttf', 16)
hfont = ImageFont.truetype('arialbd.ttf', 22)

views = [
    ('train-front-on', 'Train Front (ON)'),
    ('train-front-off', 'Train Front (OFF)'),
    ('train-wide5m-on', 'Train Wide 5m (ON)'),
    ('train-left1m-on', 'Hatch 1m Left (ON)'),
    ('hq-front-day', 'HQ Front + Rack (Day)'),
    ('hq-front-night', 'HQ Front + Rack (Night)'),
]

pw, ph = 620, 349
cols = 3
# Make two 2x3 sheets (sheet 1: Training ON/OFF + Wide/Left, sheet 2: ALL 6 views before vs after)
# Actually 6 columns x 2 rows is wide (3720px), better: 2 rows of 3 pairs (4 rows x 3 cols = 1900 x 1560)!
W = cols * (pw + 12) + 16
H = 4 * (ph + 34) + 84
sheet = Image.new('RGB', (W, H), '#15181c')
d = ImageDraw.Draw(sheet)
bh = s['before']['draws']['hq']
ah = s['after']['draws']['hq']
d.text((14, 12), f"CH-3 #2 Armory Booth Native Pair (1920x1080 WebGPU) · Live {s['liveMd5'][:8]} (house meshes {bh['houseMeshes']}, arm tris {bh['armTris']}) vs Copy {s['copyMd5'][:8]} (house meshes {ah['houseMeshes']}, arm tris {ah['armTris']})", font=hfont, fill='#f4efe6')

for block_i, trio in enumerate([views[:3], views[3:]]):
    for side_i, (side, stag) in enumerate([('before', 'LIVE 22afb368'), ('after', 'COPY 4cc9f507')]):
        row = block_i * 2 + side_i
        y = 54 + row * (ph + 34)
        for c_i, (key, title) in enumerate(trio):
            x = 12 + c_i * (pw + 12)
            with Image.open(root / side / f'{key}.png') as im:
                im = im.convert('RGB').resize((pw, ph), Image.Resampling.LANCZOS)
                sheet.paste(im, (x, y))
            d.text((x + 6, y + ph + 5), f'{stag} · {title}', font=font, fill='#f4efe6')

sheet.save(root / 'CH-3-booth-native-pair.jpg', format='JPEG', quality=93, subsampling=0)
print('BOOTH_SHEET_OK')
