import json, os, sys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.getcwd()
TAG = sys.argv[1] if len(sys.argv) > 1 else 'before'
DIR = os.path.join(ROOT, 'qa', 'AG-409', TAG)

def load_font(size):
    for p in ['C:/Windows/Fonts/consolab.ttf', 'C:/Windows/Fonts/arialbd.ttf', 'C:/Windows/Fonts/arial.ttf']:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    return ImageFont.load_default()

FONT = load_font(18)

def make_overview(tag):
    d = os.path.join(ROOT, 'qa', 'AG-409', tag)
    m = json.load(open(os.path.join(d, 'metrics.json'), encoding='utf-8'))
    shots = m['shots']
    TW, TH, BAR = 640, 360, 28
    groups = [
        ('sheet-1-sky-weather', shots[0:8]),
        ('sheet-2-wind-water-fire', shots[8:]),
    ]
    for name, items in groups:
        cols = 2
        rows = (len(items) + cols - 1) // cols
        W, H = cols * TW, rows * (TH + BAR)
        sheet = Image.new('RGB', (W, H), (14, 16, 18))
        draw = ImageDraw.Draw(sheet)
        for idx, it in enumerate(items):
            r, c = divmod(idx, cols)
            x, y = c * TW, r * (TH + BAR)
            draw.rectangle([x, y, x + TW - 1, y + BAR - 1], fill=(22, 26, 30))
            draw.text((x + 10, y + 5), f"{it['id']} — {it['cap']}", fill=(232, 236, 240), font=FONT)
            im = Image.open(os.path.join(ROOT, it['file'])).convert('RGB').resize((TW, TH), Image.LANCZOS)
            sheet.paste(im, (x, y + BAR))
        out = os.path.join(d, f'{name}-{tag}.jpg')
        sheet.save(out, quality=90)
        print(f'Wrote {out} ({W}x{H})')

def make_before_after():
    bdir = os.path.join(ROOT, 'qa', 'AG-409', 'before')
    adir = os.path.join(ROOT, 'qa', 'AG-409', 'after')
    if not (os.path.exists(os.path.join(bdir, 'metrics.json')) and os.path.exists(os.path.join(adir, 'metrics.json'))):
        return
    bm = json.load(open(os.path.join(bdir, 'metrics.json'), encoding='utf-8'))
    am = json.load(open(os.path.join(adir, 'metrics.json'), encoding='utf-8'))
    bmap = {s['id']: s for s in bm['shots']}
    amap = {s['id']: s for s in am['shots']}
    ids = [s['id'] for s in bm['shots'] if s['id'] in amap]
    out_dir = os.path.join(ROOT, 'qa', 'AG-409', 'before-after')
    os.makedirs(out_dir, exist_ok=True)
    TW, TH, BAR, GAP = 800, 450, 30, 8
    per = 4
    for gi in range(0, len(ids), per):
        chunk = ids[gi:gi + per]
        W = TW * 2 + GAP
        H = len(chunk) * (TH + BAR)
        sheet = Image.new('RGB', (W, H), (12, 14, 16))
        draw = ImageDraw.Draw(sheet)
        for row, sid in enumerate(chunk):
            y = row * (TH + BAR)
            cap = amap[sid]['cap']
            draw.rectangle([0, y, TW - 1, y + BAR - 1], fill=(34, 28, 26))
            draw.text((10, y + 6), f"BEFORE · {sid} — {cap}", fill=(240, 220, 210), font=FONT)
            draw.rectangle([TW + GAP, y, W - 1, y + BAR - 1], fill=(22, 36, 30))
            draw.text((TW + GAP + 10, y + 6), f"AFTER · {sid} — {cap}", fill=(215, 245, 225), font=FONT)
            bim = Image.open(os.path.join(ROOT, bmap[sid]['file'])).convert('RGB').resize((TW, TH), Image.LANCZOS)
            aim = Image.open(os.path.join(ROOT, amap[sid]['file'])).convert('RGB').resize((TW, TH), Image.LANCZOS)
            sheet.paste(bim, (0, y + BAR))
            sheet.paste(aim, (TW + GAP, y + BAR))
        out = os.path.join(out_dir, f'ba-{(gi // per) + 1}.jpg')
        sheet.save(out, quality=92)
        print(f'Wrote {out} ({W}x{H})')

make_overview(TAG)
make_before_after()
