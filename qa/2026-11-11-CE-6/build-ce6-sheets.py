# qa/2026-11-11-CE-6/build-ce6-sheets.py
# Builds 2 high-density 4-light contact sheets in review/CE-6/gpu/:
#   1) sheet-1-ce6-revolver-1p-3p-4lights.jpg
#   2) sheet-2-ce6-pair-and-launcher-4lights.jpg

import json
import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(r"C:\Users\Zero\Desktop\Tiny Trek")
OUT_DIR = ROOT / "review" / "CE-6" / "gpu"
STILLS = OUT_DIR / "stills"
LIGHTS = ["noon", "overcast", "dusk", "night"]


def get_font(size, bold=False):
    for p in [
        r"C:\Windows\Fonts\consolab.ttf" if bold else r"C:\Windows\Fonts\consola.ttf",
        r"C:\Windows\Fonts\segoeuib.ttf" if bold else r"C:\Windows\Fonts\segoeui.ttf",
    ]:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def build_sheet(out_name, title, subtitle, rows, crop_box=None):
    f_title = get_font(24, True)
    f_sub = get_font(15, False)
    f_lbl = get_font(15, True)
    tw, th = 440, 248
    pad_x = 24
    W = pad_x * 2 + 4 * tw + 3 * 16
    H = 104 + len(rows) * (th + 34) + 18

    img = Image.new("RGB", (W, H), (14, 17, 23))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, W, 88], fill=(22, 27, 36))
    d.text((24, 14), title, font=f_title, fill=(242, 246, 252))
    d.text((24, 50), subtitle, font=f_sub, fill=(134, 239, 172))

    y = 102
    for prefix, label, crop in rows:
        d.text((24, y), label, font=f_lbl, fill=(255, 214, 102))
        y += 22
        for ci, lt in enumerate(LIGHTS):
            x = pad_x + ci * (tw + 16)
            fp = STILLS / f"{prefix}-{lt}.jpg"
            if fp.exists():
                im = Image.open(fp).convert("RGB")
                if crop:
                    im = im.crop(crop)
                im = im.resize((tw, th), Image.Resampling.LANCZOS)
                img.paste(im, (x, y))
            d.rectangle([x, y, x + tw, y + th], outline=(58, 72, 92), width=1)
            d.rectangle([x + 6, y + 6, x + 104, y + 26], fill=(12, 16, 22))
            d.text((x + 12, y + 8), lt.upper(), font=f_lbl, fill=(215, 228, 245))
        y += th + 12

    out_fp = OUT_DIR / out_name
    img.save(out_fp, quality=91)
    print(f"Saved {out_fp}")


def main():
    m = json.loads((OUT_DIR / "ce6-metrics.json").read_text(encoding="utf-8"))
    r1 = m["revolver1P"]
    rr = m["revolverReload"]
    sub1 = (
        f"1P 6/6 pulls: deltaChambers={[p['deltaChambers'] for p in r1]}  ·  "
        f"maxVmWorldDiff={max(p['vmAngleDeg'] or 0 for p in r1)}°  ·  "
        f"flicker={max(p['restFlickerChambers'] for p in r1)}  ·  "
        f"reloadMaxDelta={rr['worstSingleFrameDeltaChambers']} ch"
    )
    rows1 = [
        ("rev1p-p0-rest", "1P Revolver · Rest Before Pull 1 (6 Live Chambers)", (280, 120, 1180, 626)),
        ("rev1p-p1-mid", "1P Revolver · Pull 1 Mid-Pull (~0.10s: Hammer Cocked, Trigger Back, Live #5 Rotated to Bore)", (280, 120, 1180, 626)),
        ("rev1p-p1-after", "1P Revolver · After Shot 1 (5 Live Left, Fired Chamber #5 Remains Under Hammer, 0 Flicker)", (280, 120, 1180, 626)),
        ("rev1p-p6-mid", "1P Revolver · Pull 6 Mid-Pull (Last Live #0 Rotated to Bore, Hammer Cocked)", (280, 120, 1180, 626)),
        ("rev1p-p6-after", "1P Revolver · After Shot 6 (0 Live, 6 Spent, Cylinder Indexed +6×60° Cleanly)", (280, 120, 1180, 626)),
        ("rev3p-p0-rest", "3P Revolver Close · Rest Before Pull 1 (Cylinder, Hammer & Trigger)", (220, 90, 1060, 562)),
        ("rev3p-p1-mid", "3P Revolver Close · Pull 1 Mid-Pull (Hammer Cocked Back, Cylinder Turning +60°)", (220, 90, 1060, 562)),
        ("rev3p-p6-after", "3P Revolver Close · After Shot 6 (All 6 Chambers Indexed Cleanly)", (220, 90, 1060, 562)),
    ]
    build_sheet(
        "sheet-1-ce6-revolver-1p-3p-4lights.jpg",
        "CE-6 (J136) · Revolver Cylinder, Hammer & Trigger Per Pull — 1P & 3P Close (4 Lights)",
        sub1,
        rows1,
    )

    p_pulls = m["revolverPair1P"]["pulls"]
    gl1 = m["launcher1P"]
    glr = m["launcherReload"]
    sub2 = (
        f"Pair 6 pulls (main/offhand deltas): {[(p['mainDelta'], p['offhandDelta']) for p in p_pulls]}  ·  "
        f"Launcher 6 shots delta={[s['deltaChambers'] for s in gl1]}  ·  "
        f"Launcher reloadMaxDelta={glr['worstSingleFrameDeltaChambers']} ch"
    )
    rows2 = [
        ("pair1p-p0-rest", "1P Akimbo Revolvers · Rest Before Pull 1 (Both Cylinders Full)", (80, 120, 1200, 720)),
        ("pair1p-p1-after", "1P Akimbo Revolvers · After Pull 1 (Main Gun Indexes +1 Chamber, Offhand Steady)", (80, 120, 1200, 720)),
        ("pair1p-p2-after", "1P Akimbo Revolvers · After Pull 2 (Offhand Gun Indexes +1 Chamber, Main Steady)", (80, 120, 1200, 720)),
        ("pair1p-p6-after", "1P Akimbo Revolvers · After Pull 6 (3 Indexed Each, 0 Flicker)", (80, 120, 1200, 720)),
        ("gl1p-s0-rest", "1P Grenade Launcher · Rest Before Shot 1 (6 Live 40mm Rounds)", (180, 80, 1220, 665)),
        ("gl1p-s1-after", "1P Grenade Launcher · After Shot 1 (~70ms Spring Drum Turn +1 Chamber, 0 Flicker)", (180, 80, 1220, 665)),
        ("gl3p-s0-full6", "3P Launcher Front-Drum Close · Full 6 Live 40mm Noses Before Shot 1", (200, 80, 1080, 575)),
        ("gl3p-s3-after", "3P Launcher Front-Drum Close · After Shot 3 (Drum Indexed 3×60°, Next Live Behind Barrel)", (200, 80, 1080, 575)),
        ("gl3p-s6-after", "3P Launcher Front-Drum Close · After Shot 6 (All 6 Fired Cases Retained Until Reload)", (200, 80, 1080, 575)),
    ]
    build_sheet(
        "sheet-2-ce6-pair-and-launcher-4lights.jpg",
        "CE-6 (J136) · Akimbo Revolver Pair & Grenade Launcher Drum Per Shot — 1P & 3P (4 Lights)",
        sub2,
        rows2,
    )


if __name__ == "__main__":
    main()
