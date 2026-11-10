# tools/build-ag290-sheets.py
# Generates composite before/after review sheets for AG-290:
# 1. review/AG-290/sheet.jpg: Master Before/After review sheet (6 comparison rows)
# 2. review/AG-290/heat-strips.jpg: 4-light visual progression strip

import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REV_DIR = os.path.join(ROOT, "review", "AG-290")
QA_DIR = os.path.join(ROOT, "qa", "2026-11-10-AG-290")
os.makedirs(REV_DIR, exist_ok=True)
os.makedirs(QA_DIR, exist_ok=True)

ROWS = [
    {
        "title": "Row 1 · First-Person M4 (Noon): Cold Barrel vs Sustained Fire (Glow + Smoke)",
        "before_label": "BEFORE: Cold Barrel (Heat 0.0, 0 Emissive, 0 Smoke)",
        "after_label": "AFTER: Sustained Fire (Heat 0.88, Glowing Barrel + Drifting Smoke Wisp)",
        "before": os.path.join(REV_DIR, "before-fp-m4-cold-noon.png"),
        "after": os.path.join(REV_DIR, "after-fp-m4-hot-noon.png")
    },
    {
        "title": "Row 2 · First-Person M4 (Overcast): Cold Barrel vs Sustained Fire (Glow + Smoke)",
        "before_label": "BEFORE: Cold Barrel (Heat 0.0) · Overcast Diffuse",
        "after_label": "AFTER: Sustained Fire (Heat 0.88, Red-Orange Glow + Smoke Wisp) · Overcast",
        "before": os.path.join(REV_DIR, "before-fp-m4-cold-overcast.png"),
        "after": os.path.join(REV_DIR, "after-fp-m4-hot-overcast.png")
    },
    {
        "title": "Row 3 · First-Person M4 (Dusk): Cold Barrel vs Sustained Fire (Glow + Smoke)",
        "before_label": "BEFORE: Cold Barrel (Heat 0.0) · Amber Dusk",
        "after_label": "AFTER: Sustained Fire (Heat 0.88, Red-Orange Glow + Smoke Wisp) · Dusk",
        "before": os.path.join(REV_DIR, "before-fp-m4-cold-dusk.png"),
        "after": os.path.join(REV_DIR, "after-fp-m4-hot-dusk.png")
    },
    {
        "title": "Row 4 · First-Person M4 (Night): Cold Barrel vs Glowing Incandescent Barrel",
        "before_label": "BEFORE: Cold Barrel (Heat 0.0) · Night Moonlight",
        "after_label": "AFTER: Sustained Fire (Heat 0.88, Glowing Emissive Barrel + Smoke) · Night",
        "before": os.path.join(REV_DIR, "before-fp-m4-cold-night.png"),
        "after": os.path.join(REV_DIR, "after-fp-m4-hot-night.png")
    },
    {
        "title": "Row 5 · Suppressor Fitted (Night): Suppressor Glows & Smokes, Barrel Stays Cool",
        "before_label": "BEFORE: Suppressed M4 Cold (Heat 0.0) · Night",
        "after_label": "AFTER: Suppressed Hot (Heat 0.88, Suppressor Glows & Smokes; Barrel Cool)",
        "before": os.path.join(REV_DIR, "before-fp-m4-suppressed-cold-night.png"),
        "after": os.path.join(REV_DIR, "after-fp-m4-suppressed-hot-night.png")
    },
    {
        "title": "Row 6 · Minigun (Noon): Cold 6-Barrel Cluster vs Sustained Rotary Fire Glow",
        "before_label": "BEFORE: Minigun Cold (Heat 0.0) · Noon",
        "after_label": "AFTER: Minigun Hot (Heat 0.92, Glowing 6-Barrel Assembly + Smoke Wisp) · Noon",
        "before": os.path.join(REV_DIR, "before-fp-minigun-cold-noon.png"),
        "after": os.path.join(REV_DIR, "after-fp-minigun-hot-noon.png")
    }
]

def build_master_sheet():
    target_w, target_h = 700, 394
    header_h, subheader_h = 60, 24
    row_h = subheader_h + target_h + 16
    pad = 20

    sheet_w = pad * 2 + target_w * 2 + 16
    sheet_h = header_h + len(ROWS) * row_h + pad

    sheet = Image.new("RGB", (sheet_w, sheet_h), (18, 20, 24))
    draw = ImageDraw.Draw(sheet)

    try:
        font_title = ImageFont.truetype("arial.ttf", 20)
        font_sub = ImageFont.truetype("arial.ttf", 13)
        font_tag = ImageFont.truetype("arial.ttf", 11)
    except:
        font_title = font_sub = font_tag = ImageFont.load_default()

    draw.rectangle([(0, 0), (sheet_w, header_h)], fill=(28, 32, 40))
    draw.text((pad, 12), "AG-290: Barrel Heat, Muzzle Smoke Wisp & Barrel/Suppressor Red Glow (J131, J132)", fill=(240, 245, 255), font=font_title)
    draw.text((pad, 36), "RTX 5080 WebGPU Direct3D11 · First Person & Third Person in 4 Lights · Gemini 4 Carbon", fill=(170, 185, 205), font=font_sub)

    y = header_h + pad // 2
    for idx, r in enumerate(ROWS):
        draw.text((pad, y), r["title"], fill=(255, 215, 110), font=font_sub)
        y += subheader_h

        img_b = Image.open(r["before"]).resize((target_w, target_h), Image.Resampling.LANCZOS)
        img_a = Image.open(r["after"]).resize((target_w, target_h), Image.Resampling.LANCZOS)

        sheet.paste(img_b, (pad, y))
        sheet.paste(img_a, (pad + target_w + 16, y))

        draw.rectangle([(pad, y), (pad + 420, y + 20)], fill=(0, 0, 0, 180))
        draw.text((pad + 6, y + 3), r["before_label"], fill=(200, 215, 230), font=font_tag)

        draw.rectangle([(pad + target_w + 16, y), (pad + target_w + 16 + 510, y + 20)], fill=(0, 0, 0, 180))
        draw.text((pad + target_w + 22, y + 3), r["after_label"], fill=(255, 140, 60), font=font_tag)

        y += target_h + 16

    out_file = os.path.join(REV_DIR, "sheet.jpg")
    qa_file = os.path.join(QA_DIR, "sheet.jpg")
    sheet.save(out_file, quality=92)
    sheet.save(qa_file, quality=92)
    print(f"Saved master sheet: {out_file} ({sheet_w}x{sheet_h})")

def build_strips_sheet():
    strip_shots = [
        ("Noon · Cold", os.path.join(REV_DIR, "before-fp-m4-cold-noon.png")),
        ("Noon · Hot (Glow+Smoke)", os.path.join(REV_DIR, "after-fp-m4-hot-noon.png")),
        ("Overcast · Hot", os.path.join(REV_DIR, "after-fp-m4-hot-overcast.png")),
        ("Dusk · Hot", os.path.join(REV_DIR, "after-fp-m4-hot-dusk.png")),
        ("Night · Hot (Incandescent)", os.path.join(REV_DIR, "after-fp-m4-hot-night.png")),
        ("Night · Suppressed Hot", os.path.join(REV_DIR, "after-fp-m4-suppressed-hot-night.png"))
    ]

    target_w, target_h = 420, 236
    pad = 16
    header_h = 50

    sheet_w = pad * 2 + target_w * 3 + pad * 2
    sheet_h = header_h + (target_h + 30) * 2 + pad * 2

    sheet = Image.new("RGB", (sheet_w, sheet_h), (18, 20, 24))
    draw = ImageDraw.Draw(sheet)

    try:
        font_title = ImageFont.truetype("arial.ttf", 18)
        font_label = ImageFont.truetype("arial.ttf", 12)
    except:
        font_title = font_label = ImageFont.load_default()

    draw.text((pad, 14), "AG-290: 4-Light Heat Progression & Suppressor Isolation Strip", fill=(240, 245, 255), font=font_title)

    for i, (lbl, pth) in enumerate(strip_shots):
        row = i // 3
        col = i % 3
        x = pad + col * (target_w + pad)
        y = header_h + pad + row * (target_h + 30)

        img = Image.open(pth).resize((target_w, target_h), Image.Resampling.LANCZOS)
        sheet.paste(img, (x, y))

        draw.rectangle([(x, y), (x + target_w, y + 20)], fill=(0, 0, 0, 180))
        draw.text((x + 6, y + 3), lbl, fill=(255, 200, 120), font=font_label)

    out_file = os.path.join(REV_DIR, "heat-strips.jpg")
    qa_file = os.path.join(QA_DIR, "heat-strips.jpg")
    sheet.save(out_file, quality=92)
    sheet.save(qa_file, quality=92)
    print(f"Saved strips sheet: {out_file} ({sheet_w}x{sheet_h})")

if __name__ == "__main__":
    build_master_sheet()
    build_strips_sheet()
