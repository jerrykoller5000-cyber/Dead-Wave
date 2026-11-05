from PIL import Image, ImageDraw, ImageFont
import os

base_dir = r"C:\Users\Zero\Desktop\Tiny Trek\qa\2026-11-04-AG-235"
ag234_dir = r"C:\Users\Zero\Desktop\Tiny Trek\qa\2026-11-04-AG-234"
gb275_dir = r"C:\Users\Zero\Desktop\Tiny Trek\qa\2026-11-03-GB-275\after"

W, H = 960, 540

try:
    font = ImageFont.truetype("consola.ttf", 20)
except Exception:
    font = ImageFont.load_default()

# 1. 2x2 4-light 3P sheet
panels = [
    (os.path.join(base_dir, "minigun-3p-noon.jpg"), "3P Minigun Side Peg — Noon (0.25) [dR=0.0mm, dL=1.0mm]"),
    (os.path.join(base_dir, "minigun-3p-042.jpg"), "3P Minigun Side Peg — Afternoon (0.42) [dR=0.0mm, dL=1.0mm]"),
    (os.path.join(base_dir, "minigun-3p-dusk.jpg"), "3P Minigun Side Peg — Dusk (0.52) [dR=0.0mm, dL=1.0mm]"),
    (os.path.join(base_dir, "minigun-3p-night.jpg"), "3P Minigun Side Peg — Night (0.75) [dR=0.0mm, dL=1.0mm]"),
]

sheet = Image.new("RGB", (W * 2, H * 2), (18, 20, 24))
draw = ImageDraw.Draw(sheet)

for idx, (path, label) in enumerate(panels):
    if not os.path.exists(path):
        continue
    im = Image.open(path).convert("RGB").resize((W, H), Image.Resampling.LANCZOS)
    x = (idx % 2) * W
    y = (idx // 2) * H
    sheet.paste(im, (x, y))
    draw.rectangle([x, y, x + W, y + 34], fill=(12, 14, 18))
    draw.text((x + 12, y + 7), label, fill=(235, 240, 245), font=font)

out_path = os.path.join(base_dir, "minigun-3p-4light-sheet.jpg")
sheet.save(out_path, quality=92)
print("Saved", out_path)

# 2. Composite 1P + 3P side-peg contact sheet
comp_panels = [
    (os.path.join(ag234_dir, "fp-minigun-noon.jpg"), "1P Minigun Side Peg (CL-301) — Noon [err=0.0mm, forearm +78mm]"),
    (os.path.join(gb275_dir, "mg-peg-close-left.png"), "3P Side Peg Close-Up (GB-275) — Left [-X peg (-0.304,0.012,0.16)]"),
    (os.path.join(gb275_dir, "mg-three-left.png"), "3P Minigun Three-Quarter Left — Forearm Outside -X Receiver"),
    (os.path.join(gb275_dir, "mg-rear-close-right.png"), "3P Rear Firing Grip Close-Up — Right [dR=0.0mm, dL=1.0mm]"),
]

sheet2 = Image.new("RGB", (W * 2, H * 2), (18, 20, 24))
draw2 = ImageDraw.Draw(sheet2)

for idx, (path, label) in enumerate(comp_panels):
    if not os.path.exists(path):
        continue
    im = Image.open(path).convert("RGB").resize((W, H), Image.Resampling.LANCZOS)
    x = (idx % 2) * W
    y = (idx // 2) * H
    sheet2.paste(im, (x, y))
    draw2.rectangle([x, y, x + W, y + 34], fill=(12, 14, 18))
    draw2.text((x + 12, y + 7), label, fill=(235, 240, 245), font=font)

out_path2 = os.path.join(base_dir, "minigun-gp20024-gate-sheet.jpg")
sheet2.save(out_path2, quality=92)
print("Saved", out_path2)
