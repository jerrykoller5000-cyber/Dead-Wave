"""Verify all 16 D201 Brute step1 rear-strapV2 (AG-354) captures and build BEFORE vs CANDIDATE sheets + crops."""
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageFont

ROOT = Path("C:/Users/Zero/Desktop/Tiny Trek")
AG_DIR = ROOT / "review/GT-20111/d201/brute-step1-strap-fix/full-ag-v1"
BEFORE_DIR = AG_DIR / "before"
CAND_DIR = AG_DIR / "candidate"
OUT_DIR = ROOT / "qa/2026-11-17-AG-354"
OUT_DIR.mkdir(parents=True, exist_ok=True)

LIGHTS = [("noon", "Noon"), ("overcast", "Overcast"), ("dusk", "Dusk"), ("night", "Night")]


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


def md5_short(p):
    return hashlib.md5(Path(p).read_bytes()).hexdigest()[:8]


def mean_rgb(im):
    small = im.resize((160, 112), Image.Resampling.BILINEAR)
    px = list(small.get_flattened_data() if hasattr(small, "get_flattened_data") else small.getdata())
    n = len(px)
    return (
        round(sum(c[0] for c in px) / n, 1),
        round(sum(c[1] for c in px) / n, 1),
        round(sum(c[2] for c in px) / n, 1),
    )


def pair_diff_stats(p_a, p_b):
    a = Image.open(p_a).convert("RGB")
    b = Image.open(p_b).convert("RGB")
    assert a.size == b.size
    diff = ImageChops.difference(a, b)
    px = list(diff.get_flattened_data() if hasattr(diff, "get_flattened_data") else diff.getdata())
    changed = sum(1 for r, g, bl in px if (r + g + bl) > 6)
    max_ch = max(max(r, g, bl) for r, g, bl in px)
    mean_abs = sum(r + g + bl for r, g, bl in px) / (len(px) * 3.0)
    return {
        "changedPct": round(100.0 * changed / len(px), 3),
        "maxChannelDiff": max_ch,
        "meanAbsDiff": round(mean_abs, 4),
    }


def verify_all():
    before_rec = json.loads((BEFORE_DIR / "records.json").read_text(encoding="utf-8"))
    cand_rec = json.loads((CAND_DIR / "records.json").read_text(encoding="utf-8"))
    assert len(before_rec) == 8 and len(cand_rec) == 8, (len(before_rec), len(cand_rec))

    stats = {"before": {}, "candidate": {}, "pairDiffs": {}}
    for phase, d, recs in [("before", BEFORE_DIR, before_rec), ("candidate", CAND_DIR, cand_rec)]:
        hashes = set()
        for r in recs:
            fp = d / f"{r['name']}.png"
            assert fp.exists(), f"Missing {fp}"
            im = Image.open(fp).convert("RGB")
            assert im.size == (1280, 900), (fp, im.size)
            h = md5_short(fp)
            assert h not in hashes, f"Duplicate MD5 in {phase}: {fp.name} {h}"
            hashes.add(h)
            rgb = mean_rgb(im)
            assert max(rgb) > 20.0, f"Too dark/blank frame {fp}: {rgb}"
            stats[phase][r["name"]] = {"md5": h, "meanRGB": rgb, "size": list(im.size)}
        assert len(hashes) == 8

    for r in before_rec:
        name = r["name"]
        stats["pairDiffs"][name] = pair_diff_stats(BEFORE_DIR / f"{name}.png", CAND_DIR / f"{name}.png")

    (OUT_DIR / "frame-stats.json").write_text(json.dumps(stats, indent=2), encoding="utf-8")
    print("Verified 8/8 unique before + 8/8 unique candidate 1280x900 PNGs.")
    return stats


def make_pair_sheet(stats):
    pad = 10
    hdr = 56
    sec_h = 24
    lbl = 24
    cell_w, cell_h = 360, 253
    cols = len(LIGHTS)
    sections = [
        ("HEAD BACK CLOSE (3m, FOV 35) · NOON / OVERCAST / DUSK / NIGHT", lambda l: f"head-back-{l}"),
        ("HEAD SIDE CLOSE (3m, FOV 35) · NOON / OVERCAST / DUSK / NIGHT", lambda l: f"head-side-{l}"),
    ]
    W = pad + cols * (cell_w + pad)
    H = hdr + len(sections) * (sec_h + 2 * (cell_h + lbl + pad)) + pad
    canvas = Image.new("RGB", (W, H), (20, 22, 26))
    d = ImageDraw.Draw(canvas)
    f_hdr = load_font(16, bold=True)
    f_sub = load_font(11)
    f_sec = load_font(12, bold=True)
    f_lbl = load_font(11, bold=True)

    d.text((pad, 8), "D201 Brute step1 Rear-Strap V2 (AG-354 full-ag-v1) — Back & Side Closes in Four Lights", fill=(244, 214, 118), font=f_hdr)
    d.text((pad, 31), "UNLANDED V1 (ecf0770e, top) vs UNLANDED V2 (7d30b0b4, bottom) | 15,638->15,734 tris (1 mesh), accepted face exact", fill=(185, 200, 214), font=f_sub)

    y = hdr + 2
    for sec_title, name_fn in sections:
        d.text((pad, y + 4), sec_title, fill=(140, 200, 255), font=f_sec)
        y += sec_h
        for tag, base_dir, border_col in [("BEFORE (step1 V1)", BEFORE_DIR, (220, 120, 90)), ("CANDIDATE (rear V2)", CAND_DIR, (90, 200, 130))]:
            for c, (lkey, llabel) in enumerate(LIGHTS):
                fname = name_fn(lkey)
                im = Image.open(base_dir / f"{fname}.png").convert("RGB").resize((cell_w, cell_h), Image.Resampling.LANCZOS)
                x = pad + c * (cell_w + pad)
                canvas.paste(im, (x, y))
                d.rectangle([x - 1, y - 1, x + cell_w, y + cell_h + lbl], outline=border_col, width=2)
                d.rectangle([x, y + cell_h, x + cell_w, y + cell_h + lbl], fill=(32, 36, 42))
                diff_txt = f" ({stats['pairDiffs'][fname]['changedPct']}%)" if tag.startswith("CANDIDATE") else ""
                d.text((x + 6, y + cell_h + 5), f"{tag} · {llabel}{diff_txt}", fill=(236, 240, 244), font=f_lbl)
            y += cell_h + lbl + pad

    out = OUT_DIR / "sheet-rear-strap-v2-fourlights.jpg"
    canvas.save(out, quality=92)
    print(f"Wrote {out.name} ({W}x{H})")


def make_crops():
    specs = [
        ("head-back-noon.png", (380, 380, 900, 820), "Back Noon (Rear Traps & Plate)"),
        ("head-back-night.png", (380, 380, 900, 820), "Back Night (Rear Traps & Plate)"),
        ("head-side-noon.png", (320, 360, 840, 800), "Side Noon (Back Contour & Traps)"),
        ("head-side-night.png", (320, 360, 840, 800), "Side Night (Back Contour & Traps)"),
    ]
    cw, ch = 400, 340
    pad, hdr, lbl = 10, 50, 24
    W = pad + len(specs) * (cw + pad)
    H = hdr + 2 * (ch + lbl + pad) + pad
    canvas = Image.new("RGB", (W, H), (20, 22, 26))
    d = ImageDraw.Draw(canvas)
    f_hdr = load_font(16, bold=True)
    f_sub = load_font(11)
    f_lbl = load_font(11, bold=True)
    d.text((pad, 8), "D201 Brute step1 Rear-Strap V2 — Zoomed Back & Side Strap-Tip Crops (V1 vs V2)", fill=(244, 214, 118), font=f_hdr)
    d.text((pad, 29), "Top row: BEFORE (step1 V1 free pointed tabs) | Bottom row: CANDIDATE (rear V2 seated along rear trap/back plate)", fill=(185, 200, 214), font=f_sub)

    for c, (fname, box, title) in enumerate(specs):
        for r, (tag, base_dir, border_col) in enumerate([("BEFORE V1", BEFORE_DIR, (220, 120, 90)), ("CANDIDATE V2", CAND_DIR, (90, 200, 130))]):
            im = Image.open(base_dir / fname).convert("RGB").crop(box).resize((cw, ch), Image.Resampling.NEAREST)
            x = pad + c * (cw + pad)
            y = hdr + pad + r * (ch + lbl + pad)
            canvas.paste(im, (x, y))
            d.rectangle([x - 1, y - 1, x + cw, y + ch + lbl], outline=border_col, width=2)
            d.rectangle([x, y + ch, x + cw, y + ch + lbl], fill=(32, 36, 42))
            d.text((x + 6, y + ch + 5), f"{tag} · {title}", fill=(236, 240, 244), font=f_lbl)

    out = OUT_DIR / "crop-rear-strap-v2.png"
    canvas.save(out)
    print(f"Wrote {out.name} ({W}x{H})")


if __name__ == "__main__":
    st = verify_all()
    make_pair_sheet(st)
    make_crops()
