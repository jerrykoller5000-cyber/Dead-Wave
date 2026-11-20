"""Build per-type contact sheets (review/AG-341/sheet-<type>.jpg) from AG-341 5080 WebGPU PNGs."""
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
    summary = json.loads((OUT_DIR / "summary.json").read_text(encoding="utf-8"))
    by_type = {}
    for s in summary["shots"]:
        by_type.setdefault(s["type"], []).append(s)

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
    cols = 5
    rows = 2
    pad = 12
    hdr = 68
    lbl = 44
    W = pad + cols * (tw + pad)
    H = hdr + pad + rows * (th + lbl + pad)

    built = []
    for type_key, shots in by_type.items():
        shot_map = {(s["light"], s["view"]): s for s in shots}
        assert len(shot_map) == 9, f"{type_key}: expected 9 shots, got {len(shot_map)}"
        md5s = {s["sha1"] for s in shots}
        assert len(md5s) == 9, f"{type_key}: duplicate pixels found ({len(md5s)}/9 unique)"

        sheet = Image.new("RGB", (W, H), (18, 20, 24))
        d = ImageDraw.Draw(sheet)
        tinfo = summary["types"].get(type_key, {})
        idx_md5 = summary["sourceMd5"].get("index.html", "?")
        g_md5 = summary["sourceMd5"].get("studio/zombie-guardian-detail.js", "?")
        d.text(
            (pad, 10),
            f"AG-341 (J167) LIVE {type_key.upper()} · RTX 5080 WebGPU (index {idx_md5}, guardian-detail {g_md5})",
            fill=(244, 214, 118),
            font=f_hdr,
        )
        d.text(
            (pad, 40),
            f"mode={tinfo.get('mode')} | meshes={tinfo.get('meshCount')} | buildError={tinfo.get('buildError')} | standing idle, 85% height fill",
            fill=(185, 210, 228),
            font=f_sub,
        )

        # Row 0: 5 noon tiles (col 0..4), Row 1: 4 night tiles (col 0..3) + summary box in slot (1, 4)
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

        # Summary card in bottom-right cell (row 1, col 4)
        sx = pad + 4 * (tw + pad)
        sy = hdr + pad + 1 * (th + lbl + pad)
        d.rectangle([sx, sy, sx + tw - 1, sy + th + lbl - 1], fill=(24, 27, 33), outline=(90, 98, 112), width=2)
        notes = [
            f"Type: {type_key}",
            f"Mode: {tinfo.get('mode')}",
            f"Stand settled: {tinfo.get('settledStand')}",
            f"Visible meshes: {tinfo.get('meshCount')}",
            f"index.html: {idx_md5}",
            f"guardian-detail: {g_md5}",
            f"cave-guardian: {summary['sourceMd5'].get('world/cave-guardian.js', '?')}",
            f"concepts: {summary['sourceMd5'].get('studio/zombie-concepts.js', '?')}",
            f"detail: {summary['sourceMd5'].get('studio/zombie-detail.js', '?')}",
            f"humanoids: {summary['sourceMd5'].get('studio/zombie-humanoids.js', '?')}",
            f"brute-anat: {summary['sourceMd5'].get('studio/zombie-brute-anatomy.js', '?')}",
            f"Shots: 9/9 unique (noon 5 + night 4)",
            f"Renderer: {summary['renderer'].get('backend')}",
            f"Page/Insp errs: {len(summary['pageErrors'])}/{len(summary['inspectorErrors'])}",
        ]
        for ni, ln in enumerate(notes):
            d.text((sx + 14, sy + 18 + ni * 28), ln, fill=(215, 224, 234), font=f_sub)

        out_path = OUT_DIR / f"sheet-{type_key}.jpg"
        sheet.save(out_path, quality=92)
        built.append((out_path, len(md5s)))
        print(f"Wrote {out_path} ({out_path.stat().st_size} bytes)")

    assert len(built) == 12, f"Expected 12 type sheets, got {len(built)}"
    print("ALL 12 SHEETS VERIFIED.")


if __name__ == "__main__":
    main()
