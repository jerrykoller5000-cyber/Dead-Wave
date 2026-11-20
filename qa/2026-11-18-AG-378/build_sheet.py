from PIL import Image, ImageDraw
import os

out_dir = "qa/2026-11-18-AG-378"
base = "review/GT-20111/d204/spider-shape-p4-owner-v13-sockets"
os.makedirs(out_dir, exist_ok=True)

def crop_centered(path, cx_frac, cy_frac, half_h_frac, target_size):
    im = Image.open(path).convert("RGB")
    w, h = im.size
    tw, th = target_size
    crop_h = h * (half_h_frac * 2.0)
    crop_w = crop_h * (tw / th)
    cx, cy = w * cx_frac, h * cy_frac
    x0 = max(0, int(round(cx - crop_w / 2)))
    y0 = max(0, int(round(cy - crop_h / 2)))
    x1 = min(w, int(round(x0 + crop_w)))
    y1 = min(h, int(round(y0 + crop_h)))
    if x1 - x0 < crop_w:
        x0 = max(0, x1 - int(round(crop_w)))
    if y1 - y0 < crop_h:
        y0 = max(0, y1 - int(round(crop_h)))
    return im.crop((x0, y0, x1, y1)).resize(target_size, Image.Resampling.LANCZOS)

# Sheet 1: 4 rows (side, 3/4, front, back) x 2 cols (BEFORE natural15 left vs PLAN Spider17 sockets right)
views = [
    ("side", "close-side-noon.png", 0.51, 0.52, 0.25),
    ("3/4", "close-threequarter-noon.png", 0.50, 0.52, 0.25),
    ("front", "close-front-noon.png", 0.50, 0.53, 0.24),
    ("back", "close-back-noon.png", 0.50, 0.53, 0.24),
]
sheet1 = Image.new("RGB", (1320, 1280), (26, 29, 34))
draw1 = ImageDraw.Draw(sheet1)
for idx, (name, fn, cx, cy, hh) in enumerate(views):
    y = 10 + idx * 318
    t_b = crop_centered(f"{base}/before/{fn}", cx, cy, hh, (640, 290))
    t_p = crop_centered(f"{base}/plan/{fn}", cx, cy, hh, (640, 290))
    sheet1.paste(t_b, (12, y))
    sheet1.paste(t_p, (668, y))
    draw1.text((16, y + 294), f"BEFORE natural15 ({name})", fill=(225, 220, 215))
    draw1.text((672, y + 294), f"PLAN Spider17 sockets ({name})", fill=(225, 240, 225))
sheet1.save(f"{out_dir}/sheet-spider17-sockets-zoom.jpg", quality=92)

# Sheet 2: Tight detail zoom on neck socket & limb root sockets (side & 3/4 before vs plan)
tight = [
    ("BEFORE side: open neck & femur root gaps", f"{base}/before/close-side-noon.png", 0.52, 0.48, 0.16),
    ("PLAN side: dark cervical collar & limb root cuffs", f"{base}/plan/close-side-noon.png", 0.52, 0.48, 0.16),
    ("BEFORE 3/4: open neck & right femur sockets", f"{base}/before/close-threequarter-noon.png", 0.53, 0.50, 0.16),
    ("PLAN 3/4: continuous cervical & root cuffs (dark belly/neck read)", f"{base}/plan/close-threequarter-noon.png", 0.53, 0.50, 0.16),
]
sheet2 = Image.new("RGB", (1280, 920), (26, 29, 34))
draw2 = ImageDraw.Draw(sheet2)
for idx, (label, path, cx, cy, hh) in enumerate(tight):
    col, row = idx % 2, idx // 2
    x, y = 12 + col * 634, 12 + row * 452
    tile = crop_centered(path, cx, cy, hh, (618, 420))
    sheet2.paste(tile, (x, y))
    draw2.text((x + 6, y + 424), label, fill=(235, 240, 245))
sheet2.save(f"{out_dir}/sheet-spider17-root-closeup.jpg", quality=92)
print("Saved Spider17 zoomed sheets.")
