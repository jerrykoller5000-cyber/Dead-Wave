from pathlib import Path
import json
from PIL import Image, ImageDraw, ImageFont

root = Path('qa/AG-404/cj10-v2')
sheets_dir = root / 'sheets'
sheets_dir.mkdir(parents=True, exist_ok=True)
font = ImageFont.truetype('arial.ttf', 16)
header_font = ImageFont.truetype('arialbd.ttf', 22)
accent = '#ffdd88'
text = '#f4efe6'
width, height = 504, 315

before_r = json.loads((root / 'before' / 'receipt.json').read_text(encoding='utf8'))
after_r = json.loads((root / 'after' / 'receipt.json').read_text(encoding='utf8'))

def place(sheet, x, y, folder, shot, label):
    with Image.open(folder / shot['file']) as frame:
        assert frame.size == (1600, 900)
        frame = frame.convert('RGB')
    draw = ImageDraw.Draw(sheet)
    frame_x, frame_y = x + 4, y
    panel_size = (496, 279)
    sheet.paste(frame.resize(panel_size, Image.Resampling.LANCZOS), (frame_x, frame_y))
    casing = shot['case']
    tick = f'{round(1000 * shot["sinceShot"])} ms after shot'
    if not casing:
        caption = f'{label} · {tick} · before ejection'
    else:
        px, py, z = casing['px']
        drawable = 0 <= px < 1600 and 0 <= py < 900 and -1 <= z <= 1
        if drawable:
            point_x = frame_x + px * panel_size[0] / 1600
            point_y = frame_y + py * panel_size[1] / 900
            draw.ellipse((point_x - 7, point_y - 7, point_x + 7, point_y + 7), outline=accent, width=1)
            half = 40
            cut = frame.crop((round(px) - half, round(py) - half, round(px) + half, round(py) + half))
            cut = cut.resize((96, 96), Image.Resampling.NEAREST)
            corner_x = frame_x + panel_size[0] - 108 if px < 1050 or py < 500 else frame_x + 12
            corner_y = frame_y + panel_size[1] - 107
            sheet.paste(cut, (corner_x, corner_y))
            draw.rectangle((corner_x - 1, corner_y - 1, corner_x + 96, corner_y + 96), outline=accent, width=1)
        caption = f'{label} · {tick} · case {round(1000 * casing["age"])} ms'
        if not drawable:
            caption += ' · offscreen'
    draw.text((x + 9, y + 280), caption, font=font, fill=text)

def render(name, heading, section_key, subdir, columns):
    sheet = Image.new('RGB', (width * len(columns), 48 + height * 2), '#191c20')
    draw = ImageDraw.Draw(sheet)
    draw.text((11, 10), heading, font=header_font, fill=text)
    for row, (side, rec, tag) in enumerate([('before', before_r, 'Live 22afb368'), ('after', after_r, 'v2 8f49f5df')]):
        folder = root / side / subdir
        shots = rec[section_key]
        for col, (gun, label, stage) in enumerate(columns):
            place(sheet, width * col, 48 + height * row, folder, shots[gun]['images'][stage], f'{tag} {label}')
    sheet.save(sheets_dir / name, format='JPEG', quality=94, subsampling=0)

guns = [('minigun', 'Minigun burst'), ('pistol', 'Pistol'), ('uzi', 'Uzi'),
        ('m4', 'M4'), ('ak', 'AK'), ('sniper', 'Sniper bolt'), ('shotgun', 'Shotgun pump')]

for gun, title in guns:
    render(f'{gun}-third-match.jpg', f'CJ-10 v2 · {title} · third-match (GP-20283 cam)', 'thirdMatch', 'third-match',
           [(gun, title, f'shot-{t}') for t in (100, 250, 500)])
    render(f'{gun}-third-clear.jpg', f'CJ-10 v2 · {title} · third-clear', 'thirdClear', 'third-clear',
           [(gun, title, f'shot-{t}') for t in (100, 250, 500)])
    if gun in ('sniper', 'shotgun'):
        render(f'{gun}-ejection.jpg', f'CJ-10 v2 · {title} · after ejection (third-match)', 'thirdMatch', 'third-match',
               [(gun, title, f'age-{t}') for t in (100, 250, 500)])

render('first-person.jpg', 'CJ-10 v2 · First person · 0.10 s since ejection', 'first', 'first',
       [(k, l, 'age-100') for k, l in [('pistol', 'Pistol'), ('ak', 'AK'), ('minigun', 'Minigun')]])

# Combined overview sheet of all 7 guns (third-match 100/250/500 ms for after)
all_sheet = Image.new('RGB', (width * 3, 48 + height * 7), '#191c20')
d = ImageDraw.Draw(all_sheet)
d.text((11, 10), 'CJ-10 casings v2 (8f49f5df) · All 7 guns third-match (100 / 250 / 500 ms)', font=header_font, fill=text)
for r_i, (gun, title) in enumerate(guns):
    for c_i, t in enumerate((100, 250, 500)):
        place(all_sheet, width * c_i, 48 + height * r_i, root / 'after' / 'third-match',
              after_r['thirdMatch'][gun]['images'][f'shot-{t}'], f'v2 {title}')
all_sheet.save(sheets_dir / 'all7-v2-third-match.jpg', format='JPEG', quality=92, subsampling=0)
print('SHEETS_OK')
