#!/usr/bin/env python3
"""
build-gp20073-sheets.py - Generates master review contact sheet for GP-20073
(J96 Armory Workbench, Shelves & Kiosk GPU Visual Review on RTX 5080)
"""
import os
import sys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
QA_DIR = os.path.join(ROOT, 'qa', 'GP-20073')
os.makedirs(QA_DIR, exist_ok=True)

def get_font(size):
    try:
        return ImageFont.truetype("arial.ttf", size)
    except:
        return ImageFont.load_default()

def load_img(name):
    p = os.path.join(QA_DIR, name)
    if os.path.exists(p):
        return Image.open(p)
    print(f"[WARN] Image not found: {name}")
    return None

def main():
    print("Building GP-20073 Visual Review Contact Sheet...")

    shots = [
        # Desktop 1280x720
        ("1280-armory-initial.png", "1. Desktop Armory: Locked Gun Icons & Emplacements Shelf"),
        ("1280-armory-workbench.png", "2. Desktop Pistol Workbench: One-Click Buy+Fit & Ammo"),
        ("1280-armory-emplacements.png", "3. Desktop Emplacement Shelf: Watchman & Mortar Ammo"),
        ("1280-kiosk-builds.png", "4. Desktop Kiosk Builds: Light/Flame/Heavy/Mine (No Mortar/M240)"),
        # Mobile 390x844
        ("390-armory-mobile.png", "5. Mobile Armory: Zero Overflow & Responsive Shelves"),
        ("390-workbench-mobile.png", "6. Mobile Workbench: Responsive Mod Buttons & Price"),
        ("390-emplacements-mobile.png", "7. Mobile Emplacements: Clean Card Wrap"),
        ("390-kiosk-builds-mobile.png", "8. Mobile Kiosk Builds: Clean Responsive Layout")
    ]

    loaded = []
    for fname, lbl in shots:
        im = load_img(fname)
        if im:
            loaded.append((im, lbl))

    if not loaded:
        print("[ERROR] No images loaded")
        sys.exit(1)

    # 4 columns, 2 rows
    cols = 4
    rows = 2
    cell_w = 640
    cell_h = 360
    lbl_h = 35
    header_h = 60

    canvas_w = cols * cell_w
    canvas_h = header_h + rows * (cell_h + lbl_h)

    canvas = Image.new("RGB", (canvas_w, canvas_h), (16, 20, 24))
    draw = ImageDraw.Draw(canvas)

    f_title = get_font(28)
    f_lbl = get_font(15)

    draw.text((25, 18), "GP-20073 / J96: ARMORY WORKBENCH, SHELVES & KIOSK INDEPENDENT GPU REVIEW (RTX 5080 WEBGPU)", fill=(255, 255, 255), font=f_title)

    for idx, (im, lbl) in enumerate(loaded):
        c = idx % cols
        r = idx // cols

        x = c * cell_w
        y = header_h + r * (cell_h + lbl_h)

        resized = im.resize((cell_w, cell_h), Image.Resampling.LANCZOS)
        canvas.paste(resized, (x, y))

        draw.rectangle([x, y + cell_h, x + cell_w, y + cell_h + lbl_h], fill=(26, 32, 38))
        draw.line([x, y, x, y + cell_h + lbl_h], fill=(45, 55, 65), width=1)
        draw.text((x + 10, y + cell_h + 8), lbl, fill=(215, 225, 235), font=f_lbl)

    out_p = os.path.join(QA_DIR, "gp20073-master-review-sheet.jpg")
    canvas.save(out_p, "JPEG", quality=92)
    print(f"[OK] Master review sheet saved: {out_p} ({canvas_w}x{canvas_h})")

if __name__ == '__main__':
    main()
