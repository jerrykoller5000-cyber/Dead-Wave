# tools/build-ag287-sheets.py
# Generates composite review sheets for AG-287:
# 1. four-lights-sheet.jpg: Side-by-side comparison across all 4 distinct lights (Noon, Overcast, Dusk, Night)
# 2. areas-overview-sheet.jpg: All 10 eye-level walkthrough areas
# 3. closeups-sheet.jpg: 12 targeted close-up inspections (stations, keypads, seating, J124 fade fix)
# 4. sheet.jpg: Master overview sheet for CLAUDE DIRECTOR

import os
import json
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
QA_DIR = os.path.join(ROOT, "qa", "2026-11-10-AG-287")
REV_DIR = os.path.join(ROOT, "review", "AG-287")
os.makedirs(QA_DIR, exist_ok=True)
os.makedirs(REV_DIR, exist_ok=True)

# Helper to draw simple text with background badge
def badge_text(draw, pos, text, bg=(30, 34, 40), fg=(240, 240, 240)):
    x, y = pos
    w = len(text) * 7 + 12
    h = 20
    draw.rectangle([(x, y), (x + w, y + h)], fill=bg)
    draw.text((x + 6, y + 4), text, fill=fg)

# 1. Four Distinct Lights Sheet
def make_four_lights_sheet():
    areas = [
        ("01-range-spawn-downrange", "1. Firing Range: Spawn & Pistol Downrange"),
        ("04-range-east-stations", "2. Range East Wall: CIF, Kiosk, Armory"),
        ("06-build-hangar-overview", "3. Build Room: 24m Hangar & High-Bay Lamps"),
        ("08-build-containment-gate", "4. Containment Gate & Floor Hazard Paint"),
        ("09-build-placed-layout", "5. Placed Defense: Tiered Walls, Sandbags, Wire"),
        ("10-build-infirmary-bay", "6. Field Infirmary: Stretcher, ECG, IV & Cot"),
    ]
    lights = [
        ("noon", "NOON (High Sun · Blue Sky · Crisp Shadows)", (240, 210, 50)),
        ("overcast", "OVERCAST (Cool Diffuse Clouds · Wrap-Around Fill)", (180, 200, 220)),
        ("dusk", "DUSK (Warm Low Sunset · Floor Grazing Shadows)", (240, 130, 40)),
        ("night", "NIGHT (Lights Switch OFF · Player Flashlight Beam)", (100, 160, 240)),
    ]

    thumb_w, thumb_h = 480, 270
    pad = 12
    hdr_h = 75
    subhdr_h = 35

    total_w = pad + len(lights) * (thumb_w + pad)
    total_h = hdr_h + subhdr_h + len(areas) * (thumb_h + pad + 26) + pad

    sheet = Image.new("RGB", (total_w, total_h), (18, 20, 22))
    draw = ImageDraw.Draw(sheet)

    # Title header
    draw.rectangle([(0, 0), (total_w, hdr_h)], fill=(12, 14, 16))
    draw.text((24, 15), "AG-287: Training Ground Eye-Level Walkthrough Across 4 Distinct Lights", fill=(255, 215, 0))
    draw.text((24, 42), "Hardware: NVIDIA GeForce RTX 5080 WebGPU (1280x720) · Distinct exposure, sky bounce, sun angles, lamps & shadows across all 4 lights", fill=(170, 185, 200))

    # Column subheaders
    for c_idx, (l_key, l_title, l_col) in enumerate(lights):
        cx = pad + c_idx * (thumb_w + pad)
        draw.rectangle([(cx, hdr_h + 4), (cx + thumb_w, hdr_h + subhdr_h - 4)], fill=(28, 32, 38))
        draw.text((cx + 10, hdr_h + 10), l_title, fill=l_col)

    y_cur = hdr_h + subhdr_h + 6

    for a_slug, a_title in areas:
        draw.rectangle([(pad, y_cur), (total_w - pad, y_cur + 22)], fill=(24, 28, 34))
        draw.text((pad + 8, y_cur + 4), a_title, fill=(230, 230, 230))
        y_cur += 26

        for c_idx, (l_key, _, _) in enumerate(lights):
            cx = pad + c_idx * (thumb_w + pad)
            fn = f"area-{a_slug}-{l_key}.png"
            p = os.path.join(QA_DIR, fn)
            if os.path.exists(p):
                im = Image.open(p).convert("RGB").resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
                sheet.paste(im, (cx, y_cur))
            else:
                draw.rectangle([(cx, y_cur), (cx + thumb_w, y_cur + thumb_h)], fill=(40, 20, 20))
                draw.text((cx + 20, y_cur + thumb_h // 2), f"Missing: {fn}", fill=(255, 100, 100))
        y_cur += thumb_h + pad

    out_qa = os.path.join(QA_DIR, "four-lights-sheet.jpg")
    out_rev = os.path.join(REV_DIR, "four-lights-sheet.jpg")
    sheet.save(out_qa, "JPEG", quality=92)
    sheet.save(out_rev, "JPEG", quality=92)
    print(f"[AG-287] Built four-lights-sheet.jpg ({os.path.getsize(out_qa)} B)")

# 2. Areas Overview Sheet (10 areas in Noon)
def make_areas_sheet():
    areas = [
        ("01-range-spawn-downrange", "Area 1: Firing Range Spawn & Pistol Downrange"),
        ("02-range-lanes-targets", "Area 2: 5 Silhouette Lanes (8m-25m) & Bench"),
        ("03-range-backwall-lockers", "Area 3: Back Wall, Incident Board & Rifle Racks"),
        ("04-range-east-stations", "Area 4: East Wall CIF, Kiosk & Armory"),
        ("05-range-console-switch-door", "Area 5: Range Console, Switch & Security Door"),
        ("06-build-hangar-overview", "Area 6: Build Room 24m Hangar Trusses & Lamps"),
        ("07-build-west-stations", "Area 7: West Recesses (Skull Window & HQ Panel)"),
        ("08-build-containment-gate", "Area 8: Containment Gate & Floor Hazard Paint"),
        ("09-build-placed-layout", "Area 9: Placed Defense Layout (Walls, Wire, Bags)"),
        ("10-build-infirmary-bay", "Area 10: Field Infirmary Stretcher, Cot & ECG"),
    ]
    cols = 2
    rows = (len(areas) + cols - 1) // cols
    thumb_w, thumb_h = 720, 405
    pad = 16
    hdr_h = 70
    lbl_h = 24

    total_w = pad + cols * (thumb_w + pad)
    total_h = hdr_h + rows * (thumb_h + lbl_h + pad) + pad

    sheet = Image.new("RGB", (total_w, total_h), (18, 20, 22))
    draw = ImageDraw.Draw(sheet)

    draw.rectangle([(0, 0), (total_w, hdr_h)], fill=(12, 14, 16))
    draw.text((24, 15), "AG-287: All 10 Training Ground Areas at Eye Level (Jerry's Walkthrough)", fill=(255, 215, 0))
    draw.text((24, 40), "NVIDIA RTX 5080 WebGPU · Standard Noon Lighting · First-Person Eye Height (y = floor + 1.62m)", fill=(170, 185, 200))

    for idx, (a_slug, a_title) in enumerate(areas):
        r = idx // cols
        c = idx % cols
        x = pad + c * (thumb_w + pad)
        y = hdr_h + pad + r * (thumb_h + lbl_h + pad)

        draw.rectangle([(x, y), (x + thumb_w, y + lbl_h)], fill=(28, 32, 38))
        draw.text((x + 8, y + 4), a_title, fill=(240, 240, 240))

        fn = f"area-{a_slug}-noon.png"
        p = os.path.join(QA_DIR, fn)
        if os.path.exists(p):
            im = Image.open(p).convert("RGB").resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
            sheet.paste(im, (x, y + lbl_h))

    out_qa = os.path.join(QA_DIR, "areas-overview-sheet.jpg")
    out_rev = os.path.join(REV_DIR, "areas-overview-sheet.jpg")
    sheet.save(out_qa, "JPEG", quality=92)
    sheet.save(out_rev, "JPEG", quality=92)
    print(f"[AG-287] Built areas-overview-sheet.jpg ({os.path.getsize(out_qa)} B)")

# 3. Close-Ups & Seating Sheet (12 close-ups + control shot)
def make_closeups_sheet():
    shots = [
        ("close-01-cif-station.png", "1. CIF Station Copy: Casing, Pedestal & CRT Flush"),
        ("close-02-kiosk-station.png", "2. Supply Kiosk Copy: Metal Baseplate on Floor"),
        ("close-03-armory-station.png", "3. Armory Workbench & Weapon Shelf Copy"),
        ("close-04-range-console-near.png", "4. Range Console (J124): Solid Opaque at 0.40m Eye"),
        ("close-05-door-keypad-range.png", "5. Door Keypad (J104): Flush on Striped Trim (Range)"),
        ("close-06-door-keypad-build.png", "6. Door Keypad (J104): Flush on Striped Trim (Build)"),
        ("close-07-east-fence-recess-1p.png", "7. East Fence in Recess (J124 FIX): Solid (Op 1.00)"),
        ("close-07b-east-fence-solid-1p.png", "8. East Fence Control (x=-10.35): Solid in Room"),
        ("close-08-skull-window-recess-1p.png", "9. Skull Window Recess: Glass, Metal & West Fence"),
        ("close-09-hq-panel-recess.png", "10. HQ Alarm Panel Copy: Flush in Wall Recess"),
        ("close-10-fence-post-baseplate.png", "11. Fence Baseplate (J128 FIX): Bottom at y = 0.000m"),
        ("close-11-infirmary-bed-props.png", "12. Infirmary Furniture: Casters, Cot, IV, O2 Flush"),
    ]

    cols = 3
    rows = (len(shots) + cols - 1) // cols
    thumb_w, thumb_h = 480, 270
    pad = 14
    hdr_h = 70
    lbl_h = 24

    total_w = pad + cols * (thumb_w + pad)
    total_h = hdr_h + rows * (thumb_h + lbl_h + pad) + pad

    sheet = Image.new("RGB", (total_w, total_h), (18, 20, 22))
    draw = ImageDraw.Draw(sheet)

    draw.rectangle([(0, 0), (total_w, hdr_h)], fill=(12, 14, 16))
    draw.text((24, 15), "AG-287: Training Ground Close-Up Inspections & Seating Verification", fill=(255, 215, 0))
    draw.text((24, 40), "NVIDIA RTX 5080 WebGPU · J124/J90 Zero Near-Eye Fade · J128 Flush Ground Contacts · J104 Trim Keypads", fill=(170, 185, 200))

    for idx, (fn, title) in enumerate(shots):
        r = idx // cols
        c = idx % cols
        x = pad + c * (thumb_w + pad)
        y = hdr_h + pad + r * (thumb_h + lbl_h + pad)

        draw.rectangle([(x, y), (x + thumb_w, y + lbl_h)], fill=(28, 32, 38))
        draw.text((x + 8, y + 4), title, fill=(240, 240, 240))

        p = os.path.join(QA_DIR, fn)
        if os.path.exists(p):
            im = Image.open(p).convert("RGB").resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
            sheet.paste(im, (x, y + lbl_h))

    out_qa = os.path.join(QA_DIR, "closeups-sheet.jpg")
    out_rev = os.path.join(REV_DIR, "closeups-sheet.jpg")
    sheet.save(out_qa, "JPEG", quality=92)
    sheet.save(out_rev, "JPEG", quality=92)
    print(f"[AG-287] Built closeups-sheet.jpg ({os.path.getsize(out_qa)} B)")

# 4. Master Composite Sheet
def make_master_sheet():
    f_lights = os.path.join(QA_DIR, "four-lights-sheet.jpg")
    f_closeups = os.path.join(QA_DIR, "closeups-sheet.jpg")
    if not (os.path.exists(f_lights) and os.path.exists(f_closeups)):
        return

    im1 = Image.open(f_lights)
    im2 = Image.open(f_closeups)

    # Scale im2 to match width of im1
    w1, h1 = im1.size
    w2, h2 = im2.size
    scale = w1 / w2
    im2_scaled = im2.resize((w1, int(h2 * scale)), Image.Resampling.LANCZOS)

    total_h = h1 + im2_scaled.size[1] + 20
    master = Image.new("RGB", (w1, total_h), (14, 16, 18))
    master.paste(im1, (0, 0))
    master.paste(im2_scaled, (0, h1 + 20))

    out_qa = os.path.join(QA_DIR, "sheet.jpg")
    out_rev = os.path.join(REV_DIR, "sheet.jpg")
    master.save(out_qa, "JPEG", quality=90)
    master.save(out_rev, "JPEG", quality=90)
    print(f"[AG-287] Built master sheet.jpg ({os.path.getsize(out_qa)} B)")

if __name__ == "__main__":
    make_four_lights_sheet()
    make_areas_sheet()
    make_closeups_sheet()
    make_master_sheet()
