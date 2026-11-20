from PIL import Image, ImageDraw
import os

out_dir = "qa/2026-11-18-AG-381"
base = "review/GT-20111/d204/spider-death-retarget-owner-v9-world-limited-inward"
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
# Sheet 1: 6 rows x 2 cols (BEFORE UPtips vs PLAN inward curl)
sheet = Image.new("RGB", (1160, 1480), (26, 29, 34))
draw = ImageDraw.Draw(sheet)
for idx, f in enumerate(frames):
    fn = f"death-frame-{f:02d}.png"
    y = 10 + idx * 244
    t_b = crop_centered(f"{base}/before/{fn}", 0.50, 0.56, 0.25, (560, 215))
    t_p = crop_centered(f"{base}/plan/{fn}", 0.50, 0.56, 0.25, (560, 215))
    sheet.paste(t_b, (12, y))
    sheet.paste(t_p, (588, y))
    draw.text((16, y + 219), f"BEFORE (Spider17 UPtips) frame {f}", fill=(225, 220, 215))
    draw.text((592, y + 219), f"PLAN (Spider17 INWARD curl) frame {f}", fill=(225, 245, 225))
sheet.save(f"{out_dir}/sheet-spider-inward-frames.jpg", quality=92)

# Sheet 2: Tight zoom on frames 30, 43, 60
close_tiles = [
    ("BEFORE f30: knees drop, tibias spike straight UP", f"{base}/before/death-frame-30.png", 0.50, 0.57, 0.22),
    ("PLAN f30: smooth crouch/curl transition, zero UP spikes", f"{base}/plan/death-frame-30.png", 0.50, 0.57, 0.22),
    ("BEFORE f43: six coat-hook tibias upright above body", f"{base}/before/death-frame-43.png", 0.50, 0.56, 0.22),
    ("PLAN f43: knees raised, legs fold INWARD/DOWN under flank", f"{base}/plan/death-frame-43.png", 0.50, 0.56, 0.22),
    ("BEFORE f60: final upright coat-hook pose", f"{base}/before/death-frame-60.png", 0.50, 0.56, 0.22),
    ("PLAN f60: 0 contacts/58 rooted/+0.032mm/159.5deg clamp", f"{base}/plan/death-frame-60.png", 0.50, 0.56, 0.22),
]
sheet2 = Image.new("RGB", (1280, 1360), (26, 29, 34))
draw2 = ImageDraw.Draw(sheet2)
for idx, (label, path, cx, cy, hh) in enumerate(close_tiles):
    col, row = idx % 2, idx // 2
    x, y = 12 + col * 634, 12 + row * 448
    tile = crop_centered(path, cx, cy, hh, (618, 418))
    sheet2.paste(tile, (x, y))
    draw2.text((x + 6, y + 422), label, fill=(235, 240, 245))
sheet2.save(f"{out_dir}/sheet-spider-inward-closeup.jpg", quality=92)
print("Saved Spider inward sheets.")
