# qa/2026-11-11-AG-311/build-sheets.py
import json
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
    f_lbl = load_font(15)
    draw.text((pad, 15), title, fill=(242, 212, 114), font=f_title)
    for idx, (fname, label) in enumerate(items):
        r = idx // cols
        c = idx % cols
        x = pad + c * (thumb_w + pad)
        y = hdr_h + pad + r * (thumb_h + lbl_h + pad)
        im = Image.open(SHOTS / fname).convert("RGB").resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
        canvas.paste(im, (x, y))
        draw.rectangle([x, y + thumb_h, x + thumb_w - 1, y + thumb_h + lbl_h - 1], fill=(26, 31, 36))
        draw.text((x + 8, y + thumb_h + 8), label, fill=(225, 232, 236), font=f_lbl)
    return canvas

def main():
    meta = json.loads((OUT_REV / "gp20108-5080-summary.json").read_text(encoding="utf-8"))
    shot_map = meta["shots"]

    def tag(fname, desc):
        s = shot_map[fname]
        return (fname, f"{desc}  [luma={s['lumaMean']} std={s['lumaStd']}]")

    # Sheet 1: Range Lanes Ceiling — Firing Line (~45° up downrange) & Mid-Range z=+14 (~45° up back) in 4 Lights + Lights Off + Torch
    s1 = make_grid(
        "AG-311 / GP-20108 RTX 5080 Look — Range Lanes Ceiling (4 Lights + Lights Off + Flashlight)",
        [
            tag("lane-from-line-noon.png", "Firing Line ~45° Up -> Noon (Lights ON)"),
            tag("lane-from-line-overcast.png", "Firing Line ~45° Up -> Overcast (Lights ON)"),
            tag("lane-from-line-dusk.png", "Firing Line ~45° Up -> Dusk (Lights ON)"),
            tag("lane-from-line-night.png", "Firing Line ~45° Up -> Night (Lights ON)"),
            tag("lane-from-line-lights-off.png", "Firing Line ~45° Up -> Wall Switch OFF"),
            tag("lane-from-line-lights-off-torch.png", "Firing Line ~45° Up -> Wall Switch OFF + Torch"),
            tag("lane-mid-back-noon.png", "Mid-Range z=+14 ~45° Up Back -> Noon (ON)"),
            tag("lane-mid-back-overcast.png", "Mid-Range z=+14 ~45° Up Back -> Overcast (ON)"),
            tag("lane-mid-back-dusk.png", "Mid-Range z=+14 ~45° Up Back -> Dusk (ON)"),
            tag("lane-mid-back-night.png", "Mid-Range z=+14 ~45° Up Back -> Night (ON)"),
            tag("lane-mid-back-lights-off.png", "Mid-Range z=+14 ~45° Up Back -> Switch OFF"),
            tag("lane-mid-back-lights-off-torch.png", "Mid-Range z=+14 ~45° Up Back -> OFF + Torch"),
        ],
        cols=3,
        thumb_w=560,
        thumb_h=315,
    )
    for d in [OUT_QA, OUT_REV]:
        s1.save(d / "sheet-gp20108-lanes-4lights.jpg", quality=92)

    # Sheet 2: Live 1P Gameplay Eye Across All Training Ground Rooms + 3P Overhead Cutaway Verification
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

    # Sheet 3: Ceiling Bullet Impacts + J128 Close-Up Seating / Intersection Inspection
    s3 = make_grid(
        "AG-311 / GP-20108 RTX 5080 Look — Live Ceiling Bullet Marks & J128 Close-Up Inspection",
        [
            tag("closeup-ceiling-bullet-impacts.png", "Live Bullets: 3 Impact Marks on y=5.985 Deck"),
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

    print("Built all 3 contact sheets in review/AG-311/")

if __name__ == "__main__":
    main()
