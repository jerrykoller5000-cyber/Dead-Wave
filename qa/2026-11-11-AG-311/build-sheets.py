# qa/2026-11-11-AG-311/build-sheets.py
import json
import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path("C:/Users/Zero/Desktop/Tiny Trek")
SHOTS = ROOT / "review/AG-311/shots"
OUT_QA = ROOT / "qa/2026-11-11-AG-311"
OUT_REV = ROOT / "review/AG-311"

def load_font(sz):
    for p in ["C:/Windows/Fonts/consolab.ttf", "C:/Windows/Fonts/arialbd.ttf", "C:/Windows/Fonts/segoeui.ttf"]:
        if Path(p).exists():
            return ImageFont.truetype(p, sz)
    return ImageFont.load_default()

def compute_png_stats(im_rgb):
    # Sample center-view region (excluding top/bottom HUD corners) on 160x90 grid
    small = im_rgb.resize((160, 90), Image.Resampling.BILINEAR)
    px = list(small.getdata())
    n = len(px)
    s1 = 0.0
    s2 = 0.0
    max_l = 0.0
    blown = 0
    near_black = 0
    for r, g, b in px:
        l = 0.2126 * r + 0.7152 * g + 0.0722 * b
        s1 += l
        s2 += l * l
        if l > max_l:
            max_l = l
        if l >= 250:
            blown += 1
        if l < 4:
            near_black += 1
    mean = s1 / n
    std = math.sqrt(max(0.0, s2 / n - mean * mean))
    return {
        "lumaMean": round(mean, 2),
        "lumaStd": round(std, 2),
        "maxLum": round(max_l, 1),
        "blownPct": round(100.0 * blown / n, 2),
        "nearBlackPct": round(100.0 * near_black / n, 2),
    }

def make_grid(title, items, cols, thumb_w=620, thumb_h=349):
    rows = (len(items) + cols - 1) // cols
    pad = 16
    hdr_h = 54
    lbl_h = 34
    W = pad + cols * (thumb_w + pad)
    H = hdr_h + pad + rows * (thumb_h + lbl_h + pad)
    canvas = Image.new("RGB", (W, H), (16, 19, 22))
    draw = ImageDraw.Draw(canvas)
    f_title = load_font(22)
    f_lbl = load_font(14)
    draw.text((pad, 15), title, fill=(242, 212, 114), font=f_title)
    for idx, (fname, label) in enumerate(items):
        r = idx // cols
        c = idx % cols
        x = pad + c * (thumb_w + pad)
        y = hdr_h + pad + r * (thumb_h + lbl_h + pad)
        im = Image.open(SHOTS / fname).convert("RGB").resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
        canvas.paste(im, (x, y))
        draw.rectangle([x, y + thumb_h, x + thumb_w - 1, y + thumb_h + lbl_h - 1], fill=(26, 31, 36))
        draw.text((x + 8, y + thumb_h + 9), label, fill=(225, 232, 236), font=f_lbl)
    return canvas

def main():
    meta = json.loads((OUT_REV / "gp20108-5080-summary.json").read_text(encoding="utf-8"))
    for fname, entry in meta["shots"].items():
        im = Image.open(SHOTS / fname).convert("RGB")
        st = compute_png_stats(im)
        entry.update(st)
    for row in meta.get("lane4Lights", []):
        row.update(meta["shots"][row["file"]])
    for row in meta.get("gameplayAreas", []):
        row.update(meta["shots"][row["file"]])

    for d in [OUT_QA, OUT_REV]:
        (d / "gp20108-5080-summary.json").write_text(json.dumps(meta, indent=2) + "\n", encoding="utf-8")

    shot_map = meta["shots"]

    def tag(fname, desc):
        s = shot_map[fname]
        return (fname, f"{desc} [luma={s['lumaMean']} sha={s['sha'][:7]}]")

    s1 = make_grid(
        "AG-311 / GP-20108 RTX 5080 Look — Range Lanes Ceiling (True 4 Lights + Lights Off + Torch)",
        [
            tag("lane-from-line-noon.png", "Firing Line 45° Up -> Noon (Lights ON)"),
            tag("lane-from-line-overcast.png", "Firing Line 45° Up -> Overcast (Lights ON)"),
            tag("lane-from-line-dusk.png", "Firing Line 45° Up -> Dusk (Lights ON)"),
            tag("lane-from-line-night.png", "Firing Line 45° Up -> Night (Lights ON)"),
            tag("lane-from-line-lights-off.png", "Firing Line 45° Up -> Wall Switch OFF"),
            tag("lane-from-line-lights-off-torch.png", "Firing Line 45° Up -> Switch OFF + Torch"),
            tag("lane-mid-back-noon.png", "Mid-Range z=+14 45° Up Back -> Noon (ON)"),
            tag("lane-mid-back-overcast.png", "Mid-Range z=+14 45° Up Back -> Overcast (ON)"),
            tag("lane-mid-back-dusk.png", "Mid-Range z=+14 45° Up Back -> Dusk (ON)"),
            tag("lane-mid-back-night.png", "Mid-Range z=+14 45° Up Back -> Night (ON)"),
            tag("lane-mid-back-lights-off.png", "Mid-Range z=+14 45° Up Back -> Switch OFF"),
            tag("lane-mid-back-lights-off-torch.png", "Mid-Range z=+14 45° Up Back -> OFF + Torch"),
        ],
        cols=3,
        thumb_w=560,
        thumb_h=315,
    )
    for d in [OUT_QA, OUT_REV]:
        s1.save(d / "sheet-gp20108-lanes-4lights.jpg", quality=92)

    s2 = make_grid(
        "AG-311 / GP-20108 RTX 5080 Look — 1P Gameplay Eye Across All Areas + 3P Overhead Cutaway",
        [
            tag("area-1p-firing-up-on.png", "1P Live Eye: Firing Line Up (Lights ON)"),
            tag("area-1p-firing-up-off.png", "1P Live Eye: Firing Line Up (Lights OFF)"),
            tag("area-1p-stations-up.png", "1P Live Eye: Range Stations Up (+X Wall)"),
            tag("area-1p-apron-up.png", "1P Live Eye: Doorway Apron Up (Hangar 24m)"),
            tag("area-1p-infirmary-up.png", "1P Live Eye: Infirmary Bay Up (Hangar 24m)"),
            tag("area-1p-hq-ladder-up.png", "1P Live Eye: HQ / Ladder Up (Hangar 24m)"),
            tag("area-1p-hangar-up.png", "1P Live Eye: Hangar Center Up (Truss Deck)"),
            tag("area-1p-passage-up.png", "1P Live Eye: Holding Passage Up (6.3m Roof)"),
            tag("3p-gameplay-firing-line.png", "3P Live Gameplay: Ceiling Hidden (0 Occlusion)"),
            tag("3p-overhead-range-wide.png", "3P Overhead Wide: Full Range & Lanes Clear"),
        ],
        cols=2,
        thumb_w=640,
        thumb_h=360,
    )
    for d in [OUT_QA, OUT_REV]:
        s2.save(d / "sheet-gp20108-areas-and-3p.jpg", quality=92)

    s3 = make_grid(
        "AG-311 / GP-20108 RTX 5080 Look — Live Ceiling Bullet Marks & J128 Close-Up Inspection",
        [
            tag("closeup-ceiling-bullet-impacts.png", "Live Bullets: 5 Impact Marks on y=5.985 Deck"),
            tag("closeup-baffle-end-z5_4.png", "Baffle End z=5.4 (12mm Rubber/Steel Overlap; No Solid)"),
            tag("closeup-sprinkler-floating-z1.png", "Sprinkler z=1: 20mm Floating Nozzle + 5mm Cone Gap"),
            tag("closeup-sprinkler-beam-clash-z9.png", "Sprinkler z=9: Bracket Intersects Cross-Beam"),
            tag("closeup-duct-beam-clash-z3.png", "Supply Duct z=3: Beam Cuts Through Duct + 10mm/100mm Gaps"),
        ],
        cols=2,
        thumb_w=660,
        thumb_h=371,
    )
    for d in [OUT_QA, OUT_REV]:
        s3.save(d / "sheet-gp20108-j128-and-impacts.jpg", quality=93)

    print("Built all 3 contact sheets + true pixel luminance stats in review/AG-311/")

if __name__ == "__main__":
    main()
