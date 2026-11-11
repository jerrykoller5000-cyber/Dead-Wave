# qa/2026-11-11-CC-343b/build-cc343b-sheet.py
import json
import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path("C:/Users/Zero/Desktop/Tiny Trek")
REV = ROOT / "review/CC-343b"
SHOTS = REV / "shots"
QA = ROOT / "qa/2026-11-11-CC-343b"
CLAUDE_DIR = ROOT / "Claude outputs/CC-343b"

with open(REV / "cc343b-summary.json", "r", encoding="utf-8") as f:
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
FONT_SEC = get_font(15, True)
FONT_LBL = get_font(13, True)

SCENES = [
    ("stairs-crouched", "1. STAIRS CROUCHED (Facing Up)"),
    ("stairs-standing", "2. STAIRS STANDING (After Step)"),
    ("stairs-down",     "3. STAIRS DOWN (Facing Down)"),
    ("stairs-walking",  "4. STAIRS WALKING UP"),
    ("deck-edge",       "5. DECK EDGE (Lower Boot Drop)"),
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
        im = im.crop((
            int(cw * crop_box[0]),
            int(ch * crop_box[1]),
            int(cw * crop_box[2]),
            int(ch * crop_box[3]),
        ))
    sw, sh = im.size
    scale = max(w / sw, h / sh)
    nw, nh = int(round(sw * scale)), int(round(sh * scale))
    im = im.resize((nw, nh), Image.Resampling.LANCZOS)
    x0 = (nw - w) // 2
    y0 = (nh - h) // 2
    return im.crop((x0, y0, x0 + w, y0 + h))


def paste_tile(canvas, draw, fn, x, y, w, h, label, badge_col=(16, 20, 28)):
    tile = load_fit(fn, w, h)
    canvas.paste(tile, (x, y))
    draw.rectangle([x, y, x + w - 1, y + h - 1], outline=(62, 68, 78), width=1)
    bbox = draw.textbbox((0, 0), label, font=FONT_LBL)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.rectangle([x + 6, y + 6, x + 6 + tw + 12, y + 6 + th + 8], fill=badge_col)
    draw.text((x + 12, y + 9), label, fill=(240, 244, 250), font=FONT_LBL)


# Sheet 1: Full 5 scenes x 4 lights Before vs After (8 columns per scene: B/A pairs for Noon, Overcast, Dusk, Night)
TW, TH = 300, 225
GAP = 8
PAIR_GAP = 16
PAD = 22
W = PAD * 2 + 8 * TW + 4 * GAP + 3 * PAIR_GAP
ROW_H = 26 + TH + 14
H = 88 + len(SCENES) * ROW_H + PAD

sheet = Image.new("RGB", (W, H), (14, 17, 22))
draw = ImageDraw.Draw(sheet)

draw.text(
    (PAD, 18),
    "CC-343 Part 1 — Marine Boots & Hip Drop on Stairs and Deck Edge: Before vs After Across 4 Lights (mkbatch.py Recipe)",
    fill=(244, 247, 252),
    font=FONT_TITLE,
)
draw.text(
    (PAD, 48),
    f"RTX 5080 WebGPU ({summary['backend']})  ·  5 Scenes × 4 Lights × Before/After (40 Captures, 0 Page/GPU Errors)  ·  Each Light Pair: Left = BEFORE, Right = AFTER",
    fill=(170, 182, 198),
    font=FONT_SUB,
)

y = 88
for sc_key, sc_title in SCENES:
    draw.text((PAD, y), sc_title, fill=(220, 228, 242), font=FONT_SEC)
    y += 24
    x = PAD
    for li, (lk, ltitle) in enumerate(LIGHTS):
        paste_tile(sheet, draw, f"b-{sc_key}-{lk}.png", x, y, TW, TH, f"BEFORE · {ltitle}", (68, 28, 28))
        x += TW + GAP
        paste_tile(sheet, draw, f"a-{sc_key}-{lk}.png", x, y, TW, TH, f"AFTER · {ltitle}", (22, 62, 36))
        x += TW + (PAIR_GAP if li < 3 else 0)
    y += TH + 16

for out_dir in (REV, QA, CLAUDE_DIR):
    out_dir.mkdir(parents=True, exist_ok=True)
    out_p = out_dir / "sheet-cc343b-before-after-4lights.jpg"
    tmp_p = out_dir / "sheet-cc343b-before-after-4lights.tmp.jpg"
    sheet.save(tmp_p, quality=92)
    os.replace(tmp_p, out_p)

# Sheet 2: Close-up Boot-to-Tread / Deck-Edge Crop Strip (Noon & Overcast Before vs After across all 5 scenes)
ZTW, ZTH = 430, 340
ZW = PAD * 2 + 5 * ZTW + 4 * 12
ZH = 84 + 2 * (26 + ZTH + 14) + PAD
zsheet = Image.new("RGB", (ZW, ZH), (14, 17, 22))
zdraw = ImageDraw.Draw(zsheet)
zdraw.text(
    (PAD, 18),
    "CC-343 Part 1 — Boot Contact & Hip Drop Close-Up Comparison (Noon — Top Row: BEFORE, Bottom Row: AFTER)",
    fill=(244, 247, 252),
    font=FONT_TITLE,
)
zdraw.text(
    (PAD, 48),
    "Zoomed into marine lower body, boots, stair treads, and floor deck edge from the 960×720 RTX 5080 WebGPU captures",
    fill=(170, 182, 198),
    font=FONT_SUB,
)

zy = 84
for tag, row_lbl, bcol in [
    ("b", "BEFORE CC-343b (Soles Sunk Into Stairs Ramp / Stiff-Legged at Deck Edge)", (68, 28, 28)),
    ("a", "AFTER CC-343b Part 1 (Up-Stairs Crouched/Standing/Walking Planted; Down-Stairs & Edge Step Open)", (22, 62, 36)),
]:
    zdraw.text((PAD, zy), row_lbl, fill=(220, 228, 242), font=FONT_SEC)
    zy += 24
    for idx, (sc_key, sc_title) in enumerate(SCENES):
        zx = PAD + idx * (ZTW + 12)
        tile = load_fit(f"{tag}-{sc_key}-noon.png", ZTW, ZTH, crop_box=(0.24, 0.22, 0.76, 0.88))
        zsheet.paste(tile, (zx, zy))
        zdraw.rectangle([zx, zy, zx + ZTW - 1, zy + ZTH - 1], outline=(62, 68, 78), width=1)
        lbl = f"{'BEFORE' if tag == 'b' else 'AFTER'} · {sc_key}"
        bbox = zdraw.textbbox((0, 0), lbl, font=FONT_LBL)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        zdraw.rectangle([zx + 6, zy + 6, zx + 6 + tw + 12, zy + 6 + th + 8], fill=bcol)
        zdraw.text((zx + 12, zy + 9), lbl, fill=(240, 244, 250), font=FONT_LBL)
    zy += ZTH + 16

for out_dir in (REV, QA, CLAUDE_DIR):
    out_p = out_dir / "sheet-cc343b-boots-zoom.jpg"
    tmp_p = out_dir / "sheet-cc343b-boots-zoom.tmp.jpg"
    zsheet.save(tmp_p, quality=93)
    os.replace(tmp_p, out_p)

print("Saved", REV / "sheet-cc343b-before-after-4lights.jpg", sheet.size, zsheet.size)
