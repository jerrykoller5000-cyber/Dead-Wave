import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "qa/2026-11-03-AG-229"
STILLS_DIR = OUT_DIR / "stills"

GUN_LABELS = {
    "minigun": "Minigun vs m134_handheld_minigun.glb",
    "m4": "GW-4 (m4) vs m4_sopmod.glb",
    "ak": "KR-7 (ak) vs ak-47.glb",
    "uzi": "Wasp (uzi) vs uzi.glb",
    "shotgun": "Shotgun vs shotgun.glb",
    "aa12": "Breacher-12 (aa12) vs aa12.glb",
    "revolver": "Revolver vs 38_special_revolver.glb",
    "sniper": "Sniper vs sniper.glb",
    "launcher": "Launcher vs naders_grenade_launcher.glb",
    "chainsaw": "Chainsaw vs chainsaw.glb",
}


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


def smart_crop_and_fit(img: Image.Image, target_w: int, target_h: int, header_reserve: int = 68) -> Image.Image:
    # Ignore the left UI panel (x < 355)
    viewport = img.crop((355, 0, img.width, img.height))
    arr = np.asarray(viewport, dtype=np.int16)
    bg = np.array([18, 20, 24], dtype=np.int16)
    diff = np.abs(arr - bg).max(axis=2)
    ys, xs = np.where(diff > 5)
    if len(xs) > 20 and len(ys) > 20:
        x0, x1 = max(0, int(xs.min()) - 28), min(viewport.width, int(xs.max()) + 28)
        y0, y1 = max(0, int(ys.min()) - 28), min(viewport.height, int(ys.max()) + 28)
        sub = viewport.crop((x0, y0, x1, y1))
    else:
        sub = viewport

    avail_w = target_w - 16
    avail_h = target_h - header_reserve - 12
    scale = min(avail_w / max(1, sub.width), avail_h / max(1, sub.height))
    nw = max(1, int(round(sub.width * scale)))
    nh = max(1, int(round(sub.height * scale)))
    resized = sub.resize((nw, nh), Image.Resampling.LANCZOS)

    canvas = Image.new("RGB", (target_w, target_h), (18, 20, 24))
    px = (target_w - nw) // 2
    py = header_reserve + (avail_h - nh) // 2
    canvas.paste(resized, (px, py))
    return canvas


def build_group_sheet(gun_ids, title, out_name, metrics, views):
    font_title = load_font(22, bold=True)
    font_sub = load_font(13, bold=False)
    font_bold = load_font(14, bold=True)

    tile_w, tile_h = 640, 440
    pad = 12
    header_h = 56
    cols = len(views)
    rows = len(gun_ids)
    sheet_w = cols * tile_w + (cols + 1) * pad
    sheet_h = header_h + rows * tile_h + (rows + 1) * pad

    sheet = Image.new("RGB", (sheet_w, sheet_h), (12, 14, 18))
    draw = ImageDraw.Draw(sheet)
    draw.text((pad, 15), title, fill=(235, 240, 248), font=font_title)

    for r_idx, gid in enumerate(gun_ids):
        m = metrics["results"][gid]
        ob = m["ours"]["box"]
        rb = m["ref"]["box"]
        d = m["deltas"]
        for c_idx, (vkey, vlabel) in enumerate(views):
            img = Image.open(STILLS_DIR / f"{gid}-{vkey}.jpg").convert("RGB")
            tile = smart_crop_and_fit(img, tile_w, tile_h, header_reserve=66)
            td = ImageDraw.Draw(tile, "RGBA")
            td.rectangle([0, 0, tile_w, 64], fill=(8, 10, 14, 220))
            td.text((8, 5), f"{GUN_LABELS[gid]} · {vlabel}", fill=(130, 245, 165, 255), font=font_bold)
            td.text(
                (8, 25),
                f"Ours: {ob['z']:.3f}×{ob['y']:.3f}×{ob['x']:.3f}m | Ref: {rb['z']:.3f}×{rb['y']:.3f}×{rb['x']:.3f}m (dL={d['lengthPct']:+.1f}%, dH={d['heightPct']:+.1f}%)",
                fill=(225, 232, 245, 255),
                font=font_sub,
            )
            td.text(
                (8, 43),
                f"Rake: {m['ours']['rakeDeg']:.1f}° vs {m['ref']['rakeDeg']:.1f}° ({d['gripRakeDeltaDeg']:+.1f}°) | SightH: {m['ours']['sightH']:.3f} vs {m['ref']['sightH']:.3f}m | Ref tris: {m['ref']['triCount']:,}",
                fill=(200, 212, 230, 255),
                font=font_sub,
            )
            x0 = pad + c_idx * (tile_w + pad)
            y0 = header_h + pad + r_idx * (tile_h + pad)
            sheet.paste(tile, (x0, y0))

    out_path = OUT_DIR / out_name
    sheet.save(out_path, quality=92)
    print(f"Saved {out_path}")


def main():
    metrics = json.loads((OUT_DIR / "metrics.json").read_text(encoding="utf-8"))
    views_3 = [
        ("side", "SIDE (Ours Below · Ref Above)"),
        ("top", "TOP (Ours Left · Ref Right)"),
        ("orbit", "ORBIT (3/4 View)"),
    ]
    views_2 = [
        ("side", "SIDE (Ours Below · Ref Above)"),
        ("top", "TOP (Ours Left · Ref Right)"),
    ]
    build_group_sheet(
        ["m4", "ak", "uzi", "shotgun", "aa12"],
        "AG-229 · Rifles, SMG & Shotguns vs Jerry's Reference GLBs (tools/refview · Side, Top & Orbit)",
        "sheet-1-rifles-smg-shotguns.jpg",
        metrics,
        views_3,
    )
    build_group_sheet(
        ["sniper", "revolver", "launcher", "minigun", "chainsaw"],
        "AG-229 · Sniper, Revolver & Heavies vs Jerry's Reference GLBs (tools/refview · Side, Top & Orbit)",
        "sheet-2-sniper-sidearm-heavies.jpg",
        metrics,
        views_3,
    )
    build_group_sheet(
        ["m4", "ak", "uzi", "shotgun", "aa12", "sniper", "revolver", "launcher", "minigun", "chainsaw"],
        "AG-229 · Master 10-Gun Reference Comparison (tools/refview · Side & Top at Matched Scale)",
        "all-10-side-top-sheet.jpg",
        metrics,
        views_2,
    )


if __name__ == "__main__":
    main()
