import os
from PIL import Image, ImageDraw, ImageFont

ROOT = r"C:\Users\Zero\Desktop\Tiny Trek"
OUT = os.path.join(ROOT, "qa", "2026-11-02-AG-193")
AG164 = os.path.join(ROOT, "qa", "2026-10-31-AG-164")

TILE_W, TILE_H = 480, 270
PAD = 16
HEADER_H = 75
LABEL_H = 30

rows = [
    ("Row 1: Wasp Hip & ADS Down Sights vs ?vm=0 Baseline (Jerry J4 Sight Distance)", [
        (os.path.join(OUT, "1-wasp-hip.png"), "CL-281: Wasp Hip Carry (Lower-Right Pocket, NDC 0.31, -0.58)"),
        (os.path.join(OUT, "2-wasp-ads.png"), "CL-281: Wasp ADS Sights (J4 Eye Relief 37cm, Centred (0,0))"),
        (os.path.join(OUT, "3-wasp-hip-return.png"), "CL-281: Hip Return (Smooth Spring Settle & Recovery)"),
        (os.path.join(OUT, "17-old-hip.png"), "Old 1P: ?vm=0 Hip Baseline (Buried in Chest, AG-164 1.88/5)"),
    ]),
    ("Row 2: Reload Beats 1–4 Across View Space (Jerry J5 Near-Plane Clearance)", [
        (os.path.join(OUT, "4-wasp-reload-grab.png"), "Beat 1: Grab (u=0.10, Mag Base Grasp, Min Vert 30.7cm)"),
        (os.path.join(OUT, "5-wasp-reload-pouch.png"), "Beat 2: Pouch (u=0.34, Left Hand Lower-Left Pouch)"),
        (os.path.join(OUT, "6-wasp-reload-seat.png"), "Beat 3: Seat (u=0.58, Mag Seated in Well, Zero Snag)"),
        (os.path.join(OUT, "7-wasp-reload-work.png"), "Beat 4: Work (u=0.74, Top Charging Knob Cocking Pull)"),
    ]),
    ("Row 3: Art Protocol — Four Lighting Models on RTX 5080 WebGPU", [
        (os.path.join(OUT, "8-art-noon.png"), "Art Protocol: Full Noon Daylight (Direct Sun Specular & Shading)"),
        (os.path.join(OUT, "9-art-dusk.png"), "Art Protocol: Dusk Twilight (Warm Horizon Bounce & Tone)"),
        (os.path.join(OUT, "10-art-overcast.png"), "Art Protocol: Overcast Storm (Diffuse Wet Skylight & Fog)"),
        (os.path.join(OUT, "11-art-night.png"), "Art Protocol: Night Ops (Flashlight Specular & High Contrast)"),
    ]),
    ("Row 4: Motion Dynamics & Pitch Lag Checks (Ergonomics & Freedom from Photobombs)", [
        (os.path.join(OUT, "12-motion-look-down.png"), "Motion: Look Down (Pitch -0.9, No Stowed Weapon Clip)"),
        (os.path.join(OUT, "13-motion-look-up.png"), "Motion: Look Up (Pitch +0.5, Stable Arm Grounding)"),
        (os.path.join(OUT, "14-motion-turn-sway.png"), "Motion: Yaw Turn Sway (Smooth Spring Lag & Dampening)"),
        (os.path.join(OUT, "18-old-ads.png"), "Old 1P: ?vm=0 ADS Baseline (Severe J4 Claustrophobic Zoom)"),
    ]),
    ("Row 5: Depth Compression & HQ South Wall Penetration Tests vs Baseline", [
        (os.path.join(OUT, "15-wall-hip.png"), "HQ Wall South: Hip (VM.depth=0.04 Zero Wall Penetration)"),
        (os.path.join(OUT, "16-wall-ads.png"), "HQ Wall South: ADS (Sight Picture 100% Intact at Wall)"),
        (os.path.join(OUT, "19-old-wall-hip.png"), "HQ Wall South: Old ?vm=0 (Swallowed by HQ Concrete)"),
        (os.path.join(AG164, "shots", "uzi-fp-aim.png"), "AG-164 Baseline: uzi-fp-aim (Pre-Revamp Failure)"),
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

draw.text((PAD, 18), "AG-193: CL-281 Stage 2 Wasp SMG (Uzi) Viewmodel GPU Audit (RTX 5080 WebGPU)", fill=(235, 240, 245), font=font_title)
draw.text((PAD, 48), "Jerry J4 (Sight Distance & Zoom FOV), J5 (No Near-Plane Crossing), 4 Reload Beats, Art Protocol (4 Lights) & Depth Test", fill=(170, 185, 200), font=font_lbl)

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

out_file = os.path.join(OUT, "ag193-sheet.png")
canvas.save(out_file, quality=95)
print("Saved contact sheet:", out_file, canvas.size)
