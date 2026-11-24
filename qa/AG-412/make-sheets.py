import os, sys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.abspath(__file__))
TAG = sys.argv[1] if len(sys.argv) > 1 else "before"

THEMES = [
    ("root", "Root Cave (Ancient Oak & Climbers' Warren)"),
    ("shale", "Shale Cave (Split Slate Ridge & PGB Demo Crew)"),
    ("iron", "Iron Cave (Coldwater Mine Breach & Hikers)"),
    ("wet", "Wet Cave (Dripping Grotto & Drowned Sluice)"),
    ("hill", "Hill Cave (First People Barrow & Offerings)"),
    ("chalk", "Marrow Cave (Sealed Carved Door & Heart Threshold)"),
]

VIEWS = []
idx = 1
for theme, title in THEMES:
    VIEWS.append((f"{idx:02d}-{theme}-hero-noon", f"{theme.upper()} Hero 3/4 (Noon)"))
    idx += 1
    VIEWS.append((f"{idx:02d}-{theme}-close-noon", f"{theme.upper()} Close-up 1P (Noon)"))
    idx += 1
    VIEWS.append((f"{idx:02d}-{theme}-flank-noon", f"{theme.upper()} Opposite Flank (Noon)"))
    idx += 1
    VIEWS.append((f"{idx:02d}-{theme}-night", f"{theme.upper()} Night Atmosphere"))
    idx += 1
for theme in ["iron", "hill", "chalk"]:
    VIEWS.append((f"{idx:02d}-{theme}-dusk", f"{theme.upper()} Dusk Raking Light"))
    idx += 1
for theme in ["wet", "root", "shale"]:
    VIEWS.append((f"{idx:02d}-{theme}-rain", f"{theme.upper()} Storm / Overcast"))
    idx += 1

try:
    FONT = ImageFont.truetype("C:/Windows/Fonts/consolab.ttf", 18)
except Exception:
    FONT = ImageFont.load_default()

def make_grid(folder, out_name, items, cols=2):
    tw, th, bar = 800, 450, 28
    rows = (len(items) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * tw, rows * (th + bar)), (18, 20, 22))
    draw = ImageDraw.Draw(sheet)
    for i, (vid, label) in enumerate(items):
        p = os.path.join(folder, f"{vid}.png")
        if not os.path.exists(p):
            continue
        im = Image.open(p).convert("RGB").resize((tw, th), Image.Resampling.LANCZOS)
        r, c = divmod(i, cols)
        x0, y0 = c * tw, r * (th + bar)
        draw.rectangle([x0, y0, x0 + tw, y0 + bar], fill=(28, 32, 34))
        draw.text((x0 + 10, y0 + 5), f"{vid[:2]} {label}", fill=(232, 226, 204), font=FONT)
        sheet.paste(im, (x0, y0 + bar))
    out_p = os.path.join(folder, out_name)
    sheet.save(out_p, quality=90)
    print(f"Wrote {out_p} ({sheet.width}x{sheet.height})")

tag_dir = os.path.join(ROOT, TAG)
make_grid(tag_dir, f"sheet-1-root-shale-{TAG}.jpg", VIEWS[0:8], cols=2)
make_grid(tag_dir, f"sheet-2-iron-wet-{TAG}.jpg", VIEWS[8:16], cols=2)
make_grid(tag_dir, f"sheet-3-hill-chalk-{TAG}.jpg", VIEWS[16:24], cols=2)
make_grid(tag_dir, f"sheet-4-dusk-rain-{TAG}.jpg", VIEWS[24:30], cols=2)

before_dir = os.path.join(ROOT, "before")
after_dir = os.path.join(ROOT, "after")
if os.path.isdir(before_dir) and os.path.isdir(after_dir):
    ba_dir = os.path.join(ROOT, "before-after")
    os.makedirs(ba_dir, exist_ok=True)
    pw, ph, bar = 800, 450, 30
    groups = [
        ("ba-1-root-shale.jpg", VIEWS[0:8]),
        ("ba-2-iron-wet.jpg", VIEWS[8:16]),
        ("ba-3-hill-chalk.jpg", VIEWS[16:24]),
        ("ba-4-dusk-rain.jpg", VIEWS[24:30]),
    ]
    for fname, chunk in groups:
        sheet = Image.new("RGB", (pw * 2 + 8, len(chunk) * (ph + bar)), (16, 18, 20))
        draw = ImageDraw.Draw(sheet)
        for r, (vid, label) in enumerate(chunk):
            y0 = r * (ph + bar)
            pb = os.path.join(before_dir, f"{vid}.png")
            pa = os.path.join(after_dir, f"{vid}.png")
            draw.rectangle([0, y0, pw, y0 + bar], fill=(32, 34, 36))
            draw.rectangle([pw + 8, y0, pw * 2 + 8, y0 + bar], fill=(24, 38, 30))
            draw.text((10, y0 + 6), f"BEFORE · {vid} — {label}", fill=(220, 215, 195), font=FONT)
            draw.text((pw + 18, y0 + 6), f"AFTER · {vid} — {label}", fill=(175, 240, 185), font=FONT)
            if os.path.exists(pb):
                sheet.paste(Image.open(pb).convert("RGB").resize((pw, ph), Image.Resampling.LANCZOS), (0, y0 + bar))
            if os.path.exists(pa):
                sheet.paste(Image.open(pa).convert("RGB").resize((pw, ph), Image.Resampling.LANCZOS), (pw + 8, y0 + bar))
        out_p = os.path.join(ba_dir, fname)
        sheet.save(out_p, quality=90)
        print(f"Wrote {out_p} ({sheet.width}x{sheet.height})")
