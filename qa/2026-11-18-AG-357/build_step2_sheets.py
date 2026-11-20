# qa/2026-11-18-AG-357/build_step2_sheets.py
# Builds Step 2 sheets in review/AG-357/:
#   04-shambler-step2-noon-sheet.jpg   (4x5: ours | proto A-pose | proto shamble | tripo, Noon)
#   05-shambler-step2-night-sheet.jpg  (4x5: ours | proto A-pose | proto shamble | tripo, Night)
#   06-shambler-step2-head-jaw-detail.jpg (close-up verification: solid mandible, cheek flesh, neck tendons, cutouts)

import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(r"C:\Users\Zero\Desktop\Tiny Trek")
QA = ROOT / "qa" / "2026-11-18-AG-357"
FRAMES = QA / "frames-step2"
OUT_DIR = ROOT / "review" / "AG-357"
OUT_DIR.mkdir(parents=True, exist_ok=True)


def get_font(size, bold=False):
    for p in [
        r"C:\Windows\Fonts\consolab.ttf" if bold else r"C:\Windows\Fonts\consola.ttf",
        r"C:\Windows\Fonts\arialbd.ttf" if bold else r"C:\Windows\Fonts\arial.ttf",
    ]:
        if Path(p).exists():
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


F_TITLE = get_font(25, bold=True)
F_SUB = get_font(15, bold=False)
F_HDR = get_font(16, bold=True)
F_STAT = get_font(13, bold=False)
F_CELL = get_font(14, bold=True)

report = json.loads((QA / "step2-report.json").read_text(encoding="utf-8"))
st = report["stats"]
ps = report.get("protoStats", {})
hm = report.get("headMetrics", {})
tex_mb = (ps.get("texBytes", 0) or 0) / (1024 * 1024)

cols = [
    ("ours", "OURS NOW (current live)", "#5aa6e8",
     f"{st['ours']['tris']:,} tris | {st['ours']['meshes']} meshes | {st['ours']['materials']} mat"),
    ("proto_apose", "PROTOTYPE Step 2 (A-pose)", "#5cd68d",
     f"{st['proto_apose']['tris']:,} tris | {st['proto_apose']['meshes']} meshes | {st['proto_apose']['materials']} mats | {tex_mb:.1f} MB ({ps.get('texCount', 0)} maps)"),
    ("proto_shamble", "PROTOTYPE Step 2 (shamble pose)", "#80e8a8",
     f"{st['proto_shamble']['tris']:,} tris | solid mandible + stretched cheeks + PBR textures + cutouts"),
    ("tripo", "TRIPO REF (look-only, H=1.80m)", "#e8a55a",
     f"{st['tripo']['tris']:,} tris | 1 mesh | 1 mat (2K tex, ref only)"),
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
TOP_H = 112
COL_HDR_H = 54


def build_main_sheet(light_key, out_name, subtitle):
    W = PAD_X * 2 + len(cols) * CELL_W + (len(cols) - 1) * PAD_X
    H = TOP_H + COL_HDR_H + len(views) * (CELL_H + 32 + PAD_Y) + 18
    canvas = Image.new("RGB", (W, H), (18, 22, 28) if light_key == "night" else (22, 26, 31))
    draw = ImageDraw.Draw(canvas)

    draw.text(
        (PAD_X, 16),
        f"AG-357 (D-207) SHAMBLER FIDELITY TEST — STEP 2 ({light_key.upper()} LIGHT): TEXTURES + NORMALS + ROUGHNESS + CUTOUTS",
        fill=(235, 240, 245),
        font=F_TITLE,
    )
    draw.text((PAD_X, 48), subtitle, fill=(165, 182, 200), font=F_SUB)
    draw.text(
        (PAD_X, 74),
        f"Head fix folded in: solid mandible + cheek flesh | 3D crown-to-chin={hm.get('headHeightChinToTopOpenJaw')}m | "
        f"chin-to-collar={hm.get('neckLengthChinToCollar')}m | teeth-gape={hm.get('mouthGapeM')}m | WebGPU {report['backend']}",
        fill=(145, 218, 178),
        font=F_STAT,
    )

    y_hdr = TOP_H
    for ci, (key, title, color_hex, desc) in enumerate(cols):
        x0 = PAD_X + ci * (CELL_W + PAD_X)
        rgb = tuple(int(color_hex.lstrip("#")[i:i+2], 16) for i in (0, 2, 4))
        draw.rectangle([x0, y_hdr, x0 + CELL_W, y_hdr + 46], fill=(30, 35, 42), outline=rgb, width=2)
        draw.text((x0 + 10, y_hdr + 6), title, fill=rgb, font=F_HDR)
        draw.text((x0 + 10, y_hdr + 26), desc[:62], fill=(195, 203, 212), font=F_STAT)

    y_cur = TOP_H + COL_HDR_H
    for vkey, vlabel in views:
        for ci, (ckey, _, color_hex, _) in enumerate(cols):
            x0 = PAD_X + ci * (CELL_W + PAD_X)
            rgb = tuple(int(color_hex.lstrip("#")[i:i+2], 16) for i in (0, 2, 4))
            img_path = FRAMES / f"{light_key}-{ckey}-{vkey}.png"
            if img_path.exists():
                im = Image.open(img_path).convert("RGB").resize((CELL_W, CELL_H), Image.Resampling.LANCZOS)
                canvas.paste(im, (x0, y_cur))
            draw.rectangle([x0, y_cur, x0 + CELL_W, y_cur + CELL_H], outline=rgb, width=2)
            draw.rectangle([x0, y_cur + CELL_H, x0 + CELL_W, y_cur + CELL_H + 28], fill=(27, 32, 38))
            draw.text((x0 + 10, y_cur + CELL_H + 6), f"{ckey.upper()} · {vlabel} ({light_key})", fill=(218, 224, 232), font=F_CELL)
        y_cur += CELL_H + 32 + PAD_Y

    out_path = OUT_DIR / out_name
    canvas.save(out_path, quality=93)
    print("Wrote", out_path, canvas.size)


build_main_sheet(
    "noon",
    "04-shambler-step2-noon-sheet.jpg",
    "RTX 5080 WebGPU · Noon studio light · Neck tendons/blood normal+roughness maps, head pores/blood, alphaTest tank cutouts, canvas trousers, pebbled boots.",
)
build_main_sheet(
    "night",
    "05-shambler-step2-night-sheet.jpg",
    "RTX 5080 WebGPU · Night preset (LIGHTS.night: cool moonlit rim + low hemi fill + glowing necrotic 0x74a18d eyes) · Matched 4x5 comparison.",
)

# Sheet 3: Focused Head/Mandible/Cheek Profile + Neck Tendon + Night Readability Detail Sheet
rows = [
    ("PROTOTYPE STEP 2 — SOLID MANDIBLE + STRETCHED CHEEKS + NECK TENDONS (NOON)", "#5cd68d", [
        ("noon-proto_apose-head_front", "NOON · PROTO HEAD FRONT"),
        ("noon-proto_apose-head_3q", "NOON · PROTO HEAD 3/4"),
        ("noon-proto_apose-head_side", "NOON · PROTO SIDE (closed mandible!)"),
        ("noon-proto_apose-head_back", "NOON · PROTO BACK (straps flush!)"),
    ]),
    ("TRIPO REF (look-only) — HEAD & NECK COMPARISON (NOON)", "#e8a55a", [
        ("noon-tripo-head_front", "NOON · TRIPO HEAD FRONT"),
        ("noon-tripo-head_3q", "NOON · TRIPO HEAD 3/4"),
        ("noon-tripo-head_side", "NOON · TRIPO SIDE PROFILE"),
        ("noon-tripo-head_back", "NOON · TRIPO HEAD BACK"),
    ]),
    ("SHAMBLE PROFILE + NIGHT HEAD/EYE/TENDON READABILITY CHECK", "#7ec8ff", [
        ("noon-proto_shamble-head_side", "NOON · SHAMBLE HEAD SIDE"),
        ("night-proto_apose-head_3q", "NIGHT · PROTO HEAD 3/4 (eyes + throat)"),
        ("night-proto_apose-head_side", "NIGHT · PROTO HEAD SIDE"),
        ("night-tripo-head", "NIGHT · TRIPO HEAD CLOSE"),
    ]),
]

CW, CH = 440, 540
RH = 34
W3 = PAD_X * 2 + 4 * CW + 3 * PAD_X
H3 = 96 + len(rows) * (RH + CH + 30 + PAD_Y) + 16
c3 = Image.new("RGB", (W3, H3), (20, 24, 30))
d3 = ImageDraw.Draw(c3)
d3.text((PAD_X, 16), "AG-357 STEP 2 DETAIL PROOF — CLOSED MANDIBLE/CHEEK PROFILE + NORMAL-MAPPED NECK TENDONS + NIGHT EYES", fill=(235, 240, 245), font=F_TITLE)
d3.text((PAD_X, 48), "Verifies Director Step 1 feedback (solid mandible ramus/chin + stretched cheek flesh closing profile; back tank straps tucked; neck tendons & mouth blood).", fill=(165, 215, 185), font=F_SUB)

yc = 96
for rtitle, ch, cells in rows:
    rgb = tuple(int(ch.lstrip("#")[i:i+2], 16) for i in (0, 2, 4))
    d3.rectangle([PAD_X, yc, W3 - PAD_X, yc + RH - 4], fill=(32, 37, 44), outline=rgb, width=2)
    d3.text((PAD_X + 12, yc + 6), rtitle, fill=rgb, font=F_HDR)
    yc += RH
    for ci, (fkey, label) in enumerate(cells):
        x0 = PAD_X + ci * (CW + PAD_X)
        p = FRAMES / f"{fkey}.png"
        if p.exists():
            im = Image.open(p).convert("RGB").resize((CW, CH), Image.Resampling.LANCZOS)
            c3.paste(im, (x0, yc))
        d3.rectangle([x0, yc, x0 + CW, yc + CH], outline=rgb, width=2)
        d3.rectangle([x0, yc + CH, x0 + CW, yc + CH + 28], fill=(28, 33, 39))
        d3.text((x0 + 10, yc + CH + 6), label, fill=(220, 228, 236), font=F_CELL)
    yc += CH + 30 + PAD_Y

out3 = OUT_DIR / "06-shambler-step2-head-jaw-detail.jpg"
c3.save(out3, quality=93)
print("Wrote", out3, c3.size)
