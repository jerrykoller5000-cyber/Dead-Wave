import json, os, sys
from PIL import Image, ImageDraw, ImageFont

TAG = sys.argv[1] if len(sys.argv) > 1 else 'before'
ROOT = os.getcwd()
BASE = os.path.join(ROOT, 'qa', 'AG-406')
DIR = os.path.join(BASE, TAG)
meta = json.load(open(os.path.join(DIR, 'metrics.json'), 'r', encoding='utf-8'))
shots = meta['shots']

try:
    FONT = ImageFont.truetype('arialbd.ttf', 18)
    FONT_SM = ImageFont.truetype('arial.ttf', 15)
except Exception:
    FONT = ImageFont.load_default()
    FONT_SM = FONT

def make_grid(items, cols, out_path, tw=640, th=360, bar=28):
    rows = (len(items) + cols - 1) // cols
    canvas = Image.new('RGB', (cols * tw, rows * (th + bar)), (18, 20, 22))
    draw = ImageDraw.Draw(canvas)
    for idx, it in enumerate(items):
        r, c = divmod(idx, cols)
        x0, y0 = c * tw, r * (th + bar)
        img = Image.open(os.path.join(ROOT, it['file'])).convert('RGB').resize((tw, th), Image.Resampling.LANCZOS)
        canvas.paste(img, (x0, y0 + bar))
        draw.rectangle([x0, y0, x0 + tw, y0 + bar], fill=(28, 32, 36))
        draw.text((x0 + 8, y0 + 5), f"{it['id']} — {it['cap']}", fill=(235, 238, 226), font=FONT_SM)
    canvas.save(out_path, quality=92)
    print(f"Wrote {out_path} ({canvas.size[0]}x{canvas.size[1]})")

# 4 single-run overview sheets (14 + 12 + 13 + 10 = 49 shots)
groups = [
    ('sheet-1-walls-doors-floors', shots[0:14], 4),
    ('sheet-2-defenses-structure', shots[14:26], 4),
    ('sheet-3-pillars-stairs-traps-drums', shots[26:39], 4),
    ('sheet-4-turrets-and-4lights', shots[39:49], 4),
]
for name, items, cols in groups:
    if items:
        make_grid(items, cols, os.path.join(DIR, f"{name}-{TAG}.jpg"))

# If both before and after exist, build crisp side-by-side BEFORE | AFTER comparison sheets!
before_dir = os.path.join(BASE, 'before')
after_dir = os.path.join(BASE, 'after')
if os.path.exists(os.path.join(before_dir, 'metrics.json')) and os.path.exists(os.path.join(after_dir, 'metrics.json')):
    ba_dir = os.path.join(BASE, 'before-after')
    os.makedirs(ba_dir, exist_ok=True)
    bm = json.load(open(os.path.join(before_dir, 'metrics.json'), 'r', encoding='utf-8'))
    am = json.load(open(os.path.join(after_dir, 'metrics.json'), 'r', encoding='utf-8'))
    bmap = {s['id']: s for s in bm['shots']}
    pairs = [(bmap[s['id']], s) for s in am['shots'] if s['id'] in bmap]
    # 7 pairs per sheet -> 7 sheets (49 pairs)
    per = 7
    pw, ph, bar = 800, 450, 28
    for p_idx in range(0, len(pairs), per):
        chunk = pairs[p_idx:p_idx + per]
        cv = Image.new('RGB', (pw * 2 + 8, len(chunk) * (ph + bar)), (16, 18, 20))
        dr = ImageDraw.Draw(cv)
        for row, (bs, as_) in enumerate(chunk):
            y0 = row * (ph + bar)
            bi = Image.open(os.path.join(ROOT, bs['file'])).convert('RGB').resize((pw, ph), Image.Resampling.LANCZOS)
            ai = Image.open(os.path.join(ROOT, as_['file'])).convert('RGB').resize((pw, ph), Image.Resampling.LANCZOS)
            cv.paste(bi, (0, y0 + bar))
            cv.paste(ai, (pw + 8, y0 + bar))
            dr.rectangle([0, y0, pw, y0 + bar], fill=(34, 36, 40))
            dr.rectangle([pw + 8, y0, pw * 2 + 8, y0 + bar], fill=(24, 42, 32))
            dr.text((10, y0 + 5), f"BEFORE · {bs['id']} — {bs['cap']}", fill=(220, 224, 218), font=FONT_SM)
            dr.text((pw + 18, y0 + 5), f"AFTER · {as_['id']} — {as_['cap']}", fill=(168, 240, 188), font=FONT_SM)
        out = os.path.join(ba_dir, f"ba-{(p_idx // per) + 1}.jpg")
        cv.save(out, quality=92)
        print(f"Wrote {out} ({cv.size[0]}x{cv.size[1]})")
