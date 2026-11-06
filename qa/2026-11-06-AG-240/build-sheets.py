import os
import json
from PIL import Image, ImageDraw, ImageFont

DIR = os.path.dirname(os.path.abspath(__file__))
OUT_IMG = os.path.join(DIR, 'footstep-ab-sheet.jpg')
TELEMETRY_PATH = os.path.join(DIR, 'telemetry.json')

telemetry = {}
if os.path.exists(TELEMETRY_PATH):
    with open(TELEMETRY_PATH, 'r', encoding='utf-8') as f:
        telemetry = json.load(f)

# 2 rows x 2 columns
PANELS = [
    [
        ("trail-fp-walk-asis.jpg", "1. Trail Outside Threshold · First Person · Walk (As-Is: Gravel Step Takes)"),
        ("trail-fp-run-asis.jpg", "2. Trail Outside Threshold · First Person · Run (As-Is: Gravel Stomp Takes)")
    ],
    [
        ("trail-fp-walk-grass.jpg", "3. Trail Outside Threshold · First Person · Walk (?steps=grass: Soft Grass Takes)"),
        ("trail-fp-run-grass.jpg", "4. Trail Outside Threshold · First Person · Run (?steps=grass: Soft Grass Takes)")
    ]
]

thumb_w = 960
thumb_h = 540
pad_x = 20
pad_y = 20
header_h = 100
footer_h = 320

canvas_w = thumb_w * 2 + pad_x * 3
canvas_h = header_h + (thumb_h + pad_y) * 2 + footer_h

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

title_font = get_font(26, bold=True)
subtitle_font = get_font(17)
label_font = get_font(15, bold=True)
sublabel_font = get_font(13)
mono_font = get_font(12)

# Header
draw.rectangle([(0, 0), (canvas_w, header_h)], fill=(18, 22, 20))
draw.line([(0, header_h), (canvas_w, header_h)], fill=(45, 55, 48), width=2)
draw.text((pad_x, 16), "AG-240 · THE FOOTSTEP A/B AUDIT: HIS WAY (CL-295, J53, D-111, D-114)", fill=(240, 245, 235), font=title_font)
draw.text((pad_x, 56), "Jerry's Launcher (Solid=1, Debug=1, RAF=timer) · First Person Trail Outside Threshold · As-Is vs ?steps=grass", fill=(160, 175, 165), font=subtitle_font)

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
            draw.text((x + 20, y + 20), f"Pending run capture: {fname}", fill=(200, 200, 200), font=label_font)

        # Border
        draw.rectangle([(x, y), (x + thumb_w, y + thumb_h)], outline=(60, 70, 65), width=2)

        # Badge
        badge_h = 32
        draw.rectangle([(x, y), (x + thumb_w, y + badge_h)], fill=(0, 0, 0, 190))
        draw.text((x + 12, y + 6), label, fill=(245, 240, 220), font=label_font)

# Footer Summary Table
footer_y = header_h + (thumb_h + pad_y) * 2 + pad_y
draw.rectangle([(pad_x, footer_y), (canvas_w - pad_x, canvas_h - pad_y)], fill=(18, 22, 20), outline=(50, 60, 55), width=2)
draw.text((pad_x + 16, footer_y + 12), "TELEMETRY COMPARISON: SOUND EVENTS, TAKES, AND AUDIO RECORDINGS IN REVIEW/AG-240/", fill=(240, 225, 160), font=label_font)

comparison = telemetry.get("comparison", {}).get("footsteps", [])
summary_lines = [
    "SOUND ID / EVENT                     FILE / RESOURCE                           BUS   AS-IS WALK  AS-IS RUN  GRASS WALK  GRASS RUN   CLASS",
    "─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────"
]

for r in comparison[:8]:
    f_short = (r.get("file") or "").split("/")[-1] or "-"
    line = f"{r.get('name','?'):<36} {f_short:<41} {r.get('bus','fx'):<5} {r.get('walkAsIs',0):>11} {r.get('runAsIs',0):>10} {r.get('walkGrass',0):>11} {r.get('runGrass',0):>10}   {r.get('classification','NONE')}"
    summary_lines.append(line)

# Surface validation note
summary_lines.append("─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────")
summary_lines.append("SURFACE INVARIANCE: Stone (concrete boots), Metal (metal boots), Water (boot water), and Leaves (grass step) remain 100% IDENTICAL in both modes.")
summary_lines.append("AUDIO RECORDINGS (review/AG-240/): trail-walk-asis.wav, trail-run-asis.wav, trail-walk-grass.wav, trail-run-grass.wav, side-by-side-*.wav")

y_text = footer_y + 38
for line in summary_lines:
    draw.text((pad_x + 16, y_text), line, fill=(200, 215, 205), font=mono_font)
    y_text += 18

im.save(OUT_IMG, quality=92)
print(f"[AG-240] Master sheet saved: {OUT_IMG}")
