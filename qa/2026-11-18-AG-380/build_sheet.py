from PIL import Image, ImageDraw
import os

out_dir = "qa/2026-11-18-AG-380"
v16 = "review/GT-20111/d201/cloth-hinge-v1/brute-step2-fourlights-matched-owner-v2-curved-green"
v17_prev = "review/GT-20111/d201/cloth-hinge-v1/cloth-native-getup-cache-owner-v17-weighted-lift/candidate"
v18 = "review/GT-20111/d201/cloth-hinge-v1/cloth-native-getup-cache-owner-v18-hanging-back/candidate"
os.makedirs(out_dir, exist_ok=True)


def crop_frac(path, x0f, y0f, x1f, y1f, target_size):
    im = Image.open(path).convert("RGB")
    w, h = im.size
    crop = im.crop((int(w * x0f), int(h * y0f), int(w * x1f), int(h * y1f)))
    return crop.resize(target_size, Image.Resampling.LANCZOS)


tiles = [
    ("BEFORE: waist-side noon (no panels)", f"{v16}/before/waist-side-noon.png", (0.28, 0.10, 0.85, 0.90)),
    ("MODEL 16 (v2): rear fin sticks out behind hip", f"{v16}/candidate/waist-side-noon.png", (0.28, 0.10, 0.85, 0.90)),
    ("MODEL 17 (rearfin17): rear panel hangs close", f"{v18}/waist-side-noon.png", (0.28, 0.10, 0.85, 0.90)),
    ("MODEL 16 (v2): waist-side night fin", f"{v16}/candidate/waist-side-night.png", (0.28, 0.10, 0.85, 0.90)),
    ("MODEL 17 (rearfin17): waist-side night hangs", f"{v18}/waist-side-night.png", (0.28, 0.10, 0.85, 0.90)),
    ("MODEL 17 (rearfin17): full side-noon silhouette", f"{v18}/side-noon.png", (0.55, 0.22, 0.88, 0.78)),
    ("MODEL 16 (v17 weighted-lift): key-strike-1 rear fin", f"{v17_prev}/key-strike-1-side-close-noon.png", (0.28, 0.10, 0.85, 0.90)),
    ("MODEL 17 (rearfin17): key-strike-1 hangs close", f"{v18}/key-strike-1-side-close-noon.png", (0.28, 0.10, 0.85, 0.90)),
    ("MODEL 17 (rearfin17): key-wind-1 rear hang (note strap)", f"{v18}/key-wind-1-side-close-noon.png", (0.28, 0.00, 0.85, 0.90)),
]

sheet = Image.new("RGB", (1350, 1290), (24, 27, 32))
draw = ImageDraw.Draw(sheet)
for idx, (label, path, box) in enumerate(tiles):
    col, row = idx % 3, idx // 3
    x, y = 12 + col * 444, 12 + row * 424
    tile = crop_frac(path, *box, (432, 392))
    sheet.paste(tile, (x, y))
    draw.text((x + 4, y + 396), label[:64], fill=(230, 236, 240))
sheet.save(f"{out_dir}/sheet-brute-rearfin17-compare.jpg", quality=92)
print("Built Brute rearfin17 comparison sheet.")
