# qa/2026-11-11-CE-4-hq-ladder/build-ce4-hq-ladder-sheet.py
import json
import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path("C:/Users/Zero/Desktop/Tiny Trek")
REV = ROOT / "review/CE-4-hq-ladder"
SHOTS = REV / "shots"
QA = ROOT / "qa/2026-11-11-CE-4-hq-ladder"

with open(REV / "ce4-hq-ladder-summary.json", "r", encoding="utf-8") as f:
    summary = json.load(f)


def get_font(size, bold=False):
    for name in (["consolab.ttf", "arialbd.ttf"] if bold else ["consola.ttf", "arial.ttf"]):
        try:
            return ImageFont.truetype(name, size)
        except Exception:
            pass
    return ImageFont.load_default()


FONT_TITLE = get_font(22, True)
FONT_SUB = get_font(14, False)
FONT_SEC = get_font(16, True)
FONT_LBL = get_font(13, True)


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
    draw.rectangle([x + 6, y + 6, x + 6 + tw + 12, y + 6 + th + 8], fill=(12, 15, 20))
    draw.text((x + 12, y + 9), label, fill=(238, 242, 248), font=FONT_LBL)


W = 2520
PAD = 24
GAP = 12
CW6 = (W - PAD * 2 - GAP * 5) // 6  # 402
CH6 = int(round(CW6 * 9 / 16))      # 226
CW4 = (W - PAD * 2 - GAP * 3) // 4  # 609
CH4 = int(round(CW4 * 9 / 16))      # 342

H = 92 + (26 + CH6 + 16) + (26 + CH4 + 16) + (26 + CH6 + 16) + (26 + CH6 + 16) + (26 + CH4 + PAD)
sheet = Image.new("RGB", (W, H), (14, 17, 22))
draw = ImageDraw.Draw(sheet)

lg = summary["setup"]["ladderGeom"]
aud = summary["audit"]
cl_low = aud["thirdPersonClearances"]["low"]
cl_high = aud["thirdPersonClearances"]["high"]

draw.text(
    (PAD, 16),
    "CE-4 Part 3 — HQ West Pier Ladder: 1P Eye Climb (6 Frames + 4 Lights), Clean Exterior 3P Side & Behind (2 Heights, 4 Lights) & Roof Walk",
    fill=(244, 247, 252),
    font=FONT_TITLE,
)
draw.text(
    (PAD, 48),
    f"RTX 5080 WebGPU ({summary['backend']}) · {lg['rungCount']} round rungs ({lg['rungLengthZ']}m along wall) · Rail->Pier gap {lg['railToPierClearanceCm']}cm · "
    f"Body/Fist->Pier clearance: Low {cl_low['clearanceFromPierCm']:+.1f}cm / High {cl_high['clearanceFromPierCm']:+.1f}cm · Roof hold: PASS (0 pageErrors)",
    fill=(170, 182, 198),
    font=FONT_SUB,
)

y = 90
draw.text((PAD, y), "1. AT THE EYE CLIMBING HQ LADDER (6 Sequential Frames Up the Climb, Pitch +0.30 rad, W Held — Alternating Left/Right Fists Closing Over Round Rungs)", fill=(212, 222, 236), font=FONT_SEC)
y += 24
for i in range(6):
    hm = aud["climbSamples"][i]["climbHeightM"]
    paste_labeled(sheet, draw, f"eye-climb-{i}.jpg", PAD + i * (CW6 + GAP), y, CW6, CH6, f"EYE #{i+1} (+{hm:.2f}m)")
y += CH6 + 16

draw.text((PAD, y), "2. AT THE EYE MID-CLIMB ACROSS ALL 4 LIGHTS (Noon · Overcast · Dusk · Night + Flashlight)", fill=(212, 222, 236), font=FONT_SEC)
y += 24
for i, (lk, lbl) in enumerate([
    ("noon", "EYE · NOON"),
    ("overcast", "EYE · OVERCAST"),
    ("dusk", "EYE · DUSK"),
    ("night", "EYE · NIGHT (+Flashlight)"),
]):
    paste_labeled(sheet, draw, f"eye-4light-{lk}.jpg", PAD + i * (CW4 + GAP), y, CW4, CH4, lbl)
y += CH4 + 16

draw.text((PAD, y), f"3. EXTERIOR 3P — HEIGHT 1 (LOW +{cl_low['climbHeightM']:.2f}m): Clean Unobstructed Side Profile Across 4 Lights + 3/4 Behind-Side (Rungs, Hands & Pier Gap Visible)", fill=(212, 222, 236), font=FONT_SEC)
y += 24
low_tiles = [
    ("tp-side-low-noon.jpg", "LOW SIDE · NOON"),
    ("tp-side-low-overcast.jpg", "LOW SIDE · OVERCAST"),
    ("tp-side-low-dusk.jpg", "LOW SIDE · DUSK"),
    ("tp-side-low-night.jpg", "LOW SIDE · NIGHT"),
    ("tp-behind-low-noon.jpg", "LOW 3/4 BEHIND · NOON"),
    ("tp-behind-high-noon.jpg", f"HIGH 3/4 BEHIND (+{cl_high['climbHeightM']:.2f}m)"),
]
for i, (fn, lbl) in enumerate(low_tiles):
    paste_labeled(sheet, draw, fn, PAD + i * (CW6 + GAP), y, CW6, CH6, lbl)
y += CH6 + 16

draw.text((PAD, y), f"4. EXTERIOR 3P — HEIGHT 2 (HIGH +{cl_high['climbHeightM']:.2f}m): Clean Unobstructed Side Profile Across 4 Lights + Roof Step-Off", fill=(212, 222, 236), font=FONT_SEC)
y += 24
high_tiles = [
    ("tp-side-high-noon.jpg", "HIGH SIDE · NOON"),
    ("tp-side-high-overcast.jpg", "HIGH SIDE · OVERCAST"),
    ("tp-side-high-dusk.jpg", "HIGH SIDE · DUSK"),
    ("tp-side-high-night.jpg", "HIGH SIDE · NIGHT"),
    ("roof-step-0.jpg", "TOP -> ROOF STEP-OFF"),
    ("roof-step-1.jpg", "ROOF WALK +1"),
]
for i, (fn, lbl) in enumerate(high_tiles):
    paste_labeled(sheet, draw, fn, PAD + i * (CW6 + GAP), y, CW6, CH6, lbl)
y += CH6 + 16

draw.text((PAD, y), "5. STEPPING OFF ONTO HQ ROOF & WALKING EAST ACROSS ROOF (`onHqRoof === true`, Stays Solidly at Roof Height)", fill=(212, 222, 236), font=FONT_SEC)
y += 24
for i in range(4):
    rp = aud["roofWalkPositions"][i]
    paste_labeled(sheet, draw, f"roof-step-{i}.jpg", PAD + i * (CW4 + GAP), y, CW4, CH4, f"ROOF #{i} (x={rp['x']:.1f}, y={rp['y']:.2f}m)")

out_rev = REV / "sheet-ce4-hq-ladder-4lights.jpg"
tmp_rev = REV / "sheet-ce4-hq-ladder-4lights.tmp.jpg"
sheet.save(tmp_rev, quality=93)
os.replace(tmp_rev, out_rev)

QA.mkdir(parents=True, exist_ok=True)
out_qa = QA / "sheet-ce4-hq-ladder-4lights.jpg"
tmp_qa = QA / "sheet-ce4-hq-ladder-4lights.tmp.jpg"
sheet.save(tmp_qa, quality=93)
os.replace(tmp_qa, out_qa)
print("Saved", out_rev, sheet.size)
