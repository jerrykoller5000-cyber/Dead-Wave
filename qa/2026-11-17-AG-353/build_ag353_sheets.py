"""Build one contact sheet per survivor (Claude outputs/J168/survivor-views/sheet-<who>.jpg)."""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path("C:/Users/Zero/Desktop/Tiny Trek")
OUT_DIR = ROOT / "Claude outputs/J168/survivor-views"


def load_font(sz, bold=False):
    cands = (
        ["C:/Windows/Fonts/consolab.ttf", "C:/Windows/Fonts/arialbd.ttf", "C:/Windows/Fonts/segoeuib.ttf"]
        if bold
        else ["C:/Windows/Fonts/consola.ttf", "C:/Windows/Fonts/arial.ttf", "C:/Windows/Fonts/segoeui.ttf"]
    )
    for p in cands:
        if Path(p).exists():
            return ImageFont.truetype(p, sz)
    return ImageFont.load_default()


def main():
    summary = json.loads((OUT_DIR / "summary.json").read_text(encoding="utf-8"))
    by_who = {}
    for s in summary["shots"]:
        by_who.setdefault(s["who"], []).append(s)

    f_hdr = load_font(22, bold=True)
    f_sub = load_font(14, bold=False)
    f_lbl = load_font(14, bold=True)
    f_meta = load_font(12, bold=False)

    order = ["front", "3q", "side", "back"]
    tw, th = 460, 460
    cols = 4
    pad = 12
    hdr = 68
    lbl = 44
    W = pad + cols * (tw + pad)
    H = hdr + pad + th + lbl + pad

    idx_md5 = summary["sourceMd5"].get("index.html", "?")[:8]
    built = []
    for who, shots in by_who.items():
        shot_map = {s["view"]: s for s in shots}
        assert len(shot_map) == 4, f"{who}: expected 4 shots, got {len(shot_map)}"
        hashes = {s["sha1"] for s in shots}
        assert len(hashes) == 4, f"{who}: duplicate pixels found ({len(hashes)}/4 unique)"

        sinfo = summary["survivors"][who]
        sheet = Image.new("RGB", (W, H), (18, 20, 24))
        d = ImageDraw.Draw(sheet)
        d.text(
            (pad, 10),
            f"AG-353 (J168) LIVE SURVIVOR: {who.upper()} ({sinfo['camp']}) · RTX 5080 WebGPU (index {idx_md5})",
            fill=(244, 214, 118),
            font=f_hdr,
        )
        d.text(
            (pad, 40),
            f"1600x1600 Noon Studio | standing idle, unarmed hands | meshes={sinfo['meshCount']} | backRifle={sinfo['hasBackRifle']} | m240={sinfo['hasM240']} | buildErr={sinfo['buildError']}",
            fill=(185, 210, 228),
            font=f_sub,
        )

        for c, view in enumerate(order):
            s = shot_map[view]
            x = pad + c * (tw + pad)
            y = hdr + pad
            im = Image.open(ROOT / s["file"]).convert("RGB").resize((tw, th), Image.Resampling.LANCZOS)
            sheet.paste(im, (x, y))
            d.rectangle([x, y, x + tw - 1, y + th - 1], outline=(240, 200, 110), width=2)
            d.rectangle([x, y + th, x + tw, y + th + lbl], fill=(28, 32, 38))
            d.text((x + 6, y + th + 5), s["label"], fill=(240, 200, 110), font=f_lbl)
            d.text(
                (x + 6, y + th + 24),
                f"fill={s['fillHeightPct']:.1f}%x{s['fillWidthPct']:.1f}% | h={s['boundsH']:.2f}m | md5={s['md5']}",
                fill=(210, 220, 230),
                font=f_meta,
            )

        out_path = OUT_DIR / f"sheet-{who}.jpg"
        sheet.save(out_path, quality=92)
        built.append(out_path)
        print(f"Wrote {out_path} ({out_path.stat().st_size} bytes)")

    assert len(built) == 3
    print("ALL 3 SURVIVOR SHEETS VERIFIED.")


if __name__ == "__main__":
    main()
