# qa/2026-11-11-AG-300/build-ag300-sheets.py
# Builds 4-light RTX 5080 WebGPU contact sheets for GT-20077/79 flamer & chainsaw (Factory & M81)

import os
from PIL import Image, ImageDraw, ImageFont

ROOT = r"C:\Users\Zero\Desktop\Tiny Trek"
QA_DIR = os.path.join(ROOT, "qa", "2026-11-11-AG-300")
REV_DIR = os.path.join(ROOT, "review", "AG-300")
FLAMER_DIR = os.path.join(ROOT, "review", "GT-20077", "flamer", "gpu")
SAW_DIR = os.path.join(ROOT, "review", "GT-20077", "chainsaw", "gpu")

LIGHTS = ["noon", "overcast", "dusk", "night"]
LIGHT_LABELS = {"noon": "Noon", "overcast": "Overcast", "dusk": "Dusk", "night": "Night"}


def load_font(sz, bold=False):
    for p in [
        r"C:\Windows\Fonts\consolab.ttf" if bold else r"C:\Windows\Fonts\consola.ttf",
        r"C:\Windows\Fonts\segoeuib.ttf" if bold else r"C:\Windows\Fonts\segoeui.ttf",
        r"C:\Windows\Fonts\arialbd.ttf" if bold else r"C:\Windows\Fonts\arial.ttf",
    ]:
        if os.path.exists(p):
            return ImageFont.truetype(p, sz)
    return ImageFont.load_default()


F_TITLE = load_font(21, True)
F_SUB = load_font(14, False)
F_ROW = load_font(15, True)
F_TAG = load_font(13, True)


def badge(img, text, fg=(245, 248, 252)):
    im = img.copy()
    d = ImageDraw.Draw(im)
    bb = d.textbbox((0, 0), text, font=F_TAG)
    tw, th = bb[2] - bb[0], bb[3] - bb[1]
    d.rectangle([8, 8, 8 + tw + 14, 8 + th + 8], fill=(14, 18, 24), outline=(72, 86, 106), width=1)
    d.text((15, 11), text, font=F_TAG, fill=fg)
    return im


def build_sheet(w_key, w_title, subtitle, src_dir, out_dirs):
    rows = [
        ("Factory · 1P Hip", "factory", "hip", (240, 245, 255)),
        ("M81 Camo · 1P Hip", "m81", "hip", (165, 245, 185)),
        ("Factory · 1P Aimed", "factory", "aimed", (240, 245, 255)),
        ("M81 Camo · 1P Aimed", "m81", "aimed", (165, 245, 185)),
        ("Factory · 3P Held", "factory", "held", (240, 245, 255)),
        ("M81 Camo · 3P Held", "m81", "held", (165, 245, 185)),
        ("Factory · Armory Rack", "factory", "rack", (240, 245, 255)),
        ("M81 Camo · Armory Rack", "m81", "rack", (165, 245, 185)),
    ]
    tw, th = 460, 259
    pad = 9
    left_w = 215
    top_h = 72
    W = left_w + 4 * tw + 5 * pad
    H = top_h + len(rows) * (th + pad) + pad
    canvas = Image.new("RGB", (W, H), (14, 17, 22))
    d = ImageDraw.Draw(canvas)
    d.text((pad + 4, 12), w_title, font=F_TITLE, fill=(242, 246, 252))
    d.text((pad + 4, 42), subtitle, font=F_SUB, fill=(175, 190, 210))

    for r_idx, (r_lbl, fin, view, bcol) in enumerate(rows):
        y = top_h + r_idx * (th + pad)
        d.text((pad + 4, y + th // 2 - 10), r_lbl, font=F_ROW, fill=bcol)
        for c_idx, lk in enumerate(LIGHTS):
            x = left_w + pad + c_idx * (tw + pad)
            fp = os.path.join(src_dir, f"{w_key}-{fin}-{view}-{lk}.png")
            tile = Image.open(fp).convert("RGB").resize((tw, th), Image.Resampling.LANCZOS)
            tile = badge(tile, f"{fin.upper()} · {view} · {LIGHT_LABELS[lk]}", fg=bcol)
            canvas.paste(tile, (x, y))

    for od, fname in out_dirs:
        os.makedirs(od, exist_ok=True)
        op = os.path.join(od, fname)
        tmp = op + ".tmp.jpg"
        canvas.save(tmp, "JPEG", quality=93)
        os.replace(tmp, op)
        print(f"[AG-300] wrote {op} ({canvas.size[0]}x{canvas.size[1]})")


if __name__ == "__main__":
    build_sheet(
        "flamer",
        "AG-300 (GT-20077/79) — Flamethrower Factory & M81 in 4 Lights (RTX 5080 WebGPU)",
        "1P Hip, 1P Aimed, 3P Held & Armory Rack across Noon / Overcast / Dusk / Night · Gauge readable, only case/service covers take M81, grips & hose clean",
        FLAMER_DIR,
        [
            (FLAMER_DIR, "sheet-flamer-factory-m81-4lights.jpg"),
            (REV_DIR, "sheet-flamer-factory-m81-4lights.jpg"),
            (QA_DIR, "sheet-flamer-factory-m81-4lights.jpg"),
        ],
    )
    build_sheet(
        "chainsaw",
        "AG-300 (GT-20077/79) — Chainsaw Factory & M81 in 4 Lights (RTX 5080 WebGPU)",
        "1P Hip (FOV 48), 1P Aimed, 3P Held & Armory Rack across Noon / Overcast / Dusk / Night · Only covers take M81; orange motor, bar, handles & chain stay factory",
        SAW_DIR,
        [
            (SAW_DIR, "sheet-chainsaw-factory-m81-4lights.jpg"),
            (REV_DIR, "sheet-chainsaw-factory-m81-4lights.jpg"),
            (QA_DIR, "sheet-chainsaw-factory-m81-4lights.jpg"),
        ],
    )
