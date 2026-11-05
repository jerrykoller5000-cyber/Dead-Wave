import os
import shutil
from PIL import Image, ImageDraw, ImageFont

OUT_DIR = "qa/2026-11-04-AG-234"

def load_font(size=22):
    for p in ["C:/Windows/Fonts/consolab.ttf", "C:/Windows/Fonts/arialbd.ttf", "C:/Windows/Fonts/segoeui.ttf"]:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()

def make_grid(items, cols, tile_w, tile_h, out_name, title):
    rows = (len(items) + cols - 1) // cols
    header_h = 54
    canvas = Image.new("RGB", (cols * tile_w, header_h + rows * tile_h), (18, 20, 24))
    draw = ImageDraw.Draw(canvas)
    title_font = load_font(26)
    label_font = load_font(20)
    draw.text((20, 12), title, fill=(240, 244, 248), font=title_font)

    for idx, (fname, label) in enumerate(items):
        r = idx // cols
        c = idx % cols
        x0 = c * tile_w
        y0 = header_h + r * tile_h
        fpath = fname if os.path.exists(fname) else os.path.join(OUT_DIR, fname)
        if os.path.exists(fpath):
            im = Image.open(fpath).convert("RGB").resize((tile_w, tile_h), Image.Resampling.LANCZOS)
            canvas.paste(im, (x0, y0))
        draw.rectangle([x0, y0, x0 + tile_w, y0 + 36], fill=(12, 14, 18))
        draw.text((x0 + 12, y0 + 7), label, fill=(255, 230, 120), font=label_font)
        draw.rectangle([x0, y0, x0 + tile_w - 1, y0 + tile_h - 1], outline=(60, 66, 76), width=2)

    out_path = os.path.join(OUT_DIR, out_name)
    canvas.save(out_path, quality=92)
    print("Saved", out_path)

if __name__ == "__main__":
    make_grid([
        ("minigun-fp-rest.jpg", "Minigun 1P Rest — L-hand fist on GP-20024 side peg (-0.304,0.012,0.16), forearm outside"),
        ("minigun-fp-fire.jpg", "Minigun 1P Firing — Barrels spinning, L-hand on side peg, forearm outside -X plate"),
        ("chainsaw-fp-idle.jpg", "Chainsaw 1P Idle — Motorcycle grip (L-hand palm down over hoop bar, knuckles forward)"),
        ("chainsaw-fp-cut.jpg", "Chainsaw 1P Cutting — Motorcycle grip (L-hand palm down, chain accelerating round nose)"),
    ], 2, 960, 540, "fp-heavy-sheet.jpg", "AG-234 · Minigun Side Peg (GP-20024) & Chainsaw Motorcycle Grip (CL-301) — 1080p WebGPU Launcher")

    make_grid([
        ("minigun-fp-rest.jpg", "Minigun Side Peg 1P — Noon (0.50)"),
        ("minigun-fp-042.jpg", "Minigun Side Peg 1P — Afternoon (0.42)"),
        ("minigun-fp-dusk.jpg", "Minigun Side Peg 1P — Dusk (0.74)"),
        ("minigun-fp-night.jpg", "Minigun Side Peg 1P — Night (0.02)"),
        ("chainsaw-fp-idle.jpg", "Chainsaw Motorcycle Grip 1P — Noon (0.50)"),
        ("chainsaw-fp-042.jpg", "Chainsaw Motorcycle Grip 1P — Afternoon (0.42)"),
        ("chainsaw-fp-dusk.jpg", "Chainsaw Motorcycle Grip 1P — Dusk (0.74)"),
        ("chainsaw-fp-night.jpg", "Chainsaw Motorcycle Grip 1P — Night (0.02)"),
    ], 4, 640, 360, "fp-4light-sheet.jpg", "AG-234 · Four-Light First-Person Gate (Noon 0.50, Afternoon 0.42, Dusk 0.74, Night 0.02)")

    make_grid([
        ("minigun-fp-rest.jpg", "Live 1080p WebGPU Launcher — Minigun Side Peg (AG-234)"),
        ("Claude outputs/cl301/minigun-side-peg.png", "Claude Cloud Look — minigun-side-peg.png (CL-301 02:46Z)"),
        ("docs/jerry/2026-11-03-fp-refs/heavy-models/minigun-m134-handheld-belt.webp", "Jerry Ref — minigun-m134-handheld-belt.webp"),
        ("chainsaw-fp-idle.jpg", "Live 1080p WebGPU Launcher — Chainsaw Motorcycle Grip (AG-234)"),
        ("Claude outputs/cl301/chainsaw-motorcycle-grip.png", "Claude Cloud Look — chainsaw-motorcycle-grip.png (CL-301 02:20Z)"),
        ("docs/jerry/2026-11-03-fp-refs/heavy-models/chainsaw-proper-grip.jpg", "Jerry Ref — chainsaw-proper-grip.jpg"),
    ], 3, 640, 360, "comparison-sheet.jpg", "AG-234 · Live WebGPU Launcher vs Claude Cloud Looks & Jerry Heavy-Model References")

    # Refresh minigun.jpg / chainsaw.jpg in AG-232 and AG-221/223/228/231 if present
    for dst_dir in ["qa/2026-11-04-AG-232", "qa/2026-11-03-AG-221", "qa/2026-11-03-AG-223"]:
        if os.path.isdir(dst_dir):
            if os.path.exists(os.path.join(dst_dir, "minigun.jpg")):
                shutil.copyfile(os.path.join(OUT_DIR, "minigun-fp-rest.jpg"), os.path.join(dst_dir, "minigun.jpg"))
            if os.path.exists(os.path.join(dst_dir, "chainsaw.jpg")):
                shutil.copyfile(os.path.join(OUT_DIR, "chainsaw-fp-idle.jpg"), os.path.join(dst_dir, "chainsaw.jpg"))
