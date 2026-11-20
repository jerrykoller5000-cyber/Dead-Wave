"""Build tight limb/paw/foot/head close-up comparison sheet for GP-20154 v17."""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(r"C:\Users\Zero\Desktop\Tiny Trek")
V17 = ROOT / "review" / "GP-20154" / "hunt-motion-v17-pair-v1"
OUT = ROOT / "qa" / "2026-11-18-AG-360"
rec = json.loads((V17 / "receipt.json").read_text(encoding="utf-8"))
rb = rec["results"][0]["shots"]
ra = rec["results"][1]["shots"]

INDICES = [1, 2, 4, 5, 7, 8, 9, 10, 11, 12]

try:
    font = ImageFont.truetype("arial.ttf", 15)
except OSError:
    font = ImageFont.load_default()

cell_w, cell_h = 480, 380
hdr_h = 26
pad = 8
canvas = Image.new("RGB", (2 * cell_w + 3 * pad, len(INDICES) * (cell_h + hdr_h + pad) + pad), (18, 20, 24))
draw = ImageDraw.Draw(canvas)

for r_i, idx in enumerate(INDICES):
    sb, sa = rb[idx], ra[idx]
    fname = sb["file"]
    im_b = Image.open(V17 / "before" / fname).convert("RGB")
    im_a = Image.open(V17 / "after" / fname).convert("RGB")
    w, h = im_b.size
    # Tight actor bounding box using NDC without excess background
    min_x = min(sb["ndc"]["min"][0], sa["ndc"]["min"][0])
    max_x = max(sb["ndc"]["max"][0], sa["ndc"]["max"][0])
    min_y = min(sb["ndc"]["min"][1], sa["ndc"]["min"][1])
    max_y = max(sb["ndc"]["max"][1], sa["ndc"]["max"][1])
    px0 = (min_x + 1.0) * 0.5 * w - 12
    px1 = (max_x + 1.0) * 0.5 * w + 12
    py0 = (1.0 - max_y) * 0.5 * h - 12
    py1 = (1.0 - min_y) * 0.5 * h + 12
    cx, cy = (px0 + px1) * 0.5, (py0 + py1) * 0.5
    bw, bh = px1 - px0, py1 - py0
    ratio = cell_w / cell_h
    if bw / bh < ratio:
        bw = bh * ratio
    else:
        bh = bw / ratio
    x0 = max(0, int(round(cx - bw * 0.5)))
    y0 = max(0, int(round(cy - bh * 0.5)))
    x1 = min(w, int(round(x0 + bw)))
    y1 = min(h, int(round(y0 + bh)))
    box = (x0, y0, x1, y1)
    cy0 = pad + r_i * (cell_h + hdr_h + pad)
    for c_i, (ph, im) in enumerate([("BEFORE", im_b), ("AFTER", im_a)]):
        cx0 = pad + c_i * (cell_w + pad)
        crop = im.crop(box).resize((cell_w, cell_h), Image.Resampling.NEAREST)
        canvas.paste(crop, (cx0, cy0 + hdr_h))
        draw.rectangle([cx0, cy0, cx0 + cell_w, cy0 + hdr_h], fill=(32, 36, 44))
        draw.text((cx0 + 8, cy0 + 4), f"{ph} TIGHT :: {fname} ({sb['mode']})", fill=(235, 240, 245), font=font)

out_p = OUT / "sheet-v17-hunt-tight-crops.jpg"
canvas.save(out_p, quality=95)
print("Wrote", out_p, canvas.size)
