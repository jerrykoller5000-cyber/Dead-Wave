import os
import json
from PIL import Image, ImageDraw, ImageFont

DIR = os.path.dirname(os.path.abspath(__file__))
OUT_IMG = os.path.join(DIR, 'chain-sound-audit-sheet.jpg')
TELEMETRY_PATH = os.path.join(DIR, 'telemetry.json')

telemetry = {}
if os.path.exists(TELEMETRY_PATH):
    with open(TELEMETRY_PATH, 'r', encoding='utf-8') as f:
        telemetry = json.load(f)

# 4 rows x 2 columns
PANELS = [
    [
        ("tg-fp-walk.jpg", "1. Training Ground · First Person · Walk (20s)"),
        ("tg-fp-run.jpg", "2. Training Ground · First Person · Run (20s)")
    ],
    [
        ("tg-tp-walk.jpg", "3. Training Ground · Third Person · Walk (20s)"),
        ("tg-tp-run.jpg", "4. Training Ground · Third Person · Run (20s)")
    ],
    [
        ("trail-fp-walk.jpg", "5. Trail Outside Threshold · First Person · Walk (20s)"),
        ("trail-fp-run.jpg", "6. Trail Outside Threshold · First Person · Run (20s)")
    ],
    [
        ("trail-tp-walk.jpg", "7. Trail Outside Threshold · Third Person · Walk (20s)"),
        ("trail-tp-run.jpg", "8. Trail Outside Threshold · Third Person · Run (20s)")
    ]
]

thumb_w = 960
thumb_h = 540
pad_x = 20
pad_y = 20
header_h = 100
footer_h = 240

canvas_w = thumb_w * 2 + pad_x * 3
canvas_h = header_h + (thumb_h + pad_y) * 4 + footer_h

im = Image.new("RGB", (canvas_w, canvas_h), (12, 14, 13))
draw = ImageDraw.Draw(im)

def get_font(size, bold=False):
    font_names = [
        "C:\\Windows\\Fonts\\segoeuib.ttf" if bold else "C:\\Windows\\Fonts\\segoeui.ttf",
        "C:\\Windows\\Fonts\\arialbd.ttf" if bold else "C:\\Windows\\Fonts\\arial.ttf",
    ]
    for fn in font_names:
        if os.path.exists(fn):
            try:
                return ImageFont.truetype(fn, size)
            except Exception:
                pass
    return ImageFont.load_default()

title_font = get_font(28, bold=True)
subtitle_font = get_font(18)
label_font = get_font(16, bold=True)
sublabel_font = get_font(14)
footer_font = get_font(14)
mono_font = get_font(13)

# Header
draw.rectangle([(0, 0), (canvas_w, header_h)], fill=(18, 22, 20))
draw.line([(0, header_h), (canvas_w, header_h)], fill=(45, 55, 48), width=2)
draw.text((pad_x, 18), "AG-239 · THE CHAIN SOUND AUDIT: SOUND LOG ACROSS 4 SEATS (CL-295, J53)", fill=(240, 245, 235), font=title_font)
draw.text((pad_x, 58), "Jerry's Launcher (Solid=1, Debug=1, RAF=timer) · 20s Walk + 20s Run · Training Ground vs Trail Outside Threshold (FP & TP)", fill=(160, 175, 165), font=subtitle_font)

for row_idx, row in enumerate(PANELS):
    for col_idx, (fname, label) in enumerate(row):
        fpath = os.path.join(DIR, fname)
        x = pad_x + col_idx * (thumb_w + pad_x)
        y = header_h + pad_y + row_idx * (thumb_h + pad_y)
        
        if os.path.exists(fpath):
            try:
                pimg = Image.open(fpath).convert("RGB")
                pimg = pimg.resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
                im.paste(pimg, (x, y))
            except Exception as e:
                draw.rectangle([(x, y), (x + thumb_w, y + thumb_h)], fill=(30, 20, 20))
                draw.text((x + 20, y + 20), f"Error loading {fname}: {e}", fill=(255, 100, 100), font=label_font)
        else:
            draw.rectangle([(x, y), (x + thumb_w, y + thumb_h)], fill=(25, 25, 25))
            draw.text((x + 20, y + 20), f"Missing image: {fname}", fill=(200, 200, 200), font=label_font)
            
        # Border
        draw.rectangle([(x, y), (x + thumb_w, y + thumb_h)], outline=(60, 70, 65), width=2)
        
        # Badge
        badge_h = 32
        draw.rectangle([(x, y), (x + thumb_w, y + badge_h)], fill=(0, 0, 0, 180))
        draw.text((x + 12, y + 6), label, fill=(245, 240, 220), font=label_font)

# Footer Summary Table
footer_y = header_h + (thumb_h + pad_y) * 4 + pad_y
draw.rectangle([(pad_x, footer_y), (canvas_w - pad_x, canvas_h - pad_y)], fill=(18, 22, 20), outline=(50, 60, 55), width=2)
draw.text((pad_x + 16, footer_y + 12), "TELEMETRY & LOG FINDINGS SUMMARY (Sound Events, Frequencies & Culprit Identification)", fill=(240, 225, 160), font=label_font)

tables = telemetry.get("tables", {})
summary_lines = [
    "SEAT / RUN CONDITION            SOUND NAME / FILE                                    BUS     WALK (20s)   RUN (20s)   TOTAL   CLASSIFICATION",
    "─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────"
]

def format_row(seat_label, r):
    file_short = (r.get("file") or "").split("/")[-1] or "-"
    name_str = f"{r.get('name') or '?'} <{file_short}>"[:48]
    return f"{seat_label:<32} {name_str:<50} {r.get('bus','fx'):<7} {r.get('walkCount',0):>10} {r.get('runCount',0):>11} {r.get('totalCount',0):>7}   {r.get('classification','NONE')}"

mapping = [
    ("tg_first_person", "Training Ground · First Person"),
    ("tg_third_person", "Training Ground · Third Person"),
    ("trail_first_person", "Trail Threshold · First Person"),
    ("trail_third_person", "Trail Threshold · Third Person")
]

for tkey, tlabel in mapping:
    tdata = tables.get(tkey, [])
    if tdata:
        for r in tdata[:2]: # top 2 sounds per table
            summary_lines.append(format_row(tlabel, r))
    else:
        summary_lines.append(f"{tlabel:<32} (No sound events logged)")

y_text = footer_y + 40
for line in summary_lines:
    draw.text((pad_x + 16, y_text), line, fill=(200, 215, 205), font=mono_font)
    y_text += 20

im.save(OUT_IMG, quality=92)
print(f"[AG-239] Master sheet saved: {OUT_IMG}")
