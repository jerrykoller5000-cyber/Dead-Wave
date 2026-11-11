# qa/2026-11-11-AG-302/build-cd1-gp20098-sheets.py
# Builds CD-1 4-light sheets + close-up knuckle-crease pinhole check in review/CD-1-fixes2-gpu/
# and copies into Claude outputs/CD-1/fixes2/gpu/ as well.

import json
import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(r"C:\Users\Zero\Desktop\Tiny Trek")
SRC_DIR = ROOT / "review" / "CD-1-fixes2-gpu"
CLAUDE_DIR = ROOT / "Claude outputs" / "CD-1" / "fixes2"
SRC_DIR.mkdir(parents=True, exist_ok=True)
CLAUDE_DIR.mkdir(parents=True, exist_ok=True)

LIGHTS = ["noon", "overcast", "dusk", "night"]
WEAPONS = [
    ("flamer", "Flamer (both hands: front grip l + slid-down rear grip r)"),
    ("aa12", "AA-12 (firing hand slid 26 mm down grip)"),
    ("minigun", "Minigun (firing hand slid 23.5 mm down rear grip)"),
    ("shotgun", "Pump Shotgun (firing hand centered + curled glove creases)"),
    ("m4", "GW-4 / M4 (support hand + forearm cleared from screen)"),
    ("revolver", "Revolver (butt level with firing hand heel)"),
]


def get_font(size, bold=False):
    for p in [
        r"C:\Windows\Fonts\consolab.ttf" if bold else r"C:\Windows\Fonts\consola.ttf",
        r"C:\Windows\Fonts\segoeuib.ttf" if bold else r"C:\Windows\Fonts\segoeui.ttf",
    ]:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def build_sheet_1():
    tw, th = 480, 270
    pad_x, pad_y = 24, 18
    W = pad_x * 2 + 4 * tw + 3 * 16
    H = 92 + len(WEAPONS) * (th + 38) + 20
    img = Image.new("RGB", (W, H), (14, 17, 23))
    d = ImageDraw.Draw(img)
    f_title = get_font(26, True)
    f_sub = get_font(17, False)
    f_lbl = get_font(15, True)

    d.rectangle([0, 0, W, 80], fill=(22, 27, 36))
    d.text((24, 14), "CD-1 · First-Person Hands & Glove DoubleSide Fix — 4 Lights at the Eye (RTX 5080 WebGPU)", font=f_title, fill=(242, 246, 252))
    d.text((24, 48), "Columns: Noon | Overcast | Dusk | Night  ·  Facing lit concrete wall so any knuckle-crease pinhole would show bright wall", font=f_sub, fill=(165, 185, 212))

    y = 96
    for wk, title in WEAPONS:
        d.text((24, y), title, font=f_lbl, fill=(255, 214, 102))
        y += 24
        for ci, lt in enumerate(LIGHTS):
            x = pad_x + ci * (tw + 16)
            fp = SRC_DIR / f"{wk}-hip-{lt}.png"
            if fp.exists():
                im = Image.open(fp).convert("RGB").resize((tw, th), Image.Resampling.LANCZOS)
                img.paste(im, (x, y))
            d.rectangle([x, y, x + tw, y + th], outline=(58, 72, 92), width=1)
            d.rectangle([x + 6, y + 6, x + 110, y + 28], fill=(12, 16, 22))
            d.text((x + 12, y + 8), lt.upper(), font=f_lbl, fill=(215, 228, 245))
        y += th + 14

    out1 = SRC_DIR / "sheet-1-cd1-hands-4lights.jpg"
    out2 = CLAUDE_DIR / "gpu-sheet-1-cd1-hands-4lights.jpg"
    img.save(out1, quality=92)
    img.save(out2, quality=92)
    print(f"Saved {out1}")


def build_sheet_2():
    # High-magnification 1:1 / 2x crops on hands & curled shotgun knuckles across 4 lights
    # Input PNGs are 1280x720; viewmodel hands sit in lower-right / lower-center [420..1260, 310..720]
    crops = [
        ("shotgun", (680, 410, 1180, 705), "Shotgun Firing Hand Knuckle Creases (2x Zoom — Pinholes Check)"),
        ("flamer",  (470, 360, 1230, 715), "Flamer Both Hands (Support Front Grip + Firing Rear Grip)"),
        ("aa12",    (640, 380, 1220, 715), "AA-12 Firing Hand (Slid 26 mm Down Grip)"),
        ("minigun", (560, 360, 1240, 715), "Minigun Firing Hand (Rear Spade/Grip Hold)"),
        ("m4",      (430, 350, 1220, 715), "GW-4 / M4 Support Hand & Forearm (Cleared From Screen)"),
        ("revolver",(680, 370, 1200, 715), "Revolver Grip & Heel Level Check"),
    ]
    tw, th = 480, 290
    pad_x = 24
    W = pad_x * 2 + 4 * tw + 3 * 16
    H = 100 + len(crops) * (th + 38) + 20
    img = Image.new("RGB", (W, H), (14, 17, 23))
    d = ImageDraw.Draw(img)
    f_title = get_font(26, True)
    f_sub = get_font(16, False)
    f_lbl = get_font(15, True)

    sides_info = ""
    sides_fp = SRC_DIR / "glove-material-sides.json"
    if sides_fp.exists():
        arr = json.loads(sides_fp.read_text(encoding="utf-8"))
        sides_set = sorted({f"{r['name']}:side={r['side']}" for r in arr})
        sides_info = "  |  Runtime mesh sides: " + ", ".join(sides_set[:4])

    d.rectangle([0, 0, W, 84], fill=(22, 27, 36))
    d.text((24, 14), "CD-1 · Close-Up Hand Fits & Knuckle-Crease Pinhole Magnification (4 Lights)", font=f_title, fill=(242, 246, 252))
    d.text((24, 50), f"Magnified crops from 1280x720 RTX 5080 WebGPU captures{sides_info}", font=f_sub, fill=(140, 225, 165))

    y = 98
    for wk, box, title in crops:
        d.text((24, y), title, font=f_lbl, fill=(130, 212, 255))
        y += 24
        for ci, lt in enumerate(LIGHTS):
            x = pad_x + ci * (tw + 16)
            fp = SRC_DIR / f"{wk}-hip-{lt}.png"
            if fp.exists():
                im = Image.open(fp).convert("RGB").crop(box).resize((tw, th), Image.Resampling.LANCZOS)
                img.paste(im, (x, y))
            d.rectangle([x, y, x + tw, y + th], outline=(58, 72, 92), width=1)
            d.rectangle([x + 6, y + 6, x + 110, y + 28], fill=(12, 16, 22))
            d.text((x + 12, y + 8), lt.upper(), font=f_lbl, fill=(215, 228, 245))
        y += th + 14

    out1 = SRC_DIR / "sheet-2-cd1-closeups-and-pinholes.jpg"
    out2 = CLAUDE_DIR / "gpu-sheet-2-cd1-closeups-and-pinholes.jpg"
    img.save(out1, quality=92)
    img.save(out2, quality=92)
    print(f"Saved {out1}")


if __name__ == "__main__":
    build_sheet_1()
    build_sheet_2()
