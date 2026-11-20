import os
from PIL import Image, ImageDraw, ImageFont, ImageChops

ROOT = r"C:\Users\Zero\Desktop\Tiny Trek"
V15 = os.path.join(ROOT, r"review\GT-20111\d204\spider-shape-p4-owner-v15-rounded19")
V18 = os.path.join(ROOT, r"review\GT-20111\d204\spider-shape-p4-owner-v18-polish22")
OUT = os.path.join(ROOT, r"qa\2026-11-18-AG-383")
os.makedirs(OUT, exist_ok=True)

try:
    FONT = ImageFont.truetype("arial.ttf", 17)
    FONT_SM = ImageFont.truetype("arial.ttf", 14)
except Exception:
    FONT = ImageFont.load_default()
    FONT_SM = FONT


def load_crop(path, box, out_size):
    im = Image.open(path).convert("RGB")
    if box is not None:
        im = im.crop(box)
    return im.resize(out_size, Image.Resampling.LANCZOS)


def make_grid(rows, col_w, row_h, title, out_name):
    pad = 8
    header_h = 34
    label_h = 24
    ncols = max(len(r) for r in rows)
    nrows = len(rows)
    W = pad + ncols * (col_w + pad)
    H = header_h + pad + nrows * (row_h + label_h + pad)
    canvas = Image.new("RGB", (W, H), (22, 24, 28))
    draw = ImageDraw.Draw(canvas)
    draw.rectangle([0, 0, W, header_h], fill=(14, 16, 20))
    draw.text((12, 8), title, fill=(240, 244, 250), font=FONT)

    for r_idx, row in enumerate(rows):
        y0 = header_h + pad + r_idx * (row_h + label_h + pad)
        for c_idx, (label, path, box) in enumerate(row):
            x0 = pad + c_idx * (col_w + pad)
            draw.rectangle([x0, y0, x0 + col_w, y0 + label_h], fill=(34, 38, 46))
            draw.text((x0 + 6, y0 + 4), label, fill=(230, 236, 245), font=FONT_SM)
            tile = load_crop(path, box, (col_w, row_h))
            canvas.paste(tile, (x0, y0 + label_h))

    out_path = os.path.join(OUT, out_name)
    canvas.save(out_path, quality=94)
    print(f"Wrote {out_path} ({W}x{H})")


# Verify raw PNG size + black silhouette diff counts
for view in ["front", "threequarter", "side", "back"]:
    b = Image.open(os.path.join(V18, "before", f"close-{view}-black.png")).convert("RGB")
    p = Image.open(os.path.join(V18, "plan", f"close-{view}-black.png")).convert("RGB")
    diff = ImageChops.difference(b, p)
    px = list(diff.getdata())
    changed = sum(1 for r, g, bl in px if (r or g or bl))
    print(f"black-{view}: size={b.size}, changed_pixels={changed}/{len(px)}")

# Crop boxes for 1280x900 native frames
SIDE_ROOTS_TIGHT = (450, 325, 920, 560)   # tight zoom on 3 femur roots + cervical collar (side)
TQ_ROOTS_TIGHT = (410, 315, 895, 565)     # tight zoom on dorsal plates + roots + neck (3q)
BACK_PLATES = (375, 290, 905, 595)        # tight zoom on dorsal carapace plates + spines (back)
SIDE_BODY = (335, 280, 990, 620)          # side carapace + roots + neck + knees
TQ_BODY = (320, 275, 955, 635)            # 3q carapace + roots + neck + head
WIDE_SPIDER = (580, 420, 1060, 740)       # wide-threequarter zoomed around the spider

# Sheet 1: Root-seat wedge removal & cervical neck matte sheen (Spider17 -> Spider21 -> Spider22)
make_grid(
    [
        [
            ("Spider17 (AG-378 shards) | side-noon", os.path.join(V15, "before", "close-side-noon.png"), SIDE_ROOTS_TIGHT),
            ("Spider21 BEFORE (wedges+gloss) | side-noon", os.path.join(V18, "before", "close-side-noon.png"), SIDE_ROOTS_TIGHT),
            ("Spider22 POLISH (tucked+matte) | side-noon", os.path.join(V18, "plan", "close-side-noon.png"), SIDE_ROOTS_TIGHT),
        ],
        [
            ("Spider21 BEFORE | side-overcast", os.path.join(V18, "before", "close-side-overcast.png"), SIDE_ROOTS_TIGHT),
            ("Spider22 POLISH | side-overcast", os.path.join(V18, "plan", "close-side-overcast.png"), SIDE_ROOTS_TIGHT),
            ("Spider22 POLISH | side-dusk", os.path.join(V18, "plan", "close-side-dusk.png"), SIDE_ROOTS_TIGHT),
        ],
        [
            ("Spider21 BEFORE | side-night", os.path.join(V18, "before", "close-side-night.png"), SIDE_ROOTS_TIGHT),
            ("Spider22 POLISH | side-night", os.path.join(V18, "plan", "close-side-night.png"), SIDE_ROOTS_TIGHT),
            ("Spider22 POLISH | 3q-night", os.path.join(V18, "plan", "close-threequarter-night.png"), TQ_ROOTS_TIGHT),
        ],
        [
            ("Spider17 (AG-378) | 3q-noon", os.path.join(V15, "before", "close-threequarter-noon.png"), TQ_ROOTS_TIGHT),
            ("Spider21 BEFORE | 3q-noon", os.path.join(V18, "before", "close-threequarter-noon.png"), TQ_ROOTS_TIGHT),
            ("Spider22 POLISH | 3q-noon", os.path.join(V18, "plan", "close-threequarter-noon.png"), TQ_ROOTS_TIGHT),
        ],
    ],
    col_w=450,
    row_h=235,
    title="AG-383 Sheet 1: Spider22 Root-Seat Wedge Tuck & Cervical Neck Sheen (Spider17 -> Spider21 -> Spider22)",
    out_name="sheet-spider22-roots-neck-zoom.jpg",
)

# Sheet 2: Dorsal carapace plate ridge/crease contrast (Night-first + Noon 3/4, Side, Back, Wide gameplay distance)
make_grid(
    [
        [
            ("Spider21 BEFORE | 3q-night (night-first)", os.path.join(V18, "before", "close-threequarter-night.png"), TQ_BODY),
            ("Spider22 POLISH | 3q-night (night-first)", os.path.join(V18, "plan", "close-threequarter-night.png"), TQ_BODY),
        ],
        [
            ("Spider21 BEFORE | 3q-noon (carapace ridges)", os.path.join(V18, "before", "close-threequarter-noon.png"), TQ_BODY),
            ("Spider22 POLISH | 3q-noon (carapace ridges)", os.path.join(V18, "plan", "close-threequarter-noon.png"), TQ_BODY),
        ],
        [
            ("Spider21 BEFORE | back-noon (plate creases)", os.path.join(V18, "before", "close-back-noon.png"), BACK_PLATES),
            ("Spider22 POLISH | back-noon (plate creases)", os.path.join(V18, "plan", "close-back-noon.png"), BACK_PLATES),
        ],
        [
            ("Spider21 BEFORE | back-night (plate creases)", os.path.join(V18, "before", "close-back-night.png"), BACK_PLATES),
            ("Spider22 POLISH | back-night (plate creases)", os.path.join(V18, "plan", "close-back-night.png"), BACK_PLATES),
        ],
    ],
    col_w=640,
    row_h=305,
    title="AG-383 Sheet 2: Spider22 Dorsal Carapace Plate Ridge/Crease Contrast (Spider21 vs Spider22)",
    out_name="sheet-spider22-ridges-zoom.jpg",
)

# Sheet 3: Wide gameplay distance + Head/front unchanged verification + Side-black root silhouette trim
SIDE_BLACK_ROOTS = (440, 315, 930, 585)
make_grid(
    [
        [
            ("Spider21 BEFORE | wide-3q-noon (zoom)", os.path.join(V18, "before", "wide-threequarter-noon.png"), WIDE_SPIDER),
            ("Spider22 POLISH | wide-3q-noon (zoom)", os.path.join(V18, "plan", "wide-threequarter-noon.png"), WIDE_SPIDER),
        ],
        [
            ("Spider21 BEFORE | wide-3q-night (zoom)", os.path.join(V18, "before", "wide-threequarter-night.png"), WIDE_SPIDER),
            ("Spider22 POLISH | wide-3q-night (zoom)", os.path.join(V18, "plan", "wide-threequarter-night.png"), WIDE_SPIDER),
        ],
        [
            ("Spider21 BEFORE | side-black (root contour)", os.path.join(V18, "before", "close-side-black.png"), SIDE_BLACK_ROOTS),
            ("Spider22 POLISH | side-black (tucked contour)", os.path.join(V18, "plan", "close-side-black.png"), SIDE_BLACK_ROOTS),
        ],
        [
            ("Spider21 BEFORE | head-3q-noon (unchanged)", os.path.join(V18, "before", "head-threequarter-noon.png"), (220, 140, 1080, 760)),
            ("Spider22 POLISH | head-3q-noon (unchanged)", os.path.join(V18, "plan", "head-threequarter-noon.png"), (220, 140, 1080, 760)),
        ],
    ],
    col_w=620,
    row_h=285,
    title="AG-383 Sheet 3: Wide Gameplay Distance, Side Silhouette Root Trim & Head/Neck Context",
    out_name="sheet-spider22-wide-sil-zoom.jpg",
)
