import json
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = "C:/Users/Zero/Desktop/Tiny Trek"
SHOTS = os.path.join(ROOT, "review/AG-308/shots")
SUMMARY_PATH = os.path.join(ROOT, "review/AG-308/ag308-summary.json")
OUT_QA = os.path.join(ROOT, "qa/2026-11-11-AG-308")
OUT_REV = os.path.join(ROOT, "review/AG-308")

with open(SUMMARY_PATH, "r", encoding="utf-8") as f:
    summary = json.load(f)


def load_font(size, bold=False):
    candidates = [
        "C:/Windows/Fonts/consolab.ttf" if bold else "C:/Windows/Fonts/consola.ttf",
        "C:/Windows/Fonts/segoeui.ttf",
        "C:/Windows/Fonts/arial.ttf",
    ]
    for p in candidates:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


F_TITLE = load_font(22, True)
F_SUB = load_font(15, False)
F_LABEL = load_font(15, True)
F_SMALL = load_font(13, False)


def fit_crop(img, target_w, target_h, focus_x=0.5, focus_y=0.5):
    sw, sh = img.size
    target_aspect = target_w / target_h
    src_aspect = sw / sh
    if src_aspect > target_aspect:
        new_w = int(sh * target_aspect)
        x0 = int((sw - new_w) * focus_x)
        x0 = max(0, min(sw - new_w, x0))
        img = img.crop((x0, 0, x0 + new_w, sh))
    else:
        new_h = int(sw / target_aspect)
        y0 = int((sh - new_h) * focus_y)
        y0 = max(0, min(sh - new_h, y0))
        img = img.crop((0, y0, sw, y0 + new_h))
    return img.resize((target_w, target_h), Image.Resampling.LANCZOS)


def badge(draw, x, y, text, bg=(14, 18, 22), fg=(235, 240, 242)):
    bbox = draw.textbbox((0, 0), text, font=F_LABEL)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.rectangle([x, y, x + tw + 14, y + th + 10], fill=bg, outline=(72, 82, 90))
    draw.text((x + 7, y + 4), text, font=F_LABEL, fill=fg)


# --- SHEET 1: 4 Lights x (1P Pristine, 1P After Real Hits, 3P Scale Beside Marine) ---
def build_sheet_4lights():
    cols, rows = 4, 3
    tile_w, tile_h = 580, 390
    pad = 16
    hdr_h = 84
    W = pad + cols * (tile_w + pad)
    H = hdr_h + rows * (tile_h + pad) + pad

    canvas = Image.new("RGB", (W, H), (16, 19, 22))
    draw = ImageDraw.Draw(canvas)

    pd = summary.get("perfDelta", {})
    bnds = summary.get("geometryBounds", {})
    draw.text(
        (pad, 14),
        "AG-308 (J137) — Training Ground Melee Practice Dummy · 4 Lights × (1P Pristine, 1P Hit Marks, 3P Scale)",
        font=F_TITLE,
        fill=(242, 245, 247),
    )
    n_unmarked = len(summary.get("drawsUnmarked", []))
    n_marked = len(summary.get("drawsMarked", []))
    sub = (
        f"RTX 5080 WebGPU ({summary.get('backend')}) · Height {bnds.get('maxYRelFloor')}m (floor gap {bnds.get('minYRelFloor')}m) · "
        f"+{n_unmarked} draws unmarked (+{n_marked} marked) · "
        f"Render median {pd.get('withDummyUnmarked', {}).get('medianMs')} ms (vs {pd.get('withoutDummy', {}).get('medianMs')} ms without)"
    )
    draw.text((pad, 46), sub, font=F_SUB, fill=(176, 188, 196))

    lights = [
        ("noon", "NOON"),
        ("overcast", "OVERCAST"),
        ("dusk", "DUSK"),
        ("night", "NIGHT (+Flashlight)"),
    ]
    row_defs = [
        ("clean-eye", "1P EYE (~2.1m) · PRISTINE"),
        ("hits-eye", "1P EYE (~2.1m) · AFTER HITS"),
        ("clean-3p", "3P BESIDE 1.80m MARINE"),
    ]

    for r_idx, (prefix, row_title) in enumerate(row_defs):
        for c_idx, (lk, l_title) in enumerate(lights):
            fname = f"{prefix}-{lk}.jpg"
            im = Image.open(os.path.join(SHOTS, fname))
            tile = fit_crop(im, tile_w, tile_h, 0.5, 0.5)
            x = pad + c_idx * (tile_w + pad)
            y = hdr_h + r_idx * (tile_h + pad)
            canvas.paste(tile, (x, y))
            draw.rectangle([x, y, x + tile_w - 1, y + tile_h - 1], outline=(58, 66, 74))
            badge(draw, x + 8, y + 8, f"{l_title} · {row_title}")

    for out_dir in [OUT_QA, OUT_REV]:
        canvas.save(os.path.join(out_dir, "sheet-ag308-4lights.jpg"), quality=93)


# --- SHEET 2: 6 Real-Hit Decal Close-Ups + Front/Side/Back + Effect Sorting + 6-Frame Wobble Filmstrip ---
def build_sheet_details():
    W = 2420
    pad = 16
    hdr_h = 80

    # Row 1: 6 real-weapon decal close-ups
    r1_cols = 6
    r1_w = (W - pad * (r1_cols + 1)) // r1_cols
    r1_h = 380

    # Row 2: 5 panels (Front, Side, Back, Flame Sorting, Spark/Dust Sorting)
    r2_cols = 5
    r2_w = (W - pad * (r2_cols + 1)) // r2_cols
    r2_h = 390

    # Row 3: 6-frame wobble filmstrip
    r3_cols = 6
    r3_w = (W - pad * (r3_cols + 1)) // r3_cols
    r3_h = 410

    sec_lbl_h = 30
    H = hdr_h + (sec_lbl_h + r1_h + pad) + (sec_lbl_h + r2_h + pad) + (sec_lbl_h + r3_h + pad)
    canvas = Image.new("RGB", (W, H), (16, 19, 22))
    draw = ImageDraw.Draw(canvas)

    draw.text(
        (pad, 14),
        "AG-308 (J137) — Real-Hit Decal Close-Ups, Front/Side/Back Turnaround, Effect Sorting & Sprung Wobble Filmstrip",
        font=F_TITLE,
        fill=(242, 245, 247),
    )
    draw.text(
        (pad, 44),
        "Surface-conforming 3x3 curved decals (renderOrder = -0.5, depthWrite = false): sorted strictly beneath renderOrder >= 0 sparks/dust, smoke (2) & flames (3)",
        font=F_SUB,
        fill=(176, 188, 196),
    )

    y = hdr_h
    draw.text((pad, y + 4), "1. ISOLATED CLOSE-UPS PER WEAPON KIND AFTER REAL IN-GAME HITS (0.88 m, Noon)", font=F_LABEL, fill=(220, 230, 238))
    y += sec_lbl_h

    decals = [
        ("decal-1-knife.jpg", "1. KNIFE SLASH"),
        ("decal-2-machete.jpg", "2. MACHETE CHOP"),
        ("decal-3-katana.jpg", "3. KATANA SLICE"),
        ("decal-4-chainsaw.jpg", "4. CHAINSAW RIP"),
        ("decal-5-scorch.jpg", "5. THERMAL SCORCH"),
        ("decal-6-bullet.jpg", "6. GUN BULLETS"),
    ]
    for idx, (fn, title) in enumerate(decals):
        im = Image.open(os.path.join(SHOTS, fn))
        tile = fit_crop(im, r1_w, r1_h, 0.5, 0.46)
        x = pad + idx * (r1_w + pad)
        canvas.paste(tile, (x, y))
        draw.rectangle([x, y, x + r1_w - 1, y + r1_h - 1], outline=(58, 66, 74))
        badge(draw, x + 8, y + 8, title)

    y += r1_h + pad
    draw.text((pad, y + 4), "2. TURNAROUND (~2.05 m) & DECAL SORTING UNDER LIVE TRANSPARENT EFFECTS", font=F_LABEL, fill=(220, 230, 238))
    y += sec_lbl_h

    r2_items = [
        ("turnaround-front.jpg", "FRONT (~2.05 m)"),
        ("turnaround-side.jpg", "SIDE PROFILE (~2.05 m)"),
        ("turnaround-back.jpg", "BACK (Buckles, Pin & Bung)"),
        ("sort-flamethrower.jpg", "SORTING: FLAMES OVER DECALS"),
        ("sort-sparks-dust.jpg", "SORTING: SPARKS/DUST OVER DECALS"),
    ]
    for idx, (fn, title) in enumerate(r2_items):
        im = Image.open(os.path.join(SHOTS, fn))
        tile = fit_crop(im, r2_w, r2_h, 0.5, 0.5)
        x = pad + idx * (r2_w + pad)
        canvas.paste(tile, (x, y))
        draw.rectangle([x, y, x + r2_w - 1, y + r2_h - 1], outline=(58, 66, 74))
        badge(draw, x + 8, y + 8, title)

    y += r2_h + pad
    draw.text((pad, y + 4), "3. SPRUNG WOBBLE FILMSTRIP (Damped 2-Axis + Spine Torsion Oscillator, Rest Plumb Reference Line)", font=F_LABEL, fill=(220, 230, 238))
    y += sec_lbl_h

    wobble_curve = summary.get("wobbleCurve", [])
    # Compute rest head X in cropped tile from NDC of frame 0 so plumb line marks exact upright axis
    rest_ndc_x = summary.get("shots", {}).get(wobble_curve[0]["file"], {}).get("ndc", {}).get("head", [0])[0] if wobble_curve else 0.0

    for idx, wf in enumerate(wobble_curve[:6]):
        im = Image.open(os.path.join(SHOTS, wf["file"]))
        sw, sh = im.size
        # Crop centered horizontally around rest_ndc_x so plumb line is identical across all 6 tiles
        rest_px_x = (rest_ndc_x * 0.5 + 0.5) * sw
        target_aspect = r3_w / r3_h
        crop_w = min(sw, int(sh * target_aspect))
        x0 = int(max(0, min(sw - crop_w, rest_px_x - crop_w * 0.5)))
        cropped = im.crop((x0, 0, x0 + crop_w, sh)).resize((r3_w, r3_h), Image.Resampling.LANCZOS)
        plumb_x_in_tile = int((rest_px_x - x0) / crop_w * r3_w)

        x = pad + idx * (r3_w + pad)
        canvas.paste(cropped, (x, y))
        # Subtle dashed cyan upright plumb reference line
        for py in range(y + 42, y + r3_h - 10, 12):
            draw.line([(x + plumb_x_in_tile, py), (x + plumb_x_in_tile, min(y + r3_h - 10, py + 6))], fill=(90, 210, 235), width=2)
        draw.rectangle([x, y, x + r3_w - 1, y + r3_h - 1], outline=(58, 66, 74))
        lbl = f"{wf['label']} · lean {wf['signedLeanDeg']:+.1f}°"
        badge(draw, x + 8, y + 8, lbl)

    for out_dir in [OUT_QA, OUT_REV]:
        canvas.save(os.path.join(out_dir, "dummy-details.jpg"), quality=93)


if __name__ == "__main__":
    build_sheet_4lights()
    build_sheet_details()
    print("Built sheet-ag308-4lights.jpg and dummy-details.jpg successfully.")
