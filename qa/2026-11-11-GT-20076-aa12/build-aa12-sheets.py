# qa/2026-11-11-GT-20076-aa12/build-aa12-sheets.py
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = "C:/Users/Zero/Desktop/Tiny Trek"
SHOTS = os.path.join(ROOT, "review/GT-20076/gpu-aa12/shots")
OUT_REV = os.path.join(ROOT, "review/GT-20076/gpu-aa12")
OUT_QA = os.path.join(ROOT, "qa/2026-11-11-GT-20076-aa12")
os.makedirs(OUT_REV, exist_ok=True)
os.makedirs(OUT_QA, exist_ok=True)

def load_font(sz):
    for p in ["C:/Windows/Fonts/consolab.ttf", "C:/Windows/Fonts/segoeui.ttf", "C:/Windows/Fonts/arial.ttf"]:
        if os.path.exists(p):
            return ImageFont.truetype(p, sz)
    return ImageFont.load_default()

F_TITLE = load_font(22)
F_ROW = load_font(16)
F_LBL = load_font(14)

LIGHTS = ["noon", "overcast", "dusk", "night"]

def build_grid(title, rows, out_name, tw=440, th=248):
    pad = 14
    hdr_h = 54
    lbl_h = 26
    cols = len(LIGHTS)
    w = pad + cols * (tw + pad)
    h = hdr_h + len(rows) * (th + lbl_h + pad) + pad
    canvas = Image.new("RGB", (w, h), (16, 19, 24))
    drw = ImageDraw.Draw(canvas)
    drw.text((pad, 14), title, fill=(235, 242, 250), font=F_TITLE)

    for r_idx, (row_prefix, row_desc) in enumerate(rows):
        y0 = hdr_h + r_idx * (th + lbl_h + pad)
        for c_idx, lk in enumerate(LIGHTS):
            x0 = pad + c_idx * (tw + pad)
            fname = f"{row_prefix}-{lk}.jpg"
            fpath = os.path.join(SHOTS, fname)
            drw.rectangle([x0, y0, x0 + tw, y0 + lbl_h], fill=(28, 34, 44))
            drw.text((x0 + 8, y0 + 4), f"{row_desc} · {lk.upper()}", fill=(205, 222, 242), font=F_LBL)
            if os.path.exists(fpath):
                im = Image.open(fpath).convert("RGB").resize((tw, th), Image.Resampling.LANCZOS)
                canvas.paste(im, (x0, y0 + lbl_h))
            else:
                drw.rectangle([x0, y0 + lbl_h, x0 + tw, y0 + lbl_h + th], fill=(50, 20, 20))
                drw.text((x0 + 16, y0 + lbl_h + 20), f"MISSING: {fname}", fill=(255, 120, 120), font=F_ROW)

    for dest in [OUT_REV, OUT_QA]:
        canvas.save(os.path.join(dest, out_name), quality=92)
    print("Saved", out_name, canvas.size)

# Sheet 1: Factory Breacher across all 5 views x 4 lights (Eye hip/ADS crown seam, Held right/left side inset & circular trim, Rack grip graphics)
build_grid(
    "GT-20076 Breacher (aa12) J128 Surface Return · RTX 5080 WebGPU 4-Light Look (Factory: Eye, Held & Rack)",
    [
        ("factory-eye-hip", "1P Eye Hip (Crown-to-Polymer Seam)"),
        ("factory-eye-ads", "1P Eye ADS (Top Sight & Crown)"),
        ("factory-held-right", "3P Held Right (Side Inset & Trim Disc)"),
        ("factory-held-left", "3P Held Left (Left Housing & Trim)"),
        ("factory-rack", "Armory Rack (Grip Rubber Graphics & Fore-end)"),
    ],
    "sheet-1-aa12-factory-4lights.jpg",
)

# Sheet 2: M81 Camo Masking across Eye, Held-Right & Rack x 4 lights + Standalone Marine Inspector 4-light row
def build_sheet2():
    pad = 14
    hdr_h = 54
    lbl_h = 26
    tw, th = 440, 248
    rows_spec = [
        [("m81-eye-hip-" + lk + ".jpg", f"M81 1P Eye Hip · {lk.upper()}") for lk in LIGHTS],
        [("m81-held-right-" + lk + ".jpg", f"M81 3P Held Right · {lk.upper()}") for lk in LIGHTS],
        [("m81-rack-" + lk + ".jpg", f"M81 Armory Rack · {lk.upper()}") for lk in LIGHTS],
        [
            ("inspector-aa12-side-noon.jpg", "Inspector side · NOON"),
            ("inspector-aa12-three-overcast.jpg", "Inspector three · OVERCAST"),
            ("inspector-aa12-rear3-dusk.jpg", "Inspector rear3 · DUSK"),
            ("inspector-aa12-three-night.jpg", "Inspector three · NIGHT"),
        ],
        [
            ("restored-eye-hip-noon.jpg", "Factory Restored · 1P Eye NOON"),
            ("restored-held-right-noon.jpg", "Factory Restored · 3P Held NOON"),
            ("restored-rack-noon.jpg", "Factory Restored · Rack NOON"),
            ("factory-held-right-noon.jpg", "Initial Factory Ref · 3P Held NOON"),
        ],
    ]
    w = pad + 4 * (tw + pad)
    h = hdr_h + len(rows_spec) * (th + lbl_h + pad) + pad
    canvas = Image.new("RGB", (w, h), (16, 19, 24))
    drw = ImageDraw.Draw(canvas)
    drw.text((pad, 14), "GT-20076 Breacher (aa12) · M81 Camo Masking, Factory Restore & Standalone Inspector (RTX 5080 WebGPU)", fill=(235, 242, 250), font=F_TITLE)

    for r_idx, cols_list in enumerate(rows_spec):
        y0 = hdr_h + r_idx * (th + lbl_h + pad)
        for c_idx, (fname, label) in enumerate(cols_list):
            x0 = pad + c_idx * (tw + pad)
            fpath = os.path.join(SHOTS, fname)
            drw.rectangle([x0, y0, x0 + tw, y0 + lbl_h], fill=(28, 34, 44))
            drw.text((x0 + 8, y0 + 4), label, fill=(205, 222, 242), font=F_LBL)
            if os.path.exists(fpath):
                im = Image.open(fpath).convert("RGB").resize((tw, th), Image.Resampling.LANCZOS)
                canvas.paste(im, (x0, y0 + lbl_h))
    for dest in [OUT_REV, OUT_QA]:
        canvas.save(os.path.join(dest, "sheet-2-aa12-m81-inspector-restore.jpg"), quality=92)
    print("Saved sheet-2-aa12-m81-inspector-restore.jpg", canvas.size)

build_sheet2()
