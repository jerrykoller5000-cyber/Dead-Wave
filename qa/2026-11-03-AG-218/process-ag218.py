#!/usr/bin/env python3
"""
Process AG-218 Telemetry and Compose Comparison Sheets for CL-300 Near Stone Wall.
"""
import os
import json
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
AG218_DIR = os.path.join(ROOT, 'qa', '2026-11-03-AG-218')
CAPTURES_DIR = os.path.join(AG218_DIR, 'captures')
AG215_DIR = os.path.join(ROOT, 'qa', '2026-11-03-AG-215')
AG215_CAPTURES = os.path.join(AG215_DIR, 'captures')

def main():
    telem_path = os.path.join(AG218_DIR, 'telemetry.json')
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

    thumb_w, thumb_h = 640, 360
    header_h, label_h = 60, 32

    # 1. Sheet 1: CL-300 Rewritten Stone vs AG-215 Old Stone vs Slabs vs Hedge (HQ Ring Noon)
    # 3 rows (3m, 10m, 30m), 4 columns:
    # Col 0: AG-215 Old Stone ("Grey Blocks")
    # Col 1: AG-218 CL-300 New Stone (Staggered Courses, Cock-and-Hen Coping)
    # Col 2: Old Slab Box (?walls=slabs)
    # Col 3: Hedge Baseline (?walls=hedge)
    s1_cols = 4
    s1_w = thumb_w * s1_cols
    s1_h = header_h + (thumb_h + label_h) * 3
    sheet1 = Image.new('RGB', (s1_w, s1_h), color=(20, 22, 26))
    d1 = ImageDraw.Draw(sheet1)
    d1.text((20, 16), "CL-300 Rewritten Near Stone vs AG-215 Old Stone vs Slabs vs Hedge (HQ Ring, Noon Daylight)", fill=(240, 240, 240), font=font_large)

    col_headers = [
        ("AG-215 OLD NEAR STONE (Big Grey Blocks)", (255, 160, 120)),
        ("AG-218 CL-300 REWRITTEN STONE (Coursed, Coping, Moss)", (120, 255, 140)),
        ("SLAB BOXES (?walls=slabs)", (255, 120, 120)),
        ("HEDGE BASELINE (?walls=hedge)", (180, 210, 255))
    ]
    for c_idx, (title, color) in enumerate(col_headers):
        d1.text((c_idx * thumb_w + 20, header_h - 26), title, fill=color, font=font_med)

    distances = [3, 10, 30]
    for r_idx, dist in enumerate(distances):
        y_base = header_h + r_idx * (thumb_h + label_h)
        for c_idx in range(s1_cols):
            x_base = c_idx * thumb_w
            d1.text((x_base + 20, y_base + 6), f"DISTANCE: {dist} METERS", fill=(220, 220, 220), font=font_med)
            y_img = y_base + label_h

            im_path = None
            badge_text1 = ""
            badge_text2 = ""

            if c_idx == 0:
                # AG-215 old stone
                im_path = os.path.join(AG215_CAPTURES, f"camera_hq_{dist}m_noon.jpg")
                badge_text1 = "AG-215 Old Stone | 10.5k tris / 7 cells (uniform blocks)"
                badge_text2 = f"Launcher Hip | Camera Dist: {dist} m (HQ Ring)"
            elif c_idx == 1:
                # AG-218 CL-300 new stone
                shot_id = f"camera_hq_{dist}m_noon"
                im_path = os.path.join(CAPTURES_DIR, f"{shot_id}.jpg")
                rec = next((x for x in telem.get('camera', []) if x['shotId'] == shot_id), {})
                sdata = rec.get('stoneUserData') or {}
                badge_text1 = f"CL-300 Rewritten | Near cells: {sdata.get('nearShowing', 0)} ({sdata.get('nearTris', 0)} tris)"
                badge_text2 = f"Launcher Hip | Camera Dist: {rec.get('actualDist', dist)} m (HQ Ring)"
            elif c_idx == 2:
                # Slabs
                shot_id = f"slabs_hq_{dist}m_noon"
                im_path = os.path.join(CAPTURES_DIR, f"{shot_id}.jpg")
                rec = next((x for x in telem.get('slabs', []) if x['shotId'] == shot_id), {})
                badge_text1 = "Far Slab Boxes | 100% far slabs (12 tris/station)"
                badge_text2 = f"Launcher Hip | Camera Dist: {rec.get('actualDist', dist)} m (HQ Ring)"
            elif c_idx == 3:
                # Hedge
                shot_id = f"hedge_hq_{dist}m_noon"
                im_path = os.path.join(CAPTURES_DIR, f"{shot_id}.jpg")
                rec = next((x for x in telem.get('hedge', []) if x['shotId'] == shot_id), {})
                badge_text1 = "Hedge Foliage | Original dark green hedge"
                badge_text2 = f"Launcher Hip | Camera Dist: {rec.get('actualDist', dist)} m (HQ Ring)"

            if im_path and os.path.exists(im_path):
                im = Image.open(im_path).convert('RGB')
                im_thumb = im.resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
                sheet1.paste(im_thumb, (x_base, y_img))

                # Overlay badge
                overlay = Image.new('RGBA', (thumb_w - 20, 48), (0, 0, 0, 190))
                sheet1.paste(overlay, (x_base + 10, y_img + thumb_h - 58), mask=overlay)
                bd = ImageDraw.Draw(sheet1)
                bd.text((x_base + 16, y_img + thumb_h - 52), badge_text1, fill=(255, 255, 255), font=font_small)
                bd.text((x_base + 16, y_img + thumb_h - 30), badge_text2, fill=(200, 220, 255), font=font_small)

    out1 = os.path.join(AG218_DIR, 'stone-cl300-vs-ag215.jpg')
    sheet1.save(out1, quality=92)
    print(f"[AG-218] Saved comparison sheet 1: {out1}")

    # 2. Sheet 2: Master Matrix for CL-300 Camera LOD
    # 4 rows: HQ Noon, HQ Dusk, Quarter-NW Noon, Quarter-NW Dusk
    # 3 cols: 3m, 10m, 30m
    sheet2_w = thumb_w * 3
    sheet2_h = header_h + (thumb_h + label_h) * 4
    sheet2 = Image.new('RGB', (sheet2_w, sheet2_h), color=(20, 22, 26))
    d2 = ImageDraw.Draw(sheet2)
    d2.text((20, 16), "CL-300 Rewritten Stone Wall Camera LOD Master Matrix (RTX 5080 WebGPU)", fill=(240, 240, 240), font=font_large)

    for c_idx, dist in enumerate(distances):
        d2.text((c_idx * thumb_w + 20, header_h - 26), f"DISTANCE: {dist} METERS", fill=(120, 255, 140), font=font_med)

    row_specs = [
        ('hq', 'noon', 'HQ Ring (Yard Side) — Noon Daylight (t=0.50)'),
        ('hq', 'dusk', 'HQ Ring (Yard Side) — Dusk Twilight (t=0.77)'),
        ('qnw', 'noon', 'Quarter-NW (Near 83, 50) — Noon Daylight (t=0.50)'),
        ('qnw', 'dusk', 'Quarter-NW (Near 83, 50) — Dusk Twilight (t=0.77)')
    ]

    for r_idx, (spot_id, light_id, row_title) in enumerate(row_specs):
        y_base = header_h + r_idx * (thumb_h + label_h)
        for c_idx, dist in enumerate(distances):
            x_base = c_idx * thumb_w
            shot_id = f"camera_{spot_id}_{dist}m_{light_id}"
            img_path = os.path.join(CAPTURES_DIR, f"{shot_id}.jpg")

            d2.text((x_base + 20, y_base + 6), row_title if c_idx == 0 else f"{spot_id.upper()} {dist}m {light_id}", fill=(220, 220, 220), font=font_med)

            y_img = y_base + label_h
            if os.path.exists(img_path):
                im = Image.open(img_path).convert('RGB')
                im_thumb = im.resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
                sheet2.paste(im_thumb, (x_base, y_img))

                rec = next((x for x in telem.get('camera', []) if x['shotId'] == shot_id), {})
                sdata = rec.get('stoneUserData') or {}
                overlay = Image.new('RGBA', (thumb_w - 20, 48), (0, 0, 0, 190))
                sheet2.paste(overlay, (x_base + 10, y_img + thumb_h - 58), mask=overlay)
                bd = ImageDraw.Draw(sheet2)
                bd.text((x_base + 16, y_img + thumb_h - 52),
                        f"CL-300 Stone | Near cells: {sdata.get('nearShowing', 0)} ({sdata.get('nearTris', 0)} tris)",
                        fill=(255, 255, 255), font=font_small)
                bd.text((x_base + 16, y_img + thumb_h - 30),
                        f"Dist: {rec.get('actualDist', dist)} m | Cam: ({rec.get('camPos',{}).get('x',0):.1f}, {rec.get('camPos',{}).get('z',0):.1f})",
                        fill=(200, 220, 255), font=font_small)

    out2 = os.path.join(AG218_DIR, 'stone-cl300-master.jpg')
    sheet2.save(out2, quality=92)
    print(f"[AG-218] Saved comparison sheet 2: {out2}")

    # 3. Sheet 3: High-Resolution Close-Up Detail Crops (3m HQ Noon & Dusk)
    # Comparing AG-215 old stone vs CL-300 rewritten stone at 1:1 pixel resolution
    # Crops: Wall center / coping crest / mortar joints
    crop_w, crop_h = 480, 480
    sheet3_w = crop_w * 4
    sheet3_h = header_h + crop_h + 40
    sheet3 = Image.new('RGB', (sheet3_w, sheet3_h), color=(20, 22, 26))
    d3 = ImageDraw.Draw(sheet3)
    d3.text((20, 16), "CL-300 vs AG-215 Masonry Detail & Coping 1:1 Crops (3m at HQ Ring)", fill=(240, 240, 240), font=font_large)

    crops_spec = [
        ("AG-215 Old Stone (Noon, Center)", os.path.join(AG215_CAPTURES, "camera_hq_3m_noon.jpg"), (720, 280, 1200, 760)),
        ("CL-300 New Stone (Noon, Center)", os.path.join(CAPTURES_DIR, "camera_hq_3m_noon.jpg"), (720, 280, 1200, 760)),
        ("AG-215 Old Stone (Dusk, Center)", os.path.join(AG215_CAPTURES, "camera_hq_3m_dusk.jpg"), (720, 280, 1200, 760)),
        ("CL-300 New Stone (Dusk, Center)", os.path.join(CAPTURES_DIR, "camera_hq_3m_dusk.jpg"), (720, 280, 1200, 760))
    ]

    for c_idx, (label, path_img, box) in enumerate(crops_spec):
        x_base = c_idx * crop_w
        d3.text((x_base + 16, header_h - 26), label, fill=(120, 255, 140) if "CL-300" in label else (255, 160, 120), font=font_med)
        if os.path.exists(path_img):
            im = Image.open(path_img).convert('RGB')
            crop_im = im.crop(box).resize((crop_w, crop_h), Image.Resampling.LANCZOS)
            sheet3.paste(crop_im, (x_base, header_h))

    out3 = os.path.join(AG218_DIR, 'stone-cl300-detail-crops.jpg')
    sheet3.save(out3, quality=92)
    print(f"[AG-218] Saved comparison sheet 3: {out3}")

    return 0

if __name__ == '__main__':
    exit(main())
