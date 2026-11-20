# qa/2026-11-18-AG-357/build_step1_sheet.py
# Assembles AG-357 STEP 1 comparison sheet (4 cols x 5 views):
#   OURS NOW | PROTOTYPE (A-pose) | PROTOTYPE (shamble) | TRIPO REF (look-only)
# Views: front, 3/4, side, back (85% body fill), + head & neck close-up row (Noon studio light)

import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(r"C:\Users\Zero\Desktop\Tiny Trek")
QA = ROOT / "qa" / "2026-11-18-AG-357"
FRAMES = QA / "frames"
OUT = ROOT / "review" / "AG-357" / "01-shambler-step1-sheet.jpg"

def get_font(size, bold=False):
    candidates = [
        r"C:\Windows\Fonts\consolab.ttf" if bold else r"C:\Windows\Fonts\consola.ttf",
        r"C:\Windows\Fonts\arialbd.ttf" if bold else r"C:\Windows\Fonts\arial.ttf",
    ]
    for c in candidates:
        if Path(c).exists():
            return ImageFont.truetype(c, size)
    return ImageFont.load_default()

F_TITLE = get_font(26, bold=True)
F_SUB = get_font(16, bold=False)
F_HDR = get_font(17, bold=True)
F_STAT = get_font(13, bold=False)
F_CELL = get_font(14, bold=True)

report = json.loads((QA / "step1-report.json").read_text(encoding="utf-8"))
tvp = json.loads((QA / "tripo-vs-proto.json").read_text(encoding="utf-8"))
ovt = json.loads((QA / "ours-vs-tripo.json").read_text(encoding="utf-8"))

m_ours = ovt["res"]["ours"]
m_tripo = tvp["res"]["ours"]
m_proto = tvp["res"]["tripo"]
st = report["stats"]

cols = [
    ("ours", "OURS NOW (current live)", "#5aa6e8",
     f"{st['ours']['tris']:,} tris | {st['ours']['meshes']} meshes | {st['ours']['materials']} mat | shW {m_ours['shoulder width']:.2f}m | nkW {m_ours['neck width']:.2f}m | chestD {m_ours['chest depth (side)']:.2f}m"),
    ("proto_apose", "PROTOTYPE Step 1 (A-pose)", "#5cd68d",
     f"{st['proto_apose']['tris']:,} tris | {st['proto_apose']['meshes']} meshes | {st['proto_apose']['materials']} mats | shW {m_proto['shoulder width']:.2f}m | nkW {m_proto['neck width']:.2f}m | chestD {m_proto['chest depth (side)']:.2f}m"),
    ("proto_shamble", "PROTOTYPE Step 1 (shamble pose)", "#80e8a8",
     f"{st['proto_shamble']['tris']:,} tris | hunched spine, reaching arms & open moving jaw preserved (J159 no floating)"),
    ("tripo", "TRIPO REF (look-only, H=1.80m)", "#e8a55a",
     f"{st['tripo']['tris']:,} tris | 2K tex (ref only) | shW {m_tripo['shoulder width']:.2f}m | nkW {m_tripo['neck width']:.2f}m | chestD {m_tripo['chest depth (side)']:.2f}m"),
]

views = [
    ("front", "FRONT (0 deg)"),
    ("3q", "3/4 FRONT-LEFT (45 deg)"),
    ("side", "SIDE LEFT (90 deg)"),
    ("back", "BACK (180 deg)"),
    ("head", "HEAD & NECK CLOSE-UP"),
]

CELL_W, CELL_H = 440, 550
PAD_X, PAD_Y = 18, 16
TOP_H = 132
COL_HDR_H = 54
ROW_LBL_W = 0

W = PAD_X * 2 + len(cols) * CELL_W + (len(cols) - 1) * PAD_X
H = TOP_H + COL_HDR_H + len(views) * (CELL_H + 34 + PAD_Y) + 24

canvas = Image.new("RGB", (W, H), (22, 26, 31))
draw = ImageDraw.Draw(canvas)

draw.text((PAD_X, 18), "AG-357 (D-207) SHAMBLER FIDELITY TEST — STEP 1: SHAPE + SEEDED VERTEX NOISE + BAKED AO (NO TEXTURES)", fill=(235, 240, 245), font=F_TITLE)
draw.text((PAD_X, 52),
          "RTX 5080 WebGPU · Noon studio light · Normalized H = 1.800 m · CF-15 targets: head +16%H/-14%W, neck -31%W, chestD -20%, hips -16%, thin wrists + big hands, cargo pocket, torn knee, laces.",
          fill=(165, 178, 192), font=F_SUB)
draw.text((PAD_X, 78),
          f"Measured A-pose proto vs targets -> headW: {m_proto['head width']:.3f}m (tripo {m_tripo['head width']:.3f}m) | neckW: {m_proto['neck width']:.3f}m (tripo {m_tripo['neck width']:.3f}m) | "
          f"chestD: {m_proto['chest depth (side)']:.3f}m (tripo {m_tripo['chest depth (side)']:.3f}m) | waistW: {m_proto['waist width']:.3f}m (tripo {m_tripo['waist width']:.3f}m) | hipW: {m_proto['hip width']:.3f}m (tripo {m_tripo['hip width']:.3f}m)",
          fill=(145, 215, 175), font=F_STAT)

# Column headers
y_hdr = TOP_H
for ci, (key, title, color_hex, desc) in enumerate(cols):
    x0 = PAD_X + ci * (CELL_W + PAD_X)
    rgb = tuple(int(color_hex.lstrip("#")[i:i+2], 16) for i in (0, 2, 4))
    draw.rectangle([x0, y_hdr, x0 + CELL_W, y_hdr + 44], fill=(32, 37, 44), outline=rgb, width=2)
    draw.text((x0 + 10, y_hdr + 6), title, fill=rgb, font=F_HDR)
    draw.text((x0 + 10, y_hdr + 26), desc[:58], fill=(195, 203, 212), font=F_STAT)

y_cur = TOP_H + COL_HDR_H
for vi, (vkey, vlabel) in enumerate(views):
    for ci, (ckey, _, color_hex, _) in enumerate(cols):
        x0 = PAD_X + ci * (CELL_W + PAD_X)
        rgb = tuple(int(color_hex.lstrip("#")[i:i+2], 16) for i in (0, 2, 4))
        img_path = FRAMES / f"{ckey}-{vkey}.png"
        if img_path.exists():
            im = Image.open(img_path).convert("RGB").resize((CELL_W, CELL_H), Image.Resampling.LANCZOS)
            canvas.paste(im, (x0, y_cur))
        draw.rectangle([x0, y_cur, x0 + CELL_W, y_cur + CELL_H], outline=rgb, width=2)
        draw.rectangle([x0, y_cur + CELL_H, x0 + CELL_W, y_cur + CELL_H + 28], fill=(29, 34, 40))
        draw.text((x0 + 10, y_cur + CELL_H + 6), f"{ckey.upper()} · {vlabel}", fill=(215, 222, 230), font=F_CELL)
    y_cur += CELL_H + 34 + PAD_Y

OUT.parent.mkdir(parents=True, exist_ok=True)
canvas.save(OUT, quality=93)
print("Wrote", OUT)

# Sheet 2: White Clay AO + Seeded Vertex Noise Proof (Director #10)
AO_OUT = ROOT / "review" / "AG-357" / "02-shambler-step1-white-ao-proof.jpg"
ao_panels = [
    ("white_apose-front", "WHITE AO PROOF · A-pose Front", "#f0f4f8"),
    ("white_apose-3q", "WHITE AO PROOF · A-pose 3/4 (ribs, belt, folds)", "#f0f4f8"),
    ("white_apose-side", "WHITE AO PROOF · A-pose Side", "#f0f4f8"),
    ("white_apose-back", "WHITE AO PROOF · A-pose Back (scapulae, spine, hem)", "#f0f4f8"),
    ("white_apose-head", "WHITE AO PROOF · Head & Tendon Neck Close-Up", "#ffe09e"),
    ("white_shamble-3q", "WHITE AO PROOF · Live Shamble 3/4", "#8ce8b5"),
    ("white_shamble-side", "WHITE AO PROOF · Live Shamble Side", "#8ce8b5"),
    ("white_shamble-head", "WHITE AO PROOF · Live Shamble Head Close", "#8ce8b5"),
]
AW, AH = 420, 525
COLS = 4
ROWS = 2
W2 = PAD_X * 2 + COLS * AW + (COLS - 1) * PAD_X
H2 = 90 + ROWS * (AH + 32 + PAD_Y) + 14
c2 = Image.new("RGB", (W2, H2), (22, 26, 31))
d2 = ImageDraw.Draw(c2)
d2.text((PAD_X, 16), "AG-357 STEP 1 PROOF — PLAIN WHITE CLAY + BAKED AO + SEEDED VERTEX NOISE (ZERO TEXTURES)", fill=(238, 242, 247), font=F_TITLE)
d2.text((PAD_X, 48), "Pure white vertex albedo (0.94 * AO^1.3) showing brow overhang, deep eye/nose sockets, mandible jaw angle, clavicles, real tank scoop & tucked trousers.", fill=(170, 182, 195), font=F_SUB)

for idx, (fname, title, col_hex) in enumerate(ao_panels):
    r_idx, c_idx = idx // COLS, idx % COLS
    x0 = PAD_X + c_idx * (AW + PAD_X)
    y0 = 90 + r_idx * (AH + 32 + PAD_Y)
    rgb = tuple(int(col_hex.lstrip("#")[i:i+2], 16) for i in (0, 2, 4))
    p = FRAMES / f"{fname}.png"
    if p.exists():
        im = Image.open(p).convert("RGB").resize((AW, AH), Image.Resampling.LANCZOS)
        c2.paste(im, (x0, y0))
    d2.rectangle([x0, y0, x0 + AW, y0 + AH], outline=rgb, width=2)
    d2.rectangle([x0, y0 + AH, x0 + AW, y0 + AH + 28], fill=(30, 35, 42))
    d2.text((x0 + 8, y0 + AH + 6), title, fill=rgb, font=F_CELL)

c2.save(AO_OUT, quality=93)
print("Wrote", AO_OUT)
