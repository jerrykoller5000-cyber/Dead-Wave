import os
from PIL import Image, ImageDraw, ImageFont

ROOT = r"C:\Users\Zero\Desktop\Tiny Trek"
OUT = os.path.join(ROOT, "qa", "2026-10-31-AG-168")
AG164 = os.path.join(ROOT, "qa", "2026-10-31-AG-164")

TILE_W, TILE_H = 480, 270
PAD = 16
HEADER_H = 70
LABEL_H = 30

rows = [
    ("Row 1: Hip & ADS — CL-281 View Gun vs ?vm=0 vs AG-164 Baseline", [
        (os.path.join(OUT, "vm-hip.png"), "CL-281: vm-hip (View Gun)"),
        (os.path.join(OUT, "old-hip.png"), "CL-281: old-hip (?vm=0)"),
        (os.path.join(AG164, "shots", "pistol-fp-hip.png"), "AG-164: pistol-fp-hip (Pre-FP_HIP_HAND)"),
        (os.path.join(OUT, "vm-ads.png"), "CL-281: vm-ads (View Gun ADS)"),
    ]),
    ("Row 2: ADS Comparison & Reload Beats 1–2 (Grab & Pouch)", [
        (os.path.join(OUT, "old-ads.png"), "CL-281: old-ads (?vm=0 ADS)"),
        (os.path.join(AG164, "shots", "pistol-fp-aim.png"), "AG-164: pistol-fp-aim"),
        (os.path.join(OUT, "vm-reload-grab.png"), "CL-281: vm-reload-grab (u=0.18)"),
        (os.path.join(OUT, "vm-reload-pouch.png"), "CL-281: vm-reload-pouch (u=0.45)"),
    ]),
    ("Row 3: Reload Beats 3–4 (Seat & Slide) vs AG-164 Reload + Look Down/Up", [
        (os.path.join(OUT, "vm-reload-seat.png"), "CL-281: vm-reload-seat (u=0.62)"),
        (os.path.join(OUT, "vm-reload-slide.png"), "CL-281: vm-reload-slide (u=0.83) [SLING CLIP]"),
        (os.path.join(AG164, "shots", "pistol-fp-reload.png"), "AG-164: pistol-fp-reload"),
        (os.path.join(OUT, "vm-look-down.png"), "CL-281: vm-look-down (pitch=-0.9) [SLING CLIP]"),
    ]),
    ("Row 4: Look Up, Turn Sway, and HQ Wall Clipping Check (View Gun vs ?vm=0)", [
        (os.path.join(OUT, "vm-look-up.png"), "CL-281: vm-look-up (pitch=+0.5)"),
        (os.path.join(OUT, "vm-turn.png"), "CL-281: vm-turn (sway)"),
        (os.path.join(OUT, "vm-wall-hip.png"), "CL-281: vm-wall-hip (Against HQ Wall - Clean)"),
        (os.path.join(OUT, "old-wall-hip.png"), "CL-281: old-wall-hip (?vm=0 Against Wall)"),
    ]),
    ("Row 5: Wall ADS, HQ Roof Shade vs Outdoor Sun, and Night 20 + NVG Goggles", [
        (os.path.join(OUT, "vm-wall-ads.png"), "CL-281: vm-wall-ads (Against HQ Wall)"),
        (os.path.join(OUT, "vm-outdoor-sun-hip.png"), "CL-281: vm-outdoor-sun-hip (Direct Sun)"),
        (os.path.join(OUT, "vm-night20-hip.png"), "CL-281: vm-night20-hip (Night 20 No NVG)"),
        (os.path.join(OUT, "vm-night20-nvg-hip.png"), "CL-281: vm-night20-nvg-hip (Night 20 NVG ON)"),
    ]),
    ("Row 6: Night 20 ADS (No NVG vs NVG ON) & AG-164 Reference Card", [
        (os.path.join(OUT, "vm-night20-ads.png"), "CL-281: vm-night20-ads (Night 20 No NVG)"),
        (os.path.join(OUT, "vm-night20-nvg-ads.png"), "CL-281: vm-night20-nvg-ads (Night 20 NVG ON)"),
        (os.path.join(AG164, "references", "ref-sidearms.png"), "AG-164: Reference Baseline (Sidearms)"),
        (os.path.join(OUT, "vm-hip-again.png"), "CL-281: vm-hip-again (Post-ADS Return)"),
    ]),
]

cols = 4
width = PAD + cols * (TILE_W + PAD)
row_h = LABEL_H + TILE_H + LABEL_H + PAD
height = HEADER_H + len(rows) * row_h + PAD

canvas = Image.new("RGB", (width, height), (18, 22, 28))
draw = ImageDraw.Draw(canvas)

try:
    font_title = ImageFont.truetype("arialbd.ttf", 24)
    font_sec = ImageFont.truetype("arialbd.ttf", 16)
    font_lbl = ImageFont.truetype("arial.ttf", 14)
except Exception:
    font_title = ImageFont.load_default()
    font_sec = ImageFont.load_default()
    font_lbl = ImageFont.load_default()

draw.text((PAD, 18), "AG-168: CL-281 Stage 1 GPU Verification — First-Person View Gun (M9 Pistol) vs ?vm=0 & AG-164", fill=(235, 240, 245), font=font_title)

y = HEADER_H
for sec_title, items in rows:
    draw.text((PAD, y), sec_title, fill=(130, 190, 250), font=font_sec)
    y += LABEL_H
    x = PAD
    for img_path, cap in items:
        if os.path.exists(img_path):
            im = Image.open(img_path).convert("RGB")
            im = im.resize((TILE_W, TILE_H), Image.Resampling.LANCZOS)
            canvas.paste(im, (x, y))
        else:
            draw.rectangle([x, y, x + TILE_W, y + TILE_H], outline=(100, 50, 50), fill=(40, 25, 25))
            draw.text((x + 20, y + 120), f"Missing: {os.path.basename(img_path)}", fill=(255, 120, 120), font=font_lbl)
        draw.text((x + 4, y + TILE_H + 4), cap, fill=(210, 215, 220), font=font_lbl)
        x += TILE_W + PAD
    y += TILE_H + LABEL_H + PAD

out_file = os.path.join(OUT, "sheet.jpg")
canvas.save(out_file, quality=92)
print("Saved contact sheet:", out_file, canvas.size)
