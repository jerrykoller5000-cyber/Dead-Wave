"""Build sheet for KR-7 landed s24 full-press close look (review/J165-landed-s24/sheet.jpg)."""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path("C:/Users/Zero/Desktop/Tiny Trek")
OUT_DIR = ROOT / "review/J165-landed-s24"


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
    by_name = {s["name"]: s for s in summary["shots"]}
    sha1s = {s["sha1"] for s in summary["shots"]}
    assert len(sha1s) == len(summary["shots"]), f"Expected unique frames, got {len(sha1s)}/{len(summary['shots'])}"

    tiles = [
        ("kr7-s24-close-left-press-noon", "1) CLOSE LEFT · FULL PRESS (t=0.245s, hand shown)"),
        ("kr7-s24-close-left-press-nohand-noon", "2) CLOSE LEFT · FULL PRESS (same cam, glove hidden -> pad)"),
        ("kr7-s24-close-front-press-noon", "3) CLOSE FRONT · FULL PRESS (t=0.245s)"),
        ("kr7-s24-eye-press-noon", "4) EYE 1P · FULL PRESS (t=0.245s)"),
        ("kr7-s24-close-left-rest-noon", "5) CLOSE LEFT · REST (t=0, before key 2)"),
        ("kr7-s24-close-left-release-noon", "6) CLOSE LEFT · RELEASE (t=0.450s)"),
    ]

    tw, th = 640, 360
    pad = 10
    hdr = 60
    lbl = 36
    cols, rows = 2, 3
    W = pad + cols * (tw + pad)
    H = hdr + pad + rows * (th + lbl + pad)
    sheet = Image.new("RGB", (W, H), (18, 20, 24))
    d = ImageDraw.Draw(sheet)
    f_hdr = load_font(18, bold=True)
    f_sub = load_font(13, bold=False)
    f_lbl = load_font(13, bold=True)

    m = summary["md5"]
    d.text((pad, 8), "KR-7 (ak) Light C LANDED s24: Full Press Close Look (5080 WebGPU, noon, Digit2)", fill=(244, 214, 118), font=f_hdr)
    d.text(
        (pad, 34),
        f"viewmodel-poses={m['game/viewmodel-poses.js']} | viewmodel={m['game/viewmodel.js']} | attachments={m['studio/weapon-attachments.js']} | index={m['index.html']}",
        fill=(185, 208, 224),
        font=f_sub,
    )

    for idx, (name, title) in enumerate(tiles):
        s = by_name[name]
        r, c = divmod(idx, cols)
        x = pad + c * (tw + pad)
        y = hdr + pad + r * (th + lbl + pad)
        im = Image.open(ROOT / s["file"]).convert("RGB").resize((tw, th), Image.Resampling.LANCZOS)
        sheet.paste(im, (x, y))
        border = (130, 235, 170) if idx < 2 else (140, 185, 230)
        d.rectangle([x, y, x + tw - 1, y + th - 1], outline=border, width=2)
        d.rectangle([x, y + th, x + tw, y + th + lbl], fill=(28, 32, 38))
        d.text((x + 6, y + th + 3), title, fill=border, font=f_lbl)
        ls = s['lightState']
        light_str = f"t={ls['t']:.3f}s k={ls['k']:.2f} press={ls['press']} still={ls.get('still')}" if ls else "rest (light=null)"
        d.text(
            (x + 6, y + th + 19),
            f"{light_str} | sw={s['swPos']} | {s['md5']}",
            fill=(210, 220, 230),
            font=load_font(11, bold=False),
        )

    out_path = OUT_DIR / "sheet.jpg"
    sheet.save(out_path, quality=92)
    print(f"Wrote {out_path} ({out_path.stat().st_size} bytes, {len(sha1s)} unique PNGs)")


if __name__ == "__main__":
    main()
