#!/usr/bin/env python3
"""
build-ag274-sheets.py - Generates diagnostic contact sheet for AG-274 / J95
(The camo that changes size again on RTX 5080 WebGPU)
"""
import os
import sys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
QA274_DIR = os.path.join(ROOT, 'qa', 'AG-274')
QA275_DIR = os.path.join(ROOT, 'qa', 'AG-275')
J95_DIR = os.path.join(ROOT, 'Claude outputs', 'j95')

os.makedirs(QA274_DIR, exist_ok=True)
os.makedirs(QA275_DIR, exist_ok=True)

def get_font(size):
    try:
        return ImageFont.truetype("arial.ttf", size)
    except:
        return ImageFont.load_default()

def load_img(name, default_dir=QA274_DIR):
    p = os.path.join(default_dir, name)
    if os.path.exists(p):
        return Image.open(p)
    if os.path.exists(os.path.join(J95_DIR, name)):
        return Image.open(os.path.join(J95_DIR, name))
    print(f"[WARN] Image not found: {name}")
    return None

def main():
    print("Building AG-274 / J95 Camo Pop Diagnostic Contact Sheet...")

    thumb_w = 480
    thumb_h = 270
    label_h = 35
    header_h = 60

    rows_data = [
        # Row 1: Jerry's Photo Evidence
        ("JERRY'S PLAYTEST EVIDENCE (CLAUDE OUTPUTS / J95)", [
            (load_img("1-hip-hq.png", J95_DIR), "Jerry Photo 1: Facing HQ (M81 5x Denser, ~1.5cm blobs)"),
            (load_img("2-ads-range.png", J95_DIR), "Jerry Photo 2: Facing Range (M81 Normal, ~10cm blobs)")
        ]),
        # Row 2: Live WebGPU RTX 5080 Baseline: Range vs HQ
        ("LIVE RTX 5080 WEBGPU BASELINE: FACING RANGE VS FACING HQ", [
            (load_img("01-facing-range-hip.png"), "1. Facing Range (Hip, yaw=0)"),
            (load_img("02-facing-range-ads.png"), "2. Facing Range (ADS, yaw=0)"),
            (load_img("03-facing-hq-hip.png"), "3. Facing HQ/CIF (Hip, yaw=PI)"),
            (load_img("04-facing-hq-ads.png"), "4. Facing HQ/CIF (ADS, yaw=PI)")
        ]),
        # Row 3: Turn Progression
        ("SLOW TURN PROGRESSION FROM RANGE TO HQ (0 -> 180 DEG)", [
            (load_img("turn-hip-0-0deg-range.png"), "0 deg: Range (North)"),
            (load_img("turn-hip-1-45deg.png"), "45 deg: North-East"),
            (load_img("turn-hip-2-90deg-east.png"), "90 deg: East"),
            (load_img("turn-hip-3-135deg.png"), "135 deg: South-East"),
            (load_img("turn-hip-4-180deg-hq.png"), "180 deg: HQ/CIF (South)")
        ]),
        # Row 4: Candidate Isolation Pass
        ("CANDIDATE ISOLATION PASS AT 180 DEG (FINDING THE DENSE MAP CARRIER)", [
            (load_img("iso-00-baseline-facing-hq.png"), "Baseline: Facing HQ (All Visible)"),
            (load_img("iso-01-hide-live-sleeve.png"), "Hide Candidate A: 3P live-sleeve"),
            (load_img("iso-02-hide-live-sleeve-live.png"), "Hide Candidate B: live-sleeve-live"),
            (load_img("iso-03-hide-rig-skin.png"), "Hide Candidate C: rig-skin shadow proxy"),
            (load_img("iso-04-hide-vm-forearm.png"), "Hide Candidate D: 1P vm-forearm")
        ])
    ]

    max_cols = 5
    canvas_w = max_cols * thumb_w
    row_block_h = header_h + thumb_h + label_h + 20
    total_h = 80 + len(rows_data) * row_block_h

    canvas = Image.new("RGB", (canvas_w, total_h), (14, 18, 22))
    draw = ImageDraw.Draw(canvas)

    f_title = get_font(30)
    f_sec = get_font(20)
    f_lbl = get_font(15)

    draw.text((30, 25), "AG-274 / J95: CAMO SCALE POP DIAGNOSTIC AUDIT ON RTX 5080 (WEBGPU)", fill=(255, 255, 255), font=f_title)

    curr_y = 80
    for sec_title, items in rows_data:
        draw.text((30, curr_y + 15), sec_title, fill=(100, 200, 255), font=f_sec)
        y_img = curr_y + header_h

        for idx, (img, lbl) in enumerate(items):
            if img is None:
                continue
            x = idx * thumb_w
            resized = img.resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
            canvas.paste(resized, (x, y_img))

            draw.rectangle([x, y_img + thumb_h, x + thumb_w, y_img + thumb_h + label_h], fill=(24, 30, 36))
            draw.line([x, y_img, x, y_img + thumb_h + label_h], fill=(45, 55, 65), width=1)
            draw.text((x + 8, y_img + thumb_h + 8), lbl, fill=(220, 230, 240), font=f_lbl)

        curr_y += row_block_h

    out_p274 = os.path.join(QA274_DIR, "ag274-camo-pop-sheet.jpg")
    out_p275 = os.path.join(QA275_DIR, "ag274-camo-pop-sheet.jpg")
    canvas.save(out_p274, "JPEG", quality=90)
    canvas.save(out_p275, "JPEG", quality=90)
    print(f"[OK] Saved contact sheet: {out_p274} ({canvas_w}x{total_h})")

if __name__ == '__main__':
    main()
