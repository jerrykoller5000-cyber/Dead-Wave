# qa/2026-11-11-AG-311/build-ag311-sheets.py
# Builds contact sheets for AG-311 GPU verification of GP-20108 Training Ground ceiling.

import json
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = "C:/Users/Zero/Desktop/Tiny Trek"
SHOTS_DIR = os.path.join(ROOT, "qa/2026-11-11-AG-311/shots")
SUMMARY_PATH = os.path.join(ROOT, "qa/2026-11-11-AG-311/shots/ag311-summary.json")
OUT_QA = os.path.join(ROOT, "qa/2026-11-11-AG-311")
OUT_REV = os.path.join(ROOT, "review/AG-311")

os.makedirs(OUT_QA, exist_ok=True)
os.makedirs(OUT_REV, exist_ok=True)

def load_font(size, bold=False):
    candidates = [
        "C:/Windows/Fonts/consolab.ttf" if bold else "C:/Windows/Fonts/consola.ttf",
        "C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf",
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf"
    ]
    for p in candidates:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    return ImageFont.load_default()

F_TITLE = load_font(20, bold=True)
F_SECTION = load_font(15, bold=True)
F_LABEL = load_font(12, bold=True)
F_META = load_font(11)

with open(SUMMARY_PATH, "r", encoding="utf-8") as f:
    summary = json.load(f)

# ---------------------------------------------------------------------------
# Sheet 1: Lights (5) + Lane Eye Views (4)
# ---------------------------------------------------------------------------
tw, th = 320, 180
pad = 12
hdr_h = 60
sec_h = 28
lbl_h = 24

# Row 1: 5 lights (noon, overcast, dusk, night, lights-off)
# Row 2: 4 lane views (lane-from-line noon/off, lane-mid-back noon/off) + 1 blank/info tile
cols_1 = 5
w_1 = pad + cols_1 * (tw + pad)
h_1 = hdr_h + (sec_h + th + lbl_h + pad) * 2 + pad

canvas_1 = Image.new("RGB", (w_1, h_1), (18, 22, 28))
drw_1 = ImageDraw.Draw(canvas_1)

# Title
drw_1.text(
    (pad, 14),
    "AG-311 Sheet 1 · Training Ground Ceiling in 4 Lights + Lights-Off & Downrange Lane Views (RTX 5080 WebGPU)",
    fill=(240, 246, 255),
    font=F_TITLE
)
drw_1.text(
    (pad, 38),
    "J140 / GP-20108: Downward-facing baked range ceiling, overhead safety baffles, light fixtures, supply duct, sprinkler line",
    fill=(160, 180, 200),
    font=F_META
)

# Section 1: 4 Lights + Lights-Off
y_sec1 = hdr_h
drw_1.text((pad, y_sec1), "1. FIRING LINE EYE VIEW LOOKING UP AT CEILING (NOON, OVERCAST, DUSK, NIGHT, LIGHTS-OFF)", fill=(255, 215, 0), font=F_SECTION)

lights_order = ["noon", "overcast", "dusk", "night", "lights-off"]
for idx, lk in enumerate(lights_order):
    x = pad + idx * (tw + pad)
    y = y_sec1 + sec_h
    shot_fn = f"light-{lk}.png"
    shot_path = os.path.join(SHOTS_DIR, shot_fn)
    if os.path.exists(shot_path):
        img = Image.open(shot_path).resize((tw, th), Image.Resampling.LANCZOS)
        canvas_1.paste(img, (x, y))
    drw_1.rectangle([x, y, x + tw, y + th], outline=(60, 80, 100), width=1)
    
    # Label
    info = summary["lights"].get(lk, {})
    draws = info.get("draws", "?")
    lbl = f"{lk.upper()} (draws: {draws})"
    drw_1.text((x + 4, y + th + 4), lbl, fill=(220, 230, 240), font=F_LABEL)

# Section 2: Downrange Lane Views
y_sec2 = y_sec1 + sec_h + th + lbl_h + pad
drw_1.text((pad, y_sec2), "2. DOWNRANGE LANE EYE VIEWS (CHATGPT GP-20108 PROOF REPRODUCED ON RTX 5080 WEBGPU)", fill=(255, 215, 0), font=F_SECTION)

lane_keys = [
    ("lane-from-line-noon.png", "Firing Line -> Downrange 45° Up (NOON)"),
    ("lane-from-line-off.png", "Firing Line -> Downrange 45° Up (OFF)"),
    ("lane-mid-back-noon.png", "Mid-Range (z+14) -> Line 45° Up (NOON)"),
    ("lane-mid-back-off.png", "Mid-Range (z+14) -> Line 45° Up (OFF)"),
    ("ballistic-ceiling-impact.png", "Ceiling Impact Decal (Upward Round)")
]

for idx, (fn, desc) in enumerate(lane_keys):
    x = pad + idx * (tw + pad)
    y = y_sec2 + sec_h
    shot_path = os.path.join(SHOTS_DIR, fn)
    if os.path.exists(shot_path):
        img = Image.open(shot_path).resize((tw, th), Image.Resampling.LANCZOS)
        canvas_1.paste(img, (x, y))
    drw_1.rectangle([x, y, x + tw, y + th], outline=(60, 80, 100), width=1)
    drw_1.text((x + 4, y + th + 4), desc, fill=(220, 230, 240), font=F_LABEL)

out_s1_qa = os.path.join(OUT_QA, "sheet-1-ag311-lights-and-lanes.jpg")
out_s1_rev = os.path.join(OUT_REV, "sheet-1-ag311-lights-and-lanes.jpg")
canvas_1.save(out_s1_qa, quality=92)
canvas_1.save(out_s1_rev, quality=92)
print("Saved Sheet 1:", out_s1_qa)

# ---------------------------------------------------------------------------
# Sheet 2: 8-Spot TG Walk (Up vs Ahead) + 3P Overhead View
# ---------------------------------------------------------------------------
cols_2 = 8
w_2 = pad + cols_2 * (tw + pad)
h_2 = hdr_h + (sec_h + th + lbl_h + pad) * 2 + (sec_h + th + lbl_h + pad) + pad

canvas_2 = Image.new("RGB", (w_2, h_2), (18, 22, 28))
drw_2 = ImageDraw.Draw(canvas_2)

drw_2.text(
    (pad, 14),
    "AG-311 Sheet 2 · Training Ground 8-Spot Walk (Looking Up vs Ahead) & 3P Overhead Transparency",
    fill=(240, 246, 255),
    font=F_TITLE
)
drw_2.text(
    (pad, 38),
    "Every area verified at eye height: range deck, trusses, roofs. In 3P, ceiling deck and baffles hide for overhead camera.",
    fill=(160, 180, 200),
    font=F_META
)

# Row 1: 8 spots looking UP
y_row1 = hdr_h
drw_2.text((pad, y_row1), "1. LOOKING UP AT CEILING ACROSS ALL 8 TRAINING GROUND SPOTS (SOLID DECK / TRUSSES / ROOF EVERYWHERE)", fill=(255, 215, 0), font=F_SECTION)

spots = summary.get("walkSpots", [])
for idx, sp in enumerate(spots):
    x = pad + idx * (tw + pad)
    y = y_row1 + sec_h
    shot_fn = f"walk-{sp['name']}-up.png"
    shot_path = os.path.join(SHOTS_DIR, shot_fn)
    if os.path.exists(shot_path):
        img = Image.open(shot_path).resize((tw, th), Image.Resampling.LANCZOS)
        canvas_2.paste(img, (x, y))
    drw_2.rectangle([x, y, x + tw, y + th], outline=(60, 80, 100), width=1)
    drw_2.text((x + 4, y + th + 4), f"{sp['room']} (UP)", fill=(220, 230, 240), font=F_LABEL)

# Row 2: 8 spots looking AHEAD
y_row2 = y_row1 + sec_h + th + lbl_h + pad
drw_2.text((pad, y_row2), "2. LOOKING AHEAD AT EYE LEVEL ACROSS ALL 8 SPOTS (CEILING CONTACTS, WALL TOPS SEATED)", fill=(255, 215, 0), font=F_SECTION)

for idx, sp in enumerate(spots):
    x = pad + idx * (tw + pad)
    y = y_row2 + sec_h
    shot_fn = f"walk-{sp['name']}-ahead.png"
    shot_path = os.path.join(SHOTS_DIR, shot_fn)
    if os.path.exists(shot_path):
        img = Image.open(shot_path).resize((tw, th), Image.Resampling.LANCZOS)
        canvas_2.paste(img, (x, y))
    drw_2.rectangle([x, y, x + tw, y + th], outline=(60, 80, 100), width=1)
    drw_2.text((x + 4, y + th + 4), f"{sp['room']} (AHEAD)", fill=(220, 230, 240), font=F_LABEL)

# Row 3: 3P Overhead + Verification Details
y_row3 = y_row2 + sec_h + th + lbl_h + pad
drw_2.text((pad, y_row3), "3. 3P OVERHEAD VIEW (CEILING HIDDEN, CAMERA SEES IN) & BALLISTIC CEILING IMPACT", fill=(255, 215, 0), font=F_SECTION)

row3_items = [
    ("third-person-overhead.png", "3P Overhead: Ceiling Deck & Baffles Hidden", 2),
    ("ballistic-ceiling-impact.png", "Ceiling Impact: Solid Normal (0,-1,0)", 2),
    ("lane-from-line-off.png", "Night / Lights-Off Legibility: Emissive Deck", 2),
    ("walk-range-lanes-up.png", "J128: Rubber Baffles & Caged Fixtures Contact", 2)
]

cur_x = pad
for fn, desc, col_span in row3_items:
    span_w = col_span * tw + (col_span - 1) * pad
    y = y_row3 + sec_h
    shot_path = os.path.join(SHOTS_DIR, fn)
    if os.path.exists(shot_path):
        img = Image.open(shot_path).resize((span_w, th), Image.Resampling.LANCZOS)
        canvas_2.paste(img, (cur_x, y))
    drw_2.rectangle([cur_x, y, cur_x + span_w, y + th], outline=(60, 80, 100), width=1)
    drw_2.text((cur_x + 4, y + th + 4), desc, fill=(220, 230, 240), font=F_LABEL)
    cur_x += span_w + pad

out_s2_qa = os.path.join(OUT_QA, "sheet-2-ag311-walk-and-details.jpg")
out_s2_rev = os.path.join(OUT_REV, "sheet-2-ag311-walk-and-details.jpg")
canvas_2.save(out_s2_qa, quality=92)
canvas_2.save(out_s2_rev, quality=92)
print("Saved Sheet 2:", out_s2_qa)
