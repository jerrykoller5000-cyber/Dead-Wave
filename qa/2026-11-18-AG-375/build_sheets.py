from PIL import Image, ImageDraw
import os

out_dir = "qa/2026-11-18-AG-375"
v12 = "review/GP-20155/native-stone-pair-v12"
v11 = "review/GP-20155/native-stone-pair-v11"
v6  = "review/GP-20155/native-stone-pair-v6"
hunt = "review/GP-20155/hunt-live-v12-pair-v2"

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
    if x1 - x0 < crop_w: x0 = max(0, x1 - int(round(crop_w)))
    if y1 - y0 < crop_h: y0 = max(0, y1 - int(round(crop_h)))
    crop = im.crop((x0, y0, x1, y1))
    return crop.resize(target_size, Image.Resampling.LANCZOS)

# 1. Head zoom sheet (v12 after: front, 3/4, side, back noon + front, 3/4 night)
views = [
    ("v12 after head-front-noon (zoom)", f"{v12}/after/head-front-noon.png", 0.50, 0.50, 0.25),
    ("v12 after head-threequarter-noon (zoom)", f"{v12}/after/head-threequarter-noon.png", 0.46, 0.50, 0.25),
    ("v12 after head-side-noon (zoom)", f"{v12}/after/head-side-noon.png", 0.47, 0.50, 0.25),
    ("v12 after head-back-noon (zoom)", f"{v12}/after/head-back-noon.png", 0.50, 0.50, 0.25),
    ("v12 after head-front-night (zoom)", f"{v12}/after/head-front-night.png", 0.50, 0.50, 0.25),
    ("v12 after head-threequarter-night (zoom)", f"{v12}/after/head-threequarter-night.png", 0.46, 0.50, 0.25),
]
sheet1 = Image.new("RGB", (1580, 860), (26, 29, 34))
draw1 = ImageDraw.Draw(sheet1)
for idx, (label, path, cx, cy, hh) in enumerate(views):
    col, row = idx % 3, idx // 3
    x, y = 10 + col * 525, 10 + row * 425
    tile = crop_centered(path, cx, cy, hh, (510, 390))
    sheet1.paste(tile, (x, y))
    draw1.text((x + 6, y + 395), label, fill=(230, 235, 240))
sheet1.save(f"{out_dir}/sheet-v12-head-zoom.jpg", quality=92)

# 2. Progression sheet: before vs v6 vs v11 vs v12 (front and 3/4)
prog = [
    ("BEFORE (live) front", f"{v12}/before/head-front-noon.png", 0.50, 0.50, 0.25),
    ("v6 front", f"{v6}/after/head-front-noon.png", 0.50, 0.50, 0.25),
    ("v11 (flat box) front", f"{v11}/after/head-front-noon.png", 0.50, 0.50, 0.25),
    ("v12 (rounded) front", f"{v12}/after/head-front-noon.png", 0.50, 0.50, 0.25),
    ("BEFORE (live) 3/4", f"{v12}/before/head-threequarter-noon.png", 0.46, 0.50, 0.25),
    ("v6 3/4", f"{v6}/after/head-threequarter-noon.png", 0.46, 0.50, 0.25),
    ("v11 3/4", f"{v11}/after/head-threequarter-noon.png", 0.46, 0.50, 0.25),
    ("v12 3/4", f"{v12}/after/head-threequarter-noon.png", 0.46, 0.50, 0.25),
]
sheet2 = Image.new("RGB", (1620, 740), (26, 29, 34))
draw2 = ImageDraw.Draw(sheet2)
for idx, (label, path, cx, cy, hh) in enumerate(prog):
    col, row = idx % 4, idx // 4
    x, y = 10 + col * 400, 10 + row * 365
    tile = crop_centered(path, cx, cy, hh, (390, 330))
    sheet2.paste(tile, (x, y))
    draw2.text((x + 6, y + 335), label, fill=(230, 235, 240))
sheet2.save(f"{out_dir}/sheet-progression-before-v6-v11-v12.jpg", quality=92)

# 3. Hunt v12 zoomed crops on CaveGuard (before left vs after right per frame)
hunt_frames = [
    ("stand f030 (jaw 0.51)", "00-stand-f030.png", 0.115, 0.48, 0.14),
    ("gallop f078 (jaw 0.93)", "04-gallop-f078.png", 0.295, 0.50, 0.14),
    ("decelerate f190 (jaw 0.46)", "06-decelerate-f190.png", 0.345, 0.49, 0.14),
    ("strike f247 (jaw 1.12)", "09-strike-f247.png", 0.355, 0.49, 0.14),
    ("flinch f288 (jaw 0.51)", "11-flinch-f288.png", 0.355, 0.49, 0.14),
    ("recover f348 (jaw 0.40)", "12-recover-f348.png", 0.355, 0.49, 0.14),
]
sheet3 = Image.new("RGB", (1460, 1060), (26, 29, 34))
draw3 = ImageDraw.Draw(sheet3)
for idx, (label, fn, cx, cy, hh) in enumerate(hunt_frames):
    col = idx % 2
    row = idx // 2
    bx = 10 + col * 725
    by = 10 + row * 345
    t_b = crop_centered(f"{hunt}/before/{fn}", cx, cy, hh, (345, 310))
    t_a = crop_centered(f"{hunt}/after/{fn}", cx, cy, hh, (345, 310))
    sheet3.paste(t_b, (bx, by))
    sheet3.paste(t_a, (bx + 355, by))
    draw3.text((bx + 6, by + 315), f"BEFORE: {label}", fill=(210, 215, 220))
    draw3.text((bx + 361, by + 315), f"AFTER v12: {label}", fill=(230, 245, 230))
sheet3.save(f"{out_dir}/sheet-hunt-v12-zoom.jpg", quality=92)
print("Saved aspect-preserved sheets.")
