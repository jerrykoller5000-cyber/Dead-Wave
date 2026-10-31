# qa/2026-10-31-AG-166/build-sheet.py
# Generates contact sheet (sheet.jpg) for AG-166 itch.io showcase screenshots.

import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
QA_DIR = os.path.join(ROOT, "qa", "2026-10-31-AG-166")
SHOTS_DIR = os.path.join(QA_DIR, "shots")

TILES = [
    ("06-first-person-patrol", "01. First Person Patrol (GW-4 / M4)"),
    ("07-third-person-fob-defense", "02. Third Person FOB Defense"),
    ("08-trapper-path", "03. Trapper's Safe Path (4-Stone Rows)"),
    ("09-night-assault", "04. Night Assault (Night 5 Swarm)"),
    ("10-the-warrens", "05. Subterranean Warrens (The Hollows)"),
    ("11-story-hikers-camp", "06. Hikers' Campsite (Story Chain)"),
    ("12-dawn-survived", "07. Dawn Survived (Golden Morning)"),
]

def get_font(size):
    try:
        return ImageFont.truetype("arial.ttf", size)
    except Exception:
        return ImageFont.load_default()

def build_sheet():
    print("Building AG-166 7-shot itch contact sheet (sheet.jpg)...")
    tile_w = 480
    tile_h = 270
    header_h = 50
    badge_h = 26

    cols = 4
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
    draw.text((20, 14), "AG-166: NEW SCREENSHOTS FOR THE ITCH.IO PAGE (J1)", font=title_font, fill=(255, 220, 100))

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

    # Fill 8th tile with info summary
    x = 3 * tile_w
    y = header_h + 1 * tile_h
    draw.rectangle([(x, y), (x + tile_w, y + tile_h)], fill=(20, 24, 32))
    draw.rectangle([(x, y), (x + tile_w, y + tile_h)], outline=(40, 50, 65), width=1)
    draw.text((x + 20, y + 30), "Grave Shift 1.1", font=get_font(20), fill=(255, 215, 80))
    draw.text((x + 20, y + 65), "Resolution: 1920 x 1080 Full HD", font=get_font(14), fill=(180, 200, 220))
    draw.text((x + 20, y + 90), "Renderer: NVIDIA RTX 5080 (High)", font=get_font(14), fill=(180, 200, 220))
    draw.text((x + 20, y + 115), "Framed for itch.io page showcase", font=get_font(14), fill=(180, 200, 220))
    draw.text((x + 20, y + 140), "Cover image (630x500) preserved", font=get_font(14), fill=(180, 200, 220))
    draw.text((x + 20, y + 175), "Target: docs/release/itch/", font=get_font(13), fill=(130, 150, 175))

    out_sheet_path = os.path.join(QA_DIR, "sheet.jpg")
    sheet.save(out_sheet_path, "JPEG", quality=90)
    print(f"Contact sheet saved: {out_sheet_path} ({os.path.getsize(out_sheet_path):,} bytes)")

if __name__ == "__main__":
    build_sheet()
