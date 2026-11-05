import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
BEFORE_DIR = ROOT / "qa/2026-11-03-AG-225/stills"
AFTER_DIR = ROOT / "review/GP-20021"
OUT_DIR = ROOT / "qa/2026-11-03-AG-227"
OUT_DIR.mkdir(parents=True, exist_ok=True)

GUNS = [
    ("aa12", "Breacher-12 (aa12)", (1300, 620, 1520, 820)),
    ("shotgun", "Shotgun (shotgun)", (1260, 660, 1520, 880)),
    ("launcher", "Launcher (launcher)", (1220, 640, 1460, 840)),
    ("flamer", "Flamer (flamer)", (1240, 620, 1480, 820)),
]

LIGHTS = ["noon", "overcast", "dusk", "night"]


def load_font(size: int, bold: bool = False):
    candidates = (
        ["C:/Windows/Fonts/consolab.ttf", "C:/Windows/Fonts/arialbd.ttf"]
        if bold
        else ["C:/Windows/Fonts/consola.ttf", "C:/Windows/Fonts/arial.ttf"]
    )
    for c in candidates:
        if Path(c).exists():
            return ImageFont.truetype(c, size)
    return ImageFont.load_default()


def main():
    font_title = load_font(20, bold=True)
    font_sub = load_font(14, bold=False)

    metrics = {}

    # Build a 4-column (lights) x 8-row (each gun Before vs After cropped around the view gun) sheet
    # Crop box for view-gun lower-right region: (900, 460, 1860, 1060) -> 960x600 -> scaled to 560x350
    crop_box = (900, 460, 1860, 1060)
    tile_w, tile_h = 560, 350
    pad = 10
    header_h = 54
    cols = 4
    rows = len(GUNS) * 2
    sheet_w = cols * tile_w + (cols + 1) * pad
    sheet_h = header_h + rows * tile_h + (rows + 1) * pad

    sheet = Image.new("RGB", (sheet_w, sheet_h), (14, 16, 20))
    draw = ImageDraw.Draw(sheet)
    draw.text(
        (pad, 15),
        "AG-227 · GP-20021 Before (AG-225) vs After (GP-20021 2x Fold-Static + Edge Glint) · 4 Lights",
        fill=(235, 240, 248),
        font=font_title,
    )

    for g_idx, (gkey, glabel, rbox) in enumerate(GUNS):
        metrics[gkey] = {}
        for l_idx, lkey in enumerate(LIGHTS):
            before_path = BEFORE_DIR / f"{gkey}-hip-{lkey}.jpg"
            after_path = AFTER_DIR / f"{gkey}-{lkey}.jpg"

            b_img = Image.open(before_path).convert("RGB")
            a_img = Image.open(after_path).convert("RGB")

            b_arr = np.asarray(b_img.crop(rbox), dtype=np.float32)
            a_arr = np.asarray(a_img.crop(rbox), dtype=np.float32)

            b_luma = float((0.2126 * b_arr[:, :, 0] + 0.7152 * b_arr[:, :, 1] + 0.0722 * b_arr[:, :, 2]).mean())
            a_luma = float((0.2126 * a_arr[:, :, 0] + 0.7152 * a_arr[:, :, 1] + 0.0722 * a_arr[:, :, 2]).mean())
            b_p90 = float(np.percentile(0.2126 * b_arr[:, :, 0] + 0.7152 * b_arr[:, :, 1] + 0.0722 * b_arr[:, :, 2], 90))
            a_p90 = float(np.percentile(0.2126 * a_arr[:, :, 0] + 0.7152 * a_arr[:, :, 1] + 0.0722 * a_arr[:, :, 2], 90))
            b_std = float((0.2126 * b_arr[:, :, 0] + 0.7152 * b_arr[:, :, 1] + 0.0722 * b_arr[:, :, 2]).std())
            a_std = float((0.2126 * a_arr[:, :, 0] + 0.7152 * a_arr[:, :, 1] + 0.0722 * a_arr[:, :, 2]).std())

            metrics[gkey][lkey] = {
                "beforeMeanLuma": round(b_luma, 2),
                "afterMeanLuma": round(a_luma, 2),
                "lumaGainPct": round((a_luma - b_luma) / max(1.0, b_luma) * 100.0, 1),
                "beforeP90Luma": round(b_p90, 2),
                "afterP90Luma": round(a_p90, 2),
                "beforeStdLuma": round(b_std, 2),
                "afterStdLuma": round(a_std, 2),
            }

            for is_after, src_img, mean_l, p90_l, std_l in [
                (False, b_img, b_luma, b_p90, b_std),
                (True, a_img, a_luma, a_p90, a_std),
            ]:
                row = g_idx * 2 + (1 if is_after else 0)
                x0 = pad + l_idx * (tile_w + pad)
                y0 = header_h + pad + row * (tile_h + pad)
                tile = src_img.crop(crop_box).resize((tile_w, tile_h), Image.Resampling.LANCZOS)
                td = ImageDraw.Draw(tile, "RGBA")
                td.rectangle([0, 0, tile_w, 44], fill=(8, 10, 14, 198))
                tag = "AFTER (GP-20021)" if is_after else "BEFORE (AG-225)"
                col_fill = (130, 250, 155, 255) if is_after else (255, 210, 120, 255)
                td.text((8, 4), f"{glabel} · {lkey.upper()} · {tag}", fill=col_fill, font=font_sub)
                td.text((8, 22), f"receiver luma: mean={mean_l:.1f}  p90={p90_l:.1f}  contrast(std)={std_l:.1f}", fill=(220, 230, 245, 255), font=font_sub)
                sheet.paste(tile, (x0, y0))

    sheet_path = OUT_DIR / "before-after-4light-sheet.jpg"
    sheet.save(sheet_path, quality=92)
    (OUT_DIR / "metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    print(json.dumps(metrics, indent=2))
    print(f"Saved {sheet_path}")


if __name__ == "__main__":
    main()
