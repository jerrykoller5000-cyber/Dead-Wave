# tools/build-ag293-sheets.py
# AG-293 (Jerry, 10 Nov; J133, J134, D-149): Shotgun ammo types by eye on NVIDIA GeForce RTX 5080.
# Generates composite review sheets:
# 1. review/AG-293/ammo-strips.jpg:
#    - Strip 1: Birdshot (red hull, 7 pellets x 9 dmg, spread 0.14) in 4 lights
#    - Strip 2: Buckshot (blue hull with 1 band, 8 pellets x 10 dmg, spread 0.12) in 4 lights
#    - Strip 3: Slug (ivory hull with 2 bands, 1 pellet x 100 dmg, spread 0.02) in 4 lights
#    - Strip 4: The X Change (5 stages: Ready -> Unloading -> Empty -> Loading -> Settled, with HUD)
# 2. review/AG-293/sheet.jpg: Master review sheet combining strips + 10m target spread comparison + 3 spent hull artwork plate.

import os
import tempfile
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REV_DIR = os.path.join(ROOT, "review", "AG-293")
QA_DIR = os.path.join(ROOT, "qa", "2026-11-11-AG-293")
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


def get_fonts():
    try:
        font_title = ImageFont.truetype("arial.ttf", 20)
        font_sub = ImageFont.truetype("arial.ttf", 13)
        font_label = ImageFont.truetype("arial.ttf", 11)
        font_micro = ImageFont.truetype("arial.ttf", 10)
    except Exception:
        font_title = font_sub = font_label = font_micro = ImageFont.load_default()
    return font_title, font_sub, font_label, font_micro


def build_ammo_strips():
    font_title, font_sub, font_label, font_micro = get_fonts()

    strips = [
        (
            "Strip 1 · Birdshot (Issued Load: 7x9 = 63 Dmg, Spread 0.14) · Red Hull Thrown on Pump · 4 Lights",
            [
                ("Noon · Red Hull Thrown · 7-Pellet Spread at 10m", "shotgun-birdshot-noon.png"),
                ("Overcast · Red Hull Thrown · 7-Pellet Spread at 10m", "shotgun-birdshot-overcast.png"),
                ("Dusk · Red Hull Thrown · 7-Pellet Spread at 10m", "shotgun-birdshot-dusk.png"),
                ("Night · Red Hull Thrown · 7-Pellet Spread at 10m", "shotgun-birdshot-night.png"),
            ],
            (255, 110, 100),
        ),
        (
            "Strip 2 · Buckshot (00 Buck: 8x10 = 80 Dmg, Spread 0.12) · Blue Hull with 1 Band Thrown · 4 Lights",
            [
                ("Noon · Blue 1-Band Hull · Tighter 8-Pellet Cluster at 10m", "shotgun-buckshot-noon.png"),
                ("Overcast · Blue 1-Band Hull · Tighter 8-Pellet Cluster at 10m", "shotgun-buckshot-overcast.png"),
                ("Dusk · Blue 1-Band Hull · Tighter 8-Pellet Cluster at 10m", "shotgun-buckshot-dusk.png"),
                ("Night · Blue 1-Band Hull · Tighter 8-Pellet Cluster at 10m", "shotgun-buckshot-night.png"),
            ],
            (110, 180, 255),
        ),
        (
            "Strip 3 · Slug (1 oz Rifled: 1x100 = 100 Dmg, Spread 0.02) · Ivory Hull with 2 Bands Thrown · 4 Lights",
            [
                ("Noon · Ivory 2-Band Hull · Single Hole Bullseye at 10m", "shotgun-slug-noon.png"),
                ("Overcast · Ivory 2-Band Hull · Single Hole Bullseye at 10m", "shotgun-slug-overcast.png"),
                ("Dusk · Ivory 2-Band Hull · Single Hole Bullseye at 10m", "shotgun-slug-dusk.png"),
                ("Night · Ivory 2-Band Hull · Single Hole Bullseye at 10m", "shotgun-slug-night.png"),
            ],
            (240, 230, 190),
        ),
        (
            "Strip 4 · The X Change Sequence (Unloading Old Type -> Loading New Type, HUD Line & Retained Rounds)",
            [
                ("1. READY · 8/8 Birdshot Loaded · HUD: [X] TYPE", "change-1-ready.png"),
                ("2. UNLOAD · Working Shells Out (0.36s) · HUD: UNLOADING...", "change-2-unloading.png"),
                ("3. EMPTY · 8 Birdshot Retained in Stock · Transition", "change-3-transition.png"),
                ("4. LOAD · Pushing Buckshot In (0.42s) · HUD: LOADING...", "change-4-loading.png"),
                ("5. SETTLED · 8/8 Buckshot Ready · Total ~6.5s Swapped", "change-5-settled.png"),
            ],
            (120, 255, 180),
        ),
    ]

    target_w, target_h = 384, 216
    pad = 16
    header_h = 56
    strip_header_h = 24
    row_h = strip_header_h + target_h + 16

    # Strip 4 has 5 items; strips 1-3 have 4 items. We size the sheet to accommodate 5 columns if needed, or 4 standard.
    # For a 5-item row in standard width, scale to fit 5: 5 * 300 + 4 * 10 + 32 = 1572
    max_cols = 5
    item_w_5 = (pad * 2 + target_w * 4 + 12 * 3 - pad * 2 - 12 * 4) // 5
    item_h_5 = int(item_w_5 * 9 / 16)

    sheet_w = pad * 2 + target_w * 4 + 12 * 3
    sheet_h = header_h + 3 * row_h + (strip_header_h + item_h_5 + 16) + pad

    sheet = Image.new("RGB", (sheet_w, sheet_h), (14, 16, 20))
    draw = ImageDraw.Draw(sheet)

    # Header
    draw.rectangle([(0, 0), (sheet_w, header_h)], fill=(22, 26, 34))
    draw.text(
        (pad, 10),
        "AG-293: Shotgun Ammo Types & The X Change by Eye on RTX 5080 (J133, J134, D-149)",
        fill=(245, 248, 255),
        font=font_title,
    )
    draw.text(
        (pad, 34),
        "Birdshot (Red) · Buckshot (Blue, 1 Band) · Slug (Ivory, 2 Bands) · Spent Hulls on Pump · 10m Target Spread · 4 Lights · CB-294 / GP-20083",
        fill=(170, 185, 205),
        font=font_sub,
    )

    y = header_h + 10
    for idx, (strip_title, items, col_color) in enumerate(strips):
        draw.text((pad, y), strip_title, fill=col_color, font=font_sub)
        y += strip_header_h

        is_5_col = len(items) == 5
        curr_w = item_w_5 if is_5_col else target_w
        curr_h = item_h_5 if is_5_col else target_h
        gap = 10 if is_5_col else 12

        for c_idx, (lbl, fname) in enumerate(items):
            x = pad + c_idx * (curr_w + gap)
            fpath = os.path.join(REV_DIR, fname)
            if os.path.exists(fpath):
                img = Image.open(fpath).resize((curr_w, curr_h), Image.Resampling.LANCZOS)
                sheet.paste(img, (x, y))
            else:
                draw.rectangle([(x, y), (x + curr_w, y + curr_h)], fill=(30, 35, 45))

            draw.rectangle([(x, y), (x + curr_w, y + 20)], fill=(0, 0, 0))
            draw.text((x + 6, y + 3), lbl, fill=col_color, font=font_micro)

        y += curr_h + 16

    out_rev = os.path.join(REV_DIR, "ammo-strips.jpg")
    out_qa = os.path.join(QA_DIR, "ammo-strips.jpg")
    save_atomic(sheet, out_rev, quality=92)
    save_atomic(sheet, out_qa, quality=92)
    print(f"Saved ammo strips: {out_rev} ({sheet_w}x{sheet_h})")


def build_master_sheet():
    font_title, font_sub, font_label, font_micro = get_fonts()

    # Master sheet sections:
    # 1. 3-Hull Detailed Studio Plate (Red, Blue 1-band, Ivory 2-band)
    # 2. 10m Target Spread Comparison (Birdshot 7x9 vs Buckshot 8x10 vs Slug 1x100)
    # 3. 1P Fired Pump Shotgun in 4 Lights (Birdshot, Buckshot, Slug)
    # 4. The X Change 5-Stage Sequence
    target_w, target_h = 480, 270
    pad = 16
    header_h = 56
    section_h = 24

    sheet_w = pad * 2 + target_w * 3 + 12 * 2  # 3 columns layout: 1496 px wide

    # Sections:
    # Row 1: 3-Hulls Detailed Plate (spans 3 cols or 1 large + 2 targets)
    # Row 2: Target Spread at 10m (Birdshot vs Buckshot vs Slug at Noon)
    # Row 3: 1P Firing & Hull Ejected (Birdshot vs Buckshot vs Slug at Noon)
    # Row 4: 1P Firing & Hull Ejected (Birdshot vs Buckshot vs Slug at Night)
    # Row 5: The X Change Progression (3 key panels: Ready -> Unloading -> Settled)

    rows = [
        (
            "Row 1 · Spent Hull Artwork Comparison (GT-20080 / CB-294): Real 70mm 12ga Dimensions, Colors & Moulded Bands",
            [
                ("Birdshot: Red Hull (0xa43e37), Short Brass Head (0.12), 0 Bands", "hull-birdshot.png"),
                ("Buckshot: Blue Hull (0x497ba0), Tall Brass Head (0.25), 1 Moulded Band", "hull-buckshot.png"),
                ("Slug: Ivory Hull (0xc9c3a2), Tall Brass Head (0.25), 2 Moulded Bands", "hull-slug.png"),
            ],
            (255, 214, 110),
        ),
        (
            "Row 2 · Target Spread Pattern at 10m Downrange: Wide Birdshot (0.14) vs Tight Buckshot (0.12) vs Slug (0.02)",
            [
                ("Birdshot Spread (10m): 7 Pellets (63 Dmg), Wide Dispersal across Silhouette", "target-birdshot-noon.png"),
                ("Buckshot Spread (10m): 8 Pellets (80 Dmg), Tight Lethal Group in Center Mass", "target-buckshot-noon.png"),
                ("Slug Spread (10m): 1 Heavy Round (100 Dmg), Pinpoint Hole in Bullseye", "target-slug-noon.png"),
            ],
            (255, 175, 90),
        ),
        (
            "Row 3 · First-Person Firing & Pump Hull Ejection (Noon Daylight): Spent Hull Thrown in Mid-Air",
            [
                ("1P Birdshot (Noon): Red Hull Thrown from Ejection Port on Pump", "shotgun-birdshot-noon.png"),
                ("1P Buckshot (Noon): Blue 1-Band Hull Thrown from Ejection Port on Pump", "shotgun-buckshot-noon.png"),
                ("1P Slug (Noon): Ivory 2-Band Hull Thrown from Ejection Port on Pump", "shotgun-slug-noon.png"),
            ],
            (130, 220, 255),
        ),
        (
            "Row 4 · First-Person Firing & Pump Hull Ejection (Night Dark): High-Contrast Hull Silhouettes",
            [
                ("1P Birdshot (Night): Red Hull Clearly Visible against Night Range", "shotgun-birdshot-night.png"),
                ("1P Buckshot (Night): Blue Hull & Distinct Band Visible in Dark", "shotgun-buckshot-night.png"),
                ("1P Slug (Night): Pale Ivory Hull & Dual Bands Visible in Dark", "shotgun-slug-night.png"),
            ],
            (170, 190, 255),
        ),
        (
            "Row 5 · The X Change Key Milestones (Unload 0.36s/shell, Load 0.42s/shell, Settle 0.25s, Retained Ammo)",
            [
                ("Ready: 8/8 Birdshot in Tube · HUD: SHOTGUN · [X] TYPE (8/8)", "change-1-ready.png"),
                ("Unloading: Birdshot Shells Worked Out into Stock · HUD: UNLOADING... (5/8)", "change-2-unloading.png"),
                ("Settled: 8/8 Buckshot Loaded & Ready · HUD: SHOTGUN · [X] TYPE (8/8)", "change-5-settled.png"),
            ],
            (120, 255, 180),
        ),
    ]

    sheet_h = header_h + len(rows) * (section_h + target_h + 16) + pad
    sheet = Image.new("RGB", (sheet_w, sheet_h), (14, 16, 20))
    draw = ImageDraw.Draw(sheet)

    # Header
    draw.rectangle([(0, 0), (sheet_w, header_h)], fill=(22, 26, 34))
    draw.text(
        (pad, 10),
        "AG-293: Shotgun Ammo Types Master Review Sheet — RTX 5080 (J133, J134, D-149)",
        fill=(245, 248, 255),
        font=font_title,
    )
    draw.text(
        (pad, 34),
        "Spent Hulls by Type (Red, Blue 1-Band, Ivory 2-Band) · 10m Target Spread Comparison · Firing in 4 Lights · The X Change Mechanics",
        fill=(170, 185, 205),
        font=font_sub,
    )

    y = header_h + 10
    for strip_title, items, col_color in rows:
        draw.text((pad, y), strip_title, fill=col_color, font=font_sub)
        y += section_h

        for c_idx, (lbl, fname) in enumerate(items):
            x = pad + c_idx * (target_w + 12)
            fpath = os.path.join(REV_DIR, fname)
            if os.path.exists(fpath):
                img = Image.open(fpath).resize((target_w, target_h), Image.Resampling.LANCZOS)
                sheet.paste(img, (x, y))
            else:
                draw.rectangle([(x, y), (x + target_w, y + target_h)], fill=(30, 35, 45))

            draw.rectangle([(x, y), (x + target_w, y + 20)], fill=(0, 0, 0))
            draw.text((x + 6, y + 3), lbl, fill=col_color, font=font_micro)

        y += target_h + 16

    out_rev = os.path.join(REV_DIR, "sheet.jpg")
    out_qa = os.path.join(QA_DIR, "sheet.jpg")
    save_atomic(sheet, out_rev, quality=92)
    save_atomic(sheet, out_qa, quality=92)
    print(f"Saved master sheet: {out_rev} ({sheet_w}x{sheet_h})")


if __name__ == "__main__":
    build_ammo_strips()
    build_master_sheet()
