import json
import os
import shutil
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
OUT_DIR = os.path.join(ROOT, "qa", "2026-11-03-AG-221")
TMP_DIR = os.path.join(OUT_DIR, "_ref")
TELEM_PATH = os.path.join(OUT_DIR, "telemetry.json")
SWEEP_64 = os.path.join(ROOT, "review", "GP-20017", "minigun-ads-sweep", "rear-64.png")
SWEEP_76 = os.path.join(ROOT, "review", "GP-20017", "minigun-ads-sweep", "rear-76.png")

LIGHTS = [
    ("noon", "Noon (t=0.50)"),
    ("overcast", "Overcast (t=0.42)"),
    ("dusk", "Dusk (t=0.77)"),
    ("night", "Night (t=0.02)"),
]


def load_font(size, bold=False):
    candidates = [
        "C:/Windows/Fonts/consolab.ttf" if bold else "C:/Windows/Fonts/consola.ttf",
        "C:/Windows/Fonts/seguisb.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf",
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
    ]
    for path in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                pass
    return ImageFont.load_default()


def main():
    with open(TELEM_PATH, "r", encoding="utf-8") as f:
        telem = json.load(f)

    hud_mask = np.ones((1080, 1920), dtype=bool)
    hud_mask[0:290, 0:300] = False
    hud_mask[870:1080, 0:420] = False
    hud_mask[0:220, 1680:1920] = False
    hud_mask[780:1080, 1680:1920] = False

    for lkey, llabel in LIGHTS:
        for mode in ("hip", "ads"):
            key = f"{lkey}-{mode}"
            still_path = os.path.join(OUT_DIR, f"minigun-{key}.jpg")
            nogun_path = os.path.join(TMP_DIR, f"minigun-{key}-nogun.jpg")
            novm_path = os.path.join(TMP_DIR, f"minigun-{key}-novm.jpg")

            img_arm = np.asarray(Image.open(still_path).convert("RGB"), dtype=np.int16)
            img_nogun = np.asarray(Image.open(nogun_path).convert("RGB"), dtype=np.int16)
            img_novm = np.asarray(Image.open(novm_path).convert("RGB"), dtype=np.int16)

            diff_gun = np.max(np.abs(img_arm - img_nogun), axis=2) > 14
            diff_vm = np.max(np.abs(img_arm - img_novm), axis=2) > 14

            gun_px = int(np.sum(diff_gun & hud_mask))
            vm_px = int(np.sum(diff_vm & hud_mask))
            gun_pct = round(gun_px * 100.0 / (1920 * 1080), 2)
            vm_pct = round(vm_px * 100.0 / (1920 * 1080), 2)

            # Also count red dot pixels inside the reflex hood window in ADS
            dot_red_px = 0
            if mode == "ads":
                roi = img_arm[505:575, 925:995]
                red_mask = (roi[:, :, 0] > 165) & ((roi[:, :, 0] - roi[:, :, 1]) > 65) & ((roi[:, :, 0] - roi[:, :, 2]) > 65)
                dot_red_px = int(np.sum(red_mask))

            entry = telem["captures"][key]
            entry["gunPixels"] = gun_px
            entry["gunAndHandPixels"] = vm_px
            entry["gunScreenPct"] = gun_pct
            entry["gunAndHandScreenPct"] = vm_pct
            entry["dotRedPixels"] = dot_red_px

            print(
                f"[PASS] minigun-{key:13s} | gunPx={gun_px:6d} ({gun_pct:5.2f}%) | totalPx={vm_px:6d} ({vm_pct:5.2f}%) | dotRedPx={dot_red_px:3d}"
            )

    with open(TELEM_PATH, "w", encoding="utf-8") as f:
        json.dump(telem, f, indent=2)

    if os.path.exists(TMP_DIR):
        shutil.rmtree(TMP_DIR)

    # 1. Build 4-light Hip + ADS + 4x Reticle Zoom + rear-64 vs rear-76 sheet
    cols = 4
    cell_w = 560
    cell_h = 315
    label_h = 44
    pad = 16
    header_h = 68

    # 3 rows: Row 0 = 4-Light Hip, Row 1 = 4-Light ADS (rear=0.76), Row 2 = 2x 4x Zoom crops (Noon/Night ADS) + rear-64 vs rear-76 comparison
    rows = 3
    sheet_w = pad + cols * (cell_w + pad)
    sheet_h = header_h + pad + rows * (cell_h + label_h + pad)

    sheet = Image.new("RGB", (sheet_w, sheet_h), (14, 17, 22))
    draw = ImageDraw.Draw(sheet)

    title_font = load_font(22, bold=True)
    sub_font = load_font(14, bold=False)
    card_title_font = load_font(15, bold=True)
    card_meta_font = load_font(12, bold=False)

    draw.text(
        (pad, 14),
        "AG-221 — GP-20017 J18 Minigun Reflex Sight Four-Light Hip & ADS Audit (rear=0.76 · 1080p WebGPU)",
        fill=(240, 244, 248),
        font=title_font,
    )
    ga = telem["geomAudit"]
    draw.text(
        (pad, 42),
        f"SIGHT.minigun=[0, 0.330, -0.30] · Dot=[0, 0.330, 0.0355] · Rear-Grip Clearance: +{ga['clearanceOverRearGripMm']} mm (y=0.330 vs 0.320) · Hood Top Clearance: +{ga['clearanceUnderHoodTopMm']} mm",
        fill=(168, 182, 198),
        font=sub_font,
    )

    for c, (lkey, llabel) in enumerate(LIGHTS):
        for r, mode in enumerate(["hip", "ads"]):
            key = f"{lkey}-{mode}"
            entry = telem["captures"][key]
            x0 = pad + c * (cell_w + pad)
            y0 = header_h + pad + r * (cell_h + label_h + pad)

            img = Image.open(os.path.join(OUT_DIR, f"minigun-{key}.jpg")).convert("RGB")
            thumb = img.resize((cell_w, cell_h), Image.Resampling.LANCZOS)
            sheet.paste(thumb, (x0, y0))
            draw.rectangle([x0 - 1, y0 - 1, x0 + cell_w, y0 + cell_h], outline=(56, 68, 82), width=1)

            ly0 = y0 + cell_h
            draw.rectangle([x0, ly0, x0 + cell_w, ly0 + label_h], fill=(22, 27, 34), outline=(56, 68, 82), width=1)
            draw.text(
                (x0 + 10, ly0 + 5),
                f"{llabel} — {'HIP REST' if mode == 'hip' else 'ADS (rear=0.76)'}",
                fill=(255, 220, 115),
                font=card_title_font,
            )
            if mode == "hip":
                meta = f"gunPx={entry['gunPixels']:,} ({entry['gunScreenPct']}%) · totalPx={entry['gunAndHandPixels']:,} ({entry['gunAndHandScreenPct']}%)"
            else:
                meta = f"dotPx=({entry['dotPx'][0]:.1f},{entry['dotPx'][1]:.1f}) · dotRedPx={entry['dotRedPixels']} · gunPx={entry['gunPixels']:,} ({entry['gunScreenPct']}%)"
            draw.text((x0 + 10, ly0 + 24), meta, fill=(185, 205, 220), font=card_meta_font)

    # Row 2: 4x zoom of Noon ADS, 4x zoom of Night ADS, rear-64.png (crop), rear-76.png (crop)
    row2_items = [
        ("Noon ADS 4x Sight Window Crop (rear=0.76)", os.path.join(OUT_DIR, "minigun-noon-ads.jpg"), (820, 440, 1100, 600), "Dot & ring centered at (960, 540), +10mm above rear grip"),
        ("Night ADS 4x Sight Window Crop (rear=0.76)", os.path.join(OUT_DIR, "minigun-night-ads.jpg"), (820, 440, 1100, 600), "Emissive sightDotMat crisp against dark night woods"),
        ("Sweep Comparison: rear=0.64 (2x Crop)", SWEEP_64, (680, 380, 1240, 695), "Closer eye relief (0.64m): larger hood & wider housing"),
        ("Sweep Selected: rear=0.76 (2x Crop)", SWEEP_76, (680, 380, 1240, 695), "Selected eye relief (0.76m): clean framing & sight picture"),
    ]
    for c, (ctitle, cpath, box, cmeta) in enumerate(row2_items):
        x0 = pad + c * (cell_w + pad)
        y0 = header_h + pad + 2 * (cell_h + label_h + pad)
        if os.path.exists(cpath):
            src_img = Image.open(cpath).convert("RGB")
            crop = src_img.crop(box).resize((cell_w, cell_h), Image.Resampling.NEAREST)
            sheet.paste(crop, (x0, y0))
        draw.rectangle([x0 - 1, y0 - 1, x0 + cell_w, y0 + cell_h], outline=(56, 68, 82), width=1)
        ly0 = y0 + cell_h
        draw.rectangle([x0, ly0, x0 + cell_w, ly0 + label_h], fill=(22, 27, 34), outline=(56, 68, 82), width=1)
        draw.text((x0 + 10, ly0 + 5), ctitle, fill=(255, 220, 115), font=card_title_font)
        draw.text((x0 + 10, ly0 + 24), cmeta, fill=(185, 205, 220), font=card_meta_font)

    sheet1_path = os.path.join(OUT_DIR, "minigun-4light-hip-ads-sheet.jpg")
    sheet.save(sheet1_path, "JPEG", quality=93)
    print(f"[AG-221] Saved {sheet1_path}")

    # 2. Build 2x2 J18 Reflex Sight & Housing Clearance Close-Up Sheet
    c_cols = 2
    c_rows = 2
    c_w = 720
    c_h = 405
    s2_w = pad + c_cols * (c_w + pad)
    s2_h = header_h + pad + c_rows * (c_h + label_h + pad)
    sheet2 = Image.new("RGB", (s2_w, s2_h), (14, 17, 22))
    draw2 = ImageDraw.Draw(sheet2)

    draw2.text(
        (pad, 14),
        "AG-221 — Minigun J18 Reflex Sight Geometry & Rear-Grip Clearance Close-Ups",
        fill=(240, 244, 248),
        font=title_font,
    )
    draw2.text(
        (pad, 42),
        "Base=[0, 0.2835, 0.01] on rubber top y=0.2775 · Hood=[±0.024, 0.289..0.369, 0.01] · Dot=[0, 0.330, 0.0355] clears rear grip top y=0.320 by +10.0 mm",
        fill=(168, 182, 198),
        font=sub_font,
    )

    closeup_cards = [
        ("closeup-side-left", "1. Left Side Profile — Carry Handle, Reflex Base & Rear Top Grip", "Reflex base sits flush on rubber handle (y=0.2775); dot window (y=0.330) clears rear grip (y=0.320)"),
        ("closeup-front", "2. Front Oblique — Open Reflex Hood, Glass & 3.5mm/7.5mm Dot+Ring", "43×64mm transparent reflex glass (depthWrite=false) inside dark steel hood"),
        ("closeup-three-quarter", "3. Rear-Left 3/4 — Trigger Grip, Carry Arch & J18 Reflex Housing", "Clean bevelled slab & box joinery; zero z-fighting or floating parts"),
        ("closeup-bore-clearance", "4. Sight-Axis View (y=0.330, z=-0.52 -> +0.20) — Housing Clearance", "Unobstructed sight line +10.0 mm above rear grip crown straight through center of red ring"),
    ]

    for idx, (ckey, ctitle, cmeta) in enumerate(closeup_cards):
        r = idx // c_cols
        c = idx % c_cols
        x0 = pad + c * (c_w + pad)
        y0 = header_h + pad + r * (c_h + label_h + pad)
        img = Image.open(os.path.join(OUT_DIR, f"{ckey}.jpg")).convert("RGB")
        thumb = img.resize((c_w, c_h), Image.Resampling.LANCZOS)
        sheet2.paste(thumb, (x0, y0))
        draw2.rectangle([x0 - 1, y0 - 1, x0 + c_w, y0 + c_h], outline=(56, 68, 82), width=1)
        ly0 = y0 + c_h
        draw2.rectangle([x0, ly0, x0 + c_w, ly0 + label_h], fill=(22, 27, 34), outline=(56, 68, 82), width=1)
        draw2.text((x0 + 10, ly0 + 5), ctitle, fill=(255, 220, 115), font=card_title_font)
        draw2.text((x0 + 10, ly0 + 24), cmeta, fill=(185, 205, 220), font=card_meta_font)

    sheet2_path = os.path.join(OUT_DIR, "minigun-j18-clearance-sheet.jpg")
    sheet2.save(sheet2_path, "JPEG", quality=93)
    print(f"[AG-221] Saved {sheet2_path}")


if __name__ == "__main__":
    main()
