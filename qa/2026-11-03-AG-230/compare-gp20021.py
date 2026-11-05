import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
BEFORE_DIR = ROOT / "qa/2026-11-03-AG-225/stills"
AFTER_DIR = ROOT / "review/GP-20021"
AG227_METRICS_PATH = ROOT / "qa/2026-11-03-AG-227/metrics.json"
OUT_DIR = ROOT / "qa/2026-11-03-AG-230"
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

    ag227_metrics = json.loads(AG227_METRICS_PATH.read_text(encoding="utf-8")) if AG227_METRICS_PATH.exists() else {}
    metrics = {}

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
        "AG-230 · GP-20021 Final Before (AG-225) vs After (GP-20021 Final packedGunPaint + Cross-Pins) · 4 Lights",
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

            b_luma_map = 0.2126 * b_arr[:, :, 0] + 0.7152 * b_arr[:, :, 1] + 0.0722 * b_arr[:, :, 2]
            a_luma_map = 0.2126 * a_arr[:, :, 0] + 0.7152 * a_arr[:, :, 1] + 0.0722 * a_arr[:, :, 2]

            b_luma = float(b_luma_map.mean())
            a_luma = float(a_luma_map.mean())
            b_p90 = float(np.percentile(b_luma_map, 90))
            a_p90 = float(np.percentile(a_luma_map, 90))
            b_std = float(b_luma_map.std())
            a_std = float(a_luma_map.std())

            inter_luma = ag227_metrics.get(gkey, {}).get(lkey, {}).get("afterMeanLuma", None)
            inter_std = ag227_metrics.get(gkey, {}).get(lkey, {}).get("afterStdLuma", None)

            metrics[gkey][lkey] = {
                "beforeMeanLuma": round(b_luma, 2),
                "ag227MeanLuma": inter_luma,
                "afterMeanLuma": round(a_luma, 2),
                "lumaGainPctVsBefore": round((a_luma - b_luma) / max(1.0, b_luma) * 100.0, 1),
                "beforeP90Luma": round(b_p90, 2),
                "afterP90Luma": round(a_p90, 2),
                "beforeStdLuma": round(b_std, 2),
                "ag227StdLuma": inter_std,
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
                tag = "AFTER (GP-20021 FINAL)" if is_after else "BEFORE (AG-225)"
                col_fill = (130, 250, 155, 255) if is_after else (255, 210, 120, 255)
                td.text((8, 4), f"{glabel} · {lkey.upper()} · {tag}", fill=col_fill, font=font_sub)
                td.text((8, 22), f"receiver luma: mean={mean_l:.1f}  p90={p90_l:.1f}  contrast(std)={std_l:.1f}", fill=(220, 230, 245, 255), font=font_sub)
                sheet.paste(tile, (x0, y0))

    sheet_path = OUT_DIR / "before-after-4light-sheet.jpg"
    sheet.save(sheet_path, quality=92)

    # Also build a 1:1 close-up sheet for flamer and shotgun (Before vs After across all 4 lights)
    z_crop = (1040, 520, 1760, 1020)  # 720x500 native pixels
    zw, zh = 576, 400
    z_rows = 4  # Shotgun Before, Shotgun After, Flamer Before, Flamer After
    z_sheet = Image.new("RGB", (cols * zw + (cols + 1) * pad, header_h + z_rows * zh + (z_rows + 1) * pad), (14, 16, 20))
    z_draw = ImageDraw.Draw(z_sheet)
    z_draw.text(
        (pad, 15),
        "AG-230 · Close-Up Receiver & Top Skin Audit: Shotgun & Flamer (Before AG-225 vs Final GP-20021)",
        fill=(235, 240, 248),
        font=font_title,
    )
    for g_idx, (gkey, glabel) in enumerate([("shotgun", "Shotgun"), ("flamer", "Flamer")]):
        for l_idx, lkey in enumerate(LIGHTS):
            b_img = Image.open(BEFORE_DIR / f"{gkey}-hip-{lkey}.jpg").convert("RGB")
            a_img = Image.open(AFTER_DIR / f"{gkey}-{lkey}.jpg").convert("RGB")
            m = metrics[gkey][lkey]
            for is_after, src_img in [(False, b_img), (True, a_img)]:
                row = g_idx * 2 + (1 if is_after else 0)
                x0 = pad + l_idx * (zw + pad)
                y0 = header_h + pad + row * (zh + pad)
                tile = src_img.crop(z_crop).resize((zw, zh), Image.Resampling.LANCZOS)
                td = ImageDraw.Draw(tile, "RGBA")
                td.rectangle([0, 0, zw, 44], fill=(8, 10, 14, 198))
                tag = "FINAL GP-20021" if is_after else "BEFORE AG-225"
                col_fill = (130, 250, 155, 255) if is_after else (255, 210, 120, 255)
                mean_l = m["afterMeanLuma"] if is_after else m["beforeMeanLuma"]
                p90_l = m["afterP90Luma"] if is_after else m["beforeP90Luma"]
                std_l = m["afterStdLuma"] if is_after else m["beforeStdLuma"]
                td.text((8, 4), f"{glabel} · {lkey.upper()} · {tag}", fill=col_fill, font=font_sub)
                td.text((8, 22), f"mean={mean_l:.1f}  p90={p90_l:.1f}  std={std_l:.1f}  (AG-227 mean={m['ag227MeanLuma']})", fill=(220, 230, 245, 255), font=font_sub)
                z_sheet.paste(tile, (x0, y0))

    z_path = OUT_DIR / "flamer-shotgun-zoom-sheet.jpg"
    z_sheet.save(z_path, quality=93)

    (OUT_DIR / "metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    print(json.dumps(metrics, indent=2))
    print(f"Saved {sheet_path} and {z_path}")


if __name__ == "__main__":
    main()
