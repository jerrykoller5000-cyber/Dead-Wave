#!/usr/bin/env python3
"""
Process AG-214 Telemetry and Compose 8-Panel Launcher 4-Light Comparison Sheet.
"""
import os
import json
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
AG214_DIR = os.path.join(ROOT, 'qa', '2026-11-03-AG-214')
LAUNCHER_DIR = os.path.join(AG214_DIR, 'launcher')

def main():
    telem_path = os.path.join(AG214_DIR, 'telemetry.json')
    if not os.path.exists(telem_path):
        print(f"Error: {telem_path} not found")
        return 1

    with open(telem_path, 'r') as f:
        telem = json.load(f)

    # 1. Compose Launcher 4-Light Comparison Sheet
    lights = ['noon', 'overcast', 'dusk', 'night']
    light_labels = {
        'noon': 'NOON DAYLIGHT (t=0.50)',
        'overcast': 'OVERCAST STORM (t=0.46)',
        'dusk': 'DUSK TWILIGHT (t=0.77)',
        'night': 'NIGHT OPS (t=0.02)'
    }

    thumb_w = 640
    thumb_h = 360
    header_h = 60
    label_h = 30
    total_w = thumb_w * 4
    total_h = header_h + (thumb_h + label_h) * 2

    sheet = Image.new('RGB', (total_w, total_h), color=(18, 20, 24))
    draw = ImageDraw.Draw(sheet)

    try:
        font_large = ImageFont.truetype("arial.ttf", 26)
        font_med = ImageFont.truetype("arial.ttf", 18)
        font_small = ImageFont.truetype("arial.ttf", 15)
    except IOError:
        font_large = ImageFont.load_default()
        font_med = ImageFont.load_default()
        font_small = ImageFont.load_default()

    # Title header
    draw.text((20, 16), "GP-20017 Launcher Hip Cant Four-Light Comparison (RTX 5080 WebGPU)", fill=(240, 240, 240), font=font_large)

    variants = [
        ('baseline', 'Baseline (yaw = +0.025 rad)'),
        ('candidate', 'Candidate (yaw = +0.25 rad)')
    ]

    for row_idx, (var_id, var_label) in enumerate(variants):
        y_base = header_h + row_idx * (thumb_h + label_h)
        # Variant row indicator
        draw.text((20, y_base + 6), f"ROW {row_idx + 1}: {var_label.upper()}", fill=(255, 200, 80) if var_id == 'candidate' else (180, 180, 180), font=font_med)

        for col_idx, lt in enumerate(lights):
            x_base = col_idx * thumb_w
            y_img = y_base + label_h

            shot_data = telem.get('launcherFourLight', {}).get(var_id, {}).get('shots', {}).get(lt, {})
            img_file = shot_data.get('file')
            img_path = os.path.join(LAUNCHER_DIR, img_file) if img_file else None

            if img_path and os.path.exists(img_path):
                im = Image.open(img_path).convert('RGB')
                im_thumb = im.resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
                sheet.paste(im_thumb, (x_base, y_img))

                # Overlay lighting and telemetry badge
                badge_draw = ImageDraw.Draw(sheet)
                sky = shot_data.get('skyColor', 'n/a')
                sun = shot_data.get('sunIntensity', 0)
                hemi = shot_data.get('hemiIntensity', 0)
                moon = shot_data.get('moonIntensity', 0)
                m_ndc = shot_data.get('muzzleNdc', {})

                # Semi-transparent box for badge
                overlay = Image.new('RGBA', (thumb_w - 20, 64), (0, 0, 0, 180))
                sheet.paste(overlay, (x_base + 10, y_img + thumb_h - 74), mask=overlay)

                # Text lines
                line1 = f"{light_labels[lt]} | Sky: {sky}"
                line2 = f"Sun: {sun} | Hemi: {hemi} | Moon: {moon} | Muzzle: ({m_ndc.get('x')}, {m_ndc.get('y')})"
                badge_draw.text((x_base + 16, y_img + thumb_h - 70), line1, fill=(255, 255, 255), font=font_small)
                badge_draw.text((x_base + 16, y_img + thumb_h - 46), line2, fill=(200, 220, 255), font=font_small)
            else:
                draw.rectangle([x_base, y_img, x_base + thumb_w, y_img + thumb_h], fill=(40, 20, 20))
                draw.text((x_base + 20, y_img + 40), f"MISSING: {img_file}", fill=(255, 80, 80), font=font_med)

    out_sheet_path = os.path.join(LAUNCHER_DIR, 'launcher-fourlight-comparison.jpg')
    sheet.save(out_sheet_path, quality=92)
    print(f"[AG-214] Composed comparison sheet: {out_sheet_path}")

    # 2. Output 12-Gun Scorecard Summary
    guns = telem.get('guns12', {})
    print("\n--- 12-GUN REAL-HARDWARE 40 CM SCORECARD ---")
    print("| # | Weapon Key | Name | Hip Near Plane | ADS Near Plane | Reticle Clear | Magwell Status | Evidence Note |")
    print("|---|---|---|---|---|---|---|---|")
    idx = 1
    for k, v in guns.items():
        hip_str = f"PASS ({v['hipNearPlaneCm']} cm)" if v['hipNearPlanePass'] else f"FAIL ({v['hipNearPlaneCm']} cm)"
        if v['adsNearPlanePass'] == 'HELD_J18':
            ads_str = "HELD (J18 dot)"
        elif v['adsNearPlanePass']:
            ads_str = f"PASS ({v['adsNearPlaneCm']} cm)"
        else:
            ads_str = f"FAIL ({v['adsNearPlaneCm']} cm)"
        reticle_str = "PASS" if v['reticleClear'] else "FAIL"
        print(f"| {idx} | `{k}` | {v['label']} | {hip_str} | {ads_str} | {reticle_str} | {v['magwellStatus']} | {v['magwellNote']} |")
        idx += 1

    summary = {
        "composedSheet": out_sheet_path,
        "weaponsAudited": len(guns),
        "hipAllPass": all(v['hipNearPlanePass'] for v in guns.values()),
        "reticleAllClear": all(v['reticleClear'] for v in guns.values())
    }
    with open(os.path.join(AG214_DIR, 'telemetry-summary.json'), 'w') as f:
        json.dump(summary, f, indent=2)

    return 0

if __name__ == '__main__':
    exit(main())
