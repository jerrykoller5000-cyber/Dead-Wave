from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(r"C:\Users\Zero\Desktop\Tiny Trek")
OUT_DIR = ROOT / "review" / "GT-20124" / "native-mag-short-ag-v1-668e"
QA_DIR = ROOT / "qa" / "2026-11-18-AG-358"
QA_DIR.mkdir(parents=True, exist_ok=True)


def get_font(size, bold=False):
    for p in [
        r"C:\Windows\Fonts\consolab.ttf" if bold else r"C:\Windows\Fonts\consola.ttf",
        r"C:\Windows\Fonts\arialbd.ttf" if bold else r"C:\Windows\Fonts\arial.ttf",
    ]:
        if Path(p).exists():
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


F_TITLE = get_font(22, bold=True)
F_SUB = get_font(14, bold=False)
F_HDR = get_font(15, bold=True)
F_CELL = get_font(13, bold=True)

cols = [
    ("before", "unarmed", "BEFORE LIVE · UNARMED (668e97a3)", "#e07a5f"),
    ("package", "unarmed", "PACKAGE DRAFT · UNARMED (72e543b4)", "#5cd68d"),
    ("before", "pistol", "BEFORE LIVE · PISTOL (668e97a3)", "#e07a5f"),
    ("package", "pistol", "PACKAGE DRAFT · PISTOL (72e543b4)", "#5cd68d"),
]

views = [
    ("front", "FRONT (noon, matched camera)"),
    ("3q", "3/4 FRONT-LEFT (noon, matched camera)"),
    ("right-thigh", "THIGH CLOSE (+X camera, noon)"),
]

CELL = 430
PAD = 14
TOP_H = 86
HDR_H = 38
LBL_H = 26

W = PAD * 2 + 4 * CELL + 3 * PAD
H = TOP_H + HDR_H + len(views) * (CELL + LBL_H + PAD) + 12

canvas = Image.new("RGB", (W, H), (22, 26, 31))
draw = ImageDraw.Draw(canvas)

draw.text(
    (PAD, 14),
    "AG-358 / GT-20124 SHORT NATIVE PAIRED CHECK (RTX 5080 WebGPU · H.render · MD5 668e97a3 vs 72e543b4)",
    fill=(235, 240, 245),
    font=F_TITLE,
)
draw.text(
    (PAD, 46),
    "12 matched frames · BEFORE: 0/2 mags inside pouches (exposed on front thighs; diffPx=2297) | PACKAGE: 16/16 corners inside pouches (0 failures, vest exact, diffPx=0)",
    fill=(155, 215, 180),
    font=F_SUB,
)

y = TOP_H
for ci, (phase, pose, title, ch) in enumerate(cols):
    x = PAD + ci * (CELL + PAD)
    rgb = tuple(int(ch.lstrip("#")[i:i+2], 16) for i in (0, 2, 4))
    draw.rectangle([x, y, x + CELL, y + HDR_H - 6], fill=(32, 37, 44), outline=rgb, width=2)
    draw.text((x + 8, y + 8), title, fill=rgb, font=F_HDR)

y += HDR_H
for vkey, vlabel in views:
    for ci, (phase, pose, _, ch) in enumerate(cols):
        x = PAD + ci * (CELL + PAD)
        rgb = tuple(int(ch.lstrip("#")[i:i+2], 16) for i in (0, 2, 4))
        im = Image.open(OUT_DIR / phase / f"{pose}-{vkey}.png").convert("RGB").resize((CELL, CELL), Image.Resampling.LANCZOS)
        canvas.paste(im, (x, y))
        draw.rectangle([x, y, x + CELL, y + CELL], outline=rgb, width=2)
        draw.rectangle([x, y + CELL, x + CELL, y + CELL + LBL_H], fill=(29, 34, 40))
        tag = "BELT POUCH OK" if phase == "package" else "EXPOSED THIGH MAGS"
        draw.text((x + 8, y + CELL + 5), f"{pose.upper()} · {vkey} ({tag})", fill=(220, 226, 234), font=F_CELL)
    y += CELL + LBL_H + PAD

sheet_rev = OUT_DIR / "SHORT-COMPARISON-SHEET.jpg"
sheet_qa = QA_DIR / "sheet-gt20124-short.jpg"
canvas.save(sheet_rev, quality=93)
canvas.save(sheet_qa, quality=93)
print("Saved", sheet_rev, sheet_qa, canvas.size)
