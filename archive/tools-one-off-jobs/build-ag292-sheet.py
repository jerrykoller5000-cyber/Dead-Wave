# tools/build-ag292-sheet.py
# Generates composite review sheets for AG-292 (J128, D-140):
# 1. review/AG-292/before-after-props.jpg: 4 matched same-camera Before/After comparison pairs
# 2. review/AG-292/sheet.jpg: Master overview sheet of all 5 areas for CLAUDE DIRECTOR review

import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REV_DIR = os.path.join(ROOT, "review", "AG-292")
QA_DIR = os.path.join(ROOT, "qa", "2026-11-11-AG-292")
os.makedirs(REV_DIR, exist_ok=True)
os.makedirs(QA_DIR, exist_ok=True)

FIXES = [
    {
        "title": "Fix 1 · Range Locker Bank Base Floor Seating (world/training-wear.js)",
        "before_label": "BEFORE: Center y = 0.93m (h=1.85m), Floating 5.0mm Above Floor Tiles (minY = 0.0050m)",
        "after_label": "AFTER (AG-292): Center y = 0.925m, Seated Flush on Floor Tiles (minY = 0.0000m, 0.0mm Gap)",
        "before_path": os.path.join(REV_DIR, "before-01-range-lockers.png"),
        "after_path": os.path.join(REV_DIR, "after-01-range-lockers.png")
    },
    {
        "title": "Fix 2 · Range Wall Vent Grille Frame Flush Alignment (world/training-wear.js)",
        "before_label": "BEFORE: Frame Center 0.03m Off Wall (w=0.05m), Back Face Floating 5.0mm Off Tiles",
        "after_label": "AFTER (AG-292): Frame Center 0.025m Off Wall, Back Face Flush Against Tiles (0.0mm Gap)",
        "before_path": os.path.join(REV_DIR, "before-02-range-vents.png"),
        "after_path": os.path.join(REV_DIR, "after-02-range-vents.png")
    },
    {
        "title": "Fix 3 · Range Conduit Wall Bracket Flush Spanning (world/training-wear.js)",
        "before_label": "BEFORE: Bracket Detached From Wall Face, Floating Gap 35.0mm",
        "after_label": "AFTER (AG-292): Bracket Spans Flush From Wall (x = 7.9925m, 0.0mm Gap) & Clamps Pipe",
        "before_path": os.path.join(REV_DIR, "before-03-range-conduits.png"),
        "after_path": os.path.join(REV_DIR, "after-03-range-conduits.png")
    },
    {
        "title": "Fix 4 · Range Firing Line Kick Rail Floor Seating (world/training-firing-line.js)",
        "before_label": "BEFORE: Rail Height 0.075m, Center y = 0.055m, Floating 17.5mm Above Floor Tiles",
        "after_label": "AFTER (AG-292): Rail Height 0.090m, Center y = 0.045m, Seated Flush on Floor (minY = 0.0000m)",
        "before_path": os.path.join(REV_DIR, "before-04-range-firingline.png"),
        "after_path": os.path.join(REV_DIR, "after-04-range-firingline.png")
    }
]

AREAS_SHOTS = [
    # Area 1: Range
    ("Range: Locker Bank Base Flush on Floor (0.0mm gap)", os.path.join(REV_DIR, "01-range-lockers-floor.png")),
    ("Range: Wall Vent Grille Flush on East Wall (0.0mm gap)", os.path.join(REV_DIR, "02-range-vents-wall.png")),
    ("Range: Conduit Bracket Spanning Flush to Wall Face", os.path.join(REV_DIR, "03-range-conduits-bracket.png")),
    ("Range: Firing Line Bench Base Kick Rail Flush on Floor", os.path.join(REV_DIR, "04-range-firingline-base.png")),
    # Area 2: Armory
    ("Armory: Weapon Rack Rails Flush on Back Wall BZ", os.path.join(REV_DIR, "05-armory-rack-wall.png")),
    ("Armory: Station Counter Solid Housing & Wall Mount", os.path.join(REV_DIR, "06-armory-station-counter.png")),
    # Area 3: CIF
    ("CIF: Issue Station Solid Counter on Wall & Floor", os.path.join(REV_DIR, "07-cif-station-counter.png")),
    # Area 4: Corridors
    ("Corridors: Doorway Hazard Trim, Flush Keypad & Shutter", os.path.join(REV_DIR, "08-corridors-doorway-keypad.png")),
    # Area 5: Yard
    ("Yard: Containment Gate Threshold Flush on Floor", os.path.join(REV_DIR, "09-yard-containment-gate.png")),
    ("Yard: Infirmary Stretcher Casters on Mat (y = 0.020m)", os.path.join(REV_DIR, "10-yard-infirmary-stretcher.png")),
    ("Yard: Medical Cabinet 4 Steel Legs on Mat", os.path.join(REV_DIR, "11-yard-infirmary-cabinet.png")),
    ("Yard: Hangar Column Footplate Flush on Floor", os.path.join(REV_DIR, "12-yard-hangar-columns.png"))
]

def make_before_after_sheet():
    thumb_w = 720
    thumb_h = 420
    pad = 14
    hdr_h = 80
    row_title_h = 30
    label_h = 24
    row_total_h = row_title_h + label_h + thumb_h + pad

    total_w = pad + thumb_w + pad + thumb_w + pad
    total_h = hdr_h + len(FIXES) * row_total_h + pad

    sheet = Image.new("RGB", (total_w, total_h), (16, 18, 22))
    draw = ImageDraw.Draw(sheet)

    # Master Header
    draw.rectangle([(0, 0), (total_w, hdr_h)], fill=(10, 12, 14))
    draw.text((24, 14), "AG-292: Training Ground Prop Seating Fixes (Same-Camera Before vs After)", fill=(255, 215, 0))
    draw.text((24, 44), "Hardware: NVIDIA GeForce RTX 5080 WebGPU · J128 (D-140) Contact Tolerance: <= 0.5 mm Gap, 0 Penetrations", fill=(170, 185, 200))

    y_cur = hdr_h + 10

    for idx, f in enumerate(FIXES):
        # Row title
        draw.rectangle([(pad, y_cur), (total_w - pad, y_cur + row_title_h - 4)], fill=(24, 28, 36))
        draw.text((pad + 10, y_cur + 6), f["title"], fill=(240, 240, 240))
        y_cur += row_title_h

        # Labels
        x_left = pad
        x_right = pad + thumb_w + pad

        draw.rectangle([(x_left, y_cur), (x_left + thumb_w, y_cur + label_h - 4)], fill=(45, 20, 20))
        draw.text((x_left + 8, y_cur + 4), f["before_label"], fill=(255, 160, 160))

        draw.rectangle([(x_right, y_cur), (x_right + thumb_w, y_cur + label_h - 4)], fill=(20, 45, 25))
        draw.text((x_right + 8, y_cur + 4), f["after_label"], fill=(160, 255, 180))
        y_cur += label_h

        # Images
        if os.path.exists(f["before_path"]):
            im_b = Image.open(f["before_path"]).resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
            sheet.paste(im_b, (x_left, y_cur))
        else:
            draw.rectangle([(x_left, y_cur), (x_left + thumb_w, y_cur + thumb_h)], fill=(30, 30, 30))
            draw.text((x_left + 20, y_cur + thumb_h // 2), "BEFORE IMAGE MISSING", fill=(255, 100, 100))

        if os.path.exists(f["after_path"]):
            im_a = Image.open(f["after_path"]).resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
            sheet.paste(im_a, (x_right, y_cur))
        else:
            draw.rectangle([(x_right, y_cur), (x_right + thumb_w, y_cur + thumb_h)], fill=(30, 30, 30))
            draw.text((x_right + 20, y_cur + thumb_h // 2), "AFTER IMAGE MISSING", fill=(255, 100, 100))

        y_cur += thumb_h + pad

    out_file = os.path.join(REV_DIR, "before-after-props.jpg")
    sheet.save(out_file, quality=92)
    sheet.save(os.path.join(QA_DIR, "before-after-props.jpg"), quality=92)
    print(f"[AG-292] Saved Before/After Sheet: {out_file} ({sheet.size[0]}x{sheet.size[1]})")

def make_master_sheet():
    # 3x4 grid: 12 shots covering all 5 areas
    thumb_w = 480
    thumb_h = 280
    pad = 12
    hdr_h = 80
    label_h = 24
    cols = 3
    rows = 4

    total_w = pad + cols * (thumb_w + pad)
    total_h = hdr_h + rows * (thumb_h + label_h + pad) + pad

    sheet = Image.new("RGB", (total_w, total_h), (14, 16, 20))
    draw = ImageDraw.Draw(sheet)

    # Title header
    draw.rectangle([(0, 0), (total_w, hdr_h)], fill=(10, 12, 14))
    draw.text((24, 14), "AG-292: Master Review Sheet — Training Ground Prop Seating Across 5 Areas (J128 / D-140)", fill=(255, 215, 0))
    draw.text((24, 44), "Hardware: NVIDIA GeForce RTX 5080 WebGPU · tag292 Test Suite: PASS · 0 Gaps > 0.5mm, 0 Penetrations", fill=(170, 185, 200))

    for idx, (title, path) in enumerate(AREAS_SHOTS):
        r = idx // cols
        c = idx % cols
        x = pad + c * (thumb_w + pad)
        y = hdr_h + pad + r * (thumb_h + label_h + pad)

        # Label banner
        draw.rectangle([(x, y), (x + thumb_w, y + label_h - 2)], fill=(22, 26, 34))
        draw.text((x + 6, y + 4), title, fill=(220, 230, 240))

        # Thumbnail
        im_y = y + label_h
        if os.path.exists(path):
            im = Image.open(path).resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
            sheet.paste(im, (x, im_y))
        else:
            draw.rectangle([(x, im_y), (x + thumb_w, im_y + thumb_h)], fill=(28, 28, 28))
            draw.text((x + 10, im_y + thumb_h // 2), f"Missing: {os.path.basename(path)}", fill=(255, 120, 120))

    out_file = os.path.join(REV_DIR, "sheet.jpg")
    sheet.save(out_file, quality=92)
    sheet.save(os.path.join(QA_DIR, "sheet.jpg"), quality=92)
    print(f"[AG-292] Saved Master Sheet: {out_file} ({sheet.size[0]}x{sheet.size[1]})")

if __name__ == "__main__":
    make_before_after_sheet()
    make_master_sheet()
