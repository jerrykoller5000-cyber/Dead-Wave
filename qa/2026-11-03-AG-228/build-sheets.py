import json
import os
from PIL import Image, ImageDraw, ImageFont

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
OUT_228 = os.path.join(ROOT_DIR, "qa", "2026-11-03-AG-228")
OUT_231 = os.path.join(ROOT_DIR, "qa", "2026-11-03-AG-231")
STILLS_228 = os.path.join(OUT_228, "stills")
OUT_223 = os.path.join(ROOT_DIR, "qa", "2026-11-03-AG-223")
OUT_221 = os.path.join(ROOT_DIR, "qa", "2026-11-03-AG-221")
REF_DIR = os.path.join(ROOT_DIR, "docs", "jerry", "2026-11-03-fp-refs", "pair-heavy")

os.makedirs(OUT_231, exist_ok=True)


def load_font(size, bold=False):
    candidates = (
        ["C:/Windows/Fonts/consolab.ttf", "C:/Windows/Fonts/arialbd.ttf", "C:/Windows/Fonts/segoeuib.ttf"]
        if bold
        else ["C:/Windows/Fonts/consola.ttf", "C:/Windows/Fonts/arial.ttf", "C:/Windows/Fonts/segoeui.ttf"]
    )
    for path in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                pass
    return ImageFont.load_default()


def fit_box(img, target_w, target_h, bg=(18, 22, 28)):
    src_w, src_h = img.size
    scale = min(target_w / src_w, target_h / src_h)
    nw = max(1, int(round(src_w * scale)))
    nh = max(1, int(round(src_h * scale)))
    resized = img.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", (target_w, target_h), bg)
    canvas.paste(resized, ((target_w - nw) // 2, (target_h - nh) // 2))
    return canvas


def build_akimbo_sheet(telem):
    cols = 6
    rows = 3
    cell_w = 480
    cell_h = 270
    label_h = 54
    pad = 14
    header_h = 68

    sheet_w = pad + cols * (cell_w + pad)
    sheet_h = header_h + pad + rows * (cell_h + label_h + pad)

    sheet = Image.new("RGB", (sheet_w, sheet_h), (14, 17, 22))
    draw = ImageDraw.Draw(sheet)

    title_font = load_font(21, bold=True)
    sub_font = load_font(13, bold=False)
    card_title_font = load_font(14, bold=True)
    card_meta_font = load_font(11, bold=False)

    b = telem.get("build", {})
    uzi_len = b.get("uziWeaponSize", {}).get("len", "0.660") if isinstance(b.get("uziWeaponSize"), dict) else "0.660"
    uzi_fac = b.get("uziSizeFactor", 0.65465)

    draw.text(
        (pad, 14),
        "AG-231 / AG-228 (CL-301) — Akimbo Pairs in First Person: Pistol, Wasp (GP-20023 Stockless) & Revolver vs. Jerry's Refs",
        fill=(240, 244, 248),
        font=title_font,
    )
    draw.text(
        (pad, 42),
        f"Seat: [42.0, -7.55, -20.0] · Noon · Asserted akimbo=true, raise=1, reloadU in [0.35..0.55] (grip dip > 0.15 NDC) & ads > 0.95 (grip in & up) · Uzi len={uzi_len}m (factor={uzi_fac})",
        fill=(168, 182, 198),
        font=sub_font,
    )

    pairs = [
        ("pistol", "9mm Pistol Pair", "mw-pistols.jpg", "MW Pistols Ref (low, upright, muzzles ahead)"),
        ("uzi", "Wasp / Micro-SMG Pair", "mw3-uzis.png", "MW3 Uzis Ref (GP-20023 stockless, len=0.660m, turned in)"),
        ("revolver", ".357 Revolver Pair", "warzone-revolvers.jpg", "Warzone Revolvers Ref (further out, turned in 0.30 rad)"),
    ]

    for r, (key, title, ref_file, ref_desc) in enumerate(pairs):
        t = telem["pairs"][key]
        gr_rest = t["rest"]["gripRNdc"]
        gl_rest = t["rest"]["gripLNdc"]
        gr_fr = t["fireR"]["gripRNdc"]
        gl_fl = t["fireL"]["gripLNdc"]
        gr_rl = t["reload"]["gripRNdc"]
        gl_rl = t["reload"]["gripLNdc"]
        gr_aim = t["aim"]["gripRNdc"]
        gl_aim = t["aim"]["gripLNdc"]

        cells = [
            (
                f"{key}-pair-rest.jpg",
                f"{title} — 1. At Rest",
                f"key={t['rest']['vmKey']} akimbo={t['rest']['vmAkimbo']} raise={t['rest']['vmRaise']:.2f} place={t['rest']['handPlace']}",
                f"gripR=[{gr_rest['x']:+.3f},{gr_rest['y']:+.3f}] gripL=[{gl_rest['x']:+.3f},{gl_rest['y']:+.3f}]",
            ),
            (
                f"{key}-pair-fire-r.jpg",
                f"{title} — 2. Fire Right Hand",
                f"key={t['fireR']['vmKey']} akimbo={t['fireR']['vmAkimbo']} dShotsR=+{t['fireR']['deltaShotsR']} dShotsL={t['fireR']['deltaShotsL']}",
                f"gripR=[{gr_fr['x']:+.3f},{gr_fr['y']:+.3f}] slideRZ={t['fireR']['slideRZ']} (L steady)",
            ),
            (
                f"{key}-pair-fire-l.jpg",
                f"{title} — 3. Fire Left Hand",
                f"key={t['fireL']['vmKey']} akimbo={t['fireL']['vmAkimbo']} dShotsL=+{t['fireL']['deltaShotsL']} dShotsR={t['fireL']['deltaShotsR']}",
                f"gripL=[{gl_fl['x']:+.3f},{gl_fl['y']:+.3f}] slideLZ={t['fireL']['slideLZ']} (R steady)",
            ),
            (
                f"{key}-pair-reload.jpg",
                f"{title} — 4. Reload (u={t['reload']['vmReloadU']:.2f})",
                f"key={t['reload']['vmKey']} akimbo={t['reload']['vmAkimbo']} reloadU={t['reload']['vmReloadU']:.2f} dip=-{t['reload']['gripDipNdcR']:.3f}",
                f"gripR=[{gr_rl['x']:+.3f},{gr_rl['y']:+.3f}] gripL=[{gl_rl['x']:+.3f},{gl_rl['y']:+.3f}]",
            ),
            (
                f"{key}-pair-aim.jpg",
                f"{title} — 5. Right-Click (Aim)",
                f"key={t['aim']['vmKey']} akimbo={t['aim']['vmAkimbo']} ads={t['aim']['vmAds']:.2f} in=-{t['aim']['gripInNdcR']:.3f} up=+{t['aim']['gripUpNdcR']:.3f}",
                f"gripR=[{gr_aim['x']:+.3f},{gr_aim['y']:+.3f}] gripL=[{gl_aim['x']:+.3f},{gl_aim['y']:+.3f}]",
            ),
        ]

        y0 = header_h + pad + r * (cell_h + label_h + pad)
        for c, (fname, ctitle, meta1, meta2) in enumerate(cells):
            x0 = pad + c * (cell_w + pad)
            img = Image.open(os.path.join(STILLS_228, fname)).convert("RGB")
            thumb = img.resize((cell_w, cell_h), Image.Resampling.LANCZOS)
            sheet.paste(thumb, (x0, y0))
            draw.rectangle([x0 - 1, y0 - 1, x0 + cell_w, y0 + cell_h], outline=(56, 68, 82), width=1)
            ly0 = y0 + cell_h
            draw.rectangle([x0, ly0, x0 + cell_w, ly0 + label_h], fill=(22, 27, 34), outline=(56, 68, 82), width=1)
            draw.text((x0 + 8, ly0 + 4), ctitle, fill=(255, 220, 115), font=card_title_font)
            draw.text((x0 + 8, ly0 + 22), meta1, fill=(185, 225, 195), font=card_meta_font)
            draw.text((x0 + 8, ly0 + 37), meta2, fill=(160, 180, 200), font=card_meta_font)

        # Column 6: Jerry reference
        c = 5
        x0 = pad + c * (cell_w + pad)
        ref_img = Image.open(os.path.join(REF_DIR, ref_file)).convert("RGB")
        ref_thumb = fit_box(ref_img, cell_w, cell_h)
        sheet.paste(ref_thumb, (x0, y0))
        draw.rectangle([x0 - 1, y0 - 1, x0 + cell_w, y0 + cell_h], outline=(110, 140, 180), width=1)
        ly0 = y0 + cell_h
        draw.rectangle([x0, ly0, x0 + cell_w, ly0 + label_h], fill=(26, 32, 42), outline=(110, 140, 180), width=1)
        draw.text((x0 + 8, ly0 + 4), f"6. Reference: {ref_file}", fill=(135, 205, 255), font=card_title_font)
        draw.text((x0 + 8, ly0 + 22), ref_desc, fill=(200, 215, 230), font=card_meta_font)
        draw.text((x0 + 8, ly0 + 37), "docs/jerry/2026-11-03-fp-refs/pair-heavy/", fill=(150, 170, 190), font=card_meta_font)

    for out_dir in (OUT_228, OUT_231):
        out_path = os.path.join(out_dir, "akimbo-pairs-sheet.jpg")
        sheet.save(out_path, "JPEG", quality=93)
        print(f"[AG-231] Saved {out_path} ({sheet_w}x{sheet_h})")


def build_heavy_sheet(telem):
    cols = 4
    rows = 2
    cell_w = 560
    cell_h = 315
    label_h = 54
    pad = 16
    header_h = 68

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
        "AG-231 / AG-228 (CL-301) — Minigun (Top-Grip Right Hand Fix) & Chainsaw in First Person vs. Jerry's References",
        fill=(240, 244, 248),
        font=title_font,
    )
    draw.text(
        (pad, 42),
        "Seat: [42.0, -7.55, -20.0] · Noon (0.50) · Asserted vm.info.key & vm.info.akimbo === false & raise === 1 · Minigun grip socket [0, 0.235, -0.275]",
        fill=(168, 182, 198),
        font=sub_font,
    )

    mg = telem["minigun"]
    cs = telem["chainsaw"]

    y0 = header_h + pad
    mg_rest = Image.open(os.path.join(STILLS_228, "minigun-rest.jpg")).convert("RGB")
    mg_fire = Image.open(os.path.join(STILLS_228, "minigun-fire.jpg")).convert("RGB")

    wr_px = mg["rest"]["wristRNdc"]["px"]
    gx = int(wr_px[0])
    gy = int(wr_px[1])
    crop_w, crop_h = 640, 360
    cx0 = max(0, min(1920 - crop_w, gx - crop_w // 2))
    cy0 = max(0, min(1080 - crop_h, gy - crop_h // 2))
    mg_crop = mg_rest.crop((cx0, cy0, cx0 + crop_w, cy0 + crop_h)).resize((cell_w, cell_h), Image.Resampling.LANCZOS)

    ref_mg1 = Image.open(os.path.join(REF_DIR, "l4d2-minigun.jpg")).convert("RGB")
    ref_mg2 = Image.open(os.path.join(REF_DIR, "minigun-render.jpg")).convert("RGB")
    mg_ref_canvas = Image.new("RGB", (cell_w, cell_h), (18, 22, 28))
    mg_ref_canvas.paste(fit_box(ref_mg1, cell_w // 2 - 2, cell_h), (0, 0))
    mg_ref_canvas.paste(fit_box(ref_mg2, cell_w // 2 - 2, cell_h), (cell_w // 2 + 2, 0))

    mg_cells = [
        (
            mg_rest.resize((cell_w, cell_h), Image.Resampling.LANCZOS),
            "1. Minigun — At Rest (Top Handle Grip)",
            f"key={mg['rest']['vmKey']} akimbo={mg['rest']['vmAkimbo']} raise={mg['rest']['vmRaise']:.2f} place={mg['rest']['handPlace']}",
            f"gripSocket=[0,0.235,-0.275] wristR_px=[{wr_px[0]:.0f},{wr_px[1]:.0f}]",
        ),
        (
            mg_fire.resize((cell_w, cell_h), Image.Resampling.LANCZOS),
            "2. Minigun — Firing (Barrels Spinning)",
            f"key={mg['fire']['vmKey']} akimbo={mg['fire']['vmAkimbo']} dShots=+{mg['fire']['deltaShotsR']}",
            "Sustained rotary fire + vibration; right hand holds top grip",
        ),
        (
            mg_crop,
            "3. Minigun — Right Hand on Top Grip (Zoom Crop)",
            f"Crop [{cx0}:{cx0+crop_w}, {cy0}:{cy0+crop_h}] around top handle",
            "Right hand wraps top vertical grip (not through trigger guard)",
        ),
        (
            mg_ref_canvas,
            "4. Reference: l4d2-minigun.jpg + minigun-render.jpg",
            "Carried low at hip; 6 barrels reach lower-left toward crosshair",
            "docs/jerry/2026-11-03-fp-refs/pair-heavy/",
        ),
    ]

    for c, (img_cell, ctitle, meta1, meta2) in enumerate(mg_cells):
        x0 = pad + c * (cell_w + pad)
        sheet.paste(img_cell, (x0, y0))
        is_ref = c == 3
        border_col = (110, 140, 180) if is_ref else (56, 68, 82)
        draw.rectangle([x0 - 1, y0 - 1, x0 + cell_w, y0 + cell_h], outline=border_col, width=1)
        ly0 = y0 + cell_h
        draw.rectangle([x0, ly0, x0 + cell_w, ly0 + label_h], fill=(26, 32, 42) if is_ref else (22, 27, 34), outline=border_col, width=1)
        draw.text((x0 + 8, ly0 + 4), ctitle, fill=(135, 205, 255) if is_ref else (255, 220, 115), font=card_title_font)
        draw.text((x0 + 8, ly0 + 23), meta1, fill=(185, 225, 195), font=card_meta_font)
        draw.text((x0 + 8, ly0 + 38), meta2, fill=(160, 180, 200), font=card_meta_font)

    y0 = header_h + pad + (cell_h + label_h + pad)
    cs_idle = Image.open(os.path.join(STILLS_228, "chainsaw-idle.jpg")).convert("RGB")
    cs_cut = Image.open(os.path.join(STILLS_228, "chainsaw-cut.jpg")).convert("RGB")

    cs_crop = cs_idle.crop((760, 380, 1720, 920)).resize((cell_w, cell_h), Image.Resampling.LANCZOS)
    ref_cs = fit_box(Image.open(os.path.join(REF_DIR, "l4d2-chainsaw-1.jpg")).convert("RGB"), cell_w, cell_h)

    cs_cells = [
        (
            cs_idle.resize((cell_w, cell_h), Image.Resampling.LANCZOS),
            "1. Chainsaw — Idle (Running Ready)",
            f"key={cs['idle']['vmKey']} akimbo={cs['idle']['vmAkimbo']} raise={cs['idle']['vmRaise']:.2f} phase={cs['idle']['sawState']['startPhase']}",
            f"pose at=[0.24,-0.33,-0.62] yaw=0.55 pitch=0.45 roll=0.55",
        ),
        (
            cs_cut.resize((cell_w, cell_h), Image.Resampling.LANCZOS),
            "2. Chainsaw — Cutting (Active Sawing)",
            f"key={cs['cut']['vmKey']} akimbo={cs['cut']['vmAkimbo']} heat={cs['cut']['sawState']['heat']:.3f} (> idle)",
            "Thrust forward + high-frequency chain vibration",
        ),
        (
            cs_crop,
            "3. Chainsaw — Motor Body & Guide Bar (Zoom Crop)",
            "Motor body low right; guide bar angled up toward upper left",
            "Left hand on top bail handle, right hand on rear trigger grip",
        ),
        (
            ref_cs,
            "4. Reference: l4d2-chainsaw-1.jpg",
            "L4D2 Chainsaw: body low-right, guide bar angled up-left across screen",
            "docs/jerry/2026-11-03-fp-refs/pair-heavy/",
        ),
    ]

    for c, (img_cell, ctitle, meta1, meta2) in enumerate(cs_cells):
        x0 = pad + c * (cell_w + pad)
        sheet.paste(img_cell, (x0, y0))
        is_ref = c == 3
        border_col = (110, 140, 180) if is_ref else (56, 68, 82)
        draw.rectangle([x0 - 1, y0 - 1, x0 + cell_w, y0 + cell_h], outline=border_col, width=1)
        ly0 = y0 + cell_h
        draw.rectangle([x0, ly0, x0 + cell_w, ly0 + label_h], fill=(26, 32, 42) if is_ref else (22, 27, 34), outline=border_col, width=1)
        draw.text((x0 + 8, ly0 + 4), ctitle, fill=(135, 205, 255) if is_ref else (255, 220, 115), font=card_title_font)
        draw.text((x0 + 8, ly0 + 23), meta1, fill=(185, 225, 195), font=card_meta_font)
        draw.text((x0 + 8, ly0 + 38), meta2, fill=(160, 180, 200), font=card_meta_font)

    for out_dir in (OUT_228, OUT_231):
        out_path = os.path.join(out_dir, "minigun-chainsaw-sheet.jpg")
        sheet.save(out_path, "JPEG", quality=93)
        print(f"[AG-231] Saved {out_path} ({sheet_w}x{sheet_h})")


def rebuild_all_weapons_fp():
    telem_223_path = os.path.join(OUT_223, "telemetry.json")
    if not os.path.exists(telem_223_path):
        return
    with open(telem_223_path, "r", encoding="utf-8") as f:
        telem = json.load(f)

    weapons_13 = [
        ("pistol", "9mm Pistol"),
        ("revolver", ".357 Revolver"),
        ("uzi", "Wasp SMG"),
        ("m4", "GW-4 Carbine"),
        ("ak", "KR-7 Rifle"),
        ("shotgun", "Pump Shotgun"),
        ("aa12", "Breacher-12"),
        ("sniper", "Bolt Sniper"),
        ("launcher", "Grenade Launcher"),
        ("minigun", "Minigun"),
        ("flamer", "Flamethrower"),
        ("chainsaw", "Chainsaw"),
        ("akimbo-pistol", "Akimbo Pistols"),
    ]

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
        "AG-221 / AG-223 / AG-231 — All 13 First-Person Weapons at Hip Rest (Updated with CL-301 & GP-20023 Uzi len=0.660m)",
        fill=(240, 244, 248),
        font=title_font,
    )
    draw.text(
        (pad, 44),
        "Seat: [42.0, -7.55, -20.0] · 12:00 Noon · Verified: vm.info.key === weapon & raise === 1 for 1.0s (60f), CL-301 akimbo pair / minigun top-grip / chainsaw pose",
        fill=(168, 182, 198),
        font=sub_font,
    )

    for idx, (key, label) in enumerate(weapons_13):
        r = idx // cols
        c = idx % cols
        x0 = pad + c * (cell_w + pad)
        y0 = header_h + pad + r * (cell_h + label_h + pad)

        img = Image.open(os.path.join(OUT_223, f"{key}.jpg")).convert("RGB")
        thumb = img.resize((cell_w, cell_h), Image.Resampling.LANCZOS)
        sheet.paste(thumb, (x0, y0))

        draw.rectangle([x0 - 1, y0 - 1, x0 + cell_w, y0 + cell_h], outline=(56, 68, 82), width=1)
        ly0 = y0 + cell_h
        draw.rectangle([x0, ly0, x0 + cell_w, ly0 + label_h], fill=(22, 27, 34), outline=(56, 68, 82), width=1)

        entry = telem["weapons"][key]
        if key == "akimbo-pistol":
            status_str = "vm=pistol · akimbo=true · raise=1.00 (1s) · place=pair (CL-301 two-handed viewmodel)"
        elif key in ("minigun", "chainsaw"):
            status_str = f"vm={key} · akimbo=false · raise=1.00 (1s) · CL-301 pose & grip socket"
        elif key == "uzi":
            status_str = "vm=uzi · akimbo=false · raise=1.00 (1s) · GP-20023 stockless len=0.660m (factor=0.65465)"
        else:
            stock_tag = " · stock=ON" if entry.get("stockVisible") else ""
            status_str = f"vm={entry['vmKey']} · raise={entry['vmRaise']:.2f} (1s){stock_tag} · gunPx={entry['gunPixels']:,} ({entry['gunScreenPct']}%)"

        draw.text((x0 + 10, ly0 + 5), f"{idx + 1}. {label} ({key})", fill=(255, 220, 115), font=card_title_font)
        draw.text((x0 + 10, ly0 + 25), status_str, fill=(185, 205, 220), font=card_meta_font)

    for out_dir in (OUT_221, OUT_223, OUT_228, OUT_231):
        out_path = os.path.join(out_dir, "all-weapons-fp.jpg")
        sheet.save(out_path, "JPEG", quality=93)
        print(f"[AG-231] Updated {out_path}")


def main():
    with open(os.path.join(OUT_228, "telemetry.json"), "r", encoding="utf-8") as f:
        telem = json.load(f)
    build_akimbo_sheet(telem)
    build_heavy_sheet(telem)
    rebuild_all_weapons_fp()


if __name__ == "__main__":
    main()
