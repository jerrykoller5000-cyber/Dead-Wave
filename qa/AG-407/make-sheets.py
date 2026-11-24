import json
import os
import sys
from PIL import Image, ImageDraw, ImageFont

tag = sys.argv[1] if len(sys.argv) > 1 else 'before'
root = os.getcwd()
out_dir = os.path.join(root, 'qa', 'AG-407', tag)
metrics = json.load(open(os.path.join(out_dir, 'metrics.json'), encoding='utf-8'))
shots = metrics['shots']

def make_sheet(items, out_path, cols=2, tw=800, th=450, label_h=30):
    if not items:
        return
    rows = (len(items) + cols - 1) // cols
    canvas = Image.new('RGB', (cols * tw, rows * (th + label_h)), (18, 20, 22))
    draw = ImageDraw.Draw(canvas)
    try:
        font = ImageFont.truetype('arialbd.ttf', 15)
    except Exception:
        font = ImageFont.load_default()
    for idx, item in enumerate(items):
        r, c = divmod(idx, cols)
        x, y = c * tw, r * (th + label_h)
        im = Image.open(os.path.join(root, item['file'])).convert('RGB')
        im = im.resize((tw, th), Image.Resampling.LANCZOS)
        canvas.paste(im, (x, y))
        draw.rectangle([x, y + th, x + tw, y + th + label_h], fill=(24, 28, 30))
        draw.text((x + 8, y + th + 6), f"{item['id']} — {item['cap']}", fill=(235, 238, 240), font=font)
    canvas.save(out_path, quality=90)
    print(f"Wrote {out_path} ({canvas.width}x{canvas.height})")

make_sheet(shots[0:8],   os.path.join(out_dir, f'sheet-1-valley-rocks-{tag}.jpg'))
make_sheet(shots[8:16],  os.path.join(out_dir, f'sheet-2-caves-river-pit-{tag}.jpg'))
make_sheet(shots[16:24], os.path.join(out_dir, f'sheet-3-monoliths-pois-lights-{tag}.jpg'))
bonus = metrics.get('bonusShots') or []
if bonus:
    make_sheet(bonus, os.path.join(out_dir, f'sheet-4-hero-geologies-{tag}.jpg'))

before_dir = os.path.join(root, 'qa', 'AG-407', 'before')
after_dir = os.path.join(root, 'qa', 'AG-407', 'after')
if tag == 'after' and os.path.exists(os.path.join(before_dir, 'metrics.json')):
    ba_dir = os.path.join(root, 'qa', 'AG-407', 'before-after')
    os.makedirs(ba_dir, exist_ok=True)
    def make_ba(items, out_path, tw=800, th=450, label_h=30):
        rows = len(items)
        canvas = Image.new('RGB', (tw * 2 + 8, rows * (th + label_h)), (16, 18, 20))
        draw = ImageDraw.Draw(canvas)
        try:
            font = ImageFont.truetype('arialbd.ttf', 16)
        except Exception:
            font = ImageFont.load_default()
        for r, item in enumerate(items):
            y = r * (th + label_h)
            b_im = Image.open(os.path.join(before_dir, f"{item['id']}.png")).convert('RGB').resize((tw, th), Image.Resampling.LANCZOS)
            a_im = Image.open(os.path.join(after_dir, f"{item['id']}.png")).convert('RGB').resize((tw, th), Image.Resampling.LANCZOS)
            canvas.paste(b_im, (0, y + label_h))
            canvas.paste(a_im, (tw + 8, y + label_h))
            draw.rectangle([0, y, tw * 2 + 8, y + label_h], fill=(24, 28, 30))
            draw.text((10, y + 6), f"BEFORE · {item['id']} — {item['cap']}", fill=(210, 210, 210), font=font)
            draw.text((tw + 18, y + 6), f"AFTER · {item['id']} — {item['cap']}", fill=(150, 240, 175), font=font)
        canvas.save(out_path, quality=91)
        print(f"Wrote {out_path} ({canvas.width}x{canvas.height})")
    for i in range(0, len(shots), 4):
        make_ba(shots[i:i+4], os.path.join(ba_dir, f'ba-{(i//4)+1}.jpg'))
