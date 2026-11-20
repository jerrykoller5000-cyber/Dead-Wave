# qa/2026-11-18-AG-357/build_head_sheet.py
# Builds review/AG-357/03-shambler-step1-head-and-body.jpg for CLAUDE DIRECTOR review:
# Row 1: PROTOTYPE HEAD (front, 3/4, side, back) at identical tight head+collar framing
# Row 2: TRIPO REF HEAD (front, 3/4, side, back) at identical tight head+collar framing
# Row 3: WHITE-AO PROOF HEAD (front, side) + PROTOTYPE FULL BODY (front, side) w/ new tank + full trousers

import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(r"C:\Users\Zero\Desktop\Tiny Trek")
QA = ROOT / "qa" / "2026-11-18-AG-357"
FRAMES = QA / "frames"
OUT = ROOT / "review" / "AG-357" / "03-shambler-step1-head-and-body.jpg"

def get_font(size, bold=False):
    for c in [
        r"C:\Windows\Fonts\consolab.ttf" if bold else r"C:\Windows\Fonts\consola.ttf",
        r"C:\Windows\Fonts\arialbd.ttf" if bold else r"C:\Windows\Fonts\arial.ttf",
    ]:
        if Path(c).exists():
            return ImageFont.truetype(c, size)
    return ImageFont.load_default()

F_TITLE = get_font(24, bold=True)
F_SUB = get_font(15, bold=False)
F_ROW = get_font(17, bold=True)
F_CELL = get_font(14, bold=True)

report = json.loads((QA / "step1-report.json").read_text(encoding="utf-8"))
tvp = json.loads((QA / "tripo-vs-proto.json").read_text(encoding="utf-8"))
hm = report.get("headMetrics", {})
mt = tvp["res"]["ours"]
mp = tvp["res"]["tripo"]

rows = [
    ("PROTOTYPE Step 1 — SKULL & NECK (front / 3q / side / back)", "#5cd68d", [
        ("proto_apose-head_front", "PROTO · HEAD FRONT"),
        ("proto_apose-head_3q", "PROTO · HEAD 3/4"),
        ("proto_apose-head_side", "PROTO · HEAD SIDE PROFILE"),
        ("proto_apose-head_back", "PROTO · HEAD BACK"),
    ]),
    ("TRIPO REF (look-only) — SKULL & NECK (front / 3q / side / back)", "#e8a55a", [
        ("tripo-head_front", "TRIPO · HEAD FRONT"),
        ("tripo-head_3q", "TRIPO · HEAD 3/4"),
        ("tripo-head_side", "TRIPO · HEAD SIDE PROFILE"),
        ("tripo-head_back", "TRIPO · HEAD BACK"),
    ]),
    ("WHITE-AO PROOF HEAD + PROTOTYPE FULL-BODY FRONT & SIDE (real tank + full trousers + grey-beige skin)", "#c4d0dc", [
        ("white_apose-head_front", "WHITE-AO · HEAD FRONT"),
        ("white_apose-head_side", "WHITE-AO · HEAD SIDE"),
        ("proto_apose-front", "PROTO BODY · FRONT (tank + trousers)"),
        ("proto_apose-side", "PROTO BODY · SIDE (profile + knee/boots)"),
    ]),
]

CELL_W, CELL_H = 440, 540
PAD_X, PAD_Y = 18, 16
TOP_H = 104
ROW_HDR_H = 34

W = PAD_X * 2 + 4 * CELL_W + 3 * PAD_X
H = TOP_H + len(rows) * (ROW_HDR_H + CELL_H + 30 + PAD_Y) + 18

canvas = Image.new("RGB", (W, H), (22, 26, 31))
draw = ImageDraw.Draw(canvas)

draw.text((PAD_X, 16), "AG-357 STEP 1 REDO — 3D SKULL FORMS + 0.122 m NECK + REAL TANK TOP + FULL TROUSERS", fill=(235, 240, 245), font=F_TITLE)
draw.text((PAD_X, 48),
          f"3D open-jaw crown-to-chin={hm.get('headHeightChinToTopOpenJaw')}m | 3D chin-to-collar={hm.get('neckLengthChinToCollar')}m (target ~0.122m) | teeth-gape={hm.get('mouthGapeM')}m | crown={hm.get('crownY')}m chin={hm.get('chinY')}m",
          fill=(150, 220, 180), font=F_SUB)
draw.text((PAD_X, 72),
          f"Silhouette measure -> headH {mp.get('head height (chin to top)', 0):.3f}m (tripo {mt.get('head height (chin to top)', 0):.3f}m) | "
          f"neckL {mp.get('neck length (chin to collar)', 0):.3f}m (tripo {mt.get('neck length (chin to collar)', 0):.3f}m) | "
          f"headW {mp['head width']:.3f}m (tripo {mt['head width']:.3f}m) | neckW {mp['neck width']:.3f}m (tripo {mt['neck width']:.3f}m)",
          fill=(180, 194, 210), font=F_SUB)

y_cur = TOP_H
for rtitle, color_hex, cells in rows:
    rgb = tuple(int(color_hex.lstrip("#")[i:i+2], 16) for i in (0, 2, 4))
    draw.rectangle([PAD_X, y_cur, W - PAD_X, y_cur + ROW_HDR_H - 4], fill=(32, 37, 44), outline=rgb, width=2)
    draw.text((PAD_X + 12, y_cur + 6), rtitle, fill=rgb, font=F_ROW)
    y_cur += ROW_HDR_H
    for ci, (fkey, label) in enumerate(cells):
        x0 = PAD_X + ci * (CELL_W + PAD_X)
        p = FRAMES / f"{fkey}.png"
        if p.exists():
            im = Image.open(p).convert("RGB").resize((CELL_W, CELL_H), Image.Resampling.LANCZOS)
            canvas.paste(im, (x0, y_cur))
        draw.rectangle([x0, y_cur, x0 + CELL_W, y_cur + CELL_H], outline=rgb, width=2)
        draw.rectangle([x0, y_cur + CELL_H, x0 + CELL_W, y_cur + CELL_H + 28], fill=(29, 34, 40))
        draw.text((x0 + 10, y_cur + CELL_H + 6), label, fill=(220, 228, 236), font=F_CELL)
    y_cur += CELL_H + 30 + PAD_Y

OUT.parent.mkdir(parents=True, exist_ok=True)
canvas.save(OUT, quality=93)
print("Wrote", OUT, canvas.size)
