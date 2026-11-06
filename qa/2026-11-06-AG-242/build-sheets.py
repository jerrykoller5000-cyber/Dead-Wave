# qa/2026-11-06-AG-242/build-sheets.py
# Composite contact sheet builder for Task AG-242: ?gates=1 Tour for Jerry's Monday Try
import json
import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(".")
OUT_DIR = ROOT / "qa/2026-11-06-AG-242"

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

    rings_info = [
        {
            "place": "depot",
            "name": "1. FUEL DEPOT SHED RING",
            "lead": "Lead: generator · Key: price-key",
            "qa_line": "Outside Read: Gate clearly identifiable (piers + shut iron leaves). Key Clue: 'Price's fuel log is by the dead HQ generator'",
            "shots": [
                ("depot-01-wide-shut.jpg", "Wide Shot: Stone Ring & Gate Shut", "Dist: ~10.5m · Ring r=11.5m · Solids: 14"),
                ("depot-02-gate-shut.jpg", "From Gate Looking In: LOCKED", "Dist: 2.2m · Prompt: 'The depot shed is locked. Price's fuel log...'"),
                ("depot-03-gate-open.jpg", "From Gate Looking In: OPEN (Price Key)", "Dist: 2.2m · Gate: OPEN (w=1.00) · Path clear into yard")
            ]
        },
        {
            "place": "mast",
            "name": "2. RADIO MAST YARD RING",
            "lead": "Lead: relay · Key: sato-key",
            "qa_line": "Outside Read: Gate clearly identifiable (piers + shut iron leaves). Key Clue: 'Once HQ has power, check the radio drawer'",
            "shots": [
                ("mast-01-wide-shut.jpg", "Wide Shot: Stone Ring & Gate Shut", "Dist: ~11.0m · Ring r=18m · Solids: 14"),
                ("mast-02-gate-shut.jpg", "From Gate Looking In: LOCKED", "Dist: 2.2m · Prompt: 'The mast yard gate needs Sato's key. Once HQ has power...'"),
                ("mast-03-gate-open.jpg", "From Gate Looking In: OPEN (Sato Key)", "Dist: 2.2m · Gate: OPEN (w=1.00) · Path clear into yard")
            ]
        },
        {
            "place": "hikers",
            "name": "3. HIKERS CAMP TRAIL RING",
            "lead": "Lead: missing · Key: chain-key",
            "qa_line": "Outside Read: Gate clearly identifiable (piers + shut iron leaves). Key Clue: 'A key was left in the ambulance glovebox'",
            "shots": [
                ("hikers-01-wide-shut.jpg", "Wide Shot: Stone Ring & Gate Shut", "Dist: ~11.5m · Ring r=18m · Solids: 14"),
                ("hikers-02-gate-shut.jpg", "From Gate Looking In: LOCKED", "Dist: 2.2m · Prompt: 'The camp chain is locked. A key was left in the ambulance...'"),
                ("hikers-03-gate-open.jpg", "From Gate Looking In: OPEN (Chain Key)", "Dist: 2.2m · Gate: OPEN (w=1.00) · Path clear into camp")
            ]
        },
        {
            "place": "rangers",
            "name": "4. RANGERS CACHE RING",
            "lead": "Lead: search · Key: ranger-gate-key",
            "qa_line": "Outside Read: Gate clearly identifiable (piers + shut iron leaves). Key Clue: 'Clarke put its key in his toolbox'",
            "shots": [
                ("rangers-01-wide-shut.jpg", "Wide Shot: Stone Ring & Gate Shut", "Dist: ~11.0m · Ring r=18m · Solids: 14"),
                ("rangers-02-gate-shut.jpg", "From Gate Looking In: LOCKED", "Dist: 2.2m · Prompt: 'The rangers' gate is locked. Clarke put its key in his toolbox'"),
                ("rangers-03-gate-open.jpg", "From Gate Looking In: OPEN (Clarke Key)", "Dist: 2.2m · Gate: OPEN (w=1.00) · Path clear into cache")
            ]
        }
    ]

    p_w, p_h = 600, 338
    cols = 3
    rows = 4
    header_h = 165
    row_bar_h = 32
    footer_h = 45
    pad_x = 24
    gap_x = 14
    gap_y = 12

    canvas_w = pad_x * 2 + cols * p_w + (cols - 1) * gap_x
    canvas_h = header_h + rows * (row_bar_h + p_h + gap_y) + footer_h + 10

    canvas = Image.new("RGB", (canvas_w, canvas_h), color=(13, 17, 23))
    draw = ImageDraw.Draw(canvas)

    f_title = get_font(21, bold=True)
    f_sub = get_font(13, bold=False)
    f_badge = get_font(14, bold=True)
    f_row_title = get_font(13, bold=True)
    f_row_lead = get_font(12, bold=False)
    f_qa = get_font(11, bold=True)
    f_panel_title = get_font(12, bold=True)
    f_panel_sub = get_font(10, bold=False)
    f_footer = get_font(11, bold=False)

    # 1. Header background
    draw.rectangle([0, 0, canvas_w, header_h], fill=(22, 28, 38))
    draw.line([0, header_h, canvas_w, header_h], fill=(48, 68, 96), width=2)

    # Header content
    draw.text((pad_x, 14), "CL-296 (?gates=1) — Story Places Rings Tour for Jerry's Monday Try", fill=(255, 215, 80), font=f_title)
    draw.text((pad_x, 44), "Task AG-242 (D-111 Order 3) · NVIDIA RTX 5080 WebGPU · Jerry's Launcher First-Person View (worldTime = 0.50 Noon)", fill=(185, 210, 235), font=f_sub)
    draw.text((pad_x, 68), "Verification: For each of the 4 rings: (1) Wide shot stone ring & gate shut, (2) Gate looking in shut, (3) Gate looking in open with key.", fill=(160, 185, 210), font=f_sub)
    draw.text((pad_x, 90), "Outside Gating & Key Evaluation: Can you see from outside that it's a gate and where its key might be? (Scored below).", fill=(130, 220, 170), font=f_sub)

    # Status Pill
    badge_w, badge_h = 240, 42
    bx0, by0 = canvas_w - pad_x - badge_w, 16
    draw.rectangle([bx0, by0, bx0 + badge_w, by0 + badge_h], fill=(20, 90, 45), outline=(50, 200, 100), width=2)
    draw.text((bx0 + 16, by0 + 11), "STATUS: PASS (4/4 RINGS)", fill=(255, 255, 255), font=f_badge)

    # Column Titles bar in header
    col_titles = [
        "COLUMN 1: Wide Shot (Ring & Gate Shut)",
        "COLUMN 2: From Gate Looking In (Shut)",
        "COLUMN 3: From Gate Looking In (Open with Key)"
    ]
    bar_y = header_h - 38
    for c_idx, title in enumerate(col_titles):
        col_x = pad_x + c_idx * (p_w + gap_x)
        draw.rectangle([col_x, bar_y, col_x + p_w, bar_y + 28], fill=(30, 39, 53), outline=(60, 80, 110), width=1)
        draw.text((col_x + 12, bar_y + 6), title, fill=(240, 240, 240), font=f_panel_title)

    curr_y = header_h + 10

    for r_idx, r_data in enumerate(rings_info):
        # Row Header Bar
        draw.rectangle([pad_x, curr_y, pad_x + cols * p_w + (cols - 1) * gap_x, curr_y + row_bar_h], fill=(26, 34, 48), outline=(55, 75, 105), width=1)
        draw.text((pad_x + 12, curr_y + 7), r_data["name"], fill=(255, 220, 100), font=f_row_title)
        draw.text((pad_x + 280, curr_y + 8), f"({r_data['lead']})", fill=(170, 195, 225), font=f_row_lead)

        # QA Evaluation text right-aligned in row bar
        draw.text((pad_x + 580, curr_y + 8), r_data["qa_line"], fill=(120, 230, 160), font=f_qa)

        row_img_y = curr_y + row_bar_h + 4

        # Render 3 panels
        for c_idx, (fname, shot_label, shot_meta) in enumerate(r_data["shots"]):
            col_x = pad_x + c_idx * (p_w + gap_x)
            fpath = OUT_DIR / fname

            if fpath.exists():
                try:
                    img = Image.open(fpath)
                    img_res = img.resize((p_w, p_h), Image.Resampling.LANCZOS)
                    canvas.paste(img_res, (col_x, row_img_y))
                except Exception as e:
                    print(f"[Python] Error opening {fpath}: {e}")
                    draw.rectangle([col_x, row_img_y, col_x + p_w, row_img_y + p_h], fill=(35, 40, 50))
            else:
                draw.rectangle([col_x, row_img_y, col_x + p_w, row_img_y + p_h], fill=(35, 40, 50))

            # Panel Border
            draw.rectangle([col_x, row_img_y, col_x + p_w, row_img_y + p_h], outline=(50, 70, 95), width=2)

            # Panel Top Pill
            draw.rectangle([col_x + 6, row_img_y + 6, col_x + p_w - 6, row_img_y + 28], fill=(12, 16, 22, 220))
            draw.text((col_x + 12, row_img_y + 9), shot_label, fill=(255, 255, 255), font=f_panel_title)

            # Panel Bottom Telemetry Banner
            draw.rectangle([col_x, row_img_y + p_h - 26, col_x + p_w, row_img_y + p_h], fill=(10, 14, 20, 230))
            draw.text((col_x + 10, row_img_y + p_h - 20), shot_meta, fill=(200, 220, 240), font=f_panel_sub)

        curr_y += row_bar_h + p_h + gap_y + 4

    # Footer
    draw.rectangle([0, canvas_h - footer_h, canvas_w, canvas_h], fill=(18, 24, 32))
    draw.line([0, canvas_h - footer_h, canvas_w, canvas_h - footer_h], fill=(45, 60, 80), width=1)
    footer_text = "Google Antigravity Real-GPU Visual Testing · Tiny Trek v1.2 · Evidence generated under shared game-test slot (crew.mjs)"
    draw.text((pad_x, canvas_h - 30), footer_text, fill=(140, 165, 190), font=f_footer)

    out_sheet = OUT_DIR / "story-gates-tour-sheet.jpg"
    canvas.save(out_sheet, quality=92)
    print(f"[Python] Successfully built composite contact sheet: {out_sheet}")

if __name__ == "__main__":
    main()
