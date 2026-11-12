# qa/2026-11-11-AG-310b/build-sheet.py
# Builds side-by-side AG-310 vs AG-310b visual parity contact sheet in review/AG-310b/sheet-ag310b-visuals.jpg

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(r"C:/Users/Zero/Desktop/Tiny Trek")
BEFORE_DIR = ROOT / "review/AG-310"
QA_AG310_DIR = ROOT / "qa/2026-11-11-AG-310"
AFTER_DIR = ROOT / "review/AG-310b"

def find_before(name: str) -> Path:
    for p in [BEFORE_DIR / f"after-{name}.png", QA_AG310_DIR / f"after-{name}.png", BEFORE_DIR / f"before-{name}.png", QA_AG310_DIR / f"before-{name}.png"]:
        if p.exists():
            return p
    raise FileNotFoundError(f"Missing reference for {name}")

PAIRS = [
    ("armory-bench", "Armory Workbench (M4 + M81 + Can + Optic + Shelf Thumbnails)"),
    ("armory-preview-turned", "Armory Rotated 3D Preview (400x200 Shared WebGPU)"),
    ("armory-swatches", "Armory All 34 Finish Swatches (96x48 Direct 2D Canvas)"),
    ("cif-card", "CIF Card & Marine Turntable (Booted Only on CIF Open)"),
]

TILE_W, TILE_H = 760, 428
PAD = 18
LABEL_H = 34
HEADER_H = 56

cols = 2
rows = len(PAIRS)
W = PAD + cols * (TILE_W + PAD)
H = HEADER_H + rows * (LABEL_H + TILE_H + PAD) + PAD

sheet = Image.new("RGB", (W, H), (18, 21, 24))
draw = ImageDraw.Draw(sheet)

try:
    font_title = ImageFont.truetype("C:/Windows/Fonts/consolab.ttf", 22)
    font_lbl = ImageFont.truetype("C:/Windows/Fonts/consolab.ttf", 15)
except Exception:
    font_title = ImageFont.load_default()
    font_lbl = ImageFont.load_default()

draw.text((PAD, 16), "AG-310b Visual Parity — Left: AG-310 Reference | Right: AG-310b After (<50ms Warmup & Cache)", fill=(230, 236, 240), font=font_title)

for idx, (slug, title) in enumerate(PAIRS):
    y0 = HEADER_H + idx * (LABEL_H + TILE_H + PAD)
    b_path = find_before(slug)
    a_path = AFTER_DIR / f"after-{slug}.png"
    for col, (p, tag) in enumerate([(b_path, "AG-310 BEFORE"), (a_path, "AG-310b AFTER")]):
        x0 = PAD + col * (TILE_W + PAD)
        draw.text((x0, y0 + 8), f"[{tag}] {title}", fill=(180, 215, 190) if col == 1 else (195, 200, 208), font=font_lbl)
        im = Image.open(p).convert("RGB").resize((TILE_W, TILE_H), Image.Resampling.LANCZOS)
        sheet.paste(im, (x0, y0 + LABEL_H))
        draw.rectangle([x0, y0 + LABEL_H, x0 + TILE_W - 1, y0 + LABEL_H + TILE_H - 1], outline=(62, 70, 78), width=1)

out_path = AFTER_DIR / "sheet-ag310b-visuals.jpg"
sheet.save(out_path, quality=92)
print(f"Saved {out_path} ({W}x{H})")
