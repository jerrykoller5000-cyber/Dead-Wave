"""Build AG-356 review contact sheets in review/AG-356/ from RTX 5080 WebGPU captures."""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path("C:/Users/Zero/Desktop/Tiny Trek")
QA = ROOT / "qa/2026-11-18-AG-356"
OUT = ROOT / "review/AG-356"
OUT.mkdir(parents=True, exist_ok=True)


def font(sz, bold=False):
    cands = (
        ["C:/Windows/Fonts/consolab.ttf", "C:/Windows/Fonts/arialbd.ttf", "C:/Windows/Fonts/segoeuib.ttf"]
        if bold
        else ["C:/Windows/Fonts/consola.ttf", "C:/Windows/Fonts/arial.ttf", "C:/Windows/Fonts/segoeui.ttf"]
    )
    for p in cands:
        if Path(p).exists():
            return ImageFont.truetype(p, sz)
    return ImageFont.load_default()


def build_plan_sheet(report, meas):
    f_hdr = font(24, bold=True)
    f_sub = font(15, bold=False)
    f_row = font(18, bold=True)
    f_lbl = font(14, bold=True)
    f_meta = font(12, bold=False)

    rows = [
        ("ours", "OURS NOW", "Current concept body (neutral statue, H=1.97m)", (125, 185, 255)),
        ("tripo", "TRIPO REF", "Jerry's Tripo reference (LOOK-ONLY, scaled to H=1.97m)", (255, 185, 95)),
        ("proposed", "PROPOSED", "Gaunt restyle blockout (same rig H=1.97m, bare feet, rags, acid)", (155, 235, 115)),
    ]
    cols = [
        ("front", "Front"),
        ("3q", "3/4 Front-Left"),
        ("side", "Side (Left)"),
        ("back", "Back"),
        ("head", "Head Close-Up"),
    ]

    tw, th = 400, 400
    pad = 14
    hdr_h = 74
    row_hdr_h = 34
    cell_lbl_h = 26
    left_w = 26

    W = pad + len(cols) * (tw + pad)
    H = hdr_h + pad + len(rows) * (row_hdr_h + th + cell_lbl_h + pad)
    img = Image.new("RGB", (W, H), (18, 20, 24))
    d = ImageDraw.Draw(img)

    d.text((pad, 10), "AG-356 (J168 + D-190) SPITTER RESTYLE PLAN SHEET · RTX 5080 WebGPU · Noon", fill=(244, 214, 118), font=f_hdr)
    d.text((pad, 42), "Same height (1.966 m), same studio lighting, same AG-341 camera framing (85% body fill, 62% head fill). Review-only.", fill=(185, 205, 224), font=f_sub)

    for ri, (key, title, desc, accent) in enumerate(rows):
        ry = hdr_h + pad + ri * (row_hdr_h + th + cell_lbl_h + pad)
        m = meas.get(key, {})
        stats = (
            f"shoulders {m.get('shoulder width', 0):.2f}m | waist {m.get('waist width', 0):.2f}m | "
            f"chest-D {m.get('chest depth (side)', 0):.2f}m | wrist {m.get('wrist thickness', 0):.3f}m | "
            f"head-W {m.get('head width', 0):.2f}m"
        )
        d.rectangle([pad, ry, W - pad, ry + row_hdr_h - 4], fill=(28, 32, 38))
        d.text((pad + 10, ry + 5), f"{title} — {desc}", fill=accent, font=f_row)
        d.text((W - pad - 670, ry + 8), stats, fill=(210, 220, 232), font=f_meta)

        for ci, (vid, vlabel) in enumerate(cols):
            cx = pad + ci * (tw + pad)
            cy = ry + row_hdr_h
            finfo = report["frames"][f"{key}-{vid}"]
            tile = Image.open(ROOT / finfo["file"]).convert("RGB").resize((tw, th), Image.Resampling.LANCZOS)
            img.paste(tile, (cx, cy))
            d.rectangle([cx, cy, cx + tw - 1, cy + th - 1], outline=accent, width=2)
            d.rectangle([cx, cy + th, cx + tw, cy + th + cell_lbl_h], fill=(26, 30, 36))
            d.text((cx + 8, cy + th + 5), f"{title} · {vlabel}  ({finfo['hFill']*100:.0f}% fill)", fill=(225, 232, 240), font=f_lbl)

    out_path = OUT / "01-spitter-restyle-plan-sheet.jpg"
    img.save(out_path, quality=93)
    print("Wrote", out_path)


def build_bomber_comparison(report, meas):
    f_hdr = font(24, bold=True)
    f_sub = font(15, bold=False)
    f_lbl = font(15, bold=True)
    f_meta = font(13, bold=False)

    panels = [
        ("bomber-vs-ours-front", "BEFORE · Bomber (1.99m) vs Current Spitter (1.97m) · Noon Front", "Both share heavy belly & wide trunk silhouette", (255, 160, 120)),
        ("bomber-vs-ours-sil-front", "BEFORE · Silhouette Read (Bomber vs Current Spitter)", "Potbelly & wide shoulders blur silhouettes together", (255, 160, 120)),
        ("bomber-vs-proposed-front", "AFTER · Bomber (1.99m) vs Proposed Spitter (1.97m) · Noon Front", "Bloated pear + glowing sacs vs starved ribcage + rags + acid streaks", (155, 235, 115)),
        ("bomber-vs-proposed-sil-front", "AFTER · Silhouette Read (Bomber vs Proposed Spitter)", "Unmistakable split: 0.80m bloated waist vs 0.29m gaunt waist", (155, 235, 115)),
        ("bomber-vs-proposed-3q", "AFTER · True-Scale 3/4 View (Bomber vs Proposed Spitter)", "Different neck, ribcage, limb taper, and bare-foot vs booted stance", (155, 235, 115)),
        ("bomber-vs-proposed-side", "AFTER · True-Scale Side Profile (Bomber vs Proposed Spitter)", "0.98m protruding bomb-gut depth vs 0.25m concave starved belly", (155, 235, 115)),
    ]

    pw, ph = 640, 480
    pad = 14
    hdr_h = 74
    lbl_h = 46
    cols = 2
    rows = 3
    W = pad + cols * (pw + pad)
    H = hdr_h + pad + rows * (ph + lbl_h + pad)
    img = Image.new("RGB", (W, H), (18, 20, 24))
    d = ImageDraw.Draw(img)

    d.text((pad, 10), "AG-356 SIDE-BY-SIDE AT TRUE SCALE: BOMBER (1.99 m) vs SPITTER (1.97 m)", fill=(244, 214, 118), font=f_hdr)
    d.text((pad, 42), "RTX 5080 WebGPU · Left: current game Bomber (neutral statue) | Right: Current Spitter (top) vs Proposed Gaunt Spitter (mid/bottom).", fill=(185, 205, 224), font=f_sub)

    for idx, (pid, title, sub, accent) in enumerate(panels):
        r = idx // 2
        c = idx % 2
        x = pad + c * (pw + pad)
        y = hdr_h + pad + r * (ph + lbl_h + pad)
        pinfo = report["pairs"][pid]
        tile = Image.open(ROOT / pinfo["file"]).convert("RGB").resize((pw, ph), Image.Resampling.LANCZOS)
        img.paste(tile, (x, y))
        d.rectangle([x, y, x + pw - 1, y + ph - 1], outline=accent, width=2)
        d.rectangle([x, y + ph, x + pw, y + ph + lbl_h], fill=(26, 30, 36))
        d.text((x + 8, y + ph + 5), title, fill=accent, font=f_lbl)
        d.text((x + 8, y + ph + 25), sub, fill=(210, 220, 230), font=f_meta)

    out_path = OUT / "02-spitter-vs-bomber-side-by-side.jpg"
    img.save(out_path, quality=93)
    print("Wrote", out_path)


def main():
    report = json.loads((QA / "capture-report.json").read_text(encoding="utf-8"))
    ovt = json.loads((QA / "ours-vs-tripo.json").read_text(encoding="utf-8"))
    ovp = json.loads((QA / "ours-vs-proposed.json").read_text(encoding="utf-8"))
    meas = {
        "ours": ovt["res"]["ours"],
        "tripo": ovt["res"]["tripo"],
        "proposed": ovp["res"]["tripo"],  # second arg in pair measurement
    }
    build_plan_sheet(report, meas)
    build_bomber_comparison(report, meas)


if __name__ == "__main__":
    main()
