"""Build Antigravity independent J167 Brute1 landed sheet and BEFORE 48a2 vs LANDED 7d30 zoom crops."""
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageFont

ROOT = Path("C:/Users/Zero/Desktop/Tiny Trek")
LANDED_DIR = ROOT / "review/GT-20111/d201/brute-step1-landed-full-owner-v1/landed"
BEFORE_DIR = ROOT / "review/GT-20111/d201/brute-step1-full-ag-v2/before"
OUT_DIR = ROOT / "qa/2026-11-18-j167-brute1-landed"
OUT_DIR.mkdir(parents=True, exist_ok=True)


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


def diff_pct(p_a, p_b):
    a = Image.open(p_a).convert("RGB")
    b = Image.open(p_b).convert("RGB")
    diff = ImageChops.difference(a, b)
    px = list(diff.get_flattened_data() if hasattr(diff, "get_flattened_data") else diff.getdata())
    changed = sum(1 for r, g, bl in px if (r + g + bl) > 6)
    return round(100.0 * changed / len(px), 3)


def verify_28():
    recs = json.loads((LANDED_DIR / "records.json").read_text(encoding="utf-8"))
    assert len(recs) == 28, len(recs)
    hashes = set()
    summary = {}
    for r in recs:
        fp = LANDED_DIR / f"{r['name']}.png"
        assert fp.exists(), fp
        im = Image.open(fp).convert("RGB")
        assert im.size == (1280, 900), (fp, im.size)
        h = md5_short(fp)
        assert h not in hashes, (fp.name, h)
        hashes.add(h)
        bp = BEFORE_DIR / f"{r['name']}.png"
        summary[r["name"]] = {
            "md5": h,
            "diffVsBefore48a2Pct": diff_pct(bp, fp) if bp.exists() else None,
        }
    (OUT_DIR / "frame-check.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    return summary


def build_landed_sheet():
    cw, ch = 360, 253
    pad, hdr, sec_h, lbl = 10, 56, 22, 22
    rows = [
        ("FULL BODY NOON (6m, 1.6m eye) · LANDED 7d30 vs true Marine", [
            ("FRONT · Noon", "front-noon.png"),
            ("3/4 · Noon", "threequarter-noon.png"),
            ("SIDE · Noon", "side-noon.png"),
            ("BACK · Noon", "back-noon.png"),
        ]),
        ("FULL BODY NIGHT (6m, 1.6m eye) · LANDED 7d30 vs true Marine", [
            ("FRONT · Night", "front-night.png"),
            ("3/4 · Night", "threequarter-night.png"),
            ("SIDE · Night", "side-night.png"),
            ("BACK · Night", "back-night.png"),
        ]),
        ("SILHOUETTES (6m, 1.6m eye) · LANDED 7d30 vs true Marine", [
            ("SIL · Front", "front-black.png"),
            ("SIL · 3/4", "threequarter-black.png"),
            ("SIL · Side", "side-black.png"),
            ("SIL · Back", "back-black.png"),
        ]),
        ("HEAD & UPPER TORSO CLOSES (3m, FOV 35) · Noon & Night", [
            ("HEAD FRONT · Noon", "head-front-noon.png"),
            ("HEAD 3/4 · Noon", "head-threequarter-noon.png"),
            ("HEAD FRONT · Night", "head-front-night.png"),
            ("HEAD 3/4 · Night", "head-threequarter-night.png"),
        ]),
    ]
    W = pad + 4 * (cw + pad)
    H = hdr + len(rows) * (sec_h + ch + lbl + pad) + pad
    canvas = Image.new("RGB", (W, H), (20, 22, 26))
    d = ImageDraw.Draw(canvas)
    f_hdr = load_font(16, bold=True)
    f_sub = load_font(11)
    f_sec = load_font(11, bold=True)
    f_lbl = load_font(11, bold=True)

    d.text((pad, 8), "J167 LANDED Brute Step 1 (studio/zombie-brute.js 7d30b0b4) — 5080 WebGPU Look", fill=(244, 214, 118), font=f_hdr)
    d.text((pad, 31), "Scoped step 1 ONLY (raised traps, posterior neck fill, rear straps seated): 15,734 tris / 1 draw | t222 Feral red & later steps open", fill=(185, 200, 214), font=f_sub)

    y = hdr
    for sec_title, cells in rows:
        d.text((pad, y + 3), sec_title, fill=(140, 200, 255), font=f_sec)
        y += sec_h
        for c, (title, fname) in enumerate(cells):
            im = Image.open(LANDED_DIR / fname).convert("RGB").resize((cw, ch), Image.Resampling.LANCZOS)
            x = pad + c * (cw + pad)
            canvas.paste(im, (x, y))
            d.rectangle([x - 1, y - 1, x + cw, y + ch + lbl], outline=(90, 200, 130), width=2)
            d.rectangle([x, y + ch, x + cw, y + ch + lbl], fill=(32, 36, 42))
            d.text((x + 6, y + ch + 4), title, fill=(236, 240, 244), font=f_lbl)
        y += ch + lbl + pad

    out = OUT_DIR / "sheet-j167-brute1-landed.jpg"
    canvas.save(out, quality=92)
    print(f"Wrote {out.name} ({W}x{H})")


def build_crops():
    specs = [
        ("Back Noon", "back-noon.png", (700, 230, 1020, 500)),
        ("Back Overcast", "back-overcast.png", (700, 230, 1020, 500)),
        ("Back Dusk", "back-dusk.png", (700, 230, 1020, 500)),
        ("Back Night", "back-night.png", (700, 230, 1020, 500)),
        ("Side Noon", "side-noon.png", (760, 210, 1060, 490)),
        ("Head 3/4 Noon", "head-threequarter-noon.png", (320, 190, 860, 620)),
        ("Head Front Noon", "head-front-noon.png", (380, 190, 900, 620)),
        ("Head 3/4 Night", "head-threequarter-night.png", (320, 190, 860, 620)),
    ]
    cw, ch = 225, 190
    pad, hdr, lbl = 10, 52, 22
    W = pad + len(specs) * (cw + pad)
    H = hdr + 2 * (ch + lbl + pad) + pad
    canvas = Image.new("RGB", (W, H), (20, 22, 26))
    d = ImageDraw.Draw(canvas)
    f_hdr = load_font(16, bold=True)
    f_sub = load_font(11)
    f_lbl = load_font(10, bold=True)
    d.text((pad, 8), "J167 Brute Step 1 — BEFORE (48a2eb50) vs LANDED (7d30b0b4) Upper Torso / Traps / Rear Straps / Face Crops", fill=(244, 214, 118), font=f_hdr)
    d.text((pad, 29), "Top: BEFORE 48a2eb50 | Bottom: LANDED 7d30b0b4 (same 668e index/camera/pose: rear straps flush all 4 lights; front flare/lobes/cleft unchanged)", fill=(185, 200, 214), font=f_sub)

    y = hdr
    for tag, src_dir, col in [("BEFORE 48a2", BEFORE_DIR, (220, 120, 90)), ("LANDED 7d30", LANDED_DIR, (90, 200, 130))]:
        for c, (label, fname, box) in enumerate(specs):
            im = Image.open(src_dir / fname).convert("RGB").crop(box).resize((cw, ch), Image.Resampling.LANCZOS)
            x = pad + c * (cw + pad)
            canvas.paste(im, (x, y))
            d.rectangle([x - 1, y - 1, x + cw, y + ch + lbl], outline=col, width=2)
            d.rectangle([x, y + ch, x + cw, y + ch + lbl], fill=(32, 36, 42))
            d.text((x + 5, y + ch + 4), f"{tag} · {label}", fill=(236, 240, 244), font=f_lbl)
        y += ch + lbl + pad

    out = OUT_DIR / "crop-j167-brute1-before-vs-landed.png"
    canvas.save(out)
    print(f"Wrote {out.name} ({W}x{H})")


if __name__ == "__main__":
    verify_28()
    build_landed_sheet()
    build_crops()
