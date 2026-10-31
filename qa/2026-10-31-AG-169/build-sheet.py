import os
from PIL import Image, ImageDraw, ImageFont

ROOT = r"C:\Users\Zero\Desktop\Tiny Trek"
OUT = os.path.join(ROOT, "qa", "2026-10-31-AG-169")

TILE_W, TILE_H = 480, 270
PAD = 14
HEADER_H = 60
SECTION_H = 28
LABEL_H = 26

rows = [
    ("GP-19987: Day-1 Fuel Pump Gate & READY Briefing Tracked Objective", [
        (os.path.join(OUT, "gp19987-fuel-closed-hold-e.png"), "Lead Closed: Hold E -> Fill 0, No Prompt"),
        (os.path.join(OUT, "gp19987-fuel-open-hold-e.png"), "Lead Open: Hold E -> Fill Advances (Prompt OK)"),
        (os.path.join(OUT, "gp19987-ready-desktop.png"), "READY Briefing (Desktop): Tracked Objective in Report"),
        (os.path.join(OUT, "gp19987-ready-narrow-390.png"), "READY Briefing (390px): Clean Mobile Layout"),
    ]),
    ("GP-19988: Backwards Ballcap + Balaclava Fit (Noon Sun Closeups)", [
        (os.path.join(OUT, "gp19988-cap-noon-front.png"), "Front: Forehead Band Clears Balaclava (3-9mm)"),
        (os.path.join(OUT, "gp19988-cap-noon-back.png"), "Rear: Backwards Curved Bill & Eyelets"),
        (os.path.join(OUT, "gp19988-cap-noon-left.png"), "Left Profile: Crown Contour & Hemline"),
        (os.path.join(OUT, "gp19988-cap-noon-right.png"), "Right Profile: Zero Clipping / Flush Seams"),
    ]),
    ("GP-19988: Backwards Cap Top View, 4 Lighting Conditions & Gameplay Scale", [
        (os.path.join(OUT, "gp19988-cap-noon-top.png"), "Top View: 6-Panel Seams & Crown Button"),
        (os.path.join(OUT, "gp19988-cap-overcast-3q.png"), "Overcast Diffuse Light (Rain=0.85)"),
        (os.path.join(OUT, "gp19988-cap-dusk-3q.png"), "Dusk Warm Horizon Light"),
        (os.path.join(OUT, "gp19988-cap-night-3q.png"), "Night Ambient / Moonlight"),
    ]),
    ("GP-19988: Brute Get-Up 6-Frame Filmstrip (Beats 1 to 3) & Gameplay Scale", [
        (os.path.join(OUT, "gp19988-cap-noon-gameplay.png"), "Gameplay 3P Scale: Silhouette Read"),
        (os.path.join(OUT, "gp19988-brute-getup-1-down-palms.png"), "Beat 1 (u=0.02): Prone on Planted Palms"),
        (os.path.join(OUT, "gp19988-brute-getup-2-knee-under.png"), "Beat 2 (u=0.35): Left Knee Drawn Under"),
        (os.path.join(OUT, "gp19988-brute-getup-3-two-arm-push.png"), "Beat 3 (u=0.55): Chest Pushing High"),
    ]),
    ("GP-19988: Brute Get-Up 6-Frame Filmstrip (Beats 4 to 6) & CIF 1x Open", [
        (os.path.join(OUT, "gp19988-brute-getup-4-hip-rise.png"), "Beat 4 (u=0.70): Hips Rising, Head Lagging"),
        (os.path.join(OUT, "gp19988-brute-getup-5-head-lag.png"), "Beat 5 (u=0.86): Rising to Balance"),
        (os.path.join(OUT, "gp19988-brute-getup-6-recovered.png"), "Beat 6 (u=1.00): Recovered Standing (Zero Pop)"),
        (os.path.join(OUT, "gp19989-cif-open-1x.png"), "GP-19989: CIF Canvas Initial Open (1.0x Full)"),
    ]),
    ("GP-19989: CIF Canvas Zoom (1-2.5x Clamps, Item Reframing, Reopen Reset & Mobile)", [
        (os.path.join(OUT, "gp19989-cif-zoom-2.5x.png"), "CIF Wheel Zoom to 2.5x Upper Clamp"),
        (os.path.join(OUT, "gp19989-cif-switch-cap-2.5x.png"), "Item Switch (Cap): Head Framed at 2.5x"),
        (os.path.join(OUT, "gp19989-cif-reopen-reset-1p.png"), "Reopen from 1P: Zoom Eased Back to 1.0x"),
        (os.path.join(OUT, "gp19989-cif-narrow-390-zoom.png"), "CIF Mobile 390px Viewport (No Overflow)"),
    ]),
    ("GP-19989: Armory Workbench Zoom (Eased 1-2.5x, 390px Narrow & Gun Switch Reset)", [
        (os.path.join(OUT, "gp19989-wb-open-1x.png"), "Workbench Open (1.0x Full Weapon View)"),
        (os.path.join(OUT, "gp19989-wb-zoom-2.5x.png"), "Workbench Wheel Zoom to 2.5x Clamp"),
        (os.path.join(OUT, "gp19989-wb-narrow-390-zoom.png"), "Workbench Mobile 390px Viewport"),
        (os.path.join(OUT, "gp19989-wb-reopen-reset.png"), "Gun Switch / Reopen: Clean 1.0x Reset"),
    ]),
]

cols = 4
num_rows = len(rows)
width = PAD * (cols + 1) + TILE_W * cols
height = HEADER_H + num_rows * (SECTION_H + TILE_H + LABEL_H + PAD) + PAD

canvas = Image.new("RGB", (width, height), (17, 24, 20))
draw = ImageDraw.Draw(canvas)

try:
    font_title = ImageFont.truetype("arialbd.ttf", 24)
    font_sec = ImageFont.truetype("arialbd.ttf", 15)
    font_lbl = ImageFont.truetype("arial.ttf", 13)
except Exception:
    font_title = font_sec = font_lbl = None

draw.text((PAD, 14), "AG-169 GPU Validation & Evidence Sheet — GP-19987, GP-19988, GP-19989", fill=(235, 230, 210), font=font_title)
draw.text((PAD, 38), "RTX 5080 WebGPU native | Antigravity | All checks PASS (Zero errors, t307 6/0, zero clipping)", fill=(160, 185, 150), font=font_lbl)

y = HEADER_H
for sec_title, tiles in rows:
    draw.rectangle([PAD, y, width - PAD, y + SECTION_H], fill=(30, 42, 33))
    draw.text((PAD + 10, y + 5), sec_title, fill=(225, 215, 175), font=font_sec)
    y += SECTION_H + 6

    for c, (img_path, label) in enumerate(tiles):
        x = PAD + c * (TILE_W + PAD)
        tile_box = [x, y, x + TILE_W, y + TILE_H]
        draw.rectangle(tile_box, fill=(10, 15, 12), outline=(55, 75, 60))

        if os.path.exists(img_path):
            try:
                with Image.open(img_path) as im:
                    im_copy = im.copy()
                    im_copy.thumbnail((TILE_W - 4, TILE_H - 4), Image.Resampling.LANCZOS)
                    ox = x + (TILE_W - im_copy.width) // 2
                    oy = y + (TILE_H - im_copy.height) // 2
                    canvas.paste(im_copy, (ox, oy))
            except Exception as e:
                draw.text((x + 8, y + 20), f"Error: {e}", fill=(240, 80, 80), font=font_lbl)
        else:
            draw.text((x + 8, y + 20), f"Missing: {os.path.basename(img_path)}", fill=(240, 80, 80), font=font_lbl)

        lbl_y = y + TILE_H + 3
        draw.rectangle([x, lbl_y, x + TILE_W, lbl_y + LABEL_H - 4], fill=(22, 30, 24))
        draw.text((x + 6, lbl_y + 4), label, fill=(205, 220, 200), font=font_lbl)

    y += TILE_H + LABEL_H + PAD

out_path = os.path.join(OUT, "sheet.jpg")
canvas.save(out_path, quality=90)
print(f"Saved {out_path} ({width}x{height})")
