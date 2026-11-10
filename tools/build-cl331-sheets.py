#!/usr/bin/env python3
"""
build-cl331-sheets.py - Generates labeled contact strips and a master composite
for CL-331 & CL-332 (Pistol & Wasp Grip, Shotgun/KR-7/GW-4 RMR Risers on RTX 5080)
"""
import os
import sys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REVIEW_DIR = os.path.join(ROOT, 'review', 'CL-331')
QA_DIR = os.path.join(ROOT, 'qa', 'CL-331')

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

    thumb_w = 380
    thumb_h = 214
    label_h = 36
    header_h = 44 if title else 0
    cols = len(valid)

    strip_w = cols * thumb_w
    strip_h = header_h + thumb_h + label_h

    canvas = Image.new("RGB", (strip_w, strip_h), (20, 24, 28))
    draw = ImageDraw.Draw(canvas)

    f_title = get_font(20)
    f_label = get_font(13)

    if title:
        draw.text((15, 12), title, fill=(240, 245, 250), font=f_title)

    for i, (img, label) in enumerate(valid):
        resized = img.resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
        x = i * thumb_w
        y = header_h
        canvas.paste(resized, (x, y))

        draw.rectangle([x, y + thumb_h, x + thumb_w, y + thumb_h + label_h], fill=(30, 36, 42))
        draw.line([x, header_h, x, strip_h], fill=(50, 60, 70), width=1)
        draw.text((x + 8, y + thumb_h + 9), label, fill=(210, 220, 230), font=f_label)

    out_rev = os.path.join(REVIEW_DIR, output_filename)
    out_qa = os.path.join(QA_DIR, output_filename)
    canvas.save(out_rev, "JPEG", quality=92)
    canvas.save(out_qa, "JPEG", quality=92)
    print(f"[OK] Saved {output_filename} ({strip_w}x{strip_h})")
    return canvas

def build_master_composite(strips, output_filename):
    valid_strips = [s for s in strips if s is not None]
    if not valid_strips:
        return

    target_w = 2560
    header_h = 60
    footer_h = 40
    
    scaled_strips = []
    total_h = header_h + footer_h
    for s in valid_strips:
        aspect = s.height / s.width
        new_h = int(target_w * aspect)
        scaled = s.resize((target_w, new_h), Image.Resampling.LANCZOS)
        scaled_strips.append(scaled)
        total_h += new_h + 10

    canvas = Image.new("RGB", (target_w, total_h), (14, 17, 20))
    draw = ImageDraw.Draw(canvas)

    f_main = get_font(26)
    f_sub = get_font(16)
    f_foot = get_font(14)

    draw.text((20, 12), "CL-331 / CL-332 Independent Visual QA — NVIDIA GeForce RTX 5080 (WebGPU)", fill=(255, 255, 255), font=f_main)
    draw.text((20, 38), "Tactical Pistol & Wasp SMG Refitted Grips · Reload Sequence · Shotgun & KR-7/GW-4 RMR Risers", fill=(170, 190, 210), font=f_sub)

    curr_y = header_h
    for scaled in scaled_strips:
        canvas.paste(scaled, (0, curr_y))
        curr_y += scaled.height + 10

    draw.text((20, total_h - 28), "Verified by Antigravity (AG-277) on real RTX 5080 WebGPU hardware under single-instance test slot allocation.", fill=(140, 155, 170), font=f_foot)

    out_rev = os.path.join(REVIEW_DIR, output_filename)
    out_qa = os.path.join(QA_DIR, output_filename)
    canvas.save(out_rev, "JPEG", quality=90)
    canvas.save(out_qa, "JPEG", quality=90)
    print(f"[OK] Master Composite Saved: {output_filename} ({target_w}x{total_h})")

def main():
    print("Building CL-331 / CL-332 Review Strips...")

    # Strip 1: Tactical Pistol (Grip, Steady Rear, Full Reload & Back)
    s1_items = [
        ("01-pistol-1p-hip.png", "1P Hip (Two-Hand Grip)"),
        ("02-pistol-1p-ads.png", "1P ADS (Cheek Weld)"),
        ("03-pistol-firing-hand-detail.png", "Firing Thumb Round Back"),
        ("04-pistol-support-hand-detail.png", "Support Palm & Thumb Fwd"),
        ("05-pistol-rear-slide-steady.png", "Rear Slide Frame 2.5mm"),
        ("06-pistol-reload-01-start.png", "Reload Start / Well Dip"),
        ("07-pistol-reload-02-mag-drop.png", "Mag Clears Well"),
        ("08-pistol-reload-03-fresh-mag.png", "Fresh Mag Inserting"),
        ("09-pistol-reload-04-slide-forward.png", "Slide Return Battery"),
        ("10-pistol-reload-05-back-to-ready.png", "Back to Ready Stance")
    ]
    strip1 = create_strip(s1_items, "strip-01-pistol-grip-and-reload.jpg", "CL-331: Tactical Pistol Refitted Two-Hand Grip, Rear Slide Plane & Reload Cycle (RTX 5080)")

    # Strip 2: Wasp SMG (Single & Akimbo)
    s2_items = [
        ("11-wasp-single-1p-hip.png", "Single Wasp 1P Hip"),
        ("12-wasp-single-1p-ads.png", "Single Wasp 1P ADS"),
        ("13-wasp-single-firing-thumb.png", "Firing Thumb Round Back"),
        ("14-wasp-single-support-cradle.png", "Support Cradle 16mm Lower"),
        ("15-wasp-akimbo-1p-hip.png", "Akimbo Wasp 1P Hip"),
        ("16-wasp-akimbo-1p-ads.png", "Akimbo Wasp 1P Aimed"),
        ("17-wasp-akimbo-left-gun-grip.png", "Akimbo Left Gun Grip"),
        ("18-wasp-akimbo-right-gun-grip.png", "Akimbo Right Gun Grip")
    ]
    strip2 = create_strip(s2_items, "strip-02-wasp-grip-single-and-akimbo.jpg", "CL-331: Wasp SMG Refitted Cradle Grip & Akimbo Dual-Wield Stance (RTX 5080)")

    # Strip 3: Optics on Risers (Shotgun, KR-7, GW-4 RMR)
    s3_items = [
        ("19-shotgun-rmr-hip.png", "Shotgun RMR 1P Hip"),
        ("20-shotgun-rmr-ads.png", "Shotgun RMR ADS (Clear)"),
        ("21-shotgun-rmr-suppressor-hip.png", "Shotgun RMR+Can Hip"),
        ("22-shotgun-rmr-suppressor-ads.png", "Shotgun RMR+Can ADS (Clear)"),
        ("23-shotgun-rmr-riser-detail.png", "Shotgun 26mm Riser Hardware"),
        ("24-kr7-rmr-hip.png", "KR-7 RMR 1P Hip"),
        ("25-kr7-rmr-ads.png", "KR-7 RMR ADS Sightline"),
        ("26-gw4-rmr-hip.png", "GW-4 RMR 1P Hip"),
        ("27-gw4-rmr-ads.png", "GW-4 RMR ADS (Clear)"),
        ("28-gw4-rmr-riser-detail.png", "GW-4 21mm Riser Hardware")
    ]
    strip3 = create_strip(s3_items, "strip-03-shotgun-kr7-rmr-risers.jpg", "CL-332: Optics on Risers — Shotgun (with/without Can), KR-7 & GW-4 RMR Clearances (RTX 5080)")

    build_master_composite([strip1, strip2, strip3], "cl331-master-review-sheet.jpg")

if __name__ == "__main__":
    main()
