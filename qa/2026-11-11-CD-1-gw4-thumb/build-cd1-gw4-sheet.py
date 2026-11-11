# qa/2026-11-11-CD-1-gw4-thumb/build-cd1-gw4-sheet.py
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path("C:/Users/Zero/Desktop/Tiny Trek")
REV = ROOT / "review/CD-1-gw4-thumb"
SHOTS = REV / "shots"
QA = ROOT / "qa/2026-11-11-CD-1-gw4-thumb"

with open(REV / "cd1-gw4-summary.json", "r", encoding="utf-8") as f:
    summary = json.load(f)


def get_font(size, bold=False):
    for name in (["consolab.ttf", "arialbd.ttf"] if bold else ["consola.ttf", "arial.ttf"]):
        try:
            return ImageFont.truetype(name, size)
        except Exception:
            pass
    return ImageFont.load_default()


FONT_TITLE = get_font(22, True)
FONT_SUB = get_font(15, False)
FONT_SEC = get_font(16, True)
FONT_LBL = get_font(14, True)


def load_fit(name, w, h):
    im = Image.open(SHOTS / name).convert("RGB")
    sw, sh = im.size
    scale = max(w / sw, h / sh)
    nw, nh = int(round(sw * scale)), int(round(sh * scale))
    im = im.resize((nw, nh), Image.Resampling.LANCZOS)
    x0 = (nw - w) // 2
    y0 = (nh - h) // 2
    return im.crop((x0, y0, x0 + w, y0 + h))


def paste_labeled(canvas, draw, name, x, y, w, h, label):
    tile = load_fit(name, w, h)
    canvas.paste(tile, (x, y))
    draw.rectangle([x, y, x + w - 1, y + h - 1], outline=(62, 68, 78), width=1)
    bbox = draw.textbbox((0, 0), label, font=FONT_LBL)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.rectangle([x + 8, y + 8, x + 8 + tw + 14, y + 8 + th + 10], fill=(12, 15, 20))
    draw.text((x + 15, y + 12), label, fill=(238, 242, 248), font=FONT_LBL)


W = 2440
PAD = 24
GAP = 14
CW4 = (W - PAD * 2 - GAP * 3) // 4  # 587
CH4 = int(round(CW4 * 9 / 16))      # 330
CW5 = (W - PAD * 2 - GAP * 4) // 5  # 467
CH5 = 350

H = 88 + 28 + CH4 + 28 + CH4 + 28 + CH5 + PAD
sheet = Image.new("RGB", (W, H), (14, 17, 22))
draw = ImageDraw.Draw(sheet)

hip_c = summary["clearances"]["hip"]
aim_c = summary["clearances"]["aimed"]
draw.text(
    (PAD, 18),
    "CD-1 — GW-4 (M4) Support Hand Re-Hold (Thumb Forward Along Lower-Left Handguard, Forearm Below Gun & Sight Line)",
    fill=(244, 247, 252),
    font=FONT_TITLE,
)
draw.text(
    (PAD, 48),
    f"RTX 5080 WebGPU ({summary['backend']})  ·  Eye-space support-hand/forearm top Y: Hip {hip_c['leftArmMaxYInEye']:+.3f}m ({hip_c['belowSightLineByMeters']*1000:.0f}mm below eye axis)  |  Aimed {aim_c['leftArmMaxYInEye']:+.3f}m ({aim_c['belowSightLineByMeters']*1000:.0f}mm below sight line)",
    fill=(170, 182, 198),
    font=FONT_SUB,
)

y = 88
draw.text((PAD, y), "1. FIRST-PERSON HIP ACROSS 4 LIGHTS (1280x720 Live Firing Line)", fill=(212, 222, 236), font=FONT_SEC)
y += 26
for idx, (lk, title) in enumerate([
    ("noon", "HIP · NOON"),
    ("overcast", "HIP · OVERCAST"),
    ("dusk", "HIP · DUSK"),
    ("night", "HIP · NIGHT (+Flashlight)"),
]):
    paste_labeled(sheet, draw, f"gw4-hip-{lk}.jpg", PAD + idx * (CW4 + GAP), y, CW4, CH4, title)
y += CH4 + 18

draw.text((PAD, y), "2. FIRST-PERSON AIMED (ADS) ACROSS 4 LIGHTS (Sight Line Unobstructed in Every Light)", fill=(212, 222, 236), font=FONT_SEC)
y += 26
for idx, (lk, title) in enumerate([
    ("noon", "AIMED · NOON"),
    ("overcast", "AIMED · OVERCAST"),
    ("dusk", "AIMED · DUSK"),
    ("night", "AIMED · NIGHT (+Flashlight)"),
]):
    paste_labeled(sheet, draw, f"gw4-aimed-{lk}.jpg", PAD + idx * (CW4 + GAP), y, CW4, CH4, title)
y += CH4 + 18

draw.text((PAD, y), "3. SUPPORT-HAND CLOSE-UPS ON RTX 5080 (From Eye [Hip & Aim], Left, Below & Front)", fill=(212, 222, 236), font=FONT_SEC)
y += 26
for idx, (fn, title) in enumerate([
    ("gw4-close-eye-hip.jpg", "CLOSE · EYE (Hip)"),
    ("gw4-close-eye-aimed.jpg", "CLOSE · EYE (Aimed Sight Line)"),
    ("gw4-close-left.jpg", "CLOSE · LEFT (Thumb Forward)"),
    ("gw4-close-below.jpg", "CLOSE · BELOW (Palm Under)"),
    ("gw4-close-front.jpg", "CLOSE · FRONT (Fingers Right)"),
]):
    paste_labeled(sheet, draw, fn, PAD + idx * (CW5 + GAP), y, CW5, CH5, title)

import os
out_rev = REV / "sheet-cd1-gw4-thumb-4lights.jpg"
tmp_rev = REV / "sheet-cd1-gw4-thumb-4lights.tmp.jpg"
sheet.save(tmp_rev, quality=93)
os.replace(tmp_rev, out_rev)
QA.mkdir(parents=True, exist_ok=True)
out_qa = QA / "sheet-cd1-gw4-thumb-4lights.jpg"
tmp_qa = QA / "sheet-cd1-gw4-thumb-4lights.tmp.jpg"
sheet.save(tmp_qa, quality=93)
os.replace(tmp_qa, out_qa)
print("Saved", out_rev, sheet.size)
