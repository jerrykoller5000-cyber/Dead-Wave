# tools/build-ag290-sheets.py
# Generates composite before/after & multi-light range review sheets for AG-290:
# 1. review/AG-290/sheet.jpg: Master Before/After review sheet (10 rows covering GW-4 hot+cooling, Suppressed GW-4, Minigun, 1P & 3P, 4 lights)
# 2. review/AG-290/heat-strips.jpg: 5x4 Multi-panel progression strip (GW-4 4-light, Cooling decay, Suppressed 4-light, Minigun 4-light, 3P Marine 4-light)

import os
import tempfile
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REV_DIR = os.path.join(ROOT, "review", "AG-290")
QA_DIR = os.path.join(ROOT, "qa", "2026-11-10-AG-290")
os.makedirs(REV_DIR, exist_ok=True)
os.makedirs(QA_DIR, exist_ok=True)


def save_atomic(img, out_path, quality=92):
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    fd, tmp_path = tempfile.mkstemp(suffix=".jpg", dir=os.path.dirname(out_path))
    os.close(fd)
    img.save(tmp_path, format="JPEG", quality=quality)
    try:
        os.replace(tmp_path, out_path)
    except OSError:
        with open(tmp_path, "rb") as src, open(out_path, "wb") as dst:
            dst.write(src.read())
        os.remove(tmp_path)


ROWS = [
    {
        "title": "Row 1 · 1P GW-4 in Range (Noon): Cold Barrel vs Fired Hot (Heat 0.90, Glowing Barrel + Smoke Wisp)",
        "before_label": "COLD (Heat 0.00) · Noon Range",
        "after_label": "FIRED HOT (Heat 0.90, Glowing Barrel + Rising Smoke Wisp) · Noon Range",
        "before": "fp-m4-cold-noon.png",
        "after": "fp-m4-hot-noon.png",
    },
    {
        "title": "Row 2 · 1P GW-4 in Range (Overcast & Dusk): Fired Hot (Heat 0.90) Across Daylight Moods",
        "before_label": "FIRED HOT (Heat 0.90, Barrel Glow + Smoke Wisp) · Overcast Range",
        "after_label": "FIRED HOT (Heat 0.90, Barrel Glow + Smoke Wisp) · Dusk Range",
        "before": "fp-m4-hot-overcast.png",
        "after": "fp-m4-hot-dusk.png",
    },
    {
        "title": "Row 3 · 1P GW-4 in Range (Night): Cold Barrel vs Fired Hot Incandescent Glow",
        "before_label": "COLD (Heat 0.00) · Night Range",
        "after_label": "FIRED HOT (Heat 0.90, Incandescent Red-Orange Barrel + Smoke) · Night Range",
        "before": "fp-m4-cold-night.png",
        "after": "fp-m4-hot-night.png",
    },
    {
        "title": "Row 4 · 1P GW-4 Natural Cooling (Noon & Night): Fading Cherry-Red Barrel & Thinning Smoke Wisp",
        "before_label": "COOLING MID (Heat 0.58, Cherry Red + Thinning Wisp) · Noon Range",
        "after_label": "COOLING LOW (Heat 0.32, Dull Crimson Fade + Faint Wisp) · Night Range",
        "before": "fp-m4-cool58-noon.png",
        "after": "fp-m4-cool32-night.png",
    },
    {
        "title": "Row 5 · 1P Suppressed GW-4 (Noon): Can Glows & Smokes, Barrel Behind Stays Cool",
        "before_label": "SUPPRESSED COLD (Heat 0.00) · Noon Range",
        "after_label": "SUPPRESSED HOT (Heat 0.90: Can Glows & Smokes, Barrel Cold) · Noon Range",
        "before": "fp-m4-sup-cold-noon.png",
        "after": "fp-m4-sup-hot-noon.png",
    },
    {
        "title": "Row 6 · 1P Suppressed GW-4 (Night): Can Glows Incandescent, Barrel Behind Stays Cool",
        "before_label": "SUPPRESSED COLD (Heat 0.00) · Night Range",
        "after_label": "SUPPRESSED HOT (Heat 0.90: Can Glows & Smokes, Barrel Cold) · Night Range",
        "before": "fp-m4-sup-cold-night.png",
        "after": "fp-m4-sup-hot-night.png",
    },
    {
        "title": "Row 7 · 1P Minigun Spun Hot (Noon & Night): 6-Barrel Rotary Cluster Glow + Muzzle Smoke",
        "before_label": "MINIGUN SPUN HOT (Heat 0.92, 6-Barrel Glow + Smoke) · Noon Range",
        "after_label": "MINIGUN SPUN HOT (Heat 0.92, 6-Barrel Glow + Smoke) · Night Range",
        "before": "fp-minigun-hot-noon.png",
        "after": "fp-minigun-hot-night.png",
    },
    {
        "title": "Row 8 · 3P Marine GW-4 in Range (Noon & Night): Cold vs Fired Hot (Heat 0.90)",
        "before_label": "3P MARINE GW-4 HOT (Heat 0.90, Barrel Glow + Smoke) · Noon Range",
        "after_label": "3P MARINE GW-4 HOT (Heat 0.90, Barrel Glow + Smoke) · Night Range",
        "before": "tp-m4-hot-noon.png",
        "after": "tp-m4-hot-night.png",
    },
    {
        "title": "Row 9 · 3P Marine Suppressed GW-4 (Noon & Night): Suppressor Glows, Barrel Stays Cold",
        "before_label": "3P SUPPRESSED HOT (Can Glows, Barrel Cold) · Noon Range",
        "after_label": "3P SUPPRESSED HOT (Can Glows, Barrel Cold) · Night Range",
        "before": "tp-m4-sup-hot-noon.png",
        "after": "tp-m4-sup-hot-night.png",
    },
    {
        "title": "Row 10 · 3P Marine Minigun Spun Hot (Noon & Night): Rotary 6-Barrel Cluster Glow in Range",
        "before_label": "3P MINIGUN SPUN HOT (Heat 0.92) · Noon Range",
        "after_label": "3P MINIGUN SPUN HOT (Heat 0.92) · Night Range",
        "before": "tp-minigun-hot-noon.png",
        "after": "tp-minigun-hot-night.png",
    },
]


def build_master_sheet():
    target_w, target_h = 720, 405
    header_h, subheader_h = 62, 24
    row_h = subheader_h + target_h + 14
    pad = 20

    sheet_w = pad * 2 + target_w * 2 + 16
    sheet_h = header_h + len(ROWS) * row_h + pad

    sheet = Image.new("RGB", (sheet_w, sheet_h), (16, 18, 22))
    draw = ImageDraw.Draw(sheet)

    try:
        font_title = ImageFont.truetype("arial.ttf", 20)
        font_sub = ImageFont.truetype("arial.ttf", 13)
        font_tag = ImageFont.truetype("arial.ttf", 11)
    except Exception:
        font_title = font_sub = font_tag = ImageFont.load_default()

    draw.rectangle([(0, 0), (sheet_w, header_h)], fill=(26, 30, 38))
    draw.text(
        (pad, 11),
        "AG-290: Barrel Heat, Muzzle Smoke Wisp & Barrel/Suppressor Glow in Training Ground Range (J131, J132)",
        fill=(242, 246, 255),
        font=font_title,
    )
    draw.text(
        (pad, 36),
        "RTX 5080 WebGPU · GW-4 Hot (0.90) & Cooling, Suppressed GW-4 (Can Only), Minigun Spun Hot · 1P & 3P in 4 Lights · Gemini 4 Carbon",
        fill=(172, 188, 210),
        font=font_sub,
    )

    y = header_h + 10
    for r in ROWS:
        draw.text((pad, y), r["title"], fill=(255, 214, 110), font=font_sub)
        y += subheader_h

        img_b = Image.open(os.path.join(REV_DIR, r["before"])).resize((target_w, target_h), Image.Resampling.LANCZOS)
        img_a = Image.open(os.path.join(REV_DIR, r["after"])).resize((target_w, target_h), Image.Resampling.LANCZOS)

        sheet.paste(img_b, (pad, y))
        sheet.paste(img_a, (pad + target_w + 16, y))

        draw.rectangle([(pad, y), (pad + 540, y + 20)], fill=(0, 0, 0))
        draw.text((pad + 6, y + 3), r["before_label"], fill=(210, 225, 240), font=font_tag)

        draw.rectangle([(pad + target_w + 16, y), (pad + target_w + 16 + 580, y + 20)], fill=(0, 0, 0))
        draw.text((pad + target_w + 22, y + 3), r["after_label"], fill=(255, 148, 68), font=font_tag)

        y += target_h + 14

    out_rev = os.path.join(REV_DIR, "sheet.jpg")
    out_qa = os.path.join(QA_DIR, "sheet.jpg")
    save_atomic(sheet, out_rev, quality=92)
    save_atomic(sheet, out_qa, quality=92)
    print(f"Saved master sheet: {out_rev} ({sheet_w}x{sheet_h})")


def build_strips_sheet():
    strips = [
        (
            "Strip 1 · 1P GW-4 Fired Hot (Heat 0.90) Across All 4 Lights (Noon / Overcast / Dusk / Night)",
            [
                ("Noon · Heat 0.90", "fp-m4-hot-noon.png"),
                ("Overcast · Heat 0.90", "fp-m4-hot-overcast.png"),
                ("Dusk · Heat 0.90", "fp-m4-hot-dusk.png"),
                ("Night · Heat 0.90", "fp-m4-hot-night.png"),
            ],
        ),
        (
            "Strip 2 · 1P GW-4 Natural Thermal Decay: Fired Hot (0.90) -> Cooling (0.58) -> Cooling (0.32) -> Cold (0.00)",
            [
                ("Peak Hot (0.90) · Night", "fp-m4-hot-night.png"),
                ("Cooling (0.58) · Night", "fp-m4-cool58-night.png"),
                ("Cooling (0.32) · Night", "fp-m4-cool32-night.png"),
                ("Cooled Cold (0.00) · Night", "fp-m4-cold-night.png"),
            ],
        ),
        (
            "Strip 3 · 1P Suppressed GW-4 Across All 4 Lights (Suppressor Glows & Smokes, Barrel Stays Cold)",
            [
                ("Suppressed · Noon (0.90)", "fp-m4-sup-hot-noon.png"),
                ("Suppressed · Overcast (0.90)", "fp-m4-sup-hot-overcast.png"),
                ("Suppressed · Dusk (0.90)", "fp-m4-sup-hot-dusk.png"),
                ("Suppressed · Night (0.90)", "fp-m4-sup-hot-night.png"),
            ],
        ),
        (
            "Strip 4 · 1P Minigun Spun Hot (Heat 0.92, 6-Barrel Cluster) Across All 4 Lights",
            [
                ("Minigun · Noon (0.92)", "fp-minigun-hot-noon.png"),
                ("Minigun · Overcast (0.92)", "fp-minigun-hot-overcast.png"),
                ("Minigun · Dusk (0.92)", "fp-minigun-hot-dusk.png"),
                ("Minigun · Night (0.92)", "fp-minigun-hot-night.png"),
            ],
        ),
        (
            "Strip 5 · 3P Marine GW-4 Fired Hot (Heat 0.90) in Firing Range Across All 4 Lights",
            [
                ("3P Marine · Noon (0.90)", "tp-m4-hot-noon.png"),
                ("3P Marine · Overcast (0.90)", "tp-m4-hot-overcast.png"),
                ("3P Marine · Dusk (0.90)", "tp-m4-hot-dusk.png"),
                ("3P Marine · Night (0.90)", "tp-m4-hot-night.png"),
            ],
        ),
    ]

    target_w, target_h = 384, 216
    pad = 16
    header_h = 54
    strip_h = 24 + target_h + 14

    sheet_w = pad * 2 + target_w * 4 + 12 * 3
    sheet_h = header_h + len(strips) * strip_h + pad

    sheet = Image.new("RGB", (sheet_w, sheet_h), (16, 18, 22))
    draw = ImageDraw.Draw(sheet)

    try:
        font_title = ImageFont.truetype("arial.ttf", 18)
        font_strip = ImageFont.truetype("arial.ttf", 13)
        font_label = ImageFont.truetype("arial.ttf", 11)
    except Exception:
        font_title = font_strip = font_label = ImageFont.load_default()

    draw.rectangle([(0, 0), (sheet_w, header_h)], fill=(26, 30, 38))
    draw.text(
        (pad, 15),
        "AG-290: 4-Light Heat Strips — GW-4 Hot & Cooling, Suppressed GW-4, Minigun & 3P Marine in Range",
        fill=(242, 246, 255),
        font=font_title,
    )

    y = header_h + 10
    for strip_title, items in strips:
        draw.text((pad, y), strip_title, fill=(255, 214, 110), font=font_strip)
        y += 24
        for col, (lbl, fname) in enumerate(items):
            x = pad + col * (target_w + 12)
            img = Image.open(os.path.join(REV_DIR, fname)).resize((target_w, target_h), Image.Resampling.LANCZOS)
            sheet.paste(img, (x, y))
            draw.rectangle([(x, y), (x + target_w, y + 20)], fill=(0, 0, 0))
            draw.text((x + 6, y + 3), lbl, fill=(255, 190, 110), font=font_label)
        y += target_h + 14

    out_rev = os.path.join(REV_DIR, "heat-strips.jpg")
    out_qa = os.path.join(QA_DIR, "heat-strips.jpg")
    save_atomic(sheet, out_rev, quality=92)
    save_atomic(sheet, out_qa, quality=92)
    print(f"Saved strips sheet: {out_rev} ({sheet_w}x{sheet_h})")


def build_smoke_strip():
    rows = [
        (
            "Row 1 · Noon Range (Daylight Ambient): Fired Hot (0.90) -> Cooling (0.32) -> Cold (0.00) Wisps",
            [
                ("FIRED HOT (0.90) · Noon · Thin Curling Wisp", "fp-m4-hot-noon.png"),
                ("COOLING (0.32) · Noon · Faint Dissipating Wisp", "fp-m4-cool32-noon.png"),
                ("COLD (0.00) · Noon · Smoke Gone", "fp-m4-cold-noon.png"),
            ],
        ),
        (
            "Row 2 · Night Range (Dark Ambient): Fired Hot (0.90) -> Cooling (0.32) -> Cold (0.00) Wisps",
            [
                ("FIRED HOT (0.90) · Night · Thin Curling Wisp", "fp-m4-hot-night.png"),
                ("COOLING (0.32) · Night · Faint Dissipating Wisp", "fp-m4-cool32-night.png"),
                ("COLD (0.00) · Night · Smoke Gone", "fp-m4-cold-night.png"),
            ],
        ),
    ]

    target_w, target_h = 480, 270
    pad = 16
    header_h = 54
    strip_h = 24 + target_h + 14

    sheet_w = pad * 2 + target_w * 3 + 12 * 2
    sheet_h = header_h + len(rows) * strip_h + pad

    sheet = Image.new("RGB", (sheet_w, sheet_h), (16, 18, 22))
    draw = ImageDraw.Draw(sheet)

    try:
        font_title = ImageFont.truetype("arial.ttf", 18)
        font_strip = ImageFont.truetype("arial.ttf", 13)
        font_label = ImageFont.truetype("arial.ttf", 11)
    except Exception:
        font_title = font_strip = font_label = ImageFont.load_default()

    draw.rectangle([(0, 0), (sheet_w, header_h)], fill=(26, 30, 38))
    draw.text(
        (pad, 15),
        "AG-290: Smoke Wisps Strip — Hot (0.90), Cooling (0.32), and Cold (0.00) at Noon and Night (J131)",
        fill=(242, 246, 255),
        font=font_title,
    )

    y = header_h + 10
    for strip_title, items in rows:
        draw.text((pad, y), strip_title, fill=(255, 214, 110), font=font_strip)
        y += 24
        for col, (lbl, fname) in enumerate(items):
            x = pad + col * (target_w + 12)
            img = Image.open(os.path.join(REV_DIR, fname)).resize((target_w, target_h), Image.Resampling.LANCZOS)
            sheet.paste(img, (x, y))
            draw.rectangle([(x, y), (x + target_w, y + 20)], fill=(0, 0, 0))
            draw.text((x + 6, y + 3), lbl, fill=(255, 190, 110), font=font_label)
        y += target_h + 14

    out_rev = os.path.join(REV_DIR, "smoke-strip.jpg")
    out_qa = os.path.join(QA_DIR, "smoke-strip.jpg")
    save_atomic(sheet, out_rev, quality=92)
    save_atomic(sheet, out_qa, quality=92)
    print(f"Saved smoke strip: {out_rev} ({sheet_w}x{sheet_h})")


if __name__ == "__main__":
    build_master_sheet()
    build_strips_sheet()
    build_smoke_strip()
