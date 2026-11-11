# qa/2026-11-11-CD-1-revolver-cup/build-cd1-revolver-sheet.py
import json
import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path("C:/Users/Zero/Desktop/Tiny Trek")
REV = ROOT / "review/CD-1-revolver-cup"
SHOTS = REV / "shots"
QA = ROOT / "qa/2026-11-11-CD-1-revolver-cup"

with open(REV / "cd1-revolver-summary.json", "r", encoding="utf-8") as f:
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

hip_m = summary["metrics"]["hip"]
aim_m = summary["metrics"]["aimed"]
elb = hip_m["elbowOffsetFromWristEye"]
draw.text(
    (PAD, 18),
    "CD-1 — Revolver Support Hand Cupped Grip (Support Fingers Under & Round Firing Fingers, Forearm From Below via VM_SUPPORT_ELBOW)",
    fill=(244, 247, 252),
    font=FONT_TITLE,
)
draw.text(
    (PAD, 48),
    f"RTX 5080 WebGPU ({summary['backend']})  ·  Support elbow-rel-wrist (eye): ({elb[0]:+.2f}, {elb[1]:+.2f}, {elb[2]:+.2f})m  ·  Clearance below sight line: Hip {hip_m['belowSightLineByMeters']*1000:.0f}mm | Aimed {aim_m['belowSightLineByMeters']*1000:.0f}mm",
    fill=(170, 182, 198),
    font=FONT_SUB,
)

y = 88
draw.text((PAD, y), "1. FIRST-PERSON HIP ACROSS 4 LIGHTS (1280x720 Live Firing Line — Forearm From Under Gun)", fill=(212, 222, 236), font=FONT_SEC)
y += 26
for idx, (lk, title) in enumerate([
    ("noon", "HIP · NOON"),
    ("overcast", "HIP · OVERCAST"),
    ("dusk", "HIP · DUSK"),
    ("night", "HIP · NIGHT (+Flashlight)"),
]):
    paste_labeled(sheet, draw, f"revolver-hip-{lk}.jpg", PAD + idx * (CW4 + GAP), y, CW4, CH4, title)
y += CH4 + 18

draw.text((PAD, y), "2. FIRST-PERSON AIMED (ADS) ACROSS 4 LIGHTS (Sights Clear & Cupped Hands Cleanly Seated)", fill=(212, 222, 236), font=FONT_SEC)
y += 26
for idx, (lk, title) in enumerate([
    ("noon", "AIMED · NOON"),
    ("overcast", "AIMED · OVERCAST"),
    ("dusk", "AIMED · DUSK"),
    ("night", "AIMED · NIGHT (+Flashlight)"),
]):
    paste_labeled(sheet, draw, f"revolver-aimed-{lk}.jpg", PAD + idx * (CW4 + GAP), y, CW4, CH4, title)
y += CH4 + 18

draw.text((PAD, y), "3. CUPPED GRIP & SLEEVE/GLOVE CLOSE-UPS ON RTX 5080 (Eye [Hip & Aim], Left, Front & Below)", fill=(212, 222, 236), font=FONT_SEC)
y += 26
for idx, (fn, title) in enumerate([
    ("revolver-close-eye-hip.jpg", "CLOSE · EYE (Hip)"),
    ("revolver-close-eye-aimed.jpg", "CLOSE · EYE (Aimed)"),
    ("revolver-close-left.jpg", "CLOSE · LEFT (Cupped Fingers)"),
    ("revolver-close-front.jpg", "CLOSE · FRONT (Wrap & Cuffs)"),
    ("revolver-close-below.jpg", "CLOSE · BELOW (Cup Under Grip)"),
]):
    paste_labeled(sheet, draw, fn, PAD + idx * (CW5 + GAP), y, CW5, CH5, title)

out_rev = REV / "sheet-cd1-revolver-cup-4lights.jpg"
tmp_rev = REV / "sheet-cd1-revolver-cup-4lights.tmp.jpg"
sheet.save(tmp_rev, quality=93)
os.replace(tmp_rev, out_rev)
QA.mkdir(parents=True, exist_ok=True)
out_qa = QA / "sheet-cd1-revolver-cup-4lights.jpg"
tmp_qa = QA / "sheet-cd1-revolver-cup-4lights.tmp.jpg"
sheet.save(tmp_qa, quality=93)
os.replace(tmp_qa, out_qa)
print("Saved", out_rev, sheet.size)
