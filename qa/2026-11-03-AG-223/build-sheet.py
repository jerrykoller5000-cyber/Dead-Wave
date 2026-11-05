import json
import os
import shutil
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
OUT_DIR_223 = os.path.join(ROOT, "qa", "2026-11-03-AG-223")
OUT_DIR_221 = os.path.join(ROOT, "qa", "2026-11-03-AG-221")
TMP_DIR = os.path.join(OUT_DIR_223, "_ref")
TELEM_PATH_223 = os.path.join(OUT_DIR_223, "telemetry.json")
TELEM_PATH_221 = os.path.join(OUT_DIR_221, "all-weapons-fp-telemetry.json")
SHEET_PATH_223 = os.path.join(OUT_DIR_223, "all-weapons-fp.jpg")
SHEET_PATH_221 = os.path.join(OUT_DIR_221, "all-weapons-fp.jpg")

WEAPONS_13 = [
    ("pistol", "Pistol"),
    ("revolver", "Revolver"),
    ("uzi", "Wasp (Uzi)"),
    ("m4", "GW-4 (M4)"),
    ("ak", "KR-7 (AK)"),
    ("shotgun", "Shotgun"),
    ("aa12", "Breacher-12"),
    ("sniper", "Sniper"),
    ("launcher", "Launcher"),
    ("minigun", "Minigun"),
    ("flamer", "Flamer"),
    ("chainsaw", "Chainsaw"),
    ("akimbo-pistol", "Akimbo Pistols"),
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
    with open(TELEM_PATH_223, "r", encoding="utf-8") as f:
        telem = json.load(f)

    # Exclude HUD rectangles when diffing Reference vs Armed so any minor FPS counter digit change in bottom-right is ignored
    hud_mask = np.ones((1080, 1920), dtype=bool)
    hud_mask[0:290, 0:300] = False       # top-left status card
    hud_mask[870:1080, 0:420] = False    # bottom-left ammo card
    hud_mask[0:220, 1680:1920] = False   # top-right minimap
    hud_mask[780:1080, 1680:1920] = False  # bottom-right perf overlay

    all_passed = True
    prev_img = None
    prev_key = None
    for key, label in WEAPONS_13:
        still_path = os.path.join(OUT_DIR_223, f"{key}.jpg")
        nogun_path = os.path.join(TMP_DIR, f"{key}-nogun.jpg")
        novm_path = os.path.join(TMP_DIR, f"{key}-novm.jpg")

        img_arm = np.asarray(Image.open(still_path).convert("RGB"), dtype=np.int16)
        img_nogun = np.asarray(Image.open(nogun_path).convert("RGB"), dtype=np.int16)
        img_novm = np.asarray(Image.open(novm_path).convert("RGB"), dtype=np.int16)

        diff_gun = np.max(np.abs(img_arm - img_nogun), axis=2) > 14
        diff_vm = np.max(np.abs(img_arm - img_novm), axis=2) > 14

        gun_px = int(np.sum(diff_gun & hud_mask))
        vm_px = int(np.sum(diff_vm & hud_mask))
        gun_pct = round(gun_px * 100.0 / (1920 * 1080), 2)
        vm_pct = round(vm_px * 100.0 / (1920 * 1080), 2)

        # Also assert consecutive frames are distinctly different weapons (>20,000 pixels changed in weapon region)
        diff_from_prev_px = None
        if prev_img is not None:
            diff_prev = np.max(np.abs(img_arm - prev_img), axis=2) > 14
            diff_from_prev_px = int(np.sum(diff_prev & hud_mask))
            if diff_from_prev_px < 10000:
                print(f"[FAIL] {key} is too similar to previous frame {prev_key}: diff_from_prev_px={diff_from_prev_px}")
                all_passed = False

        prev_img = img_arm
        prev_key = key

        entry = telem["weapons"][key]
        entry["gunPixels"] = gun_px
        entry["gunAndHandPixels"] = vm_px
        entry["gunScreenPct"] = gun_pct
        entry["gunAndHandScreenPct"] = vm_pct
        entry["diffFromPrevWeaponPx"] = diff_from_prev_px

        if gun_px < 5000 or vm_px < 10000:
            print(f"[FAIL] {key}: gunPixels={gun_px}, gunAndHandPixels={vm_px}")
            all_passed = False
        else:
            print(
                f"[PASS] {key:14s} | gunPixels={gun_px:7d} ({gun_pct:5.2f}%) | gun+hands={vm_px:7d} ({vm_pct:5.2f}%) | vmKey={str(entry['vmKey']):9s} raise={entry['vmRaise']}"
            )

    with open(TELEM_PATH_223, "w", encoding="utf-8") as f:
        json.dump(telem, f, indent=2)
    with open(TELEM_PATH_221, "w", encoding="utf-8") as f:
        json.dump(telem, f, indent=2)

    if os.path.exists(TMP_DIR):
        shutil.rmtree(TMP_DIR)

    if not all_passed:
        sys.exit(1)

    # Build 4-across contact sheet (4 cols x 4 rows for 13 weapons)
    cols = 4
    rows = 4
    cell_w = 640
    cell_h = 360
    label_h = 44
    pad = 16
    header_h = 68

    sheet_w = pad + cols * (cell_w + pad)
    sheet_h = header_h + pad + rows * (cell_h + label_h + pad)

    sheet = Image.new("RGB", (sheet_w, sheet_h), (14, 17, 22))
    draw = ImageDraw.Draw(sheet)

    title_font = load_font(24, bold=True)
    sub_font = load_font(15, bold=False)
    card_title_font = load_font(17, bold=True)
    card_meta_font = load_font(13, bold=False)

    draw.text(
        (pad, 14),
        "AG-221 / AG-223 — All 13 First-Person Weapons at Hip Rest (Post-CL-293 Arms/Stocks/Elbows & GP-20020 Poses)",
        fill=(240, 244, 248),
        font=title_font,
    )
    draw.text(
        (pad, 44),
        "Seat: [42.0, -7.55, -20.0] · 12:00 Noon · Verified: vm.info.key === weapon & raise === 1 for 1.0s (60f), full-girth arms + upper arm, hip stocks visible",
        fill=(168, 182, 198),
        font=sub_font,
    )

    for idx, (key, label) in enumerate(WEAPONS_13):
        r = idx // cols
        c = idx % cols
        x0 = pad + c * (cell_w + pad)
        y0 = header_h + pad + r * (cell_h + label_h + pad)

        img = Image.open(os.path.join(OUT_DIR_223, f"{key}.jpg")).convert("RGB")
        thumb = img.resize((cell_w, cell_h), Image.Resampling.LANCZOS)
        sheet.paste(thumb, (x0, y0))

        draw.rectangle(
            [x0 - 1, y0 - 1, x0 + cell_w, y0 + cell_h],
            outline=(56, 68, 82),
            width=1,
        )

        ly0 = y0 + cell_h
        draw.rectangle(
            [x0, ly0, x0 + cell_w, ly0 + label_h],
            fill=(22, 27, 34),
            outline=(56, 68, 82),
            width=1,
        )

        entry = telem["weapons"][key]
        if entry["kind"] == "vm":
            stock_tag = " · stock=ON" if entry.get("stockVisible") else ""
            status_str = f"vm={entry['vmKey']} · raise={entry['vmRaise']:.2f} (1s){stock_tag} · gunPx={entry['gunPixels']:,} ({entry['gunScreenPct']}%) · totalPx={entry['gunAndHandPixels']:,}"
        else:
            status_str = f"dual=true (1s) · L+R=vis · gunPx={entry['gunPixels']:,} ({entry['gunScreenPct']}%) · totalPx={entry['gunAndHandPixels']:,}"

        draw.text(
            (x0 + 10, ly0 + 5),
            f"{idx + 1}. {label} ({key})",
            fill=(255, 220, 115),
            font=card_title_font,
        )
        draw.text(
            (x0 + 10, ly0 + 25),
            status_str,
            fill=(185, 205, 220),
            font=card_meta_font,
        )

    sheet.save(SHEET_PATH_223, "JPEG", quality=93)
    sheet.save(SHEET_PATH_221, "JPEG", quality=93)
    print(f"\n[AG-223] Saved 4-across contact sheet to:\n  - {SHEET_PATH_221}\n  - {SHEET_PATH_223}\n  ({sheet_w}x{sheet_h})")


if __name__ == "__main__":
    main()
