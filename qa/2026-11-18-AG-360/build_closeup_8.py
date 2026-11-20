"""Build 8-frame pixel-exact closeup sheet (1:1/nearest) for GP-20154 v17."""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(r"C:\Users\Zero\Desktop\Tiny Trek")
V17 = ROOT / "review" / "GP-20154" / "hunt-motion-v17-pair-v1"
OUT = ROOT / "qa" / "2026-11-18-AG-360"
rec = json.loads((V17 / "receipt.json").read_text(encoding="utf-8"))
rb, ra = rec["results"][0]["shots"], rec["results"][1]["shots"]
indices = [0, 1, 2, 4, 7, 8, 9, 12]

cell_w, cell_h = 520, 440
hdr = 24
pad = 6
canvas = Image.new("RGB", (2 * cell_w + 3 * pad, len(indices) * (cell_h + hdr + pad) + pad), (15, 17, 20))
draw = ImageDraw.Draw(canvas)
try:
    font = ImageFont.truetype("arial.ttf", 14)
except OSError:
    font = ImageFont.load_default()

for r_i, idx in enumerate(indices):
    sb, sa = rb[idx], ra[idx]
    fn = sb["file"]
    ib = Image.open(V17 / "before" / fn).convert("RGB")
    ia = Image.open(V17 / "after" / fn).convert("RGB")
    w, h = ib.size
    min_x = min(sb["ndc"]["min"][0], sa["ndc"]["min"][0])
    max_x = max(sb["ndc"]["max"][0], sa["ndc"]["max"][0])
    min_y = min(sb["ndc"]["min"][1], sa["ndc"]["min"][1])
    max_y = max(sb["ndc"]["max"][1], sa["ndc"]["max"][1])
    px0 = (min_x + 1.0) * 0.5 * w - 6
    px1 = (max_x + 1.0) * 0.5 * w + 6
    py0 = (1.0 - max_y) * 0.5 * h - 6
    py1 = (1.0 - min_y) * 0.5 * h + 6
    bw, bh = px1 - px0, py1 - py0
    cx, cy = (px0 + px1) * 0.5, (py0 + py1) * 0.5
    if bw / bh < cell_w / cell_h:
        bw = bh * (cell_w / cell_h)
    else:
        bh = bw / (cell_w / cell_h)
    x0 = max(0, int(round(cx - bw * 0.5)))
    y0 = max(0, int(round(cy - bh * 0.5)))
    x1 = min(w, int(round(x0 + bw)))
    y1 = min(h, int(round(y0 + bh)))
    box = (x0, y0, x1, y1)
    y_top = pad + r_i * (cell_h + hdr + pad)
    for c_i, (ph, im) in enumerate([("BEFORE", ib), ("AFTER", ia)]):
        x_left = pad + c_i * (cell_w + pad)
        crop = im.crop(box).resize((cell_w, cell_h), Image.Resampling.NEAREST)
        canvas.paste(crop, (x_left, y_top + hdr))
        draw.rectangle([x_left, y_top, x_left + cell_w, y_top + hdr], fill=(30, 34, 42))
        mode = sb["mode"]
        draw.text((x_left + 6, y_top + 4), f"{ph} :: {fn} ({mode})", fill=(240, 240, 245), font=font)

out_p = OUT / "closeup-pixel-8frames.png"
canvas.save(out_p)
print("Saved", out_p, canvas.size)
