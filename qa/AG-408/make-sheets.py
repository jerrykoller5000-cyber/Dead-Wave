import os, sys, json
from PIL import Image, ImageDraw, ImageFont

TAG = sys.argv[1] if len(sys.argv) > 1 else 'before'
ROOT = os.path.dirname(os.path.abspath(__file__))
DIR = os.path.join(ROOT, TAG)
metrics_path = os.path.join(DIR, 'metrics.json')
with open(metrics_path, 'r', encoding='utf-8') as f:
    M = json.load(f)

try:
    FONT = ImageFont.truetype('arialbd.ttf', 15)
except Exception:
    FONT = ImageFont.load_default()

def make_grid(shots, out_name, cols=2, tw=800, th=450, hdr=30):
    rows = (len(shots) + cols - 1) // cols
    W = cols * tw
    H = rows * (th + hdr)
    canvas = Image.new('RGB', (W, H), (16, 18, 22))
    draw = ImageDraw.Draw(canvas)
    for i, s in enumerate(shots):
        r, c = divmod(i, cols)
        x0, y0 = c * tw, r * (th + hdr)
        p = os.path.join(DIR, s['id'] + '.png')
        if os.path.exists(p):
            im = Image.open(p).convert('RGB').resize((tw, th), Image.Resampling.LANCZOS)
            canvas.paste(im, (x0, y0))
        draw.rectangle([x0, y0 + th, x0 + tw, y0 + th + hdr], fill=(20, 23, 28))
        draw.text((x0 + 8, y0 + th + 7), f"{s['id']} — {s['cap']}", fill=(232, 236, 240), font=FONT)
    out_path = os.path.join(DIR, out_name)
    canvas.save(out_path, quality=92)
    print(f"Wrote {out_path} ({W}x{H})")

shots = M.get('shots', [])
if len(shots) >= 16:
    make_grid(shots[0:8],  f"sheet-1-perimeter-vistas-{TAG}.jpg")
    make_grid(shots[8:16], f"sheet-2-overlooks-dusk-night-{TAG}.jpg")
bonus = M.get('bonusShots', [])
if bonus:
    make_grid(bonus, f"sheet-3-bonus-night-vistas-{TAG}.jpg", cols=2)

# Paired BEFORE/AFTER sheets when both exist
before_dir = os.path.join(ROOT, 'before')
if TAG != 'before' and os.path.exists(os.path.join(before_dir, 'metrics.json')):
    ba_dir = os.path.join(ROOT, 'before-after')
    os.makedirs(ba_dir, exist_ok=True)
    tw, th, hdr, gap = 800, 450, 30, 8
    for g in range(0, len(shots), 4):
        chunk = shots[g:g+4]
        W = tw * 2 + gap
        H = len(chunk) * (th + hdr)
        canvas = Image.new('RGB', (W, H), (14, 16, 20))
        draw = ImageDraw.Draw(canvas)
        for i, s in enumerate(chunk):
            y0 = i * (th + hdr)
            pb = os.path.join(before_dir, s['id'] + '.png')
            pa = os.path.join(DIR, s['id'] + '.png')
            draw.rectangle([0, y0, tw, y0 + hdr], fill=(26, 28, 34))
            draw.text((8, y0 + 7), f"BEFORE · {s['id']} — {s['cap']}", fill=(210, 214, 222), font=FONT)
            draw.rectangle([tw + gap, y0, W, y0 + hdr], fill=(22, 34, 28))
            draw.text((tw + gap + 8, y0 + 7), f"AFTER · {s['id']} — {s['cap']}", fill=(165, 240, 185), font=FONT)
            if os.path.exists(pb):
                im = Image.open(pb).convert('RGB').resize((tw, th), Image.Resampling.LANCZOS)
                canvas.paste(im, (0, y0 + hdr))
            if os.path.exists(pa):
                im = Image.open(pa).convert('RGB').resize((tw, th), Image.Resampling.LANCZOS)
                canvas.paste(im, (tw + gap, y0 + hdr))
        out_path = os.path.join(ba_dir, f"ba-{g // 4 + 1}.jpg")
        canvas.save(out_path, quality=92)
        print(f"Wrote {out_path} ({W}x{H})")
