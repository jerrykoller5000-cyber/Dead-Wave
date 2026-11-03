import os
import json
from PIL import Image, ImageDraw, ImageFont

ROOT = r"C:\Users\Zero\Desktop\Tiny Trek"
OUT = os.path.join(ROOT, "qa", "2026-11-02-AG-199")

TILE_W, TILE_H = 480, 270
PAD = 16
HEADER_H = 80
LABEL_H = 30

rows = [
    # Shotgun
    ("Row 1: Shotgun Hip, ADS Down Sights (Bead on Line, Stock Excluded), Return & Wall Check", [
        (os.path.join(OUT, "shotgun-1-hip.png"), "Shotgun: Hip Carry (Lower-Right Pocket, Hands on Sockets)"),
        (os.path.join(OUT, "shotgun-2-ads.png"), "Shotgun: ADS Sights (Bead Aligned, Stock Excluded)"),
        (os.path.join(OUT, "shotgun-3-hip-return.png"), "Shotgun: Hip Recovery (Spring Settle & Dampening)"),
        (os.path.join(OUT, "shotgun-15-wall-hip.png"), "Shotgun: HQ Wall South (VM.depth=0.04 Zero Clipping)"),
    ]),
    ("Row 2: Shotgun Reload Cycles (0.42s Tube Beats: Pouch, Port, Port, Pump)", [
        (os.path.join(OUT, "shotgun-4-reload-2.png"), "Beat 1: Pouch (u=0.20, Hand at Lower Pouch, Shell Grab)"),
        (os.path.join(OUT, "shotgun-5-reload-45.png"), "Beat 2: Port In (u=0.45, Shell Aligned to Loading Port)"),
        (os.path.join(OUT, "shotgun-6-reload-7.png"), "Beat 3: Port Push (u=0.70, Shell Seated into Magazine Tube)"),
        (os.path.join(OUT, "shotgun-7-reload-9.png"), "Beat 4: Pump (u=0.90, Support Hand Returned to Pump Forend)"),
    ]),
    ("Row 3: Shotgun Art Protocol - Four Lighting Models on RTX 5080 WebGPU", [
        (os.path.join(OUT, "shotgun-8-art-noon.png"), "Noon Daylight: Parkerized Steel Barrel & Matte Receiver"),
        (os.path.join(OUT, "shotgun-9-art-dusk.png"), "Dusk Twilight: Warm Evening Specular Horizon Line"),
        (os.path.join(OUT, "shotgun-10-art-overcast.png"), "Overcast Storm: Diffuse Ambient Wet Highlights"),
        (os.path.join(OUT, "shotgun-11-art-night.png"), "Night Ops: Weapon Light High-Contrast Tactical Beam"),
    ]),

    # AA-12
    ("Row 4: Breacher-12 (AA-12) Hip, ADS Sights, Return & Wall Depth Check", [
        (os.path.join(OUT, "aa12-1-hip.png"), "AA-12: Hip Carry (Drum Magazine Foot, Low Right Offset)"),
        (os.path.join(OUT, "aa12-2-ads.png"), "AA-12: ADS Sights (Top Line Clear, Stock Excluded)"),
        (os.path.join(OUT, "aa12-3-hip-return.png"), "AA-12: Hip Recovery (Recoil Spring Rest Position)"),
        (os.path.join(OUT, "aa12-15-wall-hip.png"), "AA-12: HQ Wall South (VM.depth=0.04 Zero Clipping)"),
    ]),
    ("Row 5: Breacher-12 (AA-12) Drum Reload Beats 1-4 Across View Space", [
        (os.path.join(OUT, "aa12-4-reload-2.png"), "Beat 1: Below (u=0.20, Left Hand Under Drum Latch)"),
        (os.path.join(OUT, "aa12-5-reload-45.png"), "Beat 2: Pouch (u=0.45, Fresh Drum Retrieved from Pouch)"),
        (os.path.join(OUT, "aa12-6-reload-7.png"), "Beat 3: Well (u=0.70, Drum Aligned and Seated in Magwell)"),
        (os.path.join(OUT, "aa12-7-reload-9.png"), "Beat 4: Fore (u=0.90, Support Hand Returns to Foregrip)"),
    ]),
    ("Row 6: Breacher-12 (AA-12) Art Protocol - Four Lighting Models on RTX 5080 WebGPU", [
        (os.path.join(OUT, "aa12-8-art-noon.png"), "Noon Daylight: Stamped Polymer & Steel Drum Contrast"),
        (os.path.join(OUT, "aa12-9-art-dusk.png"), "Dusk Twilight: Low-Sun Warm Rim Specular"),
        (os.path.join(OUT, "aa12-10-art-overcast.png"), "Overcast Storm: Neutral Diffuse Rain Texture"),
        (os.path.join(OUT, "aa12-11-art-night.png"), "Night Ops: Flashlight Grounding & Deep Shadowing"),
    ]),

    # Revolver
    ("Row 7: Revolver Hip, ADS Down Sights (Top Strap Notch & Front Blade), Return & Wall Check", [
        (os.path.join(OUT, "revolver-1-hip.png"), "Revolver: Hip Carry (Compact Frame, Sockets Grounded)"),
        (os.path.join(OUT, "revolver-2-ads.png"), "Revolver: ADS Sights (Blade Centred in Top-Strap Notch)"),
        (os.path.join(OUT, "revolver-3-hip-return.png"), "Revolver: Hip Recovery (Smooth ADS-to-Hip Transition)"),
        (os.path.join(OUT, "revolver-15-wall-hip.png"), "Revolver: HQ Wall South (VM.depth=0.04 Zero Clipping)"),
    ]),
    ("Row 8: Revolver Cylinder Reload Beats 1-4 Across View Space", [
        (os.path.join(OUT, "revolver-4-reload-2.png"), "Beat 1: Ejector (u=0.20, Crane Swung Out, Rod Depressed)"),
        (os.path.join(OUT, "revolver-5-reload-45.png"), "Beat 2: Loader Pouch (u=0.45, Speedloader Retrieved)"),
        (os.path.join(OUT, "revolver-6-reload-7.png"), "Beat 3: Loader Face (u=0.70, Fresh Rounds Chambered)"),
        (os.path.join(OUT, "revolver-7-reload-9.png"), "Beat 4: Crane Snap (u=0.90, Cylinder Snapped Shut, Two Hands)"),
    ]),
    ("Row 9: Revolver Art Protocol - Four Lighting Models on RTX 5080 WebGPU", [
        (os.path.join(OUT, "revolver-8-art-noon.png"), "Noon Daylight: Blued Steel Specular & Cylinder Fluting"),
        (os.path.join(OUT, "revolver-9-art-dusk.png"), "Dusk Twilight: Subtle Golden Highlight on Barrel Rib"),
        (os.path.join(OUT, "revolver-10-art-overcast.png"), "Overcast Storm: Soft Skylight on Cylindrical Faces"),
        (os.path.join(OUT, "revolver-11-art-night.png"), "Night Ops: Crisp Flashlight Rim & Shadow Grounding"),
    ]),

    # Sniper
    ("Row 10: Sniper Hip, ADS (Scope Viewmodel Blanking), Return & Wall Depth Check", [
        (os.path.join(OUT, "sniper-1-hip.png"), "Sniper: Hip Carry (Long Barrel, Scope Mounted, Hands on Sockets)"),
        (os.path.join(OUT, "sniper-2-ads.png"), "Sniper: ADS Optics (Full-Screen Scope Overlay, View Gun Hidden)"),
        (os.path.join(OUT, "sniper-3-hip-return.png"), "Sniper: Hip Recovery (Spring Dampening to Hip)"),
        (os.path.join(OUT, "sniper-15-wall-hip.png"), "Sniper: HQ Wall South (VM.depth=0.04 Zero Clipping)"),
    ]),
    ("Row 11: Sniper Magazine & Bolt Reload Beats 1-4 Across View Space", [
        (os.path.join(OUT, "sniper-4-reload-2.png"), "Beat 1: Mag Drop (u=0.20, Left Hand Under Box Mag)"),
        (os.path.join(OUT, "sniper-5-reload-45.png"), "Beat 2: Mag Pouch (u=0.45, Fresh Box Magazine Swap)"),
        (os.path.join(OUT, "sniper-6-reload-7.png"), "Beat 3: Bolt Work Pull (u=0.70, Left Hand Cycles Bolt Knob)"),
        (os.path.join(OUT, "sniper-7-reload-9.png"), "Beat 4: Bolt Work Forward (u=0.90, Bolt Locked Forward into Battery)"),
    ]),
    ("Row 12: Sniper Art Protocol - Four Lighting Models on RTX 5080 WebGPU", [
        (os.path.join(OUT, "sniper-8-art-noon.png"), "Noon Daylight: Matte Cerakote Finish & Scope Bell Lenses"),
        (os.path.join(OUT, "sniper-9-art-dusk.png"), "Dusk Twilight: Warm Low-Angle Ambient Lighting"),
        (os.path.join(OUT, "sniper-10-art-overcast.png"), "Overcast Storm: High Contrast Silhouette in Rain"),
        (os.path.join(OUT, "sniper-11-art-night.png"), "Night Ops: Focused Tactical Beam & Deep Contrast"),
    ]),

    # Motion Dynamics
    ("Row 13: Motion Dynamics Across Stage-3 (Look Down/Up Pitch Lag, Turn Sway, Wall ADS)", [
        (os.path.join(OUT, "shotgun-12-motion-look-down.png"), "Shotgun Look Down: Pitch -0.9, Zero Body Photobomb"),
        (os.path.join(OUT, "aa12-13-motion-look-up.png"), "AA-12 Look Up: Pitch +0.5, Clear View Cone"),
        (os.path.join(OUT, "revolver-14-motion-turn-sway.png"), "Revolver Yaw Sway: Smooth Angular Spring Lag"),
        (os.path.join(OUT, "sniper-16-wall-ads.png"), "Sniper Wall ADS: Zero Wall Penetration at Wall"),
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

draw.text((PAD, 18), "AG-199: CL-281 Stage 3 Four-Gun Viewmodel GPU Audit (RTX 5080 WebGPU)", fill=(235, 240, 245), font=font_title)
draw.text((PAD, 48), "Shotgun, Breacher-12, Revolver, Sniper - Sights & Stocks Excluded, J5 Near-Plane, 4 Reload Beats, Art Protocol (4 Lights) & Depth Test", fill=(170, 185, 200), font=font_lbl)

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

out_file = os.path.join(OUT, "ag199-sheet.png")
canvas.save(out_file, quality=95)
print("Saved contact sheet:", out_file, canvas.size)
