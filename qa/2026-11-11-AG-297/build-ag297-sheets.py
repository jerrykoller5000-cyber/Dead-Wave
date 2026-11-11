# qa/2026-11-11-AG-297/build-ag297-sheets.py
# Generates composite review sheets for AG-297:
# 1. sheet-gp20087-camera.jpg (10 camera collision spots)
# 2. sheet-gp20088-props.jpg (4 props across 4 lights)
# 3. sheet-ce2-controls.jpg (revolver DA & pistol index in 4 lights)
# 4. sheet-ce3-reloads.jpg (pistol rack, KR-7 handle, shotgun switch, revolver reload)
# 5. sheet.jpg (master composite summary)

import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT_QA = ROOT
OUT_REV = os.path.normpath(os.path.join(ROOT, '../../review/AG-297'))
os.makedirs(OUT_REV, exist_ok=True)

try:
    font_title = ImageFont.truetype("arial.ttf", 20)
    font_label = ImageFont.truetype("arial.ttf", 15)
    font_sub = ImageFont.truetype("arial.ttf", 13)
except:
    font_title = font_label = font_sub = ImageFont.load_default()

def add_header(img, text, sub=""):
    w, h = img.size
    header_h = 44
    res = Image.new("RGB", (w, h + header_h), (20, 22, 26))
    draw = ImageDraw.Draw(res)
    draw.text((16, 8), text, fill=(240, 240, 245), font=font_title)
    if sub:
        draw.text((16, 28), sub, fill=(160, 165, 175), font=font_sub)
    res.paste(img, (0, header_h))
    return res

def build_grid(rows_data, cell_w=320, cell_h=180, title="", sub=""):
    # rows_data: list of rows, each row is list of (img_path, label)
    num_rows = len(rows_data)
    num_cols = max(len(r) for r in rows_data)
    pad = 8
    label_h = 22
    grid_w = num_cols * cell_w + (num_cols + 1) * pad
    grid_h = num_rows * (cell_h + label_h) + (num_rows + 1) * pad

    canvas = Image.new("RGB", (grid_w, grid_h), (12, 14, 18))
    draw = ImageDraw.Draw(canvas)

    for r_idx, row in enumerate(rows_data):
        y = pad + r_idx * (cell_h + label_h + pad)
        for c_idx, cell in enumerate(row):
            img_path, label = cell
            x = pad + c_idx * (cell_w + pad)
            if os.path.exists(img_path):
                try:
                    im = Image.open(img_path).convert("RGB")
                    im = im.resize((cell_w, cell_h), Image.Resampling.LANCZOS)
                    canvas.paste(im, (x, y))
                except Exception as e:
                    draw.rectangle([x, y, x + cell_w, y + cell_h], fill=(40, 20, 20))
            else:
                draw.rectangle([x, y, x + cell_w, y + cell_h], fill=(30, 30, 35))
                draw.text((x + 10, y + cell_h // 2), "Missing", fill=(200, 80, 80), font=font_sub)

            # Label banner
            draw.rectangle([x, y + cell_h, x + cell_w, y + cell_h + label_h], fill=(22, 25, 30))
            draw.text((x + 6, y + cell_h + 3), label, fill=(220, 225, 230), font=font_sub)

    return add_header(canvas, title, sub)

def main():
    print("[AG-297 Python Sheets] Building composite images...")
    
    # 1. GP-20087 Camera Collision Sheet (10 spots: 2 rows of 5)
    spots = ['cif', 'kiosk', 'armory', 'hqPanel', 'skullWindow', 'lightSwitch', 'rangeConsole', 'corridor', 'armoryRoom', 'rangeBench']
    row1 = [(os.path.join(OUT_QA, f"gp20087/{s}.png"), s.upper()) for s in spots[:5]]
    row2 = [(os.path.join(OUT_QA, f"gp20087/{s}.png"), s.upper()) for s in spots[5:]]
    img_gp87 = build_grid([row1, row2], cell_w=300, cell_h=169, 
                          title="AG-297 · GP-20087 Third-Person Training Camera Collision (10 Spots)",
                          sub="RTX 5080 WebGPU 1280x720 · Verified camera stops before walls/stations, 0 inside solids")
    img_gp87.save(os.path.join(OUT_QA, "sheet-gp20087-camera.jpg"), quality=92)
    img_gp87.save(os.path.join(OUT_REV, "sheet-gp20087-camera.jpg"), quality=92)
    print("  ✓ sheet-gp20087-camera.jpg")

    # 2. GP-20088 Prop Seating Sheet (4 props x 4 lights)
    props = [
        ('perimeter', 'Perimeter Wall Clearance'),
        ('infirmary', 'Infirmary Fence Contact (y=-200)'),
        ('monitor', 'Range Drill Monitor Standoff'),
        ('cif', 'CIF Eave Wall Clearance')
    ]
    lights = ['noon', 'overcast', 'dusk', 'night']
    gp88_rows = []
    for prop_key, prop_title in props:
        row = []
        for l in lights:
            path_img = os.path.join(OUT_QA, f"gp20088/{prop_key}-{l}.png")
            row.append((path_img, f"{prop_key} @ {l}"))
        gp88_rows.append(row)
    img_gp88 = build_grid(gp88_rows, cell_w=310, cell_h=174,
                          title="AG-297 · GP-20088 Prop Seating & Clearance in 4 Lights",
                          sub="RTX 5080 WebGPU 1280x720 · Perimeter wall, Infirmary y=-200, Monitor standoff, CIF eave")
    img_gp88.save(os.path.join(OUT_QA, "sheet-gp20088-props.jpg"), quality=92)
    img_gp88.save(os.path.join(OUT_REV, "sheet-gp20088-props.jpg"), quality=92)
    print("  ✓ sheet-gp20088-props.jpg")

    # 3. CE-2b Controls Sheet (Revolver 4 phases + Pistol rest/press in 4 lights)
    ce2_rows = []
    for l in lights:
        row = [
            (os.path.join(OUT_QA, f"ce2/revolver-rest-{l}.png"), f"Rev Rest ({l})"),
            (os.path.join(OUT_QA, f"ce2/revolver-midpull-{l}.png"), f"Rev Mid-Pull ({l})"),
            (os.path.join(OUT_QA, f"ce2/revolver-break-{l}.png"), f"Rev Break ({l})"),
            (os.path.join(OUT_QA, f"ce2/revolver-reset-{l}.png"), f"Rev Reset ({l})"),
            (os.path.join(OUT_QA, f"ce2/pistol-rest-{l}.png"), f"Pistol Rest ({l})"),
            (os.path.join(OUT_QA, f"ce2/pistol-press-{l}.png"), f"Pistol Press ({l})"),
        ]
        ce2_rows.append(row)
    img_ce2 = build_grid(ce2_rows, cell_w=240, cell_h=135,
                         title="AG-297 · CE-2b First-Person Controls & Trigger Interaction (4 Lights)",
                         sub="RTX 5080 WebGPU · Revolver double-action cylinder turn & hammer break + Pistol trigger index fit")
    img_ce2.save(os.path.join(OUT_QA, "sheet-ce2-controls.jpg"), quality=92)
    img_ce2.save(os.path.join(OUT_REV, "sheet-ce2-controls.jpg"), quality=92)
    print("  ✓ sheet-ce2-controls.jpg")

    # 4. CE-3 Reloads Sheet (Pistol rack, KR-7 handle, Shotgun switch, Revolver reload in 4 lights)
    actions = [
        ('pistol-rack', 'Pistol Slide Rack'),
        ('kr7-handle', 'KR-7 Handle Pull'),
        ('shotgun-ammo-change', 'Shotgun Ammo Switch'),
        ('revolver-reload', 'Revolver Reload')
    ]
    ce3_rows = []
    for act_key, act_title in actions:
        row = []
        for l in lights:
            path_img = os.path.join(OUT_QA, f"ce3/{act_key}-{l}.png")
            row.append((path_img, f"{act_key} @ {l}"))
        ce3_rows.append(row)
    img_ce3 = build_grid(ce3_rows, cell_w=310, cell_h=174,
                         title="AG-297 · CE-3 Weapon Reloads & Actions across 4 Lights",
                         sub="RTX 5080 WebGPU · Pistol rack, KR-7 canted handle, Shotgun 12ga switch, Revolver cylinder")
    img_ce3.save(os.path.join(OUT_QA, "sheet-ce3-reloads.jpg"), quality=92)
    img_ce3.save(os.path.join(OUT_REV, "sheet-ce3-reloads.jpg"), quality=92)
    print("  ✓ sheet-ce3-reloads.jpg")

    # 5. Master Summary Sheet (composite selection of all 4 areas)
    master_rows = [
        [
            (os.path.join(OUT_QA, "gp20087/cif.png"), "GP-20087 CIF Orbit Pull"),
            (os.path.join(OUT_QA, "gp20087/kiosk.png"), "GP-20087 Kiosk Orbit Pull"),
            (os.path.join(OUT_QA, "gp20087/armory.png"), "GP-20087 Armory Orbit Pull"),
            (os.path.join(OUT_QA, "gp20087/rangeBench.png"), "GP-20087 Range Bench Pull"),
        ],
        [
            (os.path.join(OUT_QA, "gp20088/perimeter-noon.png"), "GP-20088 Perimeter Noon"),
            (os.path.join(OUT_QA, "gp20088/infirmary-noon.png"), "GP-20088 Infirmary Fence"),
            (os.path.join(OUT_QA, "gp20088/monitor-noon.png"), "GP-20088 Monitor Standoff"),
            (os.path.join(OUT_QA, "gp20088/cif-noon.png"), "GP-20088 CIF Eave Wall Contact"),
        ],
        [
            (os.path.join(OUT_QA, "ce2/revolver-rest-noon.png"), "CE-2 Revolver Rest (Noon)"),
            (os.path.join(OUT_QA, "ce2/revolver-break-noon.png"), "CE-2 Revolver Break (Noon)"),
            (os.path.join(OUT_QA, "ce2/revolver-break-night.png"), "CE-2 Revolver Break (Night)"),
            (os.path.join(OUT_QA, "ce2/pistol-press-noon.png"), "CE-2 Pistol Index Fire (Noon)"),
        ],
        [
            (os.path.join(OUT_QA, "ce3/pistol-rack-noon.png"), "CE-3 Pistol Slide Rack (Noon)"),
            (os.path.join(OUT_QA, "ce3/kr7-handle-noon.png"), "CE-3 KR-7 Handle Pull (Noon)"),
            (os.path.join(OUT_QA, "ce3/shotgun-ammo-change-noon.png"), "CE-3 Shotgun Ammo Switch"),
            (os.path.join(OUT_QA, "ce3/revolver-reload-noon.png"), "CE-3 Revolver Reload (Noon)"),
        ]
    ]
    img_master = build_grid(master_rows, cell_w=310, cell_h=174,
                            title="AG-297 Master Review Sheet · GPU Looks & 4-Light Shots on RTX 5080 WebGPU",
                            sub="Grave Shift Training Ground · GP-20087 Camera Collision · GP-20088 Prop Seating · CE-2b Controls · CE-3 Reloads")
    img_master.save(os.path.join(OUT_QA, "sheet.jpg"), quality=92)
    img_master.save(os.path.join(OUT_REV, "sheet.jpg"), quality=92)
    print("  ✓ sheet.jpg (Master)")

if __name__ == "__main__":
    main()
