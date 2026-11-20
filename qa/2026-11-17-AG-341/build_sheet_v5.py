"""Build before/after comparison sheet for CB-349 v5 (AG-342) in review/CB-349/v5-ag/."""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path("C:/Users/Zero/Desktop/Tiny Trek")
OUT_DIR = ROOT / "review/CB-349/v5-ag"


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
    bef = summary["phases"]["before"]["types"]
    aft = summary["phases"]["after"]["types"]

    rows = [
        ("guardian", "gallop", "Guardian · Gallop (deepest plunge)"),
        ("guardian", "fold", "Guardian · Gallop Fold (trail furthest back)"),
        ("guardian", "stand", "Guardian · Stand"),
        ("caveguard", "gallop", "Cave Guardian · Gallop (deepest plunge)"),
        ("caveguard", "fold", "Cave Guardian · Gallop Fold (trail furthest back)"),
        ("caveguard", "stand", "Cave Guardian · Stand"),
    ]
    cols = [
        ("before", "side", "BEFORE (live 9311196f) · Side"),
        ("after", "side", "AFTER (CB-349 v5 b22ffe13) · Side"),
        ("before", "low3q", "BEFORE (live 9311196f) · Low 3/4"),
        ("after", "low3q", "AFTER (CB-349 v5 b22ffe13) · Low 3/4"),
    ]

    tw, th = 560, 315
    pad = 10
    hdr = 68
    lbl = 40
    W = pad + len(cols) * (tw + pad)
    H = hdr + pad + len(rows) * (th + lbl + pad)
    sheet = Image.new("RGB", (W, H), (18, 20, 24))
    d = ImageDraw.Draw(sheet)
    f_hdr = load_font(20, bold=True)
    f_sub = load_font(13, bold=False)
    f_lbl = load_font(12, bold=True)

    g_b = bef["guardian"]["gallopScanSummary"]
    g_a = aft["guardian"]["gallopScanSummary"]
    c_b = bef["caveguard"]["gallopScanSummary"]
    c_a = aft["caveguard"]["gallopScanSummary"]
    d.text((pad, 8), "CB-349 v5 (AG-342): Guardian & Cave Guardian Hind Soles BEFORE vs AFTER (RTX 5080 WebGPU, noon)", fill=(244, 214, 118), font=f_hdr)
    d.text(
        (pad, 36),
        f"90-frame gallop ankle/sole min..med (cm): Guardian {g_b['ankleMinCm']}/{g_b['ankleMedianCm']} (sole {g_b['soleMinCm']}/{g_b['soleMedianCm']}) -> {g_a['ankleMinCm']}/{g_a['ankleMedianCm']} (sole {g_a['soleMinCm']}/{g_a['soleMedianCm']})  |  "
        f"Caveguard {c_b['ankleMinCm']}/{c_b['ankleMedianCm']} (sole {c_b['soleMinCm']}/{c_b['soleMedianCm']}) -> {c_a['ankleMinCm']}/{c_a['ankleMedianCm']} (sole {c_a['soleMinCm']}/{c_a['soleMedianCm']})",
        fill=(185, 210, 228),
        font=f_sub,
    )

    before_md5s = set()
    after_md5s = set()
    for ri, (tk, mode, rlabel) in enumerate(rows):
        for ci, (phase, view, clabel) in enumerate(cols):
            pdata = (bef if phase == "before" else aft)[tk]
            shot = pdata[f"{mode}Shots"][view]
            frame = pdata[f"{mode}Frame"]
            (before_md5s if phase == "before" else after_md5s).add(shot["md5"])
            im = Image.open(ROOT / shot["file"]).convert("RGB").resize((tw, th), Image.Resampling.LANCZOS)
            x = pad + ci * (tw + pad)
            y = hdr + pad + ri * (th + lbl + pad)
            sheet.paste(im, (x, y))
            d.rectangle([x, y + th, x + tw, y + th + lbl], fill=(28, 32, 38))
            tag_col = (255, 145, 130) if phase == "before" else (145, 240, 175)
            d.text((x + 6, y + th + 4), f"{rlabel} — {clabel}", fill=tag_col, font=f_lbl)
            trail_str = f" | trail={frame['trail_back_cm']:+.0f}cm" if "trail_back_cm" in frame else ""
            d.text(
                (x + 6, y + th + 21),
                f"v={frame['speed']:.2f}m/s | ankle L/R={frame['ankleL_cm']:+.1f}/{frame['ankleR_cm']:+.1f}cm | sole L/R={frame['soleL_cm']:+.1f}/{frame['soleR_cm']:+.1f}cm{trail_str}",
                fill=(220, 228, 236),
                font=f_lbl,
            )

    assert len(before_md5s) == 12, f"Expected 12 unique BEFORE tile MD5s, got {len(before_md5s)}"
    assert len(after_md5s) == 12, f"Expected 12 unique AFTER tile MD5s, got {len(after_md5s)}"
    for tk in ("guardian", "caveguard"):
        for mode in ("gallop", "fold"):
            for view in ("side", "low3q"):
                assert bef[tk][f"{mode}Shots"][view]["md5"] != aft[tk][f"{mode}Shots"][view]["md5"], f"{mode} {tk} {view} unchanged!"
    out_path = OUT_DIR / "CB-349-v5-before-after-sheet.jpg"
    sheet.save(out_path, quality=92)
    print(f"Wrote {out_path} ({out_path.stat().st_size} bytes, before={len(before_md5s)}/12, after={len(after_md5s)}/12 unique PNGs)")


if __name__ == "__main__":
    main()
