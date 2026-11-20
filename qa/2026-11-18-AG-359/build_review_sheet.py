"""Build side-by-side comparison crops of GP-20154 v7 before vs after pairs."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(r"C:\Users\Zero\Desktop\Tiny Trek")
V7 = ROOT / "review" / "GP-20154" / "candidate-diagnostic-pair-v7"
OUT_DIR = ROOT / "qa" / "2026-11-18-AG-359"
OUT_DIR.mkdir(parents=True, exist_ok=True)

PAIRS = [
    ("front-noon.png", "front-noon (native stand)"),
    ("side-noon.png", "side-noon (native stand: hand-floor + hind knee/foot stance)"),
    ("back-noon.png", "back-noon (native stand)"),
    ("front-night-marine.png", "front-night-marine (scale & gaze pitch)"),
    ("motion-059-stand.png", "motion-059-stand (live held/stand)"),
    ("motion-106-gallop.png", "motion-106-gallop (shoulder/elbow alignment)"),
    ("motion-116-gallop.png", "motion-116-gallop (hind leg reach/tuck)"),
    ("motion-125-gallop.png", "motion-125-gallop (hind stride under torso)"),
    ("motion-135-gallop.png", "motion-135-gallop (trailing hind foot dorsiflexion)"),
    ("motion-350-windup.png", "motion-350-windup (forward left ankle/toes-up pitch)"),
    ("motion-375-strike.png", "motion-375-strike (forward left ankle/toes-up pitch)"),
    ("motion-400-flinch.png", "motion-400-flinch (recoil posture)"),
]

try:
    font = ImageFont.truetype("arial.ttf", 18)
except OSError:
    font = ImageFont.load_default()


def build_sheet(pairs, out_name):
    cell_w, cell_h = 560, 440
    header_h = 28
    pad = 12
    cols = 2
    rows = len(pairs)
    canvas = Image.new("RGB", (cols * cell_w + (cols + 1) * pad, rows * (cell_h + header_h) + (rows + 1) * pad), (20, 22, 26))
    draw = ImageDraw.Draw(canvas)
    for r_idx, (fname, title) in enumerate(pairs):
        y0 = pad + r_idx * (cell_h + header_h + pad)
        for c_idx, phase in enumerate(["before", "after"]):
            x0 = pad + c_idx * (cell_w + pad)
            img = Image.open(V7 / phase / fname).convert("RGB")
            w, h = img.size
            # Center crop 65% around subject so limb/foot angles are clearly legible
            cw, ch = int(w * 0.65), int(h * 0.65)
            left = (w - cw) // 2
            top = int(h * 0.22)
            crop = img.crop((left, top, left + cw, min(h, top + ch))).resize((cell_w, cell_h), Image.Resampling.LANCZOS)
            canvas.paste(crop, (x0, y0 + header_h))
            label = f"{phase.upper()} :: {title}"
            draw.rectangle([x0, y0, x0 + cell_w, y0 + header_h], fill=(35, 39, 46))
            draw.text((x0 + 8, y0 + 4), label, fill=(235, 240, 245), font=font)
    out_path = OUT_DIR / out_name
    canvas.save(out_path, quality=92)
    print(f"Wrote {out_path} ({canvas.size[0]}x{canvas.size[1]})")


build_sheet(PAIRS[:6], "sheet-v7-part1-stand-gallop106.jpg")
build_sheet(PAIRS[6:], "sheet-v7-part2-gallop-windup-strike-flinch.jpg")
