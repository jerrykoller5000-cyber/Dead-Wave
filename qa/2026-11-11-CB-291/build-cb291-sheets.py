# qa/2026-11-11-CB-291/build-cb291-sheets.py
# Builds 3 contact sheets in review/CB-291/ag/ (one per camera: gameplay, front34, side) across all 9 CB-291 cases x 4 lights!

import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(r"C:\Users\Zero\Desktop\Tiny Trek")
DIR = ROOT / "review" / "CB-291" / "ag"

LIGHTS = ["noon", "overcast", "dusk", "night"]
CASES = [
    ("01-aa12-reload", "(1) AA-12 Reload Held @ 0.65"),
    ("02-launcher-reload", "(2) Launcher Reload Held @ 0.80"),
    ("03-m4-reload", "(3) GW-4 / M4 Reload Held @ 0.50"),
    ("04-m4-aimed", "(4) GW-4 / M4 Aimed (ADS)"),
    ("05-shotgun-aimed", "(5) Pump Shotgun Aimed (ADS)"),
    ("06-smoking-idle", "(6) Smoking Idle @ t = 7.3 s"),
    ("07a-sprint-forward", "(7a) Sprint Forward (Ankles & Hips)"),
    ("07b-sprint-backward", "(7b) Sprint / Backpedal Backward (Ankles & Hips)"),
    ("08-turn-90-rifle", "(8) Standing 90° Turn w/ Rifle (Hips Follow >42°)"),
]

CAM_SPECS = [
    ("front34", "sheet-1-cb291-front34-4lights.jpg", "CB-291 · 3/4 Front Close Camera — Marine Shoulders, Elbows, Hands, Hips & Ankles (4 Lights)"),
    ("side", "sheet-2-cb291-side-4lights.jpg", "CB-291 · Side Close Camera — Elbows vs Head/Carrier, Hands on Gun, Spine & Gait (4 Lights)"),
    ("gameplay", "sheet-3-cb291-gameplay-4lights.jpg", "CB-291 · 3P Gameplay Camera — Live OTS Framing Across All 8 Cases (4 Lights)"),
]


def get_font(size, bold=False):
    for p in [
        r"C:\Windows\Fonts\consolab.ttf" if bold else r"C:\Windows\Fonts\consola.ttf",
        r"C:\Windows\Fonts\segoeuib.ttf" if bold else r"C:\Windows\Fonts\segoeui.ttf",
    ]:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def main():
    f_title = get_font(25, True)
    f_sub = get_font(16, False)
    f_lbl = get_font(15, True)
    tw, th = 440, 248
    pad_x = 24
    W = pad_x * 2 + 4 * tw + 3 * 16
    H = 92 + len(CASES) * (th + 34) + 18

    for cam, out_name, title in CAM_SPECS:
        img = Image.new("RGB", (W, H), (14, 17, 23))
        d = ImageDraw.Draw(img)
        d.rectangle([0, 0, W, 80], fill=(22, 27, 36))
        d.text((24, 14), title, font=f_title, fill=(242, 246, 252))
        d.text((24, 48), "Columns: Noon | Overcast | Dusk | Night  ·  RTX 5080 WebGPU  ·  Identical camera across all cases", font=f_sub, fill=(165, 185, 212))

        y = 94
        for cid, clabel in CASES:
            d.text((24, y), clabel, font=f_lbl, fill=(255, 214, 102))
            y += 22
            for ci, lt in enumerate(LIGHTS):
                x = pad_x + ci * (tw + 16)
                fp = DIR / f"{cid}-{cam}-{lt}.jpg"
                if fp.exists():
                    im = Image.open(fp).convert("RGB")
                    # For close cameras, crop slightly tighter around center [180..1100, 30..700] to maximize marine legibility!
                    if cam in ("front34", "side"):
                        im = im.crop((160, 20, 1120, 700))
                    im = im.resize((tw, th), Image.Resampling.LANCZOS)
                    img.paste(im, (x, y))
                d.rectangle([x, y, x + tw, y + th], outline=(58, 72, 92), width=1)
                d.rectangle([x + 6, y + 6, x + 104, y + 26], fill=(12, 16, 22))
                d.text((x + 12, y + 8), lt.upper(), font=f_lbl, fill=(215, 228, 245))
            y += th + 12

        out_fp = DIR / out_name
        img.save(out_fp, quality=91)
        print(f"Saved {out_fp}")


if __name__ == "__main__":
    main()
