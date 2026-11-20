"""Build review/AG-341/sheet-leaper-live.jpg from LIVE mode leaper capture."""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path("C:/Users/Zero/Desktop/Tiny Trek")
OUT_DIR = ROOT / "review/AG-341"


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
    summary = json.loads((OUT_DIR / "leaper-live/summary.json").read_text(encoding="utf-8"))
    shots = summary["shots"]
    shot_map = {(s["light"], s["view"]): s for s in shots}
    assert len(shot_map) == 9, f"Expected 9 shots, got {len(shot_map)}"
    sha1s = {s["sha1"] for s in shots}
    assert len(sha1s) == 9, f"Expected 9 unique shots, got {len(sha1s)}"

    f_hdr = load_font(22, bold=True)
    f_sub = load_font(14, bold=False)
    f_lbl = load_font(14, bold=True)
    f_meta = load_font(12, bold=False)

    order = [
        ("noon", "front"),
        ("noon", "3q"),
        ("noon", "side"),
        ("noon", "back"),
        ("noon", "head"),
        ("night", "front"),
        ("night", "3q"),
        ("night", "side"),
        ("night", "back"),
    ]

    tw, th = 440, 440
    cols, rows = 5, 2
    pad, hdr, lbl = 12, 68, 44
    W = pad + cols * (tw + pad)
    H = hdr + pad + rows * (th + lbl + pad)
    sheet = Image.new("RGB", (W, H), (18, 20, 24))
    d = ImageDraw.Draw(sheet)

    sp = summary["spawn"]
    m = summary["sourceMd5"]
    d.text(
        (pad, 10),
        f"AG-347 (J167) LIVE LEAPER (mode=live, paw-solved) · RTX 5080 WebGPU (index {m['index.html']}, leaper-motion {m['game/leaper-motion.js']})",
        fill=(244, 214, 118),
        font=f_hdr,
    )
    d.text(
        (pad, 40),
        f"mode=live | floorGap={sp['floorGapCm']}cm | boundsH={sp['boundsH']}m | castShadow={sp['castShadow']} | meshes={sp['meshCount']} | leapT={sp['leapT']}",
        fill=(185, 210, 228),
        font=f_sub,
    )

    for idx, (light, view) in enumerate(order):
        s = shot_map[(light, view)]
        r = 0 if light == "noon" else 1
        c = idx if light == "noon" else idx - 5
        x = pad + c * (tw + pad)
        y = hdr + pad + r * (th + lbl + pad)
        im = Image.open(ROOT / s["file"]).convert("RGB").resize((tw, th), Image.Resampling.LANCZOS)
        sheet.paste(im, (x, y))
        border_col = (240, 200, 110) if light == "noon" else (120, 175, 255)
        d.rectangle([x, y, x + tw - 1, y + th - 1], outline=border_col, width=2)
        d.rectangle([x, y + th, x + tw, y + th + lbl], fill=(28, 32, 38))
        d.text((x + 6, y + th + 5), s["label"], fill=border_col, font=f_lbl)
        d.text(
            (x + 6, y + th + 24),
            f"fill={s['fillHeightPct']:.1f}%x{s['fillWidthPct']:.1f}% | h={s['boundsH']:.2f}m | md5={s['md5']}",
            fill=(210, 220, 230),
            font=f_meta,
        )

    sx = pad + 4 * (tw + pad)
    sy = hdr + pad + 1 * (th + lbl + pad)
    d.rectangle([sx, sy, sx + tw - 1, sy + th + lbl - 1], fill=(24, 27, 33), outline=(90, 98, 112), width=2)
    notes = [
        "Type: leaper (LIVE mode)",
        f"applyLeaperMotion: active (3 ticks)",
        f"floorGapCm: {sp['floorGapCm']} cm",
        f"boundsH: {sp['boundsH']} m",
        f"castShadow meshes: {sp['castShadow']}/{sp['meshCount']}",
        f"joints vs floor: hips={sp['jointFloorCm'].get('hips')}cm",
        f"  armL/elbowL: {sp['jointFloorCm'].get('armL')}/{sp['jointFloorCm'].get('elbowL')}cm",
        f"  legL/shinL: {sp['jointFloorCm'].get('legL')}/{sp['jointFloorCm'].get('shinL')}cm",
        f"index.html: {m['index.html']}",
        f"leaper-motion: {m['game/leaper-motion.js']}",
        f"concepts: {m['studio/zombie-concepts.js']}",
        f"Shots: 9/9 unique (noon 5 + night 4)",
        f"Page/Insp errs: {len(summary['pageErrors'])}/{len(summary['inspectorErrors'])}",
    ]
    for ni, ln in enumerate(notes):
        d.text((sx + 14, sy + 18 + ni * 28), ln, fill=(215, 224, 234), font=f_sub)

    out_path = OUT_DIR / "sheet-leaper-live.jpg"
    sheet.save(out_path, quality=92)
    print(f"Wrote {out_path} ({out_path.stat().st_size} bytes, {len(sha1s)}/9 unique)")


if __name__ == "__main__":
    main()
