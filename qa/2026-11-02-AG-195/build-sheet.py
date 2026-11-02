import os
import json
from PIL import Image, ImageDraw, ImageFont

ROOT = r"C:\Users\Zero\Desktop\Tiny Trek"
OUT = os.path.join(ROOT, "qa", "2026-11-02-AG-195")

TILE_W, TILE_H = 480, 270
PAD = 16
HEADER_H = 80
LABEL_H = 30

rows = [
    ("Row 1: GW-4 (M4) Hip, ADS Down Sights (J10 Centred Red Dot), Recovery & Wall Depth Check", [
        (os.path.join(OUT, "m4-1-hip.png"), "GW-4: Hip Carry (Lower-Right Pocket, Hands on Sockets)"),
        (os.path.join(OUT, "m4-2-ads.png"), "GW-4: ADS Sights (J10 Red Dot Centred, Stock Hidden)"),
        (os.path.join(OUT, "m4-3-hip-return.png"), "GW-4: Hip Recovery (Spring Settle & Dampening)"),
        (os.path.join(OUT, "m4-15-wall-hip.png"), "GW-4: HQ Wall South (VM.depth=0.04 Zero Clipping)"),
    ]),
    ("Row 2: GW-4 (M4) Reload Beats 1-4 Across View Space (Jerry J5 Near-Plane Clearance)", [
        (os.path.join(OUT, "m4-4-reload-grab.png"), "Beat 1: Grab (u=0.12, Mag Well Contact, Palm Support)"),
        (os.path.join(OUT, "m4-5-reload-pouch.png"), "Beat 2: Pouch (u=0.35, Mag Swap, Left Hand at Pouch)"),
        (os.path.join(OUT, "m4-6-reload-seat.png"), "Beat 3: Seat (u=0.62, Mag Seated in Well, Zero Snag)"),
        (os.path.join(OUT, "m4-7-reload-work.png"), "Beat 4: Work (u=0.78, Charging Handle Bolt Work Pull)"),
    ]),
    ("Row 3: GW-4 (M4) Art Protocol - Four Lighting Models on RTX 5080 WebGPU", [
        (os.path.join(OUT, "m4-8-art-noon.png"), "Noon Daylight: Anodized Upper/Lower & M-LOK Specular"),
        (os.path.join(OUT, "m4-9-art-dusk.png"), "Dusk Twilight: Warm Horizon Amber Glint"),
        (os.path.join(OUT, "m4-10-art-overcast.png"), "Overcast Storm: Diffuse Wet Sky & Atmospheric Fog"),
        (os.path.join(OUT, "m4-11-art-night.png"), "Night Ops: Tactical Weapon Light High-Contrast Beam"),
    ]),
    ("Row 4: KR-7 (AK) Hip, ADS Down Sights (Leaf Notch & Hooded Post Centred), Recovery & Wall Depth", [
        (os.path.join(OUT, "ak-1-hip.png"), "KR-7: Hip Carry (Lower-Right Pocket, Wood Furniture)"),
        (os.path.join(OUT, "ak-2-ads.png"), "KR-7: ADS Sights (Rear Leaf Notch & Front Hood Post Centred)"),
        (os.path.join(OUT, "ak-3-hip-return.png"), "KR-7: Hip Recovery (Spring Settle & Recovery)"),
        (os.path.join(OUT, "ak-15-wall-hip.png"), "KR-7: HQ Wall South (VM.depth=0.04 Zero Penetration)"),
    ]),
    ("Row 5: KR-7 (AK) Reload Beats 1-4 (Rock-Out, Pouch, Rock-In, Right-Side Work Rack)", [
        (os.path.join(OUT, "ak-4-reload-grab.png"), "Beat 1: Grab/Rock-Out (u=0.12, Paddle & Mag Rock-Out)"),
        (os.path.join(OUT, "ak-5-reload-pouch.png"), "Beat 2: Pouch (u=0.35, Left Hand Lower-Left Pouch)"),
        (os.path.join(OUT, "ak-6-reload-seat.png"), "Beat 3: Rock-In (u=0.62, Mag Rock-In Arc 0.27 rad)"),
        (os.path.join(OUT, "ak-7-reload-work.png"), "Beat 4: Work (u=0.79, Right Carrier Handle Cocking Rack)"),
    ]),
    ("Row 6: KR-7 (AK) Art Protocol - Four Lighting Models on RTX 5080 WebGPU", [
        (os.path.join(OUT, "ak-8-art-noon.png"), "Noon Daylight: Stamped Steel & Wood Handguard Tone"),
        (os.path.join(OUT, "ak-9-art-dusk.png"), "Dusk Twilight: Warm Evening Horizon Specular"),
        (os.path.join(OUT, "ak-10-art-overcast.png"), "Overcast Storm: Muted Metal & Matte Wood Reflections"),
        (os.path.join(OUT, "ak-11-art-night.png"), "Night Ops: Flashlight Illumination & Shadow Grounding"),
    ]),
    ("Row 7: Motion Dynamics & Pitch Lag Checks (Ergonomics, Zero Photobombs, Free Elbows)", [
        (os.path.join(OUT, "m4-12-motion-look-down.png"), "GW-4: Look Down (Pitch -0.9, No Body Clipping)"),
        (os.path.join(OUT, "m4-13-motion-look-up.png"), "GW-4: Look Up (Pitch +0.5, Stable Arm Grounding)"),
        (os.path.join(OUT, "ak-12-motion-look-down.png"), "KR-7: Look Down (Pitch -0.9, Clear View Cone)"),
        (os.path.join(OUT, "ak-13-motion-look-up.png"), "KR-7: Look Up (Pitch +0.5, Clear Frustum)"),
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
    font_lbl = ImageFont.truetype("arial.ttf", 13)
except Exception:
    font_title = ImageFont.load_default()
    font_sec = ImageFont.load_default()
    font_lbl = ImageFont.load_default()

draw.text((PAD, 18), "AG-195: CL-281 Stage 2 GW-4 & KR-7 Viewmodel GPU Audit (RTX 5080 WebGPU)", fill=(235, 240, 245), font=font_title)
draw.text((PAD, 48), "Jerry J4/J10 (Centred Sights & Eye Relief), J5 (No Near-Plane Crossing), 4 Reload Beats, AK Rock-In, Art Protocol (4 Lights) & Depth Test", fill=(170, 185, 200), font=font_lbl)

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

out_file = os.path.join(OUT, "ag195-sheet.png")
canvas.save(out_file, quality=95)
print("Saved contact sheet:", out_file, canvas.size)
