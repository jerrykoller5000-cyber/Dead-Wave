"""Verify all 56 D201 Brute step1 V4 ag-v2 captures and build BEFORE vs CANDIDATE sheets in qa/2026-11-17-AG-352/."""
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageFont

ROOT = Path("C:/Users/Zero/Desktop/Tiny Trek")
AG_DIR = ROOT / "review/GT-20111/d201/brute-step1-full-ag-v2"
BEFORE_DIR = AG_DIR / "before"
CAND_DIR = AG_DIR / "candidate"
OUT_DIR = ROOT / "qa/2026-11-17-AG-352"

LIGHTS = [("noon", "Noon"), ("overcast", "Overcast"), ("dusk", "Dusk"), ("night", "Night")]
BODY_VIEWS = [("front", "Front"), ("threequarter", "3/4"), ("side", "Side"), ("back", "Back")]
HEAD_VIEWS = [("head-front", "Head Front"), ("head-threequarter", "Head 3/4")]


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
    assert a.size == b.size, f"Size mismatch {p_a} {a.size} vs {b.size}"
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
    assert len(before_rec) == 28 and len(cand_rec) == 28, (len(before_rec), len(cand_rec))

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
        assert len(hashes) == 28

    for r in before_rec:
        name = r["name"]
        stats["pairDiffs"][name] = pair_diff_stats(BEFORE_DIR / f"{name}.png", CAND_DIR / f"{name}.png")

    (OUT_DIR / "frame-stats.json").write_text(json.dumps(stats, indent=2), encoding="utf-8")
    print(f"Verified 28/28 unique before + 28/28 unique candidate 1280x900 PNGs.")
    return stats


def make_pair_grid(title, subtitle, sections, cols_spec, cell_w, cell_h, out_name):
    """sections: list of (section_title, fn_name(col_key)) where each section has BEFORE row + CANDIDATE row."""
    pad = 10
    hdr = 52
    sec_h = 24
    lbl = 22
    cols = len(cols_spec)
    W = pad + cols * (cell_w + pad)
    H = hdr + len(sections) * (sec_h + 2 * (cell_h + lbl + pad)) + pad
    canvas = Image.new("RGB", (W, H), (20, 22, 26))
    d = ImageDraw.Draw(canvas)
    f_hdr = load_font(16, bold=True)
    f_sub = load_font(11)
    f_sec = load_font(12, bold=True)
    f_lbl = load_font(11, bold=True)

    d.text((pad, 8), title, fill=(244, 214, 118), font=f_hdr)
    d.text((pad, 30), subtitle, fill=(185, 200, 214), font=f_sub)

    y = hdr + 2
    for sec_title, name_fn in sections:
        d.text((pad, y + 4), sec_title, fill=(140, 200, 255), font=f_sec)
        y += sec_h
        for tag, base_dir, border_col in [("BEFORE (LIVE)", BEFORE_DIR, (220, 120, 90)), ("CANDIDATE (D201 step1)", CAND_DIR, (90, 200, 130))]:
            for c, (ckey, clabel) in enumerate(cols_spec):
                fname = name_fn(ckey)
                im = Image.open(base_dir / f"{fname}.png").convert("RGB").resize((cell_w, cell_h), Image.Resampling.LANCZOS)
                x = pad + c * (cell_w + pad)
                canvas.paste(im, (x, y))
                d.rectangle([x - 1, y - 1, x + cell_w, y + cell_h + lbl], outline=border_col, width=2)
                d.rectangle([x, y + cell_h, x + cell_w, y + cell_h + lbl], fill=(32, 36, 42))
                d.text((x + 6, y + cell_h + 4), f"{tag} · {clabel}", fill=(236, 240, 244), font=f_lbl)
            y += cell_h + lbl + pad

    out = OUT_DIR / out_name
    canvas.save(out, quality=92)
    print(f"Wrote {out.name} ({W}x{H})")
    return out


def make_body_fourlights_sheets():
    # Split 4 views across 2 sheets (4 cols x 4 rows each = 1400px wide, crisp & readable)
    cell_w, cell_h = 335, 236
    make_pair_grid(
        "D201 Brute step1 (AG-352 ag-v2) — Four Lights + True Marine: Front & 3/4",
        "6m camera, 1.6m eye | Top row per block: BEFORE (LIVE 48a2eb50) | Bottom row: CANDIDATE (ecf0770e, neck + traps + harness support)",
        [
            ("FRONT VIEW · NOON / OVERCAST / DUSK / NIGHT", lambda l: f"front-{l}"),
            ("THREE-QUARTER VIEW · NOON / OVERCAST / DUSK / NIGHT", lambda l: f"threequarter-{l}"),
        ],
        LIGHTS,
        cell_w,
        cell_h,
        "sheet-fourlights-front-3q.jpg",
    )
    make_pair_grid(
        "D201 Brute step1 (AG-352 ag-v2) — Four Lights + True Marine: Side & Back",
        "6m camera, 1.6m eye | Top row per block: BEFORE (LIVE 48a2eb50) | Bottom row: CANDIDATE (ecf0770e, posterior neck fill + traps)",
        [
            ("SIDE VIEW · NOON / OVERCAST / DUSK / NIGHT", lambda l: f"side-{l}"),
            ("BACK VIEW · NOON / OVERCAST / DUSK / NIGHT", lambda l: f"back-{l}"),
        ],
        LIGHTS,
        cell_w,
        cell_h,
        "sheet-fourlights-side-back.jpg",
    )


def make_silhouettes_and_heads():
    make_pair_grid(
        "D201 Brute step1 (AG-352 ag-v2) — Flat Black Silhouettes + True Marine (Noon)",
        "6m camera, 1.6m eye | Top row: BEFORE (LIVE) | Bottom row: CANDIDATE (D201 step1)",
        [("SILHOUETTES · FRONT / 3-4 / SIDE / BACK", lambda v: f"{v}-black")],
        BODY_VIEWS,
        335,
        236,
        "sheet-silhouettes-noon.jpg",
    )
    make_pair_grid(
        "D201 Brute step1 (AG-352 ag-v2) — Head Eye-Height Closes (3m, FOV 35) in Four Lights",
        "Actual rendered face exact | Top row per block: BEFORE (LIVE) | Bottom row: CANDIDATE (D201 step1)",
        [
            ("HEAD CLOSE FRONT · NOON / OVERCAST / DUSK / NIGHT", lambda l: f"head-front-{l}"),
            ("HEAD CLOSE 3/4 · NOON / OVERCAST / DUSK / NIGHT", lambda l: f"head-threequarter-{l}"),
        ],
        LIGHTS,
        335,
        236,
        "sheet-head-closes-fourlights.jpg",
    )


def make_zoom_crops():
    # Zoomed crops centered on Brute upper torso/neck/head in 1280x900 frames
    specs = [
        ("Head Front Noon", "head-front-noon.png", (380, 190, 900, 620)),
        ("Head 3/4 Noon", "head-threequarter-noon.png", (320, 190, 860, 620)),
        ("Head Front Night", "head-front-night.png", (380, 190, 900, 620)),
        ("Head 3/4 Night", "head-threequarter-night.png", (320, 190, 860, 620)),
        ("Side Noon (Upper)", "side-noon.png", (760, 210, 1060, 490)),
        ("Back Noon (Upper)", "back-noon.png", (690, 220, 1050, 520)),
    ]
    tw, th = 220, 195
    pad = 10
    hdr = 50
    lbl = 22
    cols = len(specs)
    W = pad + cols * (tw + pad)
    H = hdr + 2 * (th + lbl + pad) + pad
    canvas = Image.new("RGB", (W, H), (20, 22, 26))
    d = ImageDraw.Draw(canvas)
    f_hdr = load_font(16, bold=True)
    f_sub = load_font(11)
    f_lbl = load_font(10, bold=True)

    d.text((pad, 8), "D201 Brute step1 (AG-352 ag-v2) — Upper Torso / Neck / Traps / Harness Crops", fill=(244, 214, 118), font=f_hdr)
    d.text((pad, 28), "Top row: BEFORE (LIVE 48a2eb50) | Bottom row: CANDIDATE (ecf0770e, raised traps + posterior neck + harness seat)", fill=(185, 200, 214), font=f_sub)

    y = hdr + 2
    for tag, base_dir, border_col in [("BEFORE", BEFORE_DIR, (220, 120, 90)), ("CANDIDATE", CAND_DIR, (90, 200, 130))]:
        for c, (label, fname, box) in enumerate(specs):
            im = Image.open(base_dir / fname).convert("RGB").crop(box).resize((tw, th), Image.Resampling.LANCZOS)
            x = pad + c * (tw + pad)
            canvas.paste(im, (x, y))
            d.rectangle([x - 1, y - 1, x + tw, y + th + lbl], outline=border_col, width=2)
            d.rectangle([x, y + th, x + tw, y + th + lbl], fill=(32, 36, 42))
            d.text((x + 5, y + th + 4), f"{tag} · {label}", fill=(236, 240, 244), font=f_lbl)
        y += th + lbl + pad

    out = OUT_DIR / "crop-neck-trap-harness.png"
    canvas.save(out)
    print(f"Wrote {out.name} ({W}x{H})")
    return out


if __name__ == "__main__":
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    verify_all()
    make_body_fourlights_sheets()
    make_silhouettes_and_heads()
    make_zoom_crops()
