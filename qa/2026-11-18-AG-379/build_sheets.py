from PIL import Image, ImageDraw
import os

out_dir = "qa/2026-11-18-AG-379"
v2 = "review/GT-20111/d201/cloth-hinge-v1/brute-step2-fourlights-matched-owner-v2-curved-green"
v1 = "review/GT-20111/d201/cloth-hinge-v1/brute-step2-fourlights-matched-owner-v1"
os.makedirs(out_dir, exist_ok=True)


def crop_frac(path, x0f, y0f, x1f, y1f, target_size):
    im = Image.open(path).convert("RGB")
    w, h = im.size
    crop = im.crop((int(w * x0f), int(h * y0f), int(w * x1f), int(h * y1f)))
    return crop.resize(target_size, Image.Resampling.LANCZOS)


# Sheet 1: Full-body BEFORE vs v1 (21:42) vs v2 (model16 curved-green) across front, side, back, 3/4 + black side/back
# 3 cols x 4 rows (front-noon, side-noon, back-noon, 3q-noon)
sheet1 = Image.new("RGB", (1320, 1420), (24, 27, 32))
draw1 = ImageDraw.Draw(sheet1)
views = [
    ("front-noon.png", "Front Noon", (0.50, 0.22, 0.90, 0.78)),
    ("side-noon.png", "Side Noon", (0.55, 0.20, 0.88, 0.78)),
    ("back-noon.png", "Back Noon", (0.50, 0.22, 0.88, 0.78)),
    ("threequarter-noon.png", "3/4 Noon", (0.52, 0.22, 0.88, 0.78)),
]
cols = [
    ("BEFORE (production Brute1)", f"{v2}/before"),
    ("PRIOR v1 (21:42 model10)", f"{v1}/candidate"),
    ("CURRENT v2 (model16 curved-green)", f"{v2}/candidate"),
]
for r, (fn, label, box) in enumerate(views):
    y = 12 + r * 352
    for c, (cname, folder) in enumerate(cols):
        x = 12 + c * 434
        tile = crop_frac(f"{folder}/{fn}", *box, (422, 320))
        sheet1.paste(tile, (x, y))
        draw1.text((x + 6, y + 324), f"{cname} · {label}", fill=(230, 234, 238))
sheet1.save(f"{out_dir}/sheet-brute-step2-compare.jpg", quality=92)

# Sheet 2: Close-up waist, chest fasteners, side/rear rigid read, and elbow/forearm taper (v1 vs v2 vs before)
tiles2 = [
    ("BEFORE: waist-side noon", f"{v2}/before/waist-side-noon.png", (0.28, 0.00, 0.85, 0.90)),
    ("PRIOR v1: floating chest dot, stiff skirt, rear elbow shelf", f"{v1}/candidate/waist-side-noon.png", (0.28, 0.00, 0.85, 0.90)),
    ("CURRENT v2: dot gone, elbow taper better (top step + drooping belly remain), side/rear fin stiff", f"{v2}/candidate/waist-side-noon.png", (0.28, 0.00, 0.85, 0.90)),
    ("BEFORE: waist-3q noon", f"{v2}/before/waist-threequarter-noon.png", (0.15, 0.00, 0.95, 0.90)),
    ("CURRENT v2 waist-3q noon: 6 fasteners seated, curved front panels (flat top cut + V-notch)", f"{v2}/candidate/waist-threequarter-noon.png", (0.15, 0.00, 0.95, 0.90)),
    ("CURRENT v2 waist-side night: side flap gap/rigid cut & forearm taper check", f"{v2}/candidate/waist-side-night.png", (0.28, 0.00, 0.85, 0.90)),
    ("PRIOR v1 back-noon: spherical pumpkin elbows", f"{v1}/candidate/back-noon.png", (0.52, 0.24, 0.82, 0.76)),
    ("CURRENT v2 back-noon: bell/cone forearm flares ending at wrist cuff step", f"{v2}/candidate/back-noon.png", (0.52, 0.24, 0.82, 0.76)),
    ("CURRENT v2 back-black: bell forearm silhouette vs hunch/skirt", f"{v2}/candidate/back-black.png", (0.52, 0.24, 0.82, 0.76)),
]
sheet2 = Image.new("RGB", (1350, 1290), (24, 27, 32))
draw2 = ImageDraw.Draw(sheet2)
for idx, (label, path, box) in enumerate(tiles2):
    col, row = idx % 3, idx // 3
    x, y = 12 + col * 444, 12 + row * 424
    tile = crop_frac(path, *box, (432, 392))
    sheet2.paste(tile, (x, y))
    draw2.text((x + 4, y + 396), label[:66], fill=(230, 236, 240))
sheet2.save(f"{out_dir}/sheet-brute-step2-waist-elbow-zoom.jpg", quality=92)
print("Built AG-379 zoomed sheets.")
