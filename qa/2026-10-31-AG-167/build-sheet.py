# qa/2026-10-31-AG-167/build-sheet.py
# Generates master contact sheet (sheet.jpg) for AG-167 visual inspection.

import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
QA_DIR = os.path.join(ROOT, "qa", "2026-10-31-AG-167")
SHOTS_DIR = os.path.join(QA_DIR, "shots")

ROWS = [
    ("tg-standing", "Training Ground · Standing (Idle)"),
    ("tg-walking",  "Training Ground · Walking"),
    ("tg-aiming",   "Training Ground · Aiming (ADS)"),
    ("hq-standing", "FOB HQ · Standing (Idle)"),
    ("hq-walking",  "FOB HQ · Walking"),
    ("hq-aiming",   "FOB HQ · Aiming (ADS)"),
]

COLS = [
    ("front", "1. Low Front View (Feet)"),
    ("side",  "2. Low Profile / Side View"),
    ("rear3", "3. Rear 3/4 Elevated View"),
    ("live",  "4. Live 3P Gameplay View"),
]

def get_font(size):
    try:
        return ImageFont.truetype("arial.ttf", size)
    except Exception:
        return ImageFont.load_default()

def build_contact_sheet():
    print("Building AG-167 24-shot contact sheet (sheet.jpg)...")
    tile_w = 400
    tile_h = 225
    header_h = 50
    row_label_w = 260

    cols = len(COLS)
    rows = len(ROWS)

    total_w = row_label_w + cols * tile_w
    total_h = header_h + rows * tile_h

    sheet = Image.new("RGB", (total_w, total_h), (12, 14, 18))
    draw = ImageDraw.Draw(sheet)

    title_font = get_font(18)
    label_font = get_font(15)
    tile_font = get_font(13)

    # Column Headers
    draw.rectangle([(0, 0), (total_w, header_h)], fill=(22, 28, 36))
    draw.line([(0, header_h), (total_w, header_h)], fill=(64, 150, 255), width=2)
    draw.text((15, 14), "LOCATION & STANCE", font=title_font, fill=(160, 180, 210))

    for c_idx, (_, col_name) in enumerate(COLS):
        cx = row_label_w + c_idx * tile_w
        draw.line([(cx, 0), (cx, total_h)], fill=(35, 42, 54), width=1)
        draw.text((cx + 15, 14), col_name, font=title_font, fill=(255, 215, 80))

    # Rows
    for r_idx, (r_key, r_name) in enumerate(ROWS):
        ry = header_h + r_idx * tile_h
        draw.line([(0, ry), (total_w, ry)], fill=(35, 42, 54), width=1)

        # Row label background
        bg_col = (18, 22, 28) if (r_idx // 3) % 2 == 0 else (14, 17, 22)
        draw.rectangle([(0, ry), (row_label_w, ry + tile_h)], fill=bg_col)
        draw.text((15, ry + tile_h // 2 - 10), r_name, font=label_font, fill=(235, 240, 245))

        for c_idx, (c_key, _) in enumerate(COLS):
            cx = row_label_w + c_idx * tile_w
            shot_filename = f"{r_key}-{c_key}.png"
            shot_path = os.path.join(SHOTS_DIR, shot_filename)

            if os.path.exists(shot_path):
                try:
                    with Image.open(shot_path) as tile_img:
                        tile_resized = tile_img.resize((tile_w, tile_h), Image.Resampling.LANCZOS)
                        sheet.paste(tile_resized, (cx, ry))
                except Exception as e:
                    draw.rectangle([(cx, ry), (cx + tile_w, ry + tile_h)], fill=(60, 20, 20))
                    draw.text((cx + 10, ry + 10), f"ERR: {e}", font=tile_font, fill=(255, 100, 100))
            else:
                draw.rectangle([(cx, ry), (cx + tile_w, ry + tile_h)], fill=(30, 30, 30))
                draw.text((cx + 10, ry + 10), "MISSING", font=tile_font, fill=(255, 80, 80))

            # Tile border
            draw.rectangle([(cx, ry), (cx + tile_w, ry + tile_h)], outline=(25, 30, 40), width=1)
            # Caption badge
            badge_h = 22
            draw.rectangle([(cx, ry + tile_h - badge_h), (cx + tile_w, ry + tile_h)], fill=(0, 0, 0))
            draw.text((cx + 8, ry + tile_h - badge_h + 3), f"{r_key} [{c_key}]", font=tile_font, fill=(220, 225, 230))

    out_sheet_path = os.path.join(QA_DIR, "sheet.jpg")
    sheet.save(out_sheet_path, "JPEG", quality=88)
    print(f"Contact sheet saved: {out_sheet_path} ({os.path.getsize(out_sheet_path):,} bytes, {total_w}x{total_h})")

if __name__ == "__main__":
    build_contact_sheet()
