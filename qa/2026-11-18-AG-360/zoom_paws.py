"""8x crop on hands and feet for key GP-20154 v17 Hunt frames."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(r"C:\Users\Zero\Desktop\Tiny Trek")
V17 = ROOT / "review" / "GP-20154" / "hunt-motion-v17-pair-v1"
OUT = ROOT / "qa" / "2026-11-18-AG-360"

# Hand/paw and foot sub-crops around the CaveGuard's lower-right / feet region in pixel coords
# Let's auto-locate via NDC box and take upper-right (hands) and lower (feet) subboxes
import json
rec = json.loads((V17 / "receipt.json").read_text(encoding="utf-8"))
rb, ra = rec["results"][0]["shots"], rec["results"][1]["shots"]

TARGETS = [0, 1, 2, 4, 7, 8, 9, 12]
cw, ch = 360, 280
hdr = 22
pad = 6
canvas = Image.new("RGB", (2 * cw + 3 * pad, len(TARGETS) * (ch + hdr + pad) + pad), (15, 17, 20))
draw = ImageDraw.Draw(canvas)
try:
    font = ImageFont.truetype("arial.ttf", 13)
except OSError:
    font = ImageFont.load_default()

for r_i, idx in enumerate(TARGETS):
    sb, sa = rb[idx], ra[idx]
    fn = sb["file"]
    ib = Image.open(V17 / "before" / fn).convert("RGB")
    ia = Image.open(V17 / "after" / fn).convert("RGB")
    w, h = ib.size
    # Focus on the front half + bottom half (forepaws + feet) of the actor's NDC box
    min_x = min(sb["ndc"]["min"][0], sa["ndc"]["min"][0])
    max_x = max(sb["ndc"]["max"][0], sa["ndc"]["max"][0])
    min_y = min(sb["ndc"]["min"][1], sa["ndc"]["min"][1])
    max_y = max(sb["ndc"]["max"][1], sa["ndc"]["max"][1])
    px0 = (min_x + 1.0) * 0.5 * w
    px1 = (max_x + 1.0) * 0.5 * w
    py0 = (1.0 - max_y) * 0.5 * h
    py1 = (1.0 - min_y) * 0.5 * h
    # Crop lower 75% vertically and right 70% horizontally (covers forelimbs, paws, and feet)
    sub_x0 = int(round(px0 + (px1 - px0) * 0.25)) - 8
    sub_x1 = int(round(px1)) + 10
    sub_y0 = int(round(py0 + (py1 - py0) * 0.25)) - 6
    sub_y1 = int(round(py1)) + 10
    bw, bh = sub_x1 - sub_x0, sub_y1 - sub_y0
    cx, cy = (sub_x0 + sub_x1) * 0.5, (sub_y0 + sub_y1) * 0.5
    if bw / bh < cw / ch:
        bw = bh * (cw / ch)
    else:
        bh = bw / (cw / ch)
    box = (max(0, int(cx - bw * 0.5)), max(0, int(cy - bh * 0.5)), min(w, int(cx + bw * 0.5)), min(h, int(cy + bh * 0.5)))
    y_top = pad + r_i * (ch + hdr + pad)
    for c_i, (ph, im) in enumerate([("BEFORE", ib), ("AFTER", ia)]):
        x_left = pad + c_i * (cw + pad)
        crop = im.crop(box).resize((cw, ch), Image.Resampling.NEAREST)
        canvas.paste(crop, (x_left, y_top + hdr))
        draw.rectangle([x_left, y_top, x_left + cw, y_top + hdr], fill=(30, 34, 42))
        draw.text((x_left + 6, y_top + 4), f"{ph} PAWS/FEET :: {fn}", fill=(240, 240, 245), font=font)

out_p = OUT / "closeup-paws-feet-8frames.png"
canvas.save(out_p)
print("Saved", out_p, canvas.size)
