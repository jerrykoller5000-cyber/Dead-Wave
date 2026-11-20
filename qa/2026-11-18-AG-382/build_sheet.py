import os
from PIL import Image, ImageDraw, ImageFont

ROOT = r"C:\Users\Zero\Desktop\Tiny Trek"
V15 = os.path.join(ROOT, r"review\GT-20111\d204\spider-shape-p4-owner-v15-rounded19")
V16 = os.path.join(ROOT, r"review\GT-20111\d204\spider-shape-p4-owner-v16-ballknee20")
V17 = os.path.join(ROOT, r"review\GT-20111\d204\spider-shape-p4-owner-v17-material21")
OUT = os.path.join(ROOT, r"qa\2026-11-18-AG-382")
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


# 1. Cuffs, neck tuck, and knee ball progression (Spider17 -> Spider19 -> Spider20 -> Spider21)
# Side torso+roots+neck bbox: spider side is (325,285)-(997,767); torso/roots/neck is roughly (450, 310, 960, 580)
SIDE_ROOTS = (440, 310, 940, 575)
# 3q torso+roots+neck: spider 3q is (303,284)-(967,773); roots/neck/knees roughly (420, 310, 920, 575)
TQ_ROOTS = (420, 310, 920, 575)
# Front knees + upper body zoom: spider front is (335,281)-(947,736); upper/knees (330, 280, 955, 610)
FRONT_KNEES = (330, 280, 955, 610)
# Side knee closeups (front & mid knees): (325, 315, 965, 650)
SIDE_KNEES = (325, 315, 965, 650)

make_grid(
    [
        [
            ("Spider17 BEFORE | side-noon (root cuffs/neck)", os.path.join(V15, "before", "close-side-noon.png"), SIDE_ROOTS),
            ("Spider19 ROUNDED | side-noon (AG378 fix)", os.path.join(V15, "plan", "close-side-noon.png"), SIDE_ROOTS),
            ("Spider21 MATERIAL | side-noon (wet collar)", os.path.join(V17, "plan", "close-side-noon.png"), SIDE_ROOTS),
        ],
        [
            ("Spider17 BEFORE | 3q-noon (root cuffs/neck)", os.path.join(V15, "before", "close-threequarter-noon.png"), TQ_ROOTS),
            ("Spider19 ROUNDED | 3q-noon (AG378 fix)", os.path.join(V15, "plan", "close-threequarter-noon.png"), TQ_ROOTS),
            ("Spider21 MATERIAL | 3q-noon (wet collar)", os.path.join(V17, "plan", "close-threequarter-noon.png"), TQ_ROOTS),
        ],
        [
            ("Spider19 FLAT CUFFS | front-noon (log stumps)", os.path.join(V15, "plan", "close-front-noon.png"), FRONT_KNEES),
            ("Spider20 ROUND BALLS | front-noon (15cm sphere)", os.path.join(V16, "plan", "close-front-noon.png"), FRONT_KNEES),
            ("Spider21 MATERIAL | front-noon (pole+band)", os.path.join(V17, "plan", "close-front-noon.png"), FRONT_KNEES),
        ],
        [
            ("Spider19 FLAT CUFFS | side-noon (log stumps)", os.path.join(V15, "plan", "close-side-noon.png"), SIDE_KNEES),
            ("Spider20 ROUND BALLS | side-noon (15cm sphere)", os.path.join(V16, "plan", "close-side-noon.png"), SIDE_KNEES),
            ("Spider21 MATERIAL | side-noon (pole+band)", os.path.join(V17, "plan", "close-side-noon.png"), SIDE_KNEES),
        ],
    ],
    col_w=450,
    row_h=245,
    title="AG-382 Sheet 1: Spider17 -> Spider19 (AG-378 cuffs/neck) -> Spider20 (rounded knees) -> Spider21 (material)",
    out_name="sheet-spider19-20-cuffs-knees-zoom.jpg",
)

# 2. Spider21 Material Pass zoomed comparison (GEOMETRY20 BEFORE vs MATERIAL21 PLAN, Night-first + Noon + Back)
TQ_BODY = (320, 275, 955, 760)
SIDE_BODY = (335, 280, 990, 755)
BACK_BODY = (315, 275, 965, 745)

make_grid(
    [
        [
            ("GEOMETRY20 BEFORE | 3q-night (night-first)", os.path.join(V17, "before", "close-threequarter-night.png"), TQ_BODY),
            ("MATERIAL21 PLAN | 3q-night (night-first)", os.path.join(V17, "plan", "close-threequarter-night.png"), TQ_BODY),
        ],
        [
            ("GEOMETRY20 BEFORE | 3q-noon (plates/knees/neck)", os.path.join(V17, "before", "close-threequarter-noon.png"), TQ_BODY),
            ("MATERIAL21 PLAN | 3q-noon (plates/knees/neck)", os.path.join(V17, "plan", "close-threequarter-noon.png"), TQ_BODY),
        ],
        [
            ("GEOMETRY20 BEFORE | side-noon (wood-grain knees/neck)", os.path.join(V17, "before", "close-side-noon.png"), SIDE_BODY),
            ("MATERIAL21 PLAN | side-noon (pole+band / wet neck)", os.path.join(V17, "plan", "close-side-noon.png"), SIDE_BODY),
        ],
        [
            ("GEOMETRY20 BEFORE | back-noon (dorsal plates/knees)", os.path.join(V17, "before", "close-back-noon.png"), BACK_BODY),
            ("MATERIAL21 PLAN | back-noon (crest/crease values)", os.path.join(V17, "plan", "close-back-noon.png"), BACK_BODY),
        ],
    ],
    col_w=640,
    row_h=305,
    title="AG-382 Sheet 2: Spider21 Material Pass vs Geometry20 (Night-first, Noon 3/4, Side, Back zoom)",
    out_name="sheet-spider21-material-zoom.jpg",
)

# 3. Head/Eyes/Fangs + Lower Tibiae/Claws zoom (Spider17 -> Spider19/20 -> Spider21)
HEAD_FRONT = (200, 120, 1080, 780)
HEAD_TQ = (220, 130, 1100, 790)
CLAWS_FRONT = (325, 420, 955, 755)
CLAWS_TQ = (300, 410, 965, 780)

make_grid(
    [
        [
            ("Spider17 BEFORE | head-front-noon", os.path.join(V15, "before", "head-front-noon.png"), HEAD_FRONT),
            ("Spider20 BALLKNEE | head-front-noon", os.path.join(V16, "plan", "head-front-noon.png"), HEAD_FRONT),
            ("Spider21 MATERIAL | head-front-noon", os.path.join(V17, "plan", "head-front-noon.png"), HEAD_FRONT),
        ],
        [
            ("Spider17 BEFORE | head-3q-noon", os.path.join(V15, "before", "head-threequarter-noon.png"), HEAD_TQ),
            ("Spider20 BALLKNEE | head-3q-noon", os.path.join(V16, "plan", "head-threequarter-noon.png"), HEAD_TQ),
            ("Spider21 MATERIAL | head-3q-noon", os.path.join(V17, "plan", "head-threequarter-noon.png"), HEAD_TQ),
        ],
        [
            ("Spider17 BEFORE | head-3q-night", os.path.join(V15, "before", "head-threequarter-night.png"), HEAD_TQ),
            ("Spider20 BALLKNEE | head-3q-night", os.path.join(V16, "plan", "head-threequarter-night.png"), HEAD_TQ),
            ("Spider21 MATERIAL | head-3q-night", os.path.join(V17, "plan", "head-threequarter-night.png"), HEAD_TQ),
        ],
        [
            ("Spider17 BEFORE | lower legs/hooks (3q-noon)", os.path.join(V15, "before", "close-threequarter-noon.png"), CLAWS_TQ),
            ("Spider19 ROUNDED | fuller tibiae/hooks (3q-noon)", os.path.join(V15, "plan", "close-threequarter-noon.png"), CLAWS_TQ),
            ("Spider21 MATERIAL | lower legs/hooks (3q-noon)", os.path.join(V17, "plan", "close-threequarter-noon.png"), CLAWS_TQ),
        ],
    ],
    col_w=450,
    row_h=280,
    title="AG-382 Sheet 3: Head/Eyes/Fangs/Lateral Beads & Lower Tibiae/Hooks (Spider17 -> Spider19/20 -> Spider21)",
    out_name="sheet-spider21-head-claws-zoom.jpg",
)
