import os
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = r"C:\Users\Zero\Desktop\Tiny Trek"
GP_DIR = os.path.join(ROOT, "review", "GP-20021")
AG225_DIR = os.path.join(ROOT, "qa", "2026-11-03-AG-225", "stills")
REF_DIR = os.path.join(ROOT, "review", "weapon-photos", "AG-Weapons")
OUT_DIR = os.path.join(ROOT, "qa", "2026-11-03-AG-227")

WEAPONS = [
    {
        "key": "launcher",
        "name": "Launcher",
        "ref": os.path.join(REF_DIR, "Launcher", "launcher-refined-v3.jpg"),
        # Weapon view crop: [x1, y1, x2, y2]
        "view_crop": (960, 450, 1920, 1080),
        "rec_crop": (1180, 600, 1580, 950)
    },
    {
        "key": "aa12",
        "name": "Breacher-12 (AA-12)",
        "ref": os.path.join(REF_DIR, "AA-12", "aa12-refined-v2.jpg"),
        "view_crop": (960, 450, 1920, 1080),
        "rec_crop": (1200, 560, 1600, 910)
    },
    {
        "key": "flamer",
        "name": "Flamer",
        "ref": os.path.join(REF_DIR, "Flamer", "flamer-refined-v2.jpg"),
        "view_crop": (960, 450, 1920, 1080),
        "rec_crop": (1150, 520, 1550, 870)
    },
    {
        "key": "shotgun",
        "name": "Shotgun",
        "ref": os.path.join(REF_DIR, "Shotgun", "shotgun-refined-v2.jpg"),
        "view_crop": (960, 450, 1920, 1080),
        "rec_crop": (1180, 560, 1580, 910)
    }
]

LIGHTS = [
    ("noon", "Noon (Direct Sunlight, t=0.50)"),
    ("dusk", "Dusk (Low-Angle Horizon, t=0.77)"),
    ("overcast", "Overcast (Diffuse Rain, t=0.42)"),
    ("night", "Night (Flashlight Key, t=0.02)")
]

# Simple default font
font = ImageFont.load_default()

def create_diff_heatmap(arr1, arr2):
    # Absolute difference scaled for visual clarity
    diff = np.abs(arr1.astype(np.float32) - arr2.astype(np.float32))
    diff_lum = np.mean(diff, axis=2)
    # Scale up contrast of difference (5x)
    boosted = np.clip(diff_lum * 4.0, 0, 255).astype(np.uint8)
    # Apply warm/hot colormap (R=boosted, G=boosted*0.5, B=0)
    heat = np.zeros((boosted.shape[0], boosted.shape[1], 3), dtype=np.uint8)
    heat[:, :, 0] = np.clip(boosted * 1.5, 0, 255)
    heat[:, :, 1] = np.clip(boosted * 0.7, 0, 255)
    heat[:, :, 2] = np.clip(boosted * 0.2, 0, 255)
    return Image.fromarray(heat)

# Build a sheet for each lighting condition
# Sheet layout:
# Width: 1800 px (Header: 60px, 4 weapon rows: 260px each + 20px padding -> Height: 60 + 4*280 = 1180 px)
# Columns per row:
# 1. Jerry Reference (280x250)
# 2. AG-225 Baseline View (320x250)
# 3. GP-20021 Lifted View (320x250)
# 4. AG-225 Receiver Zoom (250x250)
# 5. GP-20021 Receiver Zoom (250x250)
# 6. Glint / Difference Heatmap (250x250)

for light_key, light_title in LIGHTS:
    sheet_w = 1800
    row_h = 270
    header_h = 70
    sheet_h = header_h + len(WEAPONS) * row_h + 30
    sheet = Image.new("RGB", (sheet_w, sheet_h), (22, 24, 28))
    draw = ImageDraw.Draw(sheet)
    
    # Title
    draw.rectangle([(0, 0), (sheet_w, header_h)], fill=(12, 14, 18))
    draw.text((25, 15), f"AG-227 / GP-20021 First-Person Material Audit — {light_title}", fill=(240, 240, 245), font=font)
    draw.text((25, 40), "Left to Right: [1] Jerry Reference | [2] AG-225 Baseline (Pre-lift) | [3] GP-20021 (Lifted 2x + Glint) | [4] Baseline Receiver Zoom | [5] GP-20021 Zoom | [6] Lift/Glint Difference Heatmap", fill=(170, 175, 185), font=font)
    
    for row_idx, w in enumerate(WEAPONS):
        y_top = header_h + 15 + row_idx * row_h
        draw.rectangle([(15, y_top), (sheet_w - 15, y_top + row_h - 10)], fill=(30, 34, 40), outline=(50, 55, 65))
        
        # Row label
        draw.text((25, y_top + 10), f"Weapon: {w['name']}", fill=(255, 215, 0), font=font)
        
        # 1. Ref Image
        ref_img = Image.open(w["ref"]).convert("RGB")
        ref_thumb = ref_img.resize((260, 220), Image.Resampling.LANCZOS)
        sheet.paste(ref_thumb, (25, y_top + 30))
        draw.text((25, y_top + 252), "Jerry Ref Photo", fill=(160, 165, 175), font=font)
        
        # 2. AG-225 View
        ag_full = Image.open(os.path.join(AG225_DIR, f"{w['key']}-hip-{light_key}.jpg")).convert("RGB")
        ag_crop = ag_full.crop(w["view_crop"])
        ag_thumb = ag_crop.resize((310, 220), Image.Resampling.LANCZOS)
        sheet.paste(ag_thumb, (300, y_top + 30))
        draw.text((300, y_top + 252), "AG-225 Baseline", fill=(160, 165, 175), font=font)
        
        # 3. GP-20021 View
        gp_full = Image.open(os.path.join(GP_DIR, f"{w['key']}-{light_key}.jpg")).convert("RGB")
        gp_crop = gp_full.crop(w["view_crop"])
        gp_thumb = gp_crop.resize((310, 220), Image.Resampling.LANCZOS)
        sheet.paste(gp_thumb, (625, y_top + 30))
        draw.text((625, y_top + 252), "GP-20021 (Lifted)", fill=(100, 255, 120), font=font)
        
        # 4. AG-225 Rec Zoom
        ag_rec = ag_full.crop(w["rec_crop"]).resize((260, 220), Image.Resampling.LANCZOS)
        sheet.paste(ag_rec, (950, y_top + 30))
        draw.text((950, y_top + 252), "Baseline Zoom (Dark)", fill=(200, 120, 120), font=font)
        
        # 5. GP-20021 Rec Zoom
        gp_rec = gp_full.crop(w["rec_crop"]).resize((260, 220), Image.Resampling.LANCZOS)
        sheet.paste(gp_rec, (1225, y_top + 30))
        draw.text((1225, y_top + 252), "GP-20021 Zoom (Bevels)", fill=(120, 220, 255), font=font)
        
        # 6. Diff Heatmap
        arr_ag_rec = np.array(ag_full.crop(w["rec_crop"]))
        arr_gp_rec = np.array(gp_full.crop(w["rec_crop"]))
        heat_img = create_diff_heatmap(arr_ag_rec, arr_gp_rec).resize((260, 220), Image.Resampling.LANCZOS)
        sheet.paste(heat_img, (1500, y_top + 30))
        draw.text((1500, y_top + 252), "Lift & Glint Delta", fill=(255, 140, 40), font=font)

    out_file = os.path.join(OUT_DIR, f"compare-{light_key}.jpg")
    sheet.save(out_file, quality=92)
    print(f"Saved: {out_file}")

print("All comparison sheets generated.")
