"""Build J167 landed guardian + caveguard sheet (index.html 668e97a3 = CB-349 v5 + CB-352 c)."""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path("C:/Users/Zero/Desktop/Tiny Trek")
OUT_DIR = ROOT / "review/CB-349/landed"


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
    types = summary["types"]

    rows = [
        ("gallop", "Gallop (deepest plunge)"),
        ("fold", "Gallop Fold (trail furthest back)"),
        ("stand", "Stand"),
    ]
    cols = [
        ("guardian", "side", "Guardian · Side"),
        ("guardian", "low3q", "Guardian · Low 3/4"),
        ("caveguard", "side", "Cave Guardian · Side"),
        ("caveguard", "low3q", "Cave Guardian · Low 3/4"),
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

    g_s = types["guardian"]["gallopScanSummary"]
    c_s = types["caveguard"]["gallopScanSummary"]
    d.text(
        (pad, 8),
        f"J167 Landed Guardian & Cave Guardian (index {summary['indexMd5']} = CB-349 v5 + CB-352 c · 5080 WebGPU, noon)",
        fill=(244, 214, 118),
        font=f_hdr,
    )
    d.text(
        (pad, 36),
        f"90-frame gallop ankle/sole min..med (cm): Guardian {g_s['ankleMinCm']}/{g_s['ankleMedianCm']} (sole {g_s['soleMinCm']}/{g_s['soleMedianCm']})  |  "
        f"Caveguard {c_s['ankleMinCm']}/{c_s['ankleMedianCm']} (sole {c_s['soleMinCm']}/{c_s['soleMedianCm']})  |  detail={summary['guardianDetailMd5']} world={summary['caveGuardianMd5']}",
        fill=(185, 210, 228),
        font=f_sub,
    )

    seen_md5s = set()
    for ri, (mode, rlabel) in enumerate(rows):
        for ci, (tk, view, clabel) in enumerate(cols):
            pdata = types[tk]
            shot = pdata[f"{mode}Shots"][view]
            frame = pdata[f"{mode}Frame"]
            seen_md5s.add(shot["md5"])
            im = Image.open(ROOT / shot["file"]).convert("RGB").resize((tw, th), Image.Resampling.LANCZOS)
            x = pad + ci * (tw + pad)
            y = hdr + pad + ri * (th + lbl + pad)
            sheet.paste(im, (x, y))
            d.rectangle([x, y + th, x + tw, y + th + lbl], fill=(28, 32, 38))
            d.text((x + 6, y + th + 4), f"{clabel} — {rlabel}", fill=(145, 240, 175), font=f_lbl)
            trail_str = f" | trail={frame['trail_back_cm']:+.0f}cm" if "trail_back_cm" in frame else ""
            d.text(
                (x + 6, y + th + 21),
                f"v={frame['speed']:.2f}m/s | ankle L/R={frame['ankleL_cm']:+.1f}/{frame['ankleR_cm']:+.1f}cm | sole L/R={frame['soleL_cm']:+.1f}/{frame['soleR_cm']:+.1f}cm{trail_str}",
                fill=(220, 228, 236),
                font=f_lbl,
            )

    assert len(seen_md5s) == 12, f"Expected 12 unique tile MD5s, got {len(seen_md5s)}"
    out_path = OUT_DIR / "CB-349-landed-sheet.jpg"
    sheet.save(out_path, quality=92)
    print(f"Wrote {out_path} ({out_path.stat().st_size} bytes, {len(seen_md5s)}/12 unique PNGs)")


if __name__ == "__main__":
    main()
