# AG-211 Image Processing & Contact Sheet Generation
import os
import json
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.abspath(__file__))
CAPTURES_DIR = os.path.join(ROOT, 'captures')
META_PATH = os.path.join(ROOT, 'ag211-metadata.json')

def load_font(size):
    try:
        return ImageFont.truetype("arial.ttf", size)
    except Exception:
        return ImageFont.load_default()

def main():
    if not os.path.exists(META_PATH):
        print(f"Error: {META_PATH} does not exist.")
        return

    with open(META_PATH, 'r') as f:
        data = json.load(f)

    # Master contact sheet: 6 columns x 4 rows
    # Columns:
    # 0: HQ 3m, 1: HQ 10m, 2: HQ 30m, 3: QNW 3m, 4: QNW 10m, 5: QNW 30m
    # Rows:
    # 0: Stone Noon, 1: Stone Dusk, 2: Hedge Noon, 3: Hedge Dusk

    col_spots = [
        ('hq', 3, 'HQ Ring · 3m'),
        ('hq', 10, 'HQ Ring · 10m'),
        ('hq', 30, 'HQ Ring · 30m'),
        ('qnw', 3, 'Quarter-NW · 3m'),
        ('qnw', 10, 'Quarter-NW · 10m'),
        ('qnw', 30, 'Quarter-NW · 30m'),
    ]

    row_modes = [
        ('stone', 'noon', 'Stone Wall (Default) · Noon'),
        ('stone', 'dusk', 'Stone Wall (Default) · Dusk'),
        ('hedge', 'noon', 'Hedge (?walls=hedge) · Noon'),
        ('hedge', 'dusk', 'Hedge (?walls=hedge) · Dusk'),
    ]

    cell_w, cell_h = 640, 360
    header_h = 70
    col_header_h = 40
    row_label_w = 260
    margin = 8

    grid_w = row_label_w + len(col_spots) * (cell_w + margin) + margin
    grid_h = header_h + col_header_h + len(row_modes) * (cell_h + margin) + margin

    sheet = Image.new('RGB', (grid_w, grid_h), color=(18, 20, 24))
    draw = ImageDraw.Draw(sheet)

    title_font = load_font(24)
    subtitle_font = load_font(15)
    header_font = load_font(16)
    cell_font = load_font(13)

    # Title Banner
    draw.text((margin + 10, 10), "AG-211: The Stone Walls in the Game vs Studio (HQ Ring & Quarter-NW)", fill=(240, 240, 245), font=title_font)
    draw.text((margin + 10, 42), "LOD Analysis: distCenter > 48m forces 12-tri far slabs everywhere in game · First-Person Launcher · 1080p WebGPU", fill=(170, 180, 195), font=subtitle_font)

    # Column Headers
    for c_idx, (_, _, col_label) in enumerate(col_spots):
        x = row_label_w + c_idx * (cell_w + margin)
        y = header_h + 10
        draw.text((x + 10, y), col_label, fill=(220, 225, 230), font=header_font)

    # Lookups for shots
    shots_by_key = {}
    for item in data.get('stone', []) + data.get('hedge', []):
        key = (item['mode'], item['spotId'], item['nominalDist'], item['lightId'])
        shots_by_key[key] = item

    for r_idx, (mode, light, row_label) in enumerate(row_modes):
        y = header_h + col_header_h + r_idx * (cell_h + margin)

        # Row label background
        draw.rectangle([margin, y, row_label_w - margin, y + cell_h], fill=(28, 32, 38))
        draw.text((margin + 12, y + 25), row_label, fill=(255, 220, 120) if mode == 'stone' else (140, 230, 160), font=header_font)

        mode_sub = "CU-233 default\nFar LOD (12-tri slab)\nTexture-only, no coping/moss" if mode == 'stone' else "?walls=hedge\nInstanced brush & saplings\nOrganic volume"
        draw.text((margin + 12, y + 65), mode_sub, fill=(160, 170, 180), font=subtitle_font)

        for c_idx, (spot, dist, _) in enumerate(col_spots):
            x = row_label_w + c_idx * (cell_w + margin)
            item = shots_by_key.get((mode, spot, dist, light))

            if item and os.path.exists(item['path']):
                img = Image.open(item['path'])
                thumb = img.resize((cell_w, cell_h), Image.Resampling.LANCZOS)
                sheet.paste(thumb, (x, y))

                # Overlay info box on thumbnail
                t = item['telemetry']
                actual_d = t.get('actualDist', t.get('nearestSolidDist', 0))
                dist_center = item['distCenter']
                lod_str = f"distCenter: {dist_center:.1f}m > 48m (isFarLOD: TRUE, 12-tri box)" if mode == 'stone' else "Hedge Brush LOD"

                draw.rectangle([x + 6, y + cell_h - 48, x + cell_w - 6, y + cell_h - 6], fill=(0, 0, 0, 190))
                draw.text((x + 12, y + cell_h - 44), f"Cam Dist: {actual_d:.2f} m (Nom: {dist} m) | Yaw: {t['aimYaw']:.2f} | Weapon: {t['weaponKey']}", fill=(255, 255, 255), font=cell_font)
                draw.text((x + 12, y + cell_h - 26), lod_str, fill=(255, 120, 120) if mode == 'stone' else (120, 255, 140), font=cell_font)
            else:
                draw.rectangle([x, y, x + cell_w, y + cell_h], fill=(40, 40, 45))
                draw.text((x + 20, y + 20), "MISSING", fill=(255, 100, 100), font=header_font)

    sheet_out = os.path.join(ROOT, 'sheet-ag211.jpg')
    sheet.save(sheet_out, quality=90)
    print(f"Master contact sheet saved to: {sheet_out}")

    # Also build a focused crop comparison sheet for 3m and 10m to highlight the slab artifact
    crop_w, crop_h = 480, 480
    crop_sheet_w = 4 * (crop_w + margin) + margin
    crop_sheet_h = header_h + 2 * (crop_h + margin) + margin
    crop_sheet = Image.new('RGB', (crop_sheet_w, crop_sheet_h), color=(18, 20, 24))
    crop_draw = ImageDraw.Draw(crop_sheet)

    crop_draw.text((margin + 10, 10), "AG-211: Wall Surface Detail & Box-Read Analysis (1:1 Center Crops)", fill=(240, 240, 245), font=title_font)
    crop_draw.text((margin + 10, 42), "Comparing Stone Far-Slab Box Read vs Hedge across HQ and Quarter-NW at 3m and 10m", fill=(170, 180, 195), font=subtitle_font)

    comparisons = [
        # (col, row, mode, spot, dist, light, label)
        (0, 0, 'stone', 'hq', 3, 'noon', 'Stone HQ 3m Noon (Far Slab)'),
        (1, 0, 'hedge', 'hq', 3, 'noon', 'Hedge HQ 3m Noon'),
        (2, 0, 'stone', 'qnw', 3, 'noon', 'Stone QNW 3m Noon (Far Slab)'),
        (3, 0, 'hedge', 'qnw', 3, 'noon', 'Hedge QNW 3m Noon'),
        (0, 1, 'stone', 'hq', 10, 'dusk', 'Stone HQ 10m Dusk (Far Slab)'),
        (1, 1, 'hedge', 'hq', 10, 'dusk', 'Hedge HQ 10m Dusk'),
        (2, 1, 'stone', 'qnw', 10, 'dusk', 'Stone QNW 10m Dusk (Far Slab)'),
        (3, 1, 'hedge', 'qnw', 10, 'dusk', 'Hedge QNW 10m Dusk'),
    ]

    for col, row, mode, spot, dist, light, label in comparisons:
        item = shots_by_key.get((mode, spot, dist, light))
        x = margin + col * (crop_w + margin)
        y = header_h + row * (crop_h + margin)

        if item and os.path.exists(item['path']):
            img = Image.open(item['path'])
            # Center crop 600x600 around center-upper screen (where wall is)
            w, h = img.size
            crop_box = (w // 2 - 300, h // 2 - 250, w // 2 + 300, h // 2 + 350)
            cropped = img.crop(crop_box).resize((crop_w, crop_h), Image.Resampling.LANCZOS)
            crop_sheet.paste(cropped, (x, y))

            crop_draw.rectangle([x + 6, y + crop_h - 36, x + crop_w - 6, y + crop_h - 6], fill=(0, 0, 0, 200))
            crop_draw.text((x + 12, y + crop_h - 30), label, fill=(255, 220, 120) if mode == 'stone' else (140, 230, 160), font=cell_font)

    crops_out = os.path.join(ROOT, 'sheet-stone-slabs-closeup.jpg')
    crop_sheet.save(crops_out, quality=90)
    print(f"Close-up comparison sheet saved to: {crops_out}")

if __name__ == '__main__':
    main()
