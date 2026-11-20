from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(r"C:\Users\Zero\Desktop\Tiny Trek")
QA_DIR = ROOT / "qa" / "2026-11-18-AG-365"
LANDED_DIR = QA_DIR / "captures" / "landed"


def get_font(size, bold=False):
    for p in [
        r"C:\Windows\Fonts\consolab.ttf" if bold else r"C:\Windows\Fonts\consola.ttf",
        r"C:\Windows\Fonts\arialbd.ttf" if bold else r"C:\Windows\Fonts\arial.ttf",
    ]:
        if Path(p).exists():
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


F_TITLE = get_font(20, bold=True)
F_SUB = get_font(13, bold=False)
F_HDR = get_font(14, bold=True)
F_CELL = get_font(13, bold=True)

CELL = 620
PAD = 16
TOP_H = 88
HDR_H = 38
LBL_H = 28

W = PAD * 2 + 2 * CELL + PAD
H = TOP_H + HDR_H + 2 * (CELL + LBL_H + PAD) + 12

canvas = Image.new("RGB", (W, H), (22, 26, 31))
draw = ImageDraw.Draw(canvas)

draw.text(
    (PAD, 14),
    "AG-365 / GT-20124 J164 Supplementary -X Anatomical RIGHT Thigh (RTX 5080 WebGPU · Landed 72e543b4)",
    fill=(235, 240, 245),
    font=F_TITLE,
)
draw.text(
    (PAD, 44),
    "NEW UNMATCHED -X side views (mirrored camera x=cx-0.88 -> tx=cx-0.112; historical +X AG-358/AG-364 framed anatomical LEFT)",
    fill=(245, 200, 120),
    font=F_SUB,
)
draw.text(
    (PAD, 63),
    "Actual production 72e543b4 (no Fetch overrides) | publicstill H.render | 16/16 corners inside closed pouches, vest 3 exact, cap 5, diffPx=0",
    fill=(155, 215, 180),
    font=F_SUB,
)

cols = [
    ("unarmed", "UNARMED · ANATOMICAL RIGHT THIGH (-X, NEW UNMATCHED)", (92, 214, 141)),
    ("pistol", "PISTOL · ANATOMICAL RIGHT THIGH (-X, NEW UNMATCHED)", (92, 214, 141)),
]

y = TOP_H
for ci, (pose, title, rgb) in enumerate(cols):
    x = PAD + ci * (CELL + PAD)
    draw.rectangle([x, y, x + CELL, y + HDR_H - 6], fill=(32, 37, 44), outline=rgb, width=2)
    draw.text((x + 10, y + 8), title, fill=rgb, font=F_HDR)

y += HDR_H
# Row 1: full 1200x1200 frames scaled to CELLxCELL
for ci, (pose, _, rgb) in enumerate(cols):
    x = PAD + ci * (CELL + PAD)
    im = Image.open(LANDED_DIR / f"{pose}-anatomical-right-thigh.png").convert("RGB")
    resized = im.resize((CELL, CELL), Image.Resampling.LANCZOS)
    canvas.paste(resized, (x, y))
    draw.rectangle([x, y, x + CELL, y + CELL], outline=rgb, width=2)
    draw.rectangle([x, y + CELL, x + CELL, y + CELL + LBL_H], fill=(29, 34, 40))
    draw.text(
        (x + 8, y + CELL + 6),
        f"{pose.upper()} · -X anatomical-right-thigh (full 1200x1200 frame, landed 72e543b4)",
        fill=(220, 226, 234),
        font=F_CELL,
    )

y += CELL + LBL_H + PAD
# Row 2: 2x thigh/hip/pouch/hand crop (x=220..920, y=180..880 -> 700x700 -> CELLxCELL)
CROP_BOX = (220, 180, 920, 880)
crop_labels = [
    "ZOOM CROP · UNARMED: closed belt pouch, wrist watch/gloved right hand over pocket/band",
    "ZOOM CROP · PISTOL: closed belt pouch, hip strap/buckle blocks, holsterW plate, grenades",
]
for ci, (pose, _, rgb) in enumerate(cols):
    x = PAD + ci * (CELL + PAD)
    im = Image.open(LANDED_DIR / f"{pose}-anatomical-right-thigh.png").convert("RGB")
    cropped = im.crop(CROP_BOX).resize((CELL, CELL), Image.Resampling.LANCZOS)
    canvas.paste(cropped, (x, y))
    draw.rectangle([x, y, x + CELL, y + CELL], outline=(245, 200, 120), width=2)
    draw.rectangle([x, y + CELL, x + CELL, y + CELL + LBL_H], fill=(29, 34, 40))
    draw.text((x + 8, y + CELL + 6), crop_labels[ci], fill=(245, 220, 160), font=F_CELL)

out_path = QA_DIR / "sheet-anatomical-right-thigh.jpg"
canvas.save(out_path, quality=93)
print("Saved", out_path, canvas.size)
