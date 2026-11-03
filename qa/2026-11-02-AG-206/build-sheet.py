import os
import json
from PIL import Image, ImageDraw, ImageFont

ROOT = r"C:\Users\Zero\Desktop\Tiny Trek"
OUT = os.path.join(ROOT, "qa", "2026-11-02-AG-206")
SHOTS = os.path.join(OUT, "shots")
J57 = os.path.join(OUT, "j57-settle")

TILE_W, TILE_H = 480, 270
PAD = 12
HEADER_H = 70
LABEL_H = 26

def get_font(size):
    try:
        return ImageFont.truetype("arial.ttf", size)
    except:
        return ImageFont.load_default()

font_title = get_font(20)
font_section = get_font(14)
font_label = get_font(11)

def build_j57_sheet():
    beats = [
        ("revolver-hip.jpg", "Revolver: Hip Carry (Woods Trail, Neutral Grounding)"),
        ("revolver-ads.jpg", "Revolver: ADS Down Sights (Blade Centred in Top-Strap Notch)"),
        ("revolver-reload-out.jpg", "Revolver: Reload Beat 1 (u=0.22, Cylinder Swings SCREEN-LEFT)"),
        ("revolver-reload-in.jpg", "Revolver: Reload Beat 2 (u=0.58, Speedloader Aligned to Cylinder)"),
        ("revolver-reload-home.jpg", "Revolver: Reload Beat 3 (u=0.82, Cylinder Latched Home)")
    ]

    cols = len(beats)
    width = cols * TILE_W + (cols + 1) * PAD
    height = HEADER_H + TILE_H + LABEL_H + PAD * 2

    im = Image.new("RGB", (width, height), (18, 20, 24))
    draw = ImageDraw.Draw(im)

    draw.text((PAD, 12), "GP-20016 / J57 REVOLVER REAL-TIME GPU SETTLE VERIFICATION", fill=(240, 240, 240), font=font_title)
    draw.text((PAD, 40), "Real-time settle before capture • Cylinder swings Screen-Left toward support palm • Front sight blade visible in ADS", fill=(160, 175, 190), font=font_section)

    y = HEADER_H + PAD
    for i, (fname, label) in enumerate(beats):
        fpath = os.path.join(J57, fname)
        x = PAD + i * (TILE_W + PAD)
        if os.path.exists(fpath):
            with Image.open(fpath) as tile:
                tile_resized = tile.resize((TILE_W, TILE_H), Image.Resampling.LANCZOS)
                im.paste(tile_resized, (x, y))
        else:
            draw.rectangle([x, y, x + TILE_W, y + TILE_H], fill=(40, 40, 40))
            draw.text((x + 20, y + 100), f"Missing: {fname}", fill=(255, 100, 100), font=font_label)

        draw.rectangle([x, y + TILE_H, x + TILE_W, y + TILE_H + LABEL_H], fill=(28, 32, 38))
        draw.text((x + 6, y + TILE_H + 6), label, fill=(220, 220, 220), font=font_label)

    out_path = os.path.join(OUT, "sheet-j57-settle.jpg")
    im.save(out_path, quality=90)
    print(f"[Build Sheet] Saved {out_path} ({width}x{height})")

def build_outdoor_sheet():
    weapons = [
        ("revolver", "Revolver (J57 Sights & Left Cylinder Swing)"),
        ("chainsaw", "Chainsaw (22 Moving Teeth & Centered Bar)"),
        ("minigun", "Minigun (Underside Support Bearing Wrist)"),
        ("flamer", "Flamer (Low-Right Nozzle & Tank Reload)"),
        ("launcher", "Launcher (0.60m ADS Eye Relief & Leaf/Post Sight)")
    ]

    lights = ["noon", "overcast", "dusk", "night"]
    light_labels = ["Noon Daylight", "Overcast Storm", "Dusk Twilight", "Night Ops"]

    # Each weapon has 1 row with 4 columns (Hip across 4 lights) and 1 row for ADS & Reload
    # Let's do 5 rows (1 row per weapon), each row having 4 columns: Noon Hip, Overcast Hip, Dusk ADS, Night Reload/ADS!
    # Or better: 4 columns = [Noon Hip, Overcast Hip, Dusk ADS, Night Ops (ADS/Reload)]
    # Or 8 columns / 2 rows per weapon. Let's do 4 columns: Noon Hip, Overcast Hip, Dusk ADS, Night Ops ADS!
    # That gives a clear comparison of all 5 weapons across all 4 lights!

    cols = 4
    width = cols * TILE_W + (cols + 1) * PAD
    # 5 weapons * 2 rows = 10 rows
    # Row 1: Hip in Noon, Overcast, Dusk, Night
    # Row 2: ADS in Noon, Overcast, Dusk, and Reload in Night
    rows_total = len(weapons) * 2
    height = HEADER_H + rows_total * (TILE_H + LABEL_H + PAD) + PAD

    im = Image.new("RGB", (width, height), (16, 18, 22))
    draw = ImageDraw.Draw(im)

    draw.text((PAD, 12), "GP-20016 FIRST-PERSON PASS: OUTDOOR FOUR-LIGHT VISUAL GATE (WOODS-TRAIL SEAT)", fill=(240, 240, 240), font=font_title)
    draw.text((PAD, 40), "NVIDIA RTX 5080 WebGPU • Real Woods-Trail Outdoor Lighting • 5 Heavy/Revolver Weapons • Art Principles Verification", fill=(160, 175, 190), font=font_section)

    cur_y = HEADER_H + PAD
    for w_key, w_name in weapons:
        # Row A: Hip in 4 lights
        for i, lt in enumerate(lights):
            fname = f"{w_key}-{lt}-hip.jpg"
            fpath = os.path.join(SHOTS, fname)
            x = PAD + i * (TILE_W + PAD)
            if os.path.exists(fpath):
                with Image.open(fpath) as tile:
                    tile_resized = tile.resize((TILE_W, TILE_H), Image.Resampling.LANCZOS)
                    im.paste(tile_resized, (x, cur_y))
            else:
                draw.rectangle([x, cur_y, x + TILE_W, cur_y + TILE_H], fill=(35, 35, 35))

            draw.rectangle([x, cur_y + TILE_H, x + TILE_W, cur_y + TILE_H + LABEL_H], fill=(25, 28, 33))
            label = f"{w_name.split(' (')[0]} [Hip - {light_labels[i]}]"
            draw.text((x + 6, cur_y + TILE_H + 6), label, fill=(210, 210, 210), font=font_label)

        cur_y += TILE_H + LABEL_H + PAD

        # Row B: ADS in 3 lights + Reload in Night (or Chainsaw Night ADS)
        for i, lt in enumerate(lights):
            is_reload = (i == 3 and w_key != "chainsaw")
            fname = f"{w_key}-{lt}-reload.jpg" if is_reload else f"{w_key}-{lt}-ads.jpg"
            fpath = os.path.join(SHOTS, fname)
            x = PAD + i * (TILE_W + PAD)
            if os.path.exists(fpath):
                with Image.open(fpath) as tile:
                    tile_resized = tile.resize((TILE_W, TILE_H), Image.Resampling.LANCZOS)
                    im.paste(tile_resized, (x, cur_y))
            else:
                draw.rectangle([x, cur_y, x + TILE_W, cur_y + TILE_H], fill=(35, 35, 35))

            draw.rectangle([x, cur_y + TILE_H, x + TILE_W, cur_y + TILE_H + LABEL_H], fill=(25, 28, 33))
            action_tag = "Reload" if is_reload else "ADS"
            label = f"{w_name.split(' (')[0]} [{action_tag} - {light_labels[i]}]"
            draw.text((x + 6, cur_y + TILE_H + 6), label, fill=(210, 210, 210), font=font_label)

        cur_y += TILE_H + LABEL_H + PAD

    out_path = os.path.join(OUT, "sheet-gp20016-outdoor.jpg")
    im.save(out_path, quality=90)
    print(f"[Build Sheet] Saved {out_path} ({width}x{height})")

if __name__ == "__main__":
    build_j57_sheet()
    build_outdoor_sheet()
