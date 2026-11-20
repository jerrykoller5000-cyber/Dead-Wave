from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(r"C:\Users\Zero\Desktop\Tiny Trek")
BEFORE_DIR = ROOT / "review" / "GT-20124" / "native-mag-short-ag-v1-668e" / "before"
LANDED_DIR = ROOT / "review" / "GT-20124" / "native-mag-landed-ag-v2" / "landed"
OUT_DIR = ROOT / "review" / "GT-20124" / "native-mag-landed-ag-v2"
QA_DIR = ROOT / "qa" / "2026-11-18-AG-364"
QA_DIR.mkdir(parents=True, exist_ok=True)


def get_font(size, bold=False):
    for p in [
        r"C:\Windows\Fonts\consolab.ttf" if bold else r"C:\Windows\Fonts\consola.ttf",
        r"C:\Windows\Fonts\arialbd.ttf" if bold else r"C:\Windows\Fonts\arial.ttf",
    ]:
        if Path(p).exists():
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


F_TITLE = get_font(21, bold=True)
F_SUB = get_font(14, bold=False)
F_HDR = get_font(14, bold=True)
F_CELL = get_font(13, bold=True)

cols = [
    ("before", BEFORE_DIR, "unarmed", "HISTORICAL BEFORE · UNARMED (668e97a3)", "#e07a5f"),
    ("landed", LANDED_DIR, "unarmed", "LANDED ACTUAL · UNARMED (72e543b4)", "#5cd68d"),
    ("before", BEFORE_DIR, "pistol", "HISTORICAL BEFORE · PISTOL (668e97a3)", "#e07a5f"),
    ("landed", LANDED_DIR, "pistol", "LANDED ACTUAL · PISTOL (72e543b4)", "#5cd68d"),
]

views = [
    ("front", "FRONT (noon, matched AG-358 historical camera)"),
    ("3q", "3/4 FRONT-LEFT (noon, matched AG-358 historical camera)"),
    ("right-thigh", "RIGHT THIGH CLOSE (+X camera, noon, matched camera)"),
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
    "AG-364 / GT-20124 J164 LANDED V2 (RTX 5080 WebGPU · publicstill H.render · Historical 668e97a3 vs Landed 72e543b4)",
    fill=(235, 240, 245),
    font=F_TITLE,
)
draw.text(
    (PAD, 46),
    "6 fresh landed frames paired against AG-358 historical pre-land baseline | 16/16 corners inside closed pouches, vest 3 exact, cap 5",
    fill=(155, 215, 180),
    font=F_SUB,
)

y = TOP_H
for ci, (phase, base_dir, pose, title, ch) in enumerate(cols):
    x = PAD + ci * (CELL + PAD)
    rgb = tuple(int(ch.lstrip("#")[i:i+2], 16) for i in (0, 2, 4))
    draw.rectangle([x, y, x + CELL, y + HDR_H - 6], fill=(32, 37, 44), outline=rgb, width=2)
    draw.text((x + 8, y + 8), title, fill=rgb, font=F_HDR)

y += HDR_H
for vkey, vlabel in views:
    for ci, (phase, base_dir, pose, _, ch) in enumerate(cols):
        x = PAD + ci * (CELL + PAD)
        rgb = tuple(int(ch.lstrip("#")[i:i+2], 16) for i in (0, 2, 4))
        im = Image.open(base_dir / f"{pose}-{vkey}.png").convert("RGB").resize((CELL, CELL), Image.Resampling.LANCZOS)
        canvas.paste(im, (x, y))
        draw.rectangle([x, y, x + CELL, y + CELL], outline=rgb, width=2)
        draw.rectangle([x, y + CELL, x + CELL, y + CELL + LBL_H], fill=(29, 34, 40))
        tag = "LANDED 72e543b4" if phase == "landed" else "HIST EXPOSED MAGS"
        draw.text((x + 8, y + CELL + 5), f"{pose.upper()} · {vkey} ({tag})", fill=(220, 226, 234), font=F_CELL)
    y += CELL + LBL_H + PAD

sheet_rev = OUT_DIR / "LANDED-COMPARISON-SHEET.jpg"
sheet_qa = QA_DIR / "sheet-gt20124-landed-v2.jpg"
canvas.save(sheet_rev, quality=93)
canvas.save(sheet_qa, quality=93)
print("Saved", sheet_rev, sheet_qa, canvas.size)
