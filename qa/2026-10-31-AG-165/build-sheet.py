# qa/2026-10-31-AG-165/build-sheet.py
# Generates contact sheet (sheet.jpg) for AG-165 visual verification.

import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
QA_DIR = os.path.join(ROOT, "qa", "2026-10-31-AG-165")
SHOTS_DIR = os.path.join(QA_DIR, "shots")

TILES = [
    ("01-trapper-gate", "01. Yard Gate Entrance (4-Stone Rows)"),
    ("02-trapper-overhead-rows", "02. Overhead Layout (32 Stones & Posts)"),
    ("03-cellar-back-sealed", "03. Cellar Back Half Enclosure (Sealed)"),
    ("04-rear-clipping-blocked", "04. Rear Clipping Blocked (Colliders)"),
    ("05-cellar-doors-open", "05. Cellar Bulkhead Doors Unlocked"),
    ("06-inside-cellar", "06. Inside Iron-Lined Cellar"),
]

def get_font(size):
    try:
        return ImageFont.truetype("arial.ttf", size)
    except Exception:
        return ImageFont.load_default()

def build_sheet():
    print("Building AG-165 6-shot contact sheet (sheet.jpg)...")
    tile_w = 480
    tile_h = 270
    header_h = 50
    badge_h = 26

    cols = 3
    rows = 2

    total_w = cols * tile_w
    total_h = header_h + rows * tile_h

    sheet = Image.new("RGB", (total_w, total_h), (14, 16, 20))
    draw = ImageDraw.Draw(sheet)

    title_font = get_font(18)
    tile_font = get_font(14)

    # Header
    draw.rectangle([(0, 0), (total_w, header_h)], fill=(24, 30, 40))
    draw.line([(0, header_h), (total_w, header_h)], fill=(64, 150, 255), width=2)
    draw.text((20, 14), "AG-165: THE TRAPPER'S PATH, SEALED AND WIDER (J45)", font=title_font, fill=(255, 220, 100))

    for idx, (stem, label) in enumerate(TILES):
        c = idx % cols
        r = idx // cols
        x = c * tile_w
        y = header_h + r * tile_h

        shot_path = os.path.join(SHOTS_DIR, f"{stem}.png")
        if os.path.exists(shot_path):
            try:
                with Image.open(shot_path) as im:
                    im_resized = im.resize((tile_w, tile_h), Image.Resampling.LANCZOS)
                    sheet.paste(im_resized, (x, y))
            except Exception as e:
                draw.rectangle([(x, y), (x + tile_w, y + tile_h)], fill=(50, 20, 20))
                draw.text((x + 10, y + 10), f"ERR: {e}", font=tile_font, fill=(255, 100, 100))
        else:
            draw.rectangle([(x, y), (x + tile_w, y + tile_h)], fill=(30, 30, 30))
            draw.text((x + 10, y + 10), f"MISSING: {stem}.png", font=tile_font, fill=(255, 80, 80))

        # Tile outline
        draw.rectangle([(x, y), (x + tile_w, y + tile_h)], outline=(40, 50, 65), width=1)

        # Badge
        draw.rectangle([(x, y + tile_h - badge_h), (x + tile_w, y + tile_h)], fill=(0, 0, 0, 200))
        draw.text((x + 10, y + tile_h - badge_h + 5), label, font=tile_font, fill=(240, 245, 250))

    out_sheet_path = os.path.join(QA_DIR, "sheet.jpg")
    sheet.save(out_sheet_path, "JPEG", quality=90)
    print(f"Contact sheet saved: {out_sheet_path} ({os.path.getsize(out_sheet_path):,} bytes)")

if __name__ == "__main__":
    build_sheet()
