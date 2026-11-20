from PIL import Image, ImageDraw
import os

out_dir = "qa/2026-11-18-AG-377"
base = "review/GT-20111/d204/spider-death-retarget-owner-v5"
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

frames = [0, 10, 20, 30, 43, 60]
# Sheet 1: 6 rows x 2 cols (BEFORE left vs PLAN death2 right) zoomed onto spider
sheet = Image.new("RGB", (1160, 1480), (26, 29, 34))
draw = ImageDraw.Draw(sheet)
for idx, f in enumerate(frames):
    fn = f"death-frame-{f:02d}.png"
    y = 10 + idx * 244
    t_b = crop_centered(f"{base}/before/{fn}", 0.48, 0.56, 0.30, (560, 215))
    t_p = crop_centered(f"{base}/plan/{fn}", 0.48, 0.56, 0.30, (560, 215))
    sheet.paste(t_b, (12, y))
    sheet.paste(t_p, (588, y))
    draw.text((16, y + 219), f"BEFORE (original curl) frame {f}", fill=(225, 220, 215))
    draw.text((592, y + 219), f"PLAN (outward-first death2) frame {f}", fill=(225, 240, 225))
sheet.save(f"{out_dir}/sheet-spider-death2-frames.jpg", quality=92)

# Sheet 2: Close-up crops on frame 30, 43, 60 (contacts/clipping vs upward-legs & open root seams)
close_tiles = [
    ("BEFORE f43: legs clip thorax & bundle", f"{base}/before/death-frame-43.png", 0.50, 0.57, 0.23),
    ("PLAN f43: knees grounded, tibias point straight UP", f"{base}/plan/death-frame-43.png", 0.50, 0.55, 0.25),
    ("BEFORE f60: black claws pierce torso/neck", f"{base}/before/death-frame-60.png", 0.50, 0.57, 0.23),
    ("PLAN f60: 0 contacts/floor +0.117mm, coat-hook legs + open neck/leg roots", f"{base}/plan/death-frame-60.png", 0.50, 0.55, 0.25),
]
sheet2 = Image.new("RGB", (1280, 920), (26, 29, 34))
draw2 = ImageDraw.Draw(sheet2)
for idx, (label, path, cx, cy, hh) in enumerate(close_tiles):
    col, row = idx % 2, idx // 2
    x, y = 12 + col * 634, 12 + row * 452
    tile = crop_centered(path, cx, cy, hh, (618, 420))
    sheet2.paste(tile, (x, y))
    draw2.text((x + 6, y + 424), label, fill=(235, 240, 245))
sheet2.save(f"{out_dir}/sheet-spider-death2-closeup.jpg", quality=92)
print("Saved Spider death2 sheets.")
