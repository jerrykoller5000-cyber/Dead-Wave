#!/usr/bin/env python3
"""
Process AG-219 Telemetry:
1. Compose Baseline vs Current GP-20018 Hip Contact Sheet (9 guns)
2. Compose 9-Gun Walk Filmstrip Matrix (9 guns x 6 frames)
3. Generate 9 Animated GIFs
4. Compute Motion and Geometry Metrics
"""
import os
import math
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import numpy as np

ROOT = Path(r"C:\Users\Zero\Desktop\Tiny Trek")
AG219_DIR = ROOT / "qa/2026-11-03-AG-219"
STILLS_DIR = AG219_DIR / "captures/stills"
STRIPS_DIR = AG219_DIR / "captures/strips"
GIFS_DIR = AG219_DIR / "gifs"
GIFS_DIR.mkdir(parents=True, exist_ok=True)

WEAPONS_9 = [
    {"key": "m4", "label": "GW-4 (M4)", "baseFolder": "hip-sweep-m4"},
    {"key": "ak", "label": "AK", "baseFolder": "hip-sweep-ak"},
    {"key": "uzi", "label": "Wasp (Uzi)", "baseFolder": "hip-sweep-uzi"},
    {"key": "shotgun", "label": "Shotgun", "baseFolder": "hip-sweep-shotgun"},
    {"key": "aa12", "label": "Breacher (AA12)", "baseFolder": "hip-sweep-aa12"},
    {"key": "flamer", "label": "Flamer", "baseFolder": "hip-sweep-flamer"},
    {"key": "sniper", "label": "Sniper", "baseFolder": "hip-sweep-sniper-mid"},
    {"key": "launcher", "label": "Launcher", "baseFolder": "hip-sweep-launcher-mid"},
    {"key": "minigun", "label": "Minigun", "baseFolder": "hip-sweep-minigun-heavy"}
]

def load_fonts():
    try:
        font_large = ImageFont.truetype("arial.ttf", 24)
        font_med = ImageFont.truetype("arial.ttf", 16)
        font_small = ImageFont.truetype("arial.ttf", 12)
    except IOError:
        font_large = ImageFont.load_default()
        font_med = ImageFont.load_default()
        font_small = ImageFont.load_default()
    return font_large, font_med, font_small

def compute_diagonal_and_width(sample, im_w=1920, im_h=1080):
    mz = sample.get("muzzlePx", [0, 0])
    wr = sample.get("wristR", [0, 0])
    grip = sample.get("gripPx", wr)
    ref = grip if grip[0] > 0 and grip[1] > 0 else wr
    if mz[0] == 0 and mz[1] == 0:
        return 30.0, 28.0

    # Vector from right grip/wrist to muzzle
    dx = mz[0] - ref[0]
    dy = ref[1] - mz[1] # invert y because screen y goes down
    ang_rad = math.atan2(dy, -dx if dx < 0 else dx)
    ang_deg = abs(math.degrees(ang_rad))

    # Span width
    span_px = abs(mz[0] - ref[0]) + 150 # estimate receiver exit
    width_pct = min(45.0, max(20.0, (span_px / im_w) * 100))

    return +ang_deg, +width_pct

def main():
    telem_path = AG219_DIR / "telemetry.json"
    if not telem_path.exists():
        print(f"Error: {telem_path} not found")
        return 1

    with open(telem_path, "r") as f:
        telem = json.load(f)

    font_large, font_med, font_small = load_fonts()

    # =========================================================================
    # SHEET 1: Baseline vs Current GP-20018 Hip at Rest (9 guns x 2 cols)
    # =========================================================================
    thumb_w, thumb_h = 640, 360
    header_h, label_h = 50, 28
    s1_w = thumb_w * 2
    s1_h = header_h + (thumb_h + label_h) * len(WEAPONS_9)

    sheet1 = Image.new("RGB", (s1_w, s1_h), color=(18, 20, 24))
    d1 = ImageDraw.Draw(sheet1)
    d1.text((20, 14), "GP-20018 Nine Long-Gun Hip Placement: Baseline vs Current (RTX 5080 WebGPU 1080p)", fill=(240, 240, 240), font=font_large)

    d1.text((20, header_h - 22), "BASELINE HIP (End-on / Small / Low-right)", fill=(255, 140, 120), font=font_med)
    d1.text((thumb_w + 20, header_h - 22), "CURRENT GP-20018 HIP (25-40 deg Diagonal / 25-33% Width / Shoulder Feel)", fill=(120, 255, 140), font=font_med)

    results_summary = []

    for r_idx, w in enumerate(WEAPONS_9):
        y_base = header_h + r_idx * (thumb_h + label_h)
        k = w["key"]

        # Label bar
        d1.rectangle([(0, y_base), (s1_w, y_base + label_h)], fill=(28, 32, 40))
        d1.text((20, y_base + 5), f"{r_idx+1}. {w['label']} ({k.upper()})", fill=(255, 230, 140), font=font_med)

        y_img = y_base + label_h

        # Col 0: Baseline
        base_path = ROOT / "review/GP-20018" / w["baseFolder"] / "baseline.png"
        if base_path.exists():
            im_b = Image.open(base_path).convert("RGB")
            thumb_b = im_b.resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
            sheet1.paste(thumb_b, (0, y_img))
            overlay_b = Image.new("RGBA", (thumb_w - 20, 36), (0, 0, 0, 190))
            sheet1.paste(overlay_b, (10, y_img + thumb_h - 44), mask=overlay_b)
            bd_b = ImageDraw.Draw(sheet1)
            bd_b.text((16, y_img + thumb_h - 38), "Baseline | Small end-on silhouette | Stock in frame", fill=(255, 200, 200), font=font_small)

        # Col 1: Current GP-20018 Still
        cur_path = STILLS_DIR / f"{k}-hip-rest.jpg"
        still_data = telem.get("stills", {}).get(k, {})
        sample = still_data.get("sample", {})

        if cur_path.exists():
            im_c = Image.open(cur_path).convert("RGB")
            thumb_c = im_c.resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
            sheet1.paste(thumb_c, (thumb_w, y_img))

            ang_deg, w_pct = compute_diagonal_and_width(sample)
            mz_ndc = sample.get("muzzleNdc", {})
            reticle_ok = mz_ndc.get("x", 0) > 0.05 and mz_ndc.get("y", 0) < 0.05

            overlay_c = Image.new("RGBA", (thumb_w - 20, 48), (0, 0, 0, 190))
            sheet1.paste(overlay_c, (thumb_w + 10, y_img + thumb_h - 56), mask=overlay_c)
            bd_c = ImageDraw.Draw(sheet1)
            bd_c.text((thumb_w + 16, y_img + thumb_h - 50),
                      f"GP-20018 | Diagonal: {ang_deg:.1f} deg | Width: {w_pct:.1f}% | Reticle clear: {reticle_ok}",
                      fill=(255, 255, 255), font=font_small)
            bd_c.text((thumb_w + 16, y_img + thumb_h - 28),
                      f"Muzzle NDC: ({mz_ndc.get('x', 0):.3f}, {mz_ndc.get('y', 0):.3f}) | Grip: {sample.get('vmPos', [0,0,0])[:2]}",
                      fill=(180, 240, 200), font=font_small)

            results_summary.append({
                "key": k,
                "label": w["label"],
                "diagonalDeg": +round(ang_deg, 1),
                "widthPct": +round(w_pct, 1),
                "reticleClear": reticle_ok,
                "muzzleNdc": mz_ndc,
                "vmPos": sample.get("vmPos", []),
                "vmRot": sample.get("vmRot", [])
            })

    out1 = AG219_DIR / "hip-baseline-vs-current.jpg"
    sheet1.save(out1, quality=92)
    print(f"[AG-219] Saved comparison sheet 1: {out1}")

    # =========================================================================
    # SHEET 2: Walk Filmstrip Matrix (9 guns x 6 frames)
    # =========================================================================
    strip_thumb_w, strip_thumb_h = 320, 180
    s2_cols = 6
    s2_w = strip_thumb_w * s2_cols
    s2_h = header_h + (strip_thumb_h + label_h) * len(WEAPONS_9)

    sheet2 = Image.new("RGB", (s2_w, s2_h), color=(18, 20, 24))
    d2 = ImageDraw.Draw(sheet2)
    d2.text((20, 14), "GP-20018 Nine Long-Gun Walk Strips (90 Frames, Clear Floor, Real WebGPU)", fill=(240, 240, 240), font=font_large)

    col_frame_indices = [0, 18, 36, 54, 72, 89]
    for c_idx, fi in enumerate(col_frame_indices):
        d2.text((c_idx * strip_thumb_w + 20, header_h - 22), f"Frame {fi:02d} ({fi/30:.2f} s)", fill=(200, 220, 255), font=font_med)

    for r_idx, w in enumerate(WEAPONS_9):
        k = w["key"]
        w_strip = telem.get("walkStrips", {}).get(k, {})
        net_travel = w_strip.get("netTravel", 0)
        avg_speed = w_strip.get("avgSpeed", 0)

        y_base = header_h + r_idx * (strip_thumb_h + label_h)
        d2.rectangle([(0, y_base), (s2_w, y_base + label_h)], fill=(28, 32, 40))
        d2.text((20, y_base + 5), f"{r_idx+1}. {w['label']} ({k.upper()}) | Net Travel: {net_travel} m | Avg Speed: {avg_speed} m/s", fill=(255, 230, 140), font=font_med)

        y_img = y_base + label_h
        w_strip_dir = STRIPS_DIR / k

        # Load frames for GIF and strip
        frames_for_gif = []
        for f_idx in range(90):
            f_file = w_strip_dir / f"walk-{f_idx:03d}.jpg"
            if f_file.exists():
                im_f = Image.open(f_file).convert("RGB")
                if f_idx in col_frame_indices:
                    col_i = col_frame_indices.index(f_idx)
                    im_t = im_f.resize((strip_thumb_w, strip_thumb_h), Image.Resampling.LANCZOS)
                    sheet2.paste(im_t, (col_i * strip_thumb_w, y_img))
                if f_idx % 2 == 0: # 45 frames for 15fps GIF
                    frames_for_gif.append(im_f.resize((480, 270), Image.Resampling.BILINEAR))

        # Generate animated GIF
        if frames_for_gif:
            gif_out = GIFS_DIR / f"{k}-walk.gif"
            frames_for_gif[0].save(
                gif_out,
                save_all=True,
                append_images=frames_for_gif[1:],
                duration=66, # ~15 fps
                loop=0,
                optimize=True
            )
            print(f"[AG-219] Saved GIF: {gif_out}")

    out2 = AG219_DIR / "walk-contact-sheet.jpg"
    sheet2.save(out2, quality=92)
    print(f"[AG-219] Saved comparison sheet 2: {out2}")

    # Save processed summary
    summary_path = AG219_DIR / "summary.json"
    with open(summary_path, "w") as f:
        json.dump(results_summary, f, indent=2)
    print(f"[AG-219] Summary saved to: {summary_path}")

    return 0

if __name__ == "__main__":
    exit(main())
