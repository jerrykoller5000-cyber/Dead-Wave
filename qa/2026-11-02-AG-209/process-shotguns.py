import json
import os
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(".")
OUT_DIR = ROOT / "qa/2026-11-02-AG-209/shotguns"
LIGHTS = ["noon", "overcast", "dusk", "night"]

def build_comparison_sheet(key, label, baseline_val):
    w_tile, h_tile = 480, 270
    sheet_w = 160 + len(LIGHTS) * (w_tile + 10) + 10
    sheet_h = 70 + 2 * (h_tile + 10) + 10

    comp = Image.new("RGB", (sheet_w, sheet_h), (20, 22, 26))
    draw = ImageDraw.Draw(comp)
    draw.text((160, 16), f"GP-20017 {label} Hip Cant Comparison: Baseline ({baseline_val}) vs +0.25 (Candidate)", fill=(245, 245, 250))
    draw.text((160, 38), "RTX 5080 WebGPU 1080p Gameplay Eye (Woods Trail)", fill=(180, 185, 190))

    for idx, lt in enumerate(LIGHTS):
        draw.text((160 + idx * (w_tile + 10) + w_tile // 3, 52), lt.upper(), fill=(200, 220, 255))

    rows = [
        (f"Baseline ({baseline_val})", "baseline"),
        ("+0.25 (Candidate)", "candidate")
    ]

    for r_idx, (r_lbl, prefix) in enumerate(rows):
        y = 70 + r_idx * (h_tile + 10)
        draw.text((16, y + h_tile // 2 - 10), r_lbl, fill=(230, 230, 230))
        for c_idx, lt in enumerate(LIGHTS):
            x = 160 + c_idx * (w_tile + 10)
            img_path = OUT_DIR / f"{key}-{prefix}-{lt}.jpg"
            if img_path.exists():
                im = Image.open(img_path).resize((w_tile, h_tile), Image.Resampling.BILINEAR)
                comp.paste(im, (x, y))
                draw.rectangle([x, y, x + w_tile, y + h_tile], outline=(70, 75, 85), width=1)

    out_file = OUT_DIR / f"{key}-fourlight-comparison.jpg"
    comp.save(out_file, quality=90)
    print(f"Comparison sheet saved: {out_file}")

def main():
    build_comparison_sheet("shotgun", "Shotgun", "+0.025")
    build_comparison_sheet("aa12", "Breacher (AA-12)", "+0.03")

if __name__ == "__main__":
    main()
