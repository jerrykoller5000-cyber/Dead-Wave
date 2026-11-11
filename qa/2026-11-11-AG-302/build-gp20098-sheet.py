# qa/2026-11-11-AG-302/build-gp20098-sheet.py
# Builds GP-20098 matching 5-step corridor cutaway 4-light contact sheet + numeric trace header in review/GP-20098/sheet-gp20098-after-cutaway-4lights.jpg

import json
import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(r"C:\Users\Zero\Desktop\Tiny Trek")
GP_DIR = ROOT / "review" / "GP-20098"
STILLS = GP_DIR / "stills"
LIGHTS = ["noon", "overcast", "dusk", "night"]
STEP_LABELS = [
    "01 · x=-7.0 (Corridor East)",
    "02 · x=-10.5 (Entering Hangar)",
    "03 · x=-14.5 (East Doorway)",
    "04 · x=-17.94 (Infirmary / Perimeter Spot)",
    "05 · x=-21.2 (Build Hangar West)",
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
    trace = json.loads((GP_DIR / "gp20098-cutaway-trace-after.json").read_text(encoding="utf-8"))
    f_title = get_font(24, True)
    f_sub = get_font(15, False)
    f_lbl = get_font(14, True)

    tw, th = 360, 203
    pad_x = 22
    W = pad_x * 2 + 5 * tw + 4 * 12
    H = 126 + 4 * (th + 36) + 18

    img = Image.new("RGB", (W, H), (14, 18, 24))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, W, 110], fill=(22, 28, 38))
    d.text(
        (22, 12),
        f"GP-20098 · After Corridor Cutaway & Marine-Fade Warmup — 4 Lights × 5 AG-301 Probe Spots (enterTrainingMs={trace.get('enterTrainingMs')} ms)",
        font=f_title,
        fill=(242, 246, 252),
    )
    run_summary = "  |  ".join(
        f"{r['light'].upper()}: med {r['medianDtMs']}ms, max {r['maxDtMs']}ms, newPipes {r['newPipelines']}, >25ms={r['hitchCountOver25ms']}"
        for r in trace["runs"]
    )
    d.text((22, 48), run_summary, font=f_sub, fill=(134, 239, 172))
    d.text(
        (22, 76),
        "Columns match AG-301 before-probe-cutaway-hitch-corridor (steps 01..05) across Noon / Overcast / Dusk / Night on RTX 5080 WebGPU",
        font=f_sub,
        fill=(170, 190, 215),
    )

    y = 124
    for lt in LIGHTS:
        r = next((x for x in trace["runs"] if x["light"] == lt), {})
        d.text(
            (22, y),
            f"{lt.upper()}  —  maxDt={r.get('maxDtMs')} ms  ·  newPipelines={r.get('newPipelines')}  ·  hitches>25ms={r.get('hitchCountOver25ms')}",
            font=f_lbl,
            fill=(255, 214, 102),
        )
        y += 20
        for si in range(5):
            x = pad_x + si * (tw + 12)
            fp = STILLS / f"after-probe-cutaway-hitch-corridor-{lt}-0{si + 1}.jpg"
            if fp.exists():
                im = Image.open(fp).convert("RGB").resize((tw, th), Image.Resampling.LANCZOS)
                img.paste(im, (x, y))
            d.rectangle([x, y, x + tw, y + th], outline=(58, 72, 92), width=1)
            d.rectangle([x + 4, y + 4, x + 286, y + 23], fill=(12, 16, 22))
            d.text((x + 8, y + 6), STEP_LABELS[si], font=get_font(12, True), fill=(215, 228, 245))
        y += th + 14

    out_fp = GP_DIR / "sheet-gp20098-after-cutaway-4lights.jpg"
    img.save(out_fp, quality=91)
    print(f"Saved {out_fp}")


if __name__ == "__main__":
    main()
