# tools/build-ag278-sheets.py
# Generates side-by-side comparison sheet for AG-278 / J104:
# Security Door Keypad flush against yellow-and-black striped door trim.

import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
QA_DIR = os.path.join(ROOT, "qa", "AG-278")
REV_DIR = os.path.join(ROOT, "review", "AG-278")
os.makedirs(QA_DIR, exist_ok=True)
os.makedirs(REV_DIR, exist_ok=True)

pairs = [
    ("01-range-door-overview.png", "Range Side: Overview (Door & Keypad)"),
    ("02-range-keypad-closeup.png", "Range Side: Close-Up (Keypad Flush on Trim)"),
    ("03-build-door-overview.png", "Build Room Side: Overview (Door & Keypad)"),
    ("04-build-keypad-closeup.png", "Build Room Side: Close-Up (Keypad Flush on Trim)"),
    ("05-door-shutter-toggled.png", "Door Interaction: Shutter Open / Closed Toggle"),
]

thumb_w = 960
thumb_h = 540
header_h = 70
row_label_h = 35

total_w = thumb_w * 2 + 30
total_h = header_h + len(pairs) * (thumb_h + row_label_h + 20) + 30

sheet = Image.new("RGB", (total_w, total_h), (24, 26, 28))
draw = ImageDraw.Draw(sheet)

# Header
draw.rectangle([(0, 0), (total_w, header_h)], fill=(16, 18, 20))
draw.text((30, 15), "AG-278 / J104: Security Door Keypad Flush on Yellow & Black Trim", fill=(240, 200, 30))
draw.text((30, 42), "Hardware: NVIDIA GeForce RTX 5080 (WebGPU) · Left: BEFORE (Displaced onto wall) · Right: AFTER (Flush on Door Trim)", fill=(180, 190, 200))

y_cur = header_h + 15

for fname, title in pairs:
    p_before = os.path.join(QA_DIR, f"before-{fname}")
    p_after = os.path.join(QA_DIR, f"after-{fname}")

    # Row label
    draw.rectangle([(15, y_cur), (total_w - 15, y_cur + row_label_h)], fill=(32, 36, 40))
    draw.text((25, y_cur + 8), title, fill=(255, 255, 255))
    y_cur += row_label_h + 8

    # Images
    if os.path.exists(p_before):
        img_b = Image.open(p_before).convert("RGB").resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
        sheet.paste(img_b, (15, y_cur))
        d_b = ImageDraw.Draw(sheet)
        d_b.rectangle([(20, y_cur + 10), (140, y_cur + 36)], fill=(180, 40, 30))
        d_b.text((28, y_cur + 14), "BEFORE", fill=(255, 255, 255))

    if os.path.exists(p_after):
        img_a = Image.open(p_after).convert("RGB").resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
        sheet.paste(img_a, (thumb_w + 25, y_cur))
        d_a = ImageDraw.Draw(sheet)
        d_a.rectangle([(thumb_w + 30, y_cur + 10), (thumb_w + 140, y_cur + 36)], fill=(30, 160, 60))
        d_a.text((thumb_w + 38, y_cur + 14), "AFTER", fill=(255, 255, 255))

    y_cur += thumb_h + 16

out_qa = os.path.join(QA_DIR, "ag278-keypad-comparison-sheet.jpg")
out_rev = os.path.join(REV_DIR, "ag278-keypad-comparison-sheet.jpg")

sheet.save(out_qa, "JPEG", quality=92)
sheet.save(out_rev, "JPEG", quality=92)
print(f"[AG-278] Generated comparison sheet: {out_qa} ({os.path.getsize(out_qa)} bytes)")
