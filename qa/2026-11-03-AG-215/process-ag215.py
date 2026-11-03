#!/usr/bin/env python3
"""
Process AG-215 Telemetry and Compose Comparison Sheets for CU-234 Camera LOD.
"""
import os
import json
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
AG215_DIR = os.path.join(ROOT, 'qa', '2026-11-03-AG-215')
CAPTURES_DIR = os.path.join(AG215_DIR, 'captures')

def main():
    telem_path = os.path.join(AG215_DIR, 'telemetry.json')
    if not os.path.exists(telem_path):
        print(f"Error: {telem_path} not found")
        return 1

    with open(telem_path, 'r') as f:
        telem = json.load(f)

    try:
        font_large = ImageFont.truetype("arial.ttf", 26)
        font_med = ImageFont.truetype("arial.ttf", 18)
        font_small = ImageFont.truetype("arial.ttf", 14)
    except IOError:
        font_large = ImageFont.load_default()
        font_med = ImageFont.load_default()
        font_small = ImageFont.load_default()

    # 1. Compose Side-by-Side: Camera LOD vs Old Slabs vs Hedge at 3m, 10m, 30m (HQ Ring Noon)
    # 3 rows (3m, 10m, 30m), 3 cols (Old Slabs, New Camera LOD, Hedge)
    thumb_w, thumb_h = 640, 360
    header_h, label_h = 60, 32
    sheet_w = thumb_w * 3
    sheet_h = header_h + (thumb_h + label_h) * 3

    sheet1 = Image.new('RGB', (sheet_w, sheet_h), color=(20, 22, 26))
    d1 = ImageDraw.Draw(sheet1)
    d1.text((20, 16), "CU-234 Stone Wall Camera LOD vs Old Slab Box vs Hedge (HQ Ring, Noon Daylight)", fill=(240, 240, 240), font=font_large)

    col_titles = [
        ("OLD SLAB BOX (?walls=slabs)", (255, 120, 120)),
        ("NEW CAMERA LOD (Default)", (120, 255, 140)),
        ("HEDGE BRUSH (?walls=hedge)", (180, 210, 255))
    ]
    for c_idx, (title, color) in enumerate(col_titles):
        d1.text((c_idx * thumb_w + 20, header_h - 26), title, fill=color, font=font_med)

    distances = [3, 10, 30]
    modes = ['slabs', 'camera', 'hedge']

    for r_idx, dist in enumerate(distances):
        y_base = header_h + r_idx * (thumb_h + label_h)
        for c_idx, mode in enumerate(modes):
            x_base = c_idx * thumb_w
            shot_id = f"{mode}_hq_{dist}m_noon"
            img_path = os.path.join(CAPTURES_DIR, f"{shot_id}.jpg")

            d1.text((x_base + 20, y_base + 6), f"DISTANCE: {dist} METERS", fill=(220, 220, 220), font=font_med)

            y_img = y_base + label_h
            if os.path.exists(img_path):
                im = Image.open(img_path).convert('RGB')
                im_thumb = im.resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
                sheet1.paste(im_thumb, (x_base, y_img))

                # Overlay badge
                overlay = Image.new('RGBA', (thumb_w - 20, 48), (0, 0, 0, 190))
                sheet1.paste(overlay, (x_base + 10, y_img + thumb_h - 58), mask=overlay)
                bd = ImageDraw.Draw(sheet1)

                # Look up telemetry
                rec = next((x for x in telem.get(mode, []) if x['shotId'] == shot_id), {})
                sdata = rec.get('stoneUserData') or {}
                if mode == 'camera':
                    info = f"Camera LOD | Near cells showing: {sdata.get('nearShowing', 0)} ({sdata.get('nearTris', 0)} tris)"
                elif mode == 'slabs':
                    info = f"Old Origin Slabs | 100% far slab box (12 tris/station)"
                else:
                    info = f"Hedge Brush | Baseline world foliage"
                bd.text((x_base + 16, y_img + thumb_h - 52), info, fill=(255, 255, 255), font=font_small)
                bd.text((x_base + 16, y_img + thumb_h - 30), f"Camera Dist: {rec.get('actualDist', dist)} m | Launcher Hip (1080p)", fill=(200, 220, 255), font=font_small)

    out_comp1 = os.path.join(AG215_DIR, 'stone-cameralod-vs-slabs.jpg')
    sheet1.save(out_comp1, quality=92)
    print(f"[AG-215] Saved comparison sheet: {out_comp1}")

    # 2. Compose Master Camera LOD Sheet (HQ Ring & Quarter-NW at 3/10/30 m, Noon & Dusk)
    # 4 rows: (HQ Noon, HQ Dusk, QNW Noon, QNW Dusk), 3 cols: 3m, 10m, 30m
    sheet2_h = header_h + (thumb_h + label_h) * 4
    sheet2 = Image.new('RGB', (sheet_w, sheet2_h), color=(20, 22, 26))
    d2 = ImageDraw.Draw(sheet2)
    d2.text((20, 16), "CU-234 Stone Wall Camera LOD Master Matrix (RTX 5080 WebGPU)", fill=(240, 240, 240), font=font_large)

    row_specs = [
        ('hq', 'noon', 'HQ Ring (Yard Side) — Noon Daylight (t=0.50)'),
        ('hq', 'dusk', 'HQ Ring (Yard Side) — Dusk Twilight (t=0.77)'),
        ('qnw', 'noon', 'Quarter-NW (Near 83, 50) — Noon Daylight (t=0.50)'),
        ('qnw', 'dusk', 'Quarter-NW (Near 83, 50) — Dusk Twilight (t=0.77)')
    ]

    for r_idx, (spot, light, r_title) in enumerate(row_specs):
        y_base = header_h + r_idx * (thumb_h + label_h)
        d2.text((20, y_base + 6), r_title.upper(), fill=(255, 215, 100), font=font_med)

        for c_idx, dist in enumerate(distances):
            x_base = c_idx * thumb_w
            y_img = y_base + label_h
            shot_id = f"camera_{spot}_{dist}m_{light}"
            img_path = os.path.join(CAPTURES_DIR, f"{shot_id}.jpg")

            if os.path.exists(img_path):
                im = Image.open(img_path).convert('RGB')
                im_thumb = im.resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
                sheet2.paste(im_thumb, (x_base, y_img))

                overlay = Image.new('RGBA', (thumb_w - 20, 48), (0, 0, 0, 190))
                sheet2.paste(overlay, (x_base + 10, y_img + thumb_h - 58), mask=overlay)
                bd = ImageDraw.Draw(sheet2)

                rec = next((x for x in telem.get('camera', []) if x['shotId'] == shot_id), {})
                sdata = rec.get('stoneUserData') or {}
                bd.text((x_base + 16, y_img + thumb_h - 52), f"Dist: {dist}m | Showing {sdata.get('nearShowing', 0)} cells ({sdata.get('nearTris', 0)} near tris)", fill=(255, 255, 255), font=font_small)
                bd.text((x_base + 16, y_img + thumb_h - 30), f"Coursed Stone, Moss & Ivy Detail | Actual Dist: {rec.get('actualDist', dist)} m", fill=(140, 255, 160), font=font_small)

    out_master = os.path.join(AG215_DIR, 'stone-cameralod-master.jpg')
    sheet2.save(out_master, quality=92)
    print(f"[AG-215] Saved master sheet: {out_master}")

    # 3. Build summary
    summary = {
        "comparisonSheet": out_comp1,
        "masterSheet": out_master,
        "cameraPassCount": len(telem.get('camera', [])),
        "slabsPassCount": len(telem.get('slabs', [])),
        "hedgePassCount": len(telem.get('hedge', []))
    }
    with open(os.path.join(AG215_DIR, 'telemetry-summary.json'), 'w') as f:
        json.dump(summary, f, indent=2)

    return 0

if __name__ == '__main__':
    exit(main())
