# qa/2026-11-06-AG-245/build-sheets.py
# Composite contact sheet builder for Task AG-245: Mast Yard Chain-Link Ring & Vines
import json
import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(".")
OUT_DIR = ROOT / "qa/2026-11-06-AG-245"

def get_font(size, bold=False):
    font_names = ["arialbd.ttf" if bold else "arial.ttf", "segoeui.ttf", "DejaVuSans.ttf"]
    for fn in font_names:
        try:
            return ImageFont.truetype(fn, size)
        except Exception:
            continue
    return ImageFont.load_default()

def main():
    print("[Python] Loading telemetry.json...")
    telem_path = OUT_DIR / "telemetry.json"
    telemetry = {}
    if telem_path.exists():
        with open(telem_path, "r", encoding="utf-8") as f:
            telemetry = json.load(f)

    shots_info = [
        {
            "file": "mast-fence-01-wide.jpg",
            "title": "1. WIDE VIEW: CHAIN-LINK RING & GATE",
            "subtitle": "Dist: ~11.5m | Ring r=18m | Tubular Steel Posts, Outrigger Arms & Concertina Razor Wire",
            "badge": "WIDE (SHUT)",
            "badge_color": (60, 90, 140)
        },
        {
            "file": "mast-fence-02-shut.jpg",
            "title": "2. GATE SHUT: OVERGROWN VINES (3 CHOPS NEEDED)",
            "subtitle": "Dist: 2.4m | Dense woody creepers & ivy clusters locking double gate leaves across trail",
            "badge": "SHUT (VINES LOCKED)",
            "badge_color": (160, 50, 40)
        },
        {
            "file": "mast-fence-03-cut.jpg",
            "title": "3. GATE VINES CUT (SEVERED CENTER & HANGING STRANDS)",
            "subtitle": "Dist: 2.4m | 3 Machete chops cut corridor | Pale wood cores, severed tendrils, ground debris",
            "badge": "CUT (SEVERED)",
            "badge_color": (180, 120, 30)
        },
        {
            "file": "mast-fence-04-open.jpg",
            "title": "4. GATE OPEN: LEAVES SWUNG WIDE (ENTRY CLEAR)",
            "subtitle": "Dist: 2.4m | Double gate leaves swung wide (w=1.00) | Trail & yard entrance 100% clear",
            "badge": "OPEN (SWUNG INWARD)",
            "badge_color": (40, 140, 60)
        }
    ]

    # Load 4 images
    images = []
    for s in shots_info:
        img_path = OUT_DIR / s["file"]
        if not img_path.exists():
            print(f"Error: {img_path} not found!")
            return
        im = Image.open(img_path).convert("RGB")
        images.append((im, s))

    # Grid layout: 2 rows of 2 columns
    # Panel size: 960 x 540 each
    thumb_w = 960
    thumb_h = 540
    header_h = 130
    footer_h = 50
    label_h = 58
    margin = 16

    total_w = margin * 3 + thumb_w * 2
    total_h = header_h + (thumb_h + label_h) * 2 + margin * 3 + footer_h

    sheet = Image.new("RGB", (total_w, total_h), (14, 16, 15))
    draw = ImageDraw.Draw(sheet)

    title_font = get_font(28, bold=True)
    sub_font = get_font(15, bold=False)
    panel_title_font = get_font(16, bold=True)
    panel_sub_font = get_font(13, bold=False)
    badge_font = get_font(12, bold=True)

    # Main Header
    draw.text((margin, 16), "AG-245: MAST YARD CHAIN-LINK RING & VINE-GROWN GATE", font=title_font, fill=(240, 244, 240))
    header_desc = (
        "Order D-116 | RTX 5080 WebGPU (1080p, Noon Daylight) | world/story-fence.js: buildChainLinkRing() & buildVines()\n"
        "2-Draw Chain-Link Ring (posts, rails, outrigger arms, concertina razor wire) | 2-Draw Vines (shut vs cut state)"
    )
    draw.text((margin, 52), header_desc, font=sub_font, fill=(160, 175, 170))

    # Draw divider
    draw.line([(margin, header_h - 14), (total_w - margin, header_h - 14)], fill=(45, 55, 50), width=2)

    for idx, (im, s) in enumerate(images):
        col = idx % 2
        row = idx // 2

        x = margin + col * (thumb_w + margin)
        y = header_h + row * (thumb_h + label_h + margin)

        # Resize image to panel size
        resized = im.resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
        sheet.paste(resized, (x, y))

        # Panel border
        draw.rectangle([x, y, x + thumb_w, y + thumb_h], outline=(60, 75, 70), width=1)

        # Badge in top-right of thumbnail
        badge_text = s["badge"]
        badge_w = int(draw.textlength(badge_text, font=badge_font)) + 16
        badge_h = 24
        bx0 = x + thumb_w - badge_w - 10
        by0 = y + 10
        draw.rectangle([bx0, by0, bx0 + badge_w, by0 + badge_h], fill=s["badge_color"])
        draw.text((bx0 + 8, by0 + 4), badge_text, font=badge_font, fill=(255, 255, 255))

        # Label bar beneath image
        lbl_y = y + thumb_h + 6
        draw.text((x, lbl_y), s["title"], font=panel_title_font, fill=(230, 238, 232))
        draw.text((x, lbl_y + 22), s["subtitle"], font=panel_sub_font, fill=(145, 160, 155))

    # Footer
    foot_y = total_h - footer_h + 12
    draw.line([(margin, foot_y - 8), (total_w - margin, foot_y - 8)], fill=(35, 45, 40), width=1)
    footer_text = "Grave Shift / Antigravity AG-245 · Hardware verification report: handoffs/2026-11-06-antigravity-AG-245.md"
    draw.text((margin, foot_y), footer_text, font=sub_font, fill=(100, 115, 110))

    out_sheet_path = OUT_DIR / "mast-fence-sheet.jpg"
    sheet.save(out_sheet_path, "JPEG", quality=92)
    print(f"[Python] Composite sheet saved: {out_sheet_path} ({total_w}x{total_h})")

if __name__ == "__main__":
    main()
