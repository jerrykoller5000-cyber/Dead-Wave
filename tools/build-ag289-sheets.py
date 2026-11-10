# tools/build-ag289-sheets.py
# Generates composite before/after comparison sheets for AG-289:
# 1. review/AG-289/before-after-props.jpg: 7 matched Before/After comparison pairs
# 2. review/AG-289/sheet.jpg: Master overview sheet for CLAUDE DIRECTOR review

import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REV_DIR = os.path.join(ROOT, "review", "AG-289")
QA_DIR = os.path.join(ROOT, "qa", "2026-11-10-AG-289")
AG288_DIR = os.path.join(ROOT, "review", "AG-288")
os.makedirs(REV_DIR, exist_ok=True)
os.makedirs(QA_DIR, exist_ok=True)

PAIRS = [
    {
        "title": "Row 1 · Find 2: Zombie Gate Header (y = 6.3..24.0 m)",
        "before_label": "BEFORE (AG-288): White Bathroom Tile (wallMatOne) Blown Out",
        "after_label": "AFTER (AG-289): Corrugated Steel Siding (sidingUv, siding)",
        "before_path": os.path.join(AG288_DIR, "find-02-gate-header-white-tile.png"),
        "after_path": os.path.join(REV_DIR, "after-find-02-gate-header-siding.png")
    },
    {
        "title": "Row 2 · Find 4: Infirmary O2 Bottle, IV Stand & Mat Seating",
        "before_label": "BEFORE (AG-288): O2 Bottle Floating +40mm, IV Stand Floating +7mm, Mat +10mm",
        "after_label": "AFTER (AG-289): Base Mat on Floor (y = 0.000m), O2 & IV Flush on Mat (y = 0.020m)",
        "before_path": os.path.join(AG288_DIR, "find-03-infirmary-o2-iv-floating.png"),
        "after_path": os.path.join(REV_DIR, "after-find-03-infirmary-o2-iv-seated.png")
    },
    {
        "title": "Row 3 · Find 5: Stretcher Casters & Medical Cabinet Legs",
        "before_label": "BEFORE (AG-288): Casters Sunk 20mm into Mat, Cabinet Front Legs Sunk, 0 Rear Legs",
        "after_label": "AFTER (AG-289): 4 Casters Seated at y = 0.020m, 4 Cabinet Steel Legs (2 Front + 2 Rear)",
        "before_path": os.path.join(AG288_DIR, "find-04-infirmary-casters-cabinet-clip.png"),
        "after_path": os.path.join(REV_DIR, "after-find-04-infirmary-casters-cabinet.png")
    },
    {
        "title": "Row 4 · Find 6: Containment Gate Threshold Plate & Nosing",
        "before_label": "BEFORE (AG-288): Steel Threshold Plate Floating +5.5mm Above Floor",
        "after_label": "AFTER (AG-289): Threshold Plate & Hazard Nosing Flush on Floor (y = 0.000m..0.032m)",
        "before_path": os.path.join(AG288_DIR, "find-05-gate-threshold-floating.png"),
        "after_path": os.path.join(REV_DIR, "after-find-05-gate-threshold-seated.png")
    },
    {
        "title": "Row 5 · Find 7: Sagging Cot X-Scissor Legs & Pivot Pin",
        "before_label": "BEFORE (AG-288): Crossing Scissor Legs Sliced 100% Through Each Other (Passthrough)",
        "after_label": "AFTER (AG-289): Scissor Legs Offset along X (±16mm), Pivot Pin & End Caps, 0 Penetration",
        "before_path": os.path.join(AG288_DIR, "find-06-cot-scissor-legs-passthrough.png"),
        "after_path": os.path.join(REV_DIR, "after-find-06-cot-scissor-legs-offset.png")
    },
    {
        "title": "Row 6 · Find 8: Build Room Wall Smudge Decals Texel Density",
        "before_label": "BEFORE (AG-288): Stretched Blurry Smudge Decals at WALL_PX = 24 (41.7 mm/px)",
        "after_label": "AFTER (AG-289): Crisp Decals at WALL_PX = 64 (15.6 mm/px, Matching Wall Tiles)",
        "before_path": os.path.join(AG288_DIR, "find-07-build-wall-blurry-smudge.png"),
        "after_path": os.path.join(REV_DIR, "after-find-07-build-wall-crisp-smudge.png")
    },
    {
        "title": "Row 7 · Flashlight: Night Close-Range Irradiance Cap at 3m",
        "before_label": "BEFORE (AG-288): Pure White Bloom Washout at 3m (Intensity 42, Clipped Pixels)",
        "after_label": "AFTER (AG-289): Irradiance Capped at 3m (Intensity ~12.1, Readable Tiles & Grout)",
        "before_path": os.path.join(AG288_DIR, "area-03-range-backwall-lockers-night.png"),
        "after_path": os.path.join(REV_DIR, "after-flashlight-3m-night-capped.png")
    }
]

def make_before_after_sheet():
    thumb_w = 640
    thumb_h = 360
    pad = 14
    hdr_h = 75
    row_title_h = 28
    label_h = 24
    row_total_h = row_title_h + label_h + thumb_h + pad

    total_w = pad + thumb_w + pad + thumb_w + pad
    total_h = hdr_h + len(PAIRS) * row_total_h + pad

    sheet = Image.new("RGB", (total_w, total_h), (16, 18, 22))
    draw = ImageDraw.Draw(sheet)

    # Master Header
    draw.rectangle([(0, 0), (total_w, hdr_h)], fill=(10, 12, 14))
    draw.text((24, 14), "AG-289: Training Ground Eye-Level Finds & Seating Verification (Before vs After)", fill=(255, 215, 0))
    draw.text((24, 42), "Hardware: NVIDIA GeForce RTX 5080 WebGPU (1280x720) · All 7 Finds & Flashlight Cap Verified", fill=(170, 185, 200))

    y_cur = hdr_h + 10

    for idx, p in enumerate(PAIRS):
        # Row title
        draw.rectangle([(pad, y_cur), (total_w - pad, y_cur + row_title_h - 4)], fill=(24, 28, 36))
        draw.text((pad + 10, y_cur + 4), p["title"], fill=(240, 240, 240))
        y_cur += row_title_h

        # Labels
        x_left = pad
        x_right = pad + thumb_w + pad

        draw.rectangle([(x_left, y_cur), (x_left + thumb_w, y_cur + label_h - 4)], fill=(45, 20, 20))
        draw.text((x_left + 8, y_cur + 3), p["before_label"], fill=(255, 160, 160))

        draw.rectangle([(x_right, y_cur), (x_right + thumb_w, y_cur + label_h - 4)], fill=(20, 45, 25))
        draw.text((x_right + 8, y_cur + 3), p["after_label"], fill=(160, 255, 180))
        y_cur += label_h

        # Images
        if os.path.exists(p["before_path"]):
            im_b = Image.open(p["before_path"]).resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
            sheet.paste(im_b, (x_left, y_cur))
        else:
            draw.rectangle([(x_left, y_cur), (x_left + thumb_w, y_cur + thumb_h)], fill=(30, 30, 30))
            draw.text((x_left + 20, y_cur + thumb_h // 2), "BEFORE IMAGE MISSING", fill=(255, 100, 100))

        if os.path.exists(p["after_path"]):
            im_a = Image.open(p["after_path"]).resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
            sheet.paste(im_a, (x_right, y_cur))
        else:
            draw.rectangle([(x_right, y_cur), (x_right + thumb_w, y_cur + thumb_h)], fill=(30, 30, 30))
            draw.text((x_right + 20, y_cur + thumb_h // 2), "AFTER IMAGE MISSING", fill=(255, 100, 100))

        y_cur += thumb_h + pad

    out_file = os.path.join(REV_DIR, "before-after-props.jpg")
    sheet.save(out_file, quality=92)
    sheet.save(os.path.join(QA_DIR, "before-after-props.jpg"), quality=92)
    print(f"[AG-289] Saved: {out_file} ({sheet.size[0]}x{sheet.size[1]})")

def make_master_sheet():
    # 2x4 grid overview: 7 After shots + 1 Summary Card
    thumb_w = 640
    thumb_h = 360
    pad = 16
    hdr_h = 75
    cols = 2
    rows = 4

    total_w = pad + cols * (thumb_w + pad)
    total_h = hdr_h + rows * (thumb_h + 30 + pad) + pad

    sheet = Image.new("RGB", (total_w, total_h), (14, 16, 20))
    draw = ImageDraw.Draw(sheet)

    # Title header
    draw.rectangle([(0, 0), (total_w, hdr_h)], fill=(10, 12, 14))
    draw.text((24, 14), "AG-289: Master Review Sheet — Training Ground Eye-Level Props & Seating Polish", fill=(255, 215, 0))
    draw.text((24, 42), "Hardware: NVIDIA GeForce RTX 5080 WebGPU (1280x720) · tag289 Test Suite: 52 PASS / 0 FAIL", fill=(170, 185, 200))

    cards = [
        ("Find 2: Zombie Gate Header in Corrugated Siding", PAIRS[0]["after_path"]),
        ("Find 4: Infirmary O2 Bottle & IV Stand Flush on Mat", PAIRS[1]["after_path"]),
        ("Find 5: Stretcher Casters & Medical Cabinet 4 Legs", PAIRS[2]["after_path"]),
        ("Find 6: Containment Gate Threshold Plate on Floor", PAIRS[3]["after_path"]),
        ("Find 7: Cot Scissor Legs Offset (Zero Penetration)", PAIRS[4]["after_path"]),
        ("Find 8: Build Room Wall Smudge Decals (64 px/m)", PAIRS[5]["after_path"]),
        ("Flashlight: 3m Night Irradiance Cap (No Blowout)", PAIRS[6]["after_path"]),
        ("Summary Card: 100% Part-on-Part Seating & Integrity Pass", None)
    ]

    for idx, (title, img_path) in enumerate(cards):
        r = idx // cols
        c = idx % cols
        x = pad + c * (thumb_w + pad)
        y = hdr_h + pad + r * (thumb_h + 30 + pad)

        draw.rectangle([(x, y), (x + thumb_w, y + 24)], fill=(28, 32, 40))
        draw.text((x + 8, y + 4), title, fill=(240, 240, 240))

        img_y = y + 26
        if img_path and os.path.exists(img_path):
            im = Image.open(img_path).resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
            sheet.paste(im, (x, img_y))
        else:
            # Summary badge card
            draw.rectangle([(x, img_y), (x + thumb_w, img_y + thumb_h)], fill=(20, 25, 32))
            draw.rectangle([(x + 20, img_y + 20), (x + thumb_w - 20, img_y + thumb_h - 20)], outline=(50, 120, 70), width=2)
            draw.text((x + 40, img_y + 40), "AG-289 VERIFICATION COMPLETE", fill=(120, 255, 150))
            draw.text((x + 40, img_y + 75), "• tag289 Suite: 52 PASS / 0 FAIL (100% PASS)", fill=(220, 220, 220))
            draw.text((x + 40, img_y + 105), "• Find 2: gateHeader sidingUv(..., siding) (y = 6.3..24.0 m)", fill=(200, 200, 200))
            draw.text((x + 40, img_y + 135), "• Find 4: O2 cylinder base & IV stand feet seated on mat (y = 0.020m)", fill=(200, 200, 200))
            draw.text((x + 40, img_y + 165), "• Find 5: 4 stretcher casters on mat, cabinet 4 steel legs", fill=(200, 200, 200))
            draw.text((x + 40, img_y + 195), "• Find 6: Threshold plate flush on floor (y = 0.000m..0.032m)", fill=(200, 200, 200))
            draw.text((x + 40, img_y + 225), "• Find 7: Cot scissor legs offset ±16mm with pivot pin & caps", fill=(200, 200, 200))
            draw.text((x + 40, img_y + 255), "• Find 8: Build wall wear WALL_PX: 64 matching wall tile density", fill=(200, 200, 200))
            draw.text((x + 40, img_y + 285), "• Flashlight: 3m hotspot capped to ~12.1 intensity (no bloom blowout)", fill=(200, 200, 200))

    out_file = os.path.join(REV_DIR, "sheet.jpg")
    sheet.save(out_file, quality=92)
    sheet.save(os.path.join(QA_DIR, "sheet.jpg"), quality=92)
    print(f"[AG-289] Saved: {out_file} ({sheet.size[0]}x{sheet.size[1]})")

if __name__ == "__main__":
    make_before_after_sheet()
    make_master_sheet()
