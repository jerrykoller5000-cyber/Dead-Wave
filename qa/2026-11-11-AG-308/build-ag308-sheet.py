# qa/2026-11-11-AG-308/build-ag308-sheet.py
import json
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = "C:/Users/Zero/Desktop/Tiny Trek"
SHOTS = os.path.join(ROOT, "review/AG-308/shots")
SUMMARY_PATH = os.path.join(ROOT, "review/AG-308/ag308-summary.json")
OUT_REV = os.path.join(ROOT, "review/AG-308")
OUT_QA = os.path.join(ROOT, "qa/2026-11-11-AG-308")
os.makedirs(OUT_REV, exist_ok=True)
os.makedirs(OUT_QA, exist_ok=True)

def load_font(sz):
    for p in ["C:/Windows/Fonts/consolab.ttf", "C:/Windows/Fonts/segoeui.ttf", "C:/Windows/Fonts/arial.ttf"]:
        if os.path.exists(p):
            return ImageFont.truetype(p, sz)
    return ImageFont.load_default()

F_TITLE = load_font(18)
F_SUB = load_font(12)
F_LBL = load_font(11)

LIGHTS = ["noon", "overcast", "dusk", "night"]
VIEWS = [
    ("01-eye-clean", "Eye: Pristine Dummy (Tactical Vinyl, Seams, Spring)"),
    ("02-eye-hits", "Eye: Multi-Weapon Hits (Slash, Scorch, Bullets, Scuff)"),
    ("03-third-person", "3P: Marine at Firing Bench & Range Floor"),
    ("04-detail-decal", "Detail: Chest Knife Cut & Chainsaw Scorch Decals")
]

# Sheet 1: Master 4-Lights x 4-Views Grid (2000 x 1280)
cols = len(VIEWS)
rows = len(LIGHTS)
tw, th = 420, 236
pad = 12
hdr_h = 60
lbl_h = 24

canvas_w = pad + cols * (tw + pad)
canvas_h = hdr_h + rows * (th + lbl_h + pad) + pad

sheet1 = Image.new("RGB", (canvas_w, canvas_h), (16, 20, 24))
draw1 = ImageDraw.Draw(sheet1)

draw1.text(
    (pad, 12),
    "AG-308 · J137 Melee Practice Striking Dummy in Training Ground Across 4 Lights (RTX 5080 WebGPU)",
    fill=(240, 246, 252),
    font=F_TITLE
)
draw1.text(
    (pad, 36),
    "Human Scale (1.78m) · Worn Combat Vinyl & Canvas · Sprung Steel Stand · Blade Cut & Chainsaw Scorch Decals · Draw delta: +3 calls / 59.8 fps",
    fill=(160, 175, 190),
    font=F_SUB
)

for r_idx, light in enumerate(LIGHTS):
    y0 = hdr_h + r_idx * (th + lbl_h + pad)
    for c_idx, (v_key, v_title) in enumerate(VIEWS):
        x0 = pad + c_idx * (tw + pad)
        shot_fn = f"dummy-{light}-{v_key}.jpg"
        shot_path = os.path.join(SHOTS, shot_fn)
        
        lbl_text = f"[{light.upper()}] {v_title}"
        draw1.text((x0, y0), lbl_text, fill=(200, 215, 230), font=F_LBL)
        
        if os.path.exists(shot_path):
            try:
                img = Image.open(shot_path).convert("RGB")
                img = img.resize((tw, th), Image.Resampling.LANCZOS)
                sheet1.paste(img, (x0, y0 + lbl_h))
            except Exception as e:
                print(f"Error loading {shot_path}: {e}")
        else:
            draw1.rectangle([x0, y0 + lbl_h, x0 + tw, y0 + lbl_h + th], fill=(30, 35, 42))
            draw1.text((x0 + 20, y0 + lbl_h + 40), f"Missing: {shot_fn}", fill=(240, 100, 100), font=F_LBL)

out_sheet1_rev = os.path.join(OUT_REV, "sheet-ag308-4lights.jpg")
out_sheet1_qa = os.path.join(OUT_QA, "sheet-ag308-4lights.jpg")
sheet1.save(out_sheet1_rev, "JPEG", quality=92)
sheet1.save(out_sheet1_qa, "JPEG", quality=92)
print(f"[AG-308] Saved {out_sheet1_rev} ({canvas_w}x{canvas_h})")

# Sheet 2: Wobble Physics & Decal Anatomy Focus Sheet
sheet2_w = 1600
sheet2_h = 900
sheet2 = Image.new("RGB", (sheet2_w, sheet2_h), (14, 18, 22))
draw2 = ImageDraw.Draw(sheet2)

draw2.text(
    (20, 14),
    "AG-308 Dummy Anatomy & Dynamic Wobble Verification · Damped Harmonic Oscillator (ω=13.5 rad/s, ζ=0.28)",
    fill=(240, 246, 252),
    font=F_TITLE
)

# 4 Panels:
# Top-Left: Clean Eye Noon (tw=760, th=400)
# Top-Right: Hits Eye Noon (tw=760, th=400)
# Bottom-Left: Dynamic Wobble Flex Noon (tw=760, th=400)
# Bottom-Right: Detail Decals Noon (tw=760, th=400)
panels = [
    ("dummy-noon-01-eye-clean.jpg", "Pristine Human-Scale Striking Dummy (1.78m, Sprung Stand, Tactical Vinyl)", 20, 56, 760, 380),
    ("dummy-noon-02-eye-hits.jpg", "Multi-Weapon Strikes (Knife Slashes, Chainsaw Scorch, Bullet Holes, Blunt Scuff)", 800, 56, 760, 380),
    ("dummy-noon-05-wobble-flex.jpg", "Dynamic Spring Wobble Flex Under Blade Impact (Oscillation Damping over 1.4s)", 20, 460, 760, 380),
    ("dummy-noon-04-detail-decal.jpg", "Decal Macro: Parted Vinyl Blade Cut & Charred Chainsaw Scorch with Embers", 800, 460, 760, 380),
]

for fn, title, px, py, pw, ph in panels:
    draw2.text((px, py), title, fill=(210, 225, 240), font=F_LBL)
    p_path = os.path.join(SHOTS, fn)
    if os.path.exists(p_path):
        try:
            img = Image.open(p_path).convert("RGB")
            img = img.resize((pw, ph), Image.Resampling.LANCZOS)
            sheet2.paste(img, (px, py + 20))
        except Exception as e:
            print(f"Error loading {p_path}: {e}")
    else:
        draw2.rectangle([px, py + 20, px + pw, py + 20 + ph], fill=(30, 35, 42))

out_sheet2_rev = os.path.join(OUT_REV, "dummy-details.jpg")
out_sheet2_qa = os.path.join(OUT_QA, "dummy-details.jpg")
sheet2.save(out_sheet2_rev, "JPEG", quality=92)
sheet2.save(out_sheet2_qa, "JPEG", quality=92)
print(f"[AG-308] Saved {out_sheet2_rev} ({sheet2_w}x{sheet2_h})")
