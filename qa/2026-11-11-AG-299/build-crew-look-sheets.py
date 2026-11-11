# qa/2026-11-11-AG-299/build-crew-look-sheets.py
# Builds high-resolution 4-light contact sheets for:
#   1. review/CD-1/fixes2/sheet-shotgun-4lights.jpg & sheet-gw4-4lights.jpg & sheet-cd1-fixes2-4lights.jpg
#   2. review/CB-292/gpu/sheet-stations-4lights.jpg & sheet-before-after-noon.jpg

import os
from PIL import Image, ImageDraw, ImageFont

ROOT = r"C:\Users\Zero\Desktop\Tiny Trek"
CD1_DIR = os.path.join(ROOT, "review", "CD-1", "fixes2")
CB_DIR = os.path.join(ROOT, "review", "CB-292")
CB_GPU = os.path.join(CB_DIR, "gpu")

LIGHTS = ["noon", "overcast", "dusk", "night"]
LIGHT_LABELS = {"noon": "Noon", "overcast": "Overcast", "dusk": "Dusk", "night": "Night"}


def load_font(sz, bold=False):
    candidates = [
        r"C:\Windows\Fonts\consolab.ttf" if bold else r"C:\Windows\Fonts\consola.ttf",
        r"C:\Windows\Fonts\segoeuib.ttf" if bold else r"C:\Windows\Fonts\segoeui.ttf",
        r"C:\Windows\Fonts\arialbd.ttf" if bold else r"C:\Windows\Fonts\arial.ttf",
    ]
    for p in candidates:
        if os.path.exists(p):
            return ImageFont.truetype(p, sz)
    return ImageFont.load_default()


F_TITLE = load_font(22, True)
F_SUB = load_font(15, False)
F_ROW = load_font(16, True)
F_TAG = load_font(14, True)


def badge(img, text, xy=(10, 10), fg=(245, 248, 252), bg=(16, 20, 26)):
    im = img.copy()
    d = ImageDraw.Draw(im)
    bb = d.textbbox((0, 0), text, font=F_TAG)
    tw, th = bb[2] - bb[0], bb[3] - bb[1]
    x, y = xy
    d.rectangle([x, y, x + tw + 14, y + th + 8], fill=bg, outline=(72, 86, 106), width=1)
    d.text((x + 7, y + 3), text, font=F_TAG, fill=fg)
    return im


def build_cd1_weapon_sheet(weapon_key, title_str, subtitle_str, out_name):
    rows = [
        ("1P Hip", "hip"),
        ("1P Aimed (ADS)", "aimed"),
        ("Close Hand — From Eye", "close-eye"),
        ("Close Hand — Left Side", "close-left"),
        ("Close Hand — Under", "close-under"),
    ]
    tw, th = 480, 270
    pad = 10
    left_w = 215
    top_h = 74
    W = left_w + 4 * tw + 5 * pad
    H = top_h + len(rows) * (th + pad) + pad
    canvas = Image.new("RGB", (W, H), (14, 17, 22))
    d = ImageDraw.Draw(canvas)
    d.text((pad + 4, 12), title_str, font=F_TITLE, fill=(242, 246, 252))
    d.text((pad + 4, 42), subtitle_str, font=F_SUB, fill=(175, 190, 210))

    for r_idx, (r_label, pose_key) in enumerate(rows):
        y = top_h + r_idx * (th + pad)
        d.text((pad + 4, y + th // 2 - 10), r_label, font=F_ROW, fill=(224, 232, 245))
        for c_idx, lk in enumerate(LIGHTS):
            x = left_w + pad + c_idx * (tw + pad)
            fp = os.path.join(CD1_DIR, f"{weapon_key}-{pose_key}-{lk}.png")
            tile = Image.open(fp).convert("RGB").resize((tw, th), Image.Resampling.LANCZOS)
            tile = badge(tile, f"{LIGHT_LABELS[lk]} · {pose_key}")
            canvas.paste(tile, (x, y))

    out_path = os.path.join(CD1_DIR, out_name)
    tmp_path = out_path + ".tmp.jpg"
    canvas.save(tmp_path, "JPEG", quality=93)
    os.replace(tmp_path, out_path)
    print(f"[CD-1] wrote {out_path} ({canvas.size[0]}x{canvas.size[1]})")
    return canvas


def build_cb292_sheets():
    stations = [
        ("cif", "CIF Issue Window (East Wall)"),
        ("kiosk", "Supply Kiosk (East Wall)"),
        ("armory", "Armory Bench & Rack (East Wall)"),
        ("skullWindow", "Skull Turn-In Window (West Wall)"),
        ("rangeConsole", "Range Control Console (Divider)"),
        ("hqPanel", "HQ Briefing Panel (West Wall)"),
    ]
    tw, th = 460, 259
    pad = 10
    left_w = 245
    top_h = 74
    W = left_w + 4 * tw + 5 * pad
    H = top_h + len(stations) * (th + pad) + pad
    canvas = Image.new("RGB", (W, H), (14, 17, 22))
    d = ImageDraw.Draw(canvas)
    d.text((pad + 4, 12), "CB-292 — Six Training Ground Station Wall Contacts in 4 Lights (RTX 5080 WebGPU)", font=F_TITLE, fill=(242, 246, 252))
    d.text((pad + 4, 42), "Exact before-cameras.json + hqPanel cameras across Noon / Overcast / Dusk / Night · 0.0 mm wall contact, [E] prompts live", font=F_SUB, fill=(175, 190, 210))

    for r_idx, (site, label) in enumerate(stations):
        y = top_h + r_idx * (th + pad)
        d.text((pad + 4, y + th // 2 - 10), label, font=F_ROW, fill=(224, 232, 245))
        for c_idx, lk in enumerate(LIGHTS):
            x = left_w + pad + c_idx * (tw + pad)
            fp = os.path.join(CB_GPU, f"after-{site}-{lk}.png")
            tile = Image.open(fp).convert("RGB").resize((tw, th), Image.Resampling.LANCZOS)
            tile = badge(tile, f"{site} · {LIGHT_LABELS[lk]}")
            canvas.paste(tile, (x, y))

    out_path = os.path.join(CB_GPU, "sheet-stations-4lights.jpg")
    tmp_path = out_path + ".tmp.jpg"
    canvas.save(tmp_path, "JPEG", quality=93)
    os.replace(tmp_path, out_path)
    print(f"[CB-292] wrote {out_path} ({canvas.size[0]}x{canvas.size[1]})")

    # Also build Noon Before vs GPU After comparison sheet if before-*.png exist
    pairs = [s for s in stations if os.path.exists(os.path.join(CB_DIR, f"before-{s[0]}-noon.png"))]
    if pairs:
        cw, ch = 560, 315
        W2 = left_w + 2 * cw + 3 * pad
        H2 = top_h + len(pairs) * (ch + pad) + pad
        c2 = Image.new("RGB", (W2, H2), (14, 17, 22))
        d2 = ImageDraw.Draw(c2)
        d2.text((pad + 4, 12), "CB-292 — Same-Camera Noon: Before vs After Station Wall Seating (RTX 5080 WebGPU)", font=F_TITLE, fill=(242, 246, 252))
        d2.text((pad + 4, 42), "Left: before-{site}-noon.png · Right: independent 5080 WebGPU after-{site}-noon.png", font=F_SUB, fill=(175, 190, 210))
        for r_idx, (site, label) in enumerate(pairs):
            y = top_h + r_idx * (ch + pad)
            d2.text((pad + 4, y + ch // 2 - 10), label, font=F_ROW, fill=(224, 232, 245))
            b_img = Image.open(os.path.join(CB_DIR, f"before-{site}-noon.png")).convert("RGB").resize((cw, ch), Image.Resampling.LANCZOS)
            a_img = Image.open(os.path.join(CB_GPU, f"after-{site}-noon.png")).convert("RGB").resize((cw, ch), Image.Resampling.LANCZOS)
            c2.paste(badge(b_img, f"BEFORE · {site} (Noon)", fg=(255, 214, 145)), (left_w + pad, y))
            c2.paste(badge(a_img, f"AFTER · {site} (Noon, 0.0 mm flush)", fg=(158, 255, 185)), (left_w + 2 * pad + cw, y))
        out2 = os.path.join(CB_GPU, "sheet-before-after-noon.jpg")
        tmp2 = out2 + ".tmp.jpg"
        c2.save(tmp2, "JPEG", quality=93)
        os.replace(tmp2, out2)
        print(f"[CB-292] wrote {out2} ({c2.size[0]}x{c2.size[1]})")

    # Low-eye floor paint Before vs GPU After + Sub-mm Nudge z-fight check across 4 lights
    paint_rows = [
        ("firing-line", "Firing Line & Chips — Before (7–14 mm)"),
        ("firing-line", "Firing Line & Chips — GPU After (<=2 mm + polygonOffset)"),
        ("firing-line", "Firing Line & Chips — +0.8 mm Camera Glide (Flicker Check)"),
        ("no-build", "No-Build Paint & Wear — Before (3–7 mm)"),
        ("no-build", "No-Build Paint & Wear — GPU After (1 mm + polygonOffset)"),
        ("no-build", "No-Build Paint & Wear — +0.8 mm Camera Glide (Flicker Check)"),
    ]
    c3 = Image.new("RGB", (W, top_h + len(paint_rows) * (th + pad) + pad), (14, 17, 22))
    d3 = ImageDraw.Draw(c3)
    d3.text((pad + 4, 12), "CB-292 — Low-Eye Floor Paint & Wear Decals in 4 Lights + Z-Fight Glide Check (RTX 5080 WebGPU)", font=F_TITLE, fill=(242, 246, 252))
    d3.text((pad + 4, 42), "Before (floating 3–14 mm) vs After (1–2 mm + polygonOffset) vs +0.8 mm sub-mm glide across Noon / Overcast / Dusk / Night", font=F_SUB, fill=(175, 190, 210))
    for r_idx, (psite, plabel) in enumerate(paint_rows):
        y = top_h + r_idx * (th + pad)
        short_lbl = plabel.split("—")[0].strip() + "\n" + plabel.split("—")[1].strip()
        d3.text((pad + 4, y + th // 2 - 18), short_lbl, font=F_TAG, fill=(224, 232, 245))
        mode = r_idx % 3
        for c_idx, lk in enumerate(LIGHTS):
            x = left_w + pad + c_idx * (tw + pad)
            if mode == 0:
                fp = os.path.join(CB_DIR, f"before-paint-{lk}-{psite}.png")
                btxt, bfg = f"BEFORE · {psite} · {LIGHT_LABELS[lk]}", (255, 214, 145)
            elif mode == 1:
                fp = os.path.join(CB_GPU, f"after-paint-{lk}-{psite}.png")
                btxt, bfg = f"AFTER · {psite} · {LIGHT_LABELS[lk]}", (158, 255, 185)
            else:
                fp = os.path.join(CB_GPU, f"nudge-paint-{lk}-{psite}.png")
                btxt, bfg = f"GLIDE +0.8mm · {psite} · {LIGHT_LABELS[lk]}", (165, 225, 255)
            tile = Image.open(fp).convert("RGB").resize((tw, th), Image.Resampling.LANCZOS)
            c3.paste(badge(tile, btxt, fg=bfg), (x, y))
    out3 = os.path.join(CB_GPU, "sheet-floor-paint-4lights.jpg")
    tmp3 = out3 + ".tmp.jpg"
    c3.save(tmp3, "JPEG", quality=93)
    os.replace(tmp3, out3)
    print(f"[CB-292] wrote {out3} ({c3.size[0]}x{c3.size[1]})")


if __name__ == "__main__":
    s1 = build_cd1_weapon_sheet(
        "shotgun",
        "CD-1 (Fixes 2) — Pump Shotgun Firing Hand (r) in 4 Lights (RTX 5080 WebGPU)",
        "1P Hip & Aimed + Close Hand Views (Eye, Left Side, Under) · Grip centered (14 deg twist removed), thumb over top, fingers clear of guard",
        "sheet-shotgun-4lights.jpg",
    )
    s2 = build_cd1_weapon_sheet(
        "m4",
        "CD-1 (Fixes 2) — GW-4 Carbine Support Hand (l) in 4 Lights (RTX 5080 WebGPU)",
        "1P Hip & Aimed + Close Hand Views (Eye, Left Side, Under) · Palm on left of handguard, thumb forward along lower-left rail",
        "sheet-gw4-4lights.jpg",
    )
    # Combined master CD-1 fixes2 sheet
    combo = Image.new("RGB", (s1.width, s1.height + s2.height + 12), (10, 12, 16))
    combo.paste(s1, (0, 0))
    combo.paste(s2, (0, s1.height + 12))
    combo_out = os.path.join(CD1_DIR, "sheet-cd1-fixes2-4lights.jpg")
    combo_tmp = combo_out + ".tmp.jpg"
    combo.save(combo_tmp, "JPEG", quality=92)
    os.replace(combo_tmp, combo_out)
    print(f"[CD-1] wrote {combo_out} ({combo.size[0]}x{combo.size[1]})")

    build_cb292_sheets()
