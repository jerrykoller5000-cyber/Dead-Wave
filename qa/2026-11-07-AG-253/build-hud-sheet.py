# qa/2026-11-07-AG-253/build-hud-sheet.py
# Crops the HUD region from each reload cycle and builds a composite contact sheet.

import os
from PIL import Image, ImageDraw, ImageFont

DIR = os.path.dirname(os.path.abspath(__file__))

shots = [
    ("00-initial-flamer-ready.jpg", "Initial: Loaded 60 + 3 Spare Cans [60, 60, 60]"),
    ("01-reload-1-burst.jpg", "Reload 1 + Burst: Loaded ~59 + 2 Spare Cans [60, 60]"),
    ("02-reload-2-burst.jpg", "Reload 2 + Burst: Loaded ~59 + 1 Spare Can [60]"),
    ("03-reload-3-burst.jpg", "Reload 3 + Burst: Loaded ~59 + 0 Spare Cans []"),
]

# In 1920x1080, #ammo is at bottom: 18px, left: 16px
# Crop box: left, upper, right, lower
CROP_BOX = (12, 920, 480, 1072)

cropped_images = []

for filename, label in shots:
    path = os.path.join(DIR, filename)
    if not os.path.exists(path):
        print(f"File not found: {path}")
        continue
    img = Image.open(path)
    crop = img.crop(CROP_BOX)
    cropped_images.append((crop, label, img))

if not cropped_images:
    print("No images to process.")
    exit(0)

# Build a vertical stack of HUD crops with titles
crop_w, crop_h = cropped_images[0][0].size
header_h = 36
panel_h = crop_h + header_h
sheet_w = crop_w + 40
sheet_h = panel_h * len(cropped_images) + 80

composite = Image.new("RGB", (sheet_w, sheet_h), (18, 22, 20))
draw = ImageDraw.Draw(composite)

try:
    font_title = ImageFont.truetype("arial.ttf", 20)
    font_label = ImageFont.truetype("arial.ttf", 15)
except:
    font_title = font_label = ImageFont.load_default()

draw.text((20, 15), "GP-20038 Real-GPU Flamer HUD & Magazine Cans Verification", fill=(240, 240, 210), font=font_title)
draw.text((20, 42), "Jerry's RTX 5080 WebGPU (1080p) - Verification by Antigravity (AG-253)", fill=(160, 180, 160), font=font_label)

y = 75
for crop, label, full in cropped_images:
    draw.rectangle([18, y, sheet_w - 18, y + panel_h - 6], fill=(28, 34, 30), outline=(60, 75, 65))
    draw.text((26, y + 8), label, fill=(255, 215, 80), font=font_label)
    composite.paste(crop, (20, y + header_h))
    y += panel_h

out_hud = os.path.join(DIR, "hud-flamer-reloads-sheet.jpg")
composite.save(out_hud, "JPEG", quality=95)
print(f"Saved HUD composite sheet to {out_hud}")

# Also build a 2x2 grid of the full 1080p screenshots scaled down
grid_cell_w = 960
grid_cell_h = 540
grid_img = Image.new("RGB", (grid_cell_w * 2, grid_cell_h * 2 + 60), (18, 22, 20))
grid_draw = ImageDraw.Draw(grid_img)
grid_draw.text((20, 15), "GP-20038 Flamer Three Reloads - Full 1080p Real-GPU Captures", fill=(240, 240, 210), font=font_title)

positions = [
    (0, 0),
    (1, 0),
    (0, 1),
    (1, 1),
]

for idx, (crop, label, full) in enumerate(cropped_images):
    gx, gy = positions[idx]
    thumb = full.resize((grid_cell_w, grid_cell_h), Image.Resampling.LANCZOS)
    x_pos = gx * grid_cell_w
    y_pos = 60 + gy * grid_cell_h
    grid_img.paste(thumb, (x_pos, y_pos))
    
    # Overlay label
    grid_draw.rectangle([x_pos + 10, y_pos + 10, x_pos + 520, y_pos + 40], fill=(0, 0, 0, 180))
    grid_draw.text((x_pos + 16, y_pos + 15), label, fill=(255, 215, 80), font=font_label)

out_grid = os.path.join(DIR, "full-flamer-reloads-sheet.jpg")
grid_img.save(out_grid, "JPEG", quality=92)
print(f"Saved full composite grid to {out_grid}")
