#!/usr/bin/env python3
"""
build-cl329-sheets.py - Generates labeled contact strips and a master composite
for CL-329 Part 1 (Weapon Part Fold & Optics Review on RTX 5080)
"""
import os
import sys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REVIEW_DIR = os.path.join(ROOT, 'review', 'CL-329')
QA_DIR = os.path.join(ROOT, 'qa', 'CL-329')

os.makedirs(REVIEW_DIR, exist_ok=True)
os.makedirs(QA_DIR, exist_ok=True)

def get_font(size):
    try:
        return ImageFont.truetype("arial.ttf", size)
    except:
        return ImageFont.load_default()

def create_strip(images_with_labels, output_filename, title=""):
    valid = []
    for item in images_with_labels:
        img_name, label = item[0], item[1]
        p = os.path.join(REVIEW_DIR, img_name)
        if not os.path.exists(p):
            p = os.path.join(QA_DIR, img_name)
        if os.path.exists(p):
            valid.append((Image.open(p), label))
        else:
            print(f"[WARN] File not found: {img_name}")

    if not valid:
        print(f"[WARN] No valid images for {output_filename}")
        return None

    thumb_w = 400
    thumb_h = 225
    label_h = 35
    header_h = 45 if title else 0
    cols = len(valid)

    strip_w = cols * thumb_w
    strip_h = header_h + thumb_h + label_h

    canvas = Image.new("RGB", (strip_w, strip_h), (20, 24, 28))
    draw = ImageDraw.Draw(canvas)

    f_title = get_font(22)
    f_label = get_font(15)

    if title:
        draw.text((15, 12), title, fill=(240, 245, 250), font=f_title)

    for i, (img, label) in enumerate(valid):
        resized = img.resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
        x = i * thumb_w
        y = header_h
        canvas.paste(resized, (x, y))

        draw.rectangle([x, y + thumb_h, x + thumb_w, y + thumb_h + label_h], fill=(30, 36, 42))
        draw.line([x, header_h, x, strip_h], fill=(50, 60, 70), width=1)
        draw.text((x + 10, y + thumb_h + 8), label, fill=(210, 220, 230), font=f_label)

    out_rev = os.path.join(REVIEW_DIR, output_filename)
    out_qa = os.path.join(QA_DIR, output_filename)
    canvas.save(out_rev, "JPEG", quality=92)
    canvas.save(out_qa, "JPEG", quality=92)
    print(f"[OK] Saved {output_filename} ({strip_w}x{strip_h})")
    return canvas

def main():
    print("Building CL-329 Part 1 Review Strips...")

    WEAPONS = [
        ('minigun', 'Rotary Gun'),
        ('m4', 'GW-4'),
        ('ak', 'KR-7'),
        ('pistol', 'Tactical Pistol'),
        ('uzi', 'Wasp SMG'),
        ('shotgun', 'Pump Shotgun'),
        ('aa12', 'Breacher-12'),
        ('revolver', 'Heavy Revolver'),
        ('sniper', 'MRAD Sniper'),
        ('launcher', 'M32A1 Launcher'),
        ('flamer', 'Flamethrower'),
        ('chainsaw', 'Chainsaw')
    ]

    # Strip 1: 1P Hip
    s1_items = [(f"1p-hip-{k}.png", name) for k, name in WEAPONS]
    create_strip(s1_items, "strip-01-all-guns-1p-hip.jpg", "CL-329 Part 1: All 12 Weapons at Hip (1st Person)")

    # Strip 2: 1P ADS
    s2_items = [(f"1p-ads-{k}.png", name) for k, name in WEAPONS]
    create_strip(s2_items, "strip-02-all-guns-1p-ads.jpg", "CL-329 Part 1: All 12 Weapons Down Sights (1st Person ADS)")

    # Strip 3: 3P Hands
    s3_items = [(f"3p-hands-{k}.png", name) for k, name in WEAPONS]
    create_strip(s3_items, "strip-03-all-guns-3p-hands.jpg", "CL-329 Part 1: All 12 Weapons in Marine Hands (3rd Person)")

    # Strip 4: 3P Back / Stowed
    s4_items = [
        ("3p-back-m4.png", "GW-4 Stowed on Back"),
        ("3p-back-ak.png", "KR-7 Stowed on Back"),
        ("3p-back-shotgun.png", "Shotgun Stowed on Back"),
        ("3p-back-aa12.png", "Breacher-12 Stowed on Back"),
        ("3p-back-sniper.png", "Sniper Stowed on Back"),
        ("3p-back-launcher.png", "Launcher Stowed on Back"),
        ("3p-back-minigun.png", "Minigun Stowed on Pack"),
        ("3p-back-chainsaw.png", "Chainsaw Stowed on Pack")
    ]
    create_strip(s4_items, "strip-04-guns-3p-back.jpg", "CL-329 Part 1: Stowed Weapons on Marine Back/Pack (3rd Person)")

    # Strip 5: Breacher Bolt Stroke
    s5_items = [
        ("breacher-bolt-0-battery.png", "1. Battery (Closed)"),
        ("breacher-bolt-1-opening.png", "2. Opening (25%)"),
        ("breacher-bolt-2-peak.png", "3. Peak Stroke (11cm)"),
        ("breacher-bolt-3-returning.png", "4. Returning (75%)"),
        ("breacher-bolt-4-locked.png", "5. Battery Restored")
    ]
    create_strip(s5_items, "strip-05-breacher-bolt-stroke.jpg", "CL-329 Part 1: Breacher-12 Bolt Stroke in Port on Shot")

    # Strip 6: Revolver Reload Counts
    s6_items = [
        ("revolver-reload-0-empty.png", "1. Crane Swung Open"),
        ("revolver-reload-1-eject.png", "2. 4 Casings Ejected"),
        ("revolver-reload-2-loader.png", "3. Speedloader (6 Rnds)"),
        ("revolver-reload-3-closed.png", "4. Cylinder Locked Full")
    ]
    create_strip(s6_items, "strip-06-revolver-reload-counts.jpg", "CL-329 Part 1: Revolver Reload Crane, Empty Chambers & Loader")

    # Strip 7: GW-4 Holo Sight
    s7_items = [
        ("gw4-holo-hip.png", "GW-4 Holo: Closed Hood at Hip"),
        ("gw4-holo-ads.png", "GW-4 Holo: Clear Window ADS")
    ]
    create_strip(s7_items, "strip-07-gw4-holo-hood-window.jpg", "CL-329 Part 1: GW-4 Holo Sight Closed Hood & Window")

    # Strip 8: Armory Optics Fitted on KR-7 and Pistol
    s8_items = [
        ("armory-optic-kr7-rmr.png", "KR-7 with RMR (Folded)"),
        ("armory-optic-kr7-prism.png", "KR-7 with Prism (Folded)"),
        ("armory-optic-kr7-acog.png", "KR-7 with ACOG (Folded)"),
        ("armory-optic-pistol-rmr.png", "Pistol with RMR (Folded)")
    ]
    create_strip(s8_items, "strip-08-armory-optics-kr7-pistol.jpg", "CL-329 Part 1: Optics Fitted & Folded on KR-7 & Pistol")

    # Strip 9: Camo finish + suppressor
    s9_items = [
        ("camo-suppressor-kr7.png", "KR-7 M81 Camo + Suppressor"),
        ("camo-suppressor-pistol.png", "Pistol M81 Camo + Suppressor")
    ]
    create_strip(s9_items, "strip-09-camo-suppressor-folded.jpg", "CL-329 Part 1: M81 Camo Finish with Fitted Suppressor")

    # Master Composite
    print("Building master composite sheet...")
    strips = [
        "strip-01-all-guns-1p-hip.jpg",
        "strip-02-all-guns-1p-ads.jpg",
        "strip-05-breacher-bolt-stroke.jpg",
        "strip-06-revolver-reload-counts.jpg",
        "strip-07-gw4-holo-hood-window.jpg",
        "strip-08-armory-optics-kr7-pistol.jpg",
        "strip-09-camo-suppressor-folded.jpg"
    ]
    loaded = []
    for s in strips:
        p = os.path.join(REVIEW_DIR, s)
        if os.path.exists(p):
            loaded.append(Image.open(p))

    if loaded:
        max_w = 2560
        scaled = []
        for img in loaded:
            ratio = max_w / float(img.width)
            h = int(img.height * ratio)
            scaled.append(img.resize((max_w, h), Image.Resampling.LANCZOS))

        total_h = sum(im.height for im in scaled) + 80
        master = Image.new("RGB", (max_w, total_h), (16, 20, 24))
        draw_m = ImageDraw.Draw(master)
        draw_m.text((30, 25), "CL-329 PART 1: WEAPON PART FOLD & OPTICS VERIFICATION ON RTX 5080 (WEBGPU)", fill=(255, 255, 255), font=get_font(28))

        curr_y = 80
        for im in scaled:
            master.paste(im, (0, curr_y))
            curr_y += im.height

        out_master_rev = os.path.join(REVIEW_DIR, "cl329-weapons-fold-master-sheet.jpg")
        out_master_qa = os.path.join(QA_DIR, "cl329-weapons-fold-master-sheet.jpg")
        master.save(out_master_rev, "JPEG", quality=90)
        master.save(out_master_qa, "JPEG", quality=90)
        print(f"[OK] Master composite saved: {out_master_rev} ({max_w}x{total_h})")

if __name__ == '__main__':
    main()
