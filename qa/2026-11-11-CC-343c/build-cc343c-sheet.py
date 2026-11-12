# qa/2026-11-11-CC-343c/build-cc343c-sheet.py
import json
import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path("C:/Users/Zero/Desktop/Tiny Trek")
REV = ROOT / "review/CC-343c"
SHOTS = REV / "shots"
QA = ROOT / "qa/2026-11-11-CC-343c"
CLAUDE_DIR = ROOT / "Claude outputs/CC-343c"

with open(REV / "cc343c-summary.json", "r", encoding="utf-8") as f:
    summary = json.load(f)

def get_font(size, bold=False):
    for name in (["consolab.ttf", "arialbd.ttf"] if bold else ["consola.ttf", "arial.ttf"]):
        try:
            return ImageFont.truetype(f"C:/Windows/Fonts/{name}", size)
        except Exception:
            pass
    return ImageFont.load_default()

FONT_TITLE = get_font(22, True)
FONT_SUB = get_font(15, False)
FONT_SEC = get_font(15, True)
FONT_LBL = get_font(13, True)

SCENES = [
    ("stairs-crouched", "1. STAIRS CROUCHED (Facing Up)"),
    ("stairs-standing", "2. STAIRS STANDING (After Step)"),
    ("stairs-down",     "3. STAIRS DOWN (Facing Down)"),
    ("stairs-walking",  "4. STAIRS WALKING UP"),
    ("deck-edge",       "5. DECK EDGE STANDING (Part 1 Squat vs Part 2 Stepped-In)"),
]
LIGHTS = [
    ("noon",     "NOON"),
    ("overcast", "OVERCAST (Rain)"),
    ("dusk",     "DUSK"),
    ("night",    "NIGHT"),
]

def load_fit(name, w, h, crop_box=None):
    im = Image.open(SHOTS / name).convert("RGB")
    if crop_box is not None:
        cw, ch = im.size
        im = im.crop((int(cw * crop_box[0]), int(ch * crop_box[1]), int(cw * crop_box[2]), int(ch * crop_box[3])))
    sw, sh = im.size
    scale = max(w / sw, h / sh)
    nw, nh = int(round(sw * scale)), int(round(sh * scale))
    im = im.resize((nw, nh), Image.Resampling.LANCZOS)
    x0 = (nw - w) // 2
    y0 = (nh - h) // 2
    return im.crop((x0, y0, x0 + w, y0 + h))

def paste_tile(canvas, draw, fn, x, y, w, h, label, badge_col=(16, 20, 28), crop_box=None):
    tile = load_fit(fn, w, h, crop_box=crop_box)
    canvas.paste(tile, (x, y))
    draw.rectangle([x, y, x + w - 1, y + h - 1], outline=(62, 68, 78), width=1)
    bbox = draw.textbbox((0, 0), label, font=FONT_LBL)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.rectangle([x + 6, y + 6, x + 6 + tw + 12, y + 6 + th + 8], fill=badge_col)
    draw.text((x + 12, y + 9), label, fill=(240, 244, 250), font=FONT_LBL)

# Sheet 1: Full 5 scenes x 4 lights Part 1 (BEFORE) vs Part 2 (AFTER)
TW, TH = 300, 225
GAP = 8
PAIR_GAP = 16
PAD = 22
W = PAD * 2 + 8 * TW + 4 * GAP + 3 * PAIR_GAP
ROW_H = 26 + TH + 14
H = 88 + len(SCENES) * ROW_H + PAD

sheet = Image.new("RGB", (W, H), (14, 17, 22))
draw = ImageDraw.Draw(sheet)
draw.text((PAD, 18), "CC-343 Part 2 (CC-343c) — Marine Legs & Boots: Part 1 (18:50 BEFORE) vs Part 2 (AFTER) Across 4 Lights", fill=(244, 247, 252), font=FONT_TITLE)
draw.text((PAD, 48), f"RTX 5080 WebGPU ({summary['backend']}) · Same yaw=65, pitch=18, dist=2.7 Cameras · Left = Part 1 (18:50), Right = Part 2 (21:30Z)", fill=(170, 182, 198), font=FONT_SUB)

y = 88
for sc_key, sc_title in SCENES:
    draw.text((PAD, y), sc_title, fill=(220, 228, 242), font=FONT_SEC)
    y += 24
    x = PAD
    for li, (lk, ltitle) in enumerate(LIGHTS):
        paste_tile(sheet, draw, f"b-{sc_key}-{lk}.png", x, y, TW, TH, f"PART 1 · {ltitle}", (68, 28, 28))
        x += TW + GAP
        paste_tile(sheet, draw, f"a-{sc_key}-{lk}.png", x, y, TW, TH, f"PART 2 · {ltitle}", (22, 62, 36))
        x += TW + (PAIR_GAP if li < 3 else 0)
    y += TH + 16

for out_dir in (REV, QA, CLAUDE_DIR):
    out_dir.mkdir(parents=True, exist_ok=True)
    out_p = out_dir / "sheet-cc343c-before-after-4lights.jpg"
    tmp_p = out_dir / "sheet-cc343c-before-after-4lights.tmp.jpg"
    sheet.save(tmp_p, quality=92)
    os.replace(tmp_p, out_p)

# Sheet 2: Close-up Boot-to-Deck / Tread Zoom (Deck-Edge Standing Part 1 vs Part 2 in 4 lights + Deck-Edge-Crouched in 4 lights + Stairs Noon)
ZTW, ZTH = 430, 340
ZW = PAD * 2 + 4 * ZTW + 3 * 14
ZH = 84 + 3 * (26 + ZTH + 16) + PAD
zsheet = Image.new("RGB", (ZW, ZH), (14, 17, 22))
zdraw = ImageDraw.Draw(zsheet)
zdraw.text((PAD, 18), "CC-343 Part 2 — Boot Placement Zoom: Deck-Edge Standing (Part 1 vs Part 2) & Deck-Edge Crouched Across 4 Lights", fill=(244, 247, 252), font=FONT_TITLE)
zdraw.text((PAD, 48), "Zoomed into boots, hips, and floor deck edge on RTX 5080 WebGPU (960x720 source captures)", fill=(170, 182, 198), font=FONT_SUB)

zy = 84
# Row 1: Deck-Edge Standing PART 1 (BEFORE) in 4 lights
zdraw.text((PAD, zy), "ROW 1: DECK-EDGE STANDING — PART 1 (18:50 BEFORE: 0.25m Squat, Outer Boot Dropped to Ground)", fill=(220, 228, 242), font=FONT_SEC)
zy += 24
for idx, (lk, ltitle) in enumerate(LIGHTS):
    paste_tile(zsheet, zdraw, f"b-deck-edge-{lk}.png", PAD + idx * (ZTW + 14), zy, ZTW, ZTH, f"PART 1 · deck-edge · {ltitle}", (68, 28, 28), crop_box=(0.24, 0.22, 0.76, 0.88))
zy += ZTH + 16

# Row 2: Deck-Edge Standing PART 2 (AFTER) in 4 lights
zdraw.text((PAD, zy), "ROW 2: DECK-EDGE STANDING — PART 2 (21:30Z AFTER: Standing on Deck, Outer Boot Stepped In)", fill=(220, 228, 242), font=FONT_SEC)
zy += 24
for idx, (lk, ltitle) in enumerate(LIGHTS):
    paste_tile(zsheet, zdraw, f"a-deck-edge-{lk}.png", PAD + idx * (ZTW + 14), zy, ZTW, ZTH, f"PART 2 · deck-edge · {ltitle}", (22, 62, 36), crop_box=(0.24, 0.22, 0.76, 0.88))
zy += ZTH + 16

# Row 3: Deck-Edge Crouched (mkbatch2.py) PART 2 in 4 lights
zdraw.text((PAD, zy), "ROW 3: DECK-EDGE CROUCHED (mkbatch2.py, Facing Off Edge) — PART 2 Across 4 Lights", fill=(220, 228, 242), font=FONT_SEC)
zy += 24
for idx, (lk, ltitle) in enumerate(LIGHTS):
    paste_tile(zsheet, zdraw, f"a-deck-edge-crouched-{lk}.png", PAD + idx * (ZTW + 14), zy, ZTW, ZTH, f"PART 2 · deck-edge-crouched · {ltitle}", (26, 54, 78), crop_box=(0.24, 0.18, 0.76, 0.86))

for out_dir in (REV, QA, CLAUDE_DIR):
    out_p = out_dir / "sheet-cc343c-boots-zoom.jpg"
    tmp_p = out_dir / "sheet-cc343c-boots-zoom.tmp.jpg"
    zsheet.save(tmp_p, quality=93)
    os.replace(tmp_p, out_p)

print("Saved CC-343c sheets:", REV / "sheet-cc343c-before-after-4lights.jpg", sheet.size, zsheet.size)
