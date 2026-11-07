# qa/2026-11-06-AG-246/build-sheets.py
# Composite contact sheet builder for Task AG-246: Two Trucks for the Hikers' Camp
import json
import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(".")
OUT_DIR = ROOT / "qa/2026-11-06-AG-246"

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
            "file": "truck-01-convoy-escort.jpg",
            "title": "1. CONVOY ESCORT TRUCK IN DITCH (WINCH ON BUMPER)",
            "subtitle": "Medical convoy behind ambulance | PGB cargo truck tilted in ditch | Front-bumper winch with drum & remote",
            "badge": "ESCORT (WINCH ON BUMPER)",
            "badge_color": (60, 90, 140)
        },
        {
            "file": "truck-02-convoy-winch-taken.jpg",
            "title": "2. ESCORT TRUCK WINCH REMOVED (RECOVERED BY PLAYER)",
            "subtitle": "Player takes winch (E) | Winch comes off front bumper plate | Key in hand for hikers' camp",
            "badge": "WINCH RECOVERED",
            "badge_color": (160, 50, 40)
        },
        {
            "file": "truck-03-hikers-crashed.jpg",
            "title": "3. CRASHED TRUCK ACROSS HIKERS' TRAIL MOUTH",
            "subtitle": "Nose-first into tree ring | Crumpled hood, shattered glass, bent bumper with winch mounting point",
            "badge": "TRAIL BLOCKED",
            "badge_color": (180, 120, 30)
        },
        {
            "file": "truck-04-hikers-winched.jpg",
            "title": "4. TRUCK WINCHED CLEAR (TRAIL 100% CLEAR)",
            "subtitle": "Winch bolted & cable tied to tree | Dragged clear beside trail (w=1.00) | Full entrance open into camp",
            "badge": "WINCHED CLEAR (OPEN)",
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
    draw.text((margin, 16), "AG-246: TWO TRUCKS FOR THE HIKERS' CAMP", font=title_font, fill=(240, 244, 240))
    header_desc = (
        "Order D-116 | RTX 5080 WebGPU (1080p, Noon Daylight) | game/story-trucks.js: buildEscortTruck() & buildCrashedTruck()\n"
        "Convoy Escort Truck with Removable Bumper Winch | Crashed Truck with Winch Mount, Line Attachment, & Winch Drag"
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
    footer_text = "Grave Shift / Antigravity AG-246 · Hardware verification report: handoffs/2026-11-06-antigravity-AG-246.md"
    draw.text((margin, foot_y), footer_text, font=sub_font, fill=(100, 115, 110))

    out_sheet_path = OUT_DIR / "trucks-sheet.jpg"
    sheet.save(out_sheet_path, "JPEG", quality=92)
    print(f"[Python] Composite sheet saved: {out_sheet_path} ({total_w}x{total_h})")

if __name__ == "__main__":
    main()
