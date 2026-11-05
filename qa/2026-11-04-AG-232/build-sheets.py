import os
from PIL import Image, ImageDraw, ImageFont

OUT_DIR = "qa/2026-11-04-AG-232"

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
        fpath = os.path.join(OUT_DIR, fname)
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
        ("minigun-fp-rest.jpg", "Minigun 1P — Hip Rest (Noon, L-hand on top post, R-hand on rear grip)"),
        ("minigun-fp-fire.jpg", "Minigun 1P — Firing (Noon, Barrels Spinning + Belt Box)"),
        ("chainsaw-fp-idle.jpg", "Chainsaw 1P — Idle (Noon, L-hand on front hoop, R-hand on rear grip)"),
        ("chainsaw-fp-cut.jpg", "Chainsaw 1P — Cutting (Noon, Forward Swing + Chain Nose)"),
    ], 2, 960, 540, "fp-heavy-sheet.jpg", "AG-232 · GP-20022 Rebuilt Minigun & Chainsaw + CL-301 1P Hands (1080p WebGPU Launcher)")

    make_grid([
        ("minigun-fp-rest.jpg", "Minigun 1P — Noon (0.35)"),
        ("minigun-fp-042.jpg", "Minigun 1P — Afternoon (0.42)"),
        ("minigun-fp-dusk.jpg", "Minigun 1P — Dusk (0.74)"),
        ("minigun-fp-night.jpg", "Minigun 1P — Night (0.02)"),
        ("chainsaw-fp-idle.jpg", "Chainsaw 1P — Noon (0.35)"),
        ("chainsaw-fp-042.jpg", "Chainsaw 1P — Afternoon (0.42)"),
        ("chainsaw-fp-dusk.jpg", "Chainsaw 1P — Dusk (0.74)"),
        ("chainsaw-fp-night.jpg", "Chainsaw 1P — Night (0.02)"),
    ], 4, 640, 360, "fp-4light-sheet.jpg", "AG-232 / GP-20022 · Four-Light First-Person Gate (Noon, 0.42, Dusk, Night)")

    make_grid([
        ("chainsaw-3p-rest-right.jpg", "Chainsaw 3P — Rest Right (GB-275 Landed)"),
        ("chainsaw-3p-rest-left.jpg", "Chainsaw 3P — Rest Left (GB-275 Landed)"),
        ("chainsaw-3p-rest-top.jpg", "Chainsaw 3P — Rest Top (GB-275 Landed)"),
        ("chainsaw-3p-cut-right.jpg", "Chainsaw 3P — Cutting Right (GB-275 Landed)"),
        ("minigun-3p-rest-right.jpg", "Minigun 3P — Rest Right (Pre-GB-275 Minigun)"),
        ("minigun-3p-rest-left.jpg", "Minigun 3P — Rest Left (Pre-GB-275 Minigun)"),
        ("minigun-3p-rest-top.jpg", "Minigun 3P — Rest Top (Pre-GB-275 Minigun)"),
        ("minigun-3p-fire-right.jpg", "Minigun 3P — Firing Right (Pre-GB-275 Minigun)"),
    ], 4, 640, 360, "tp-heavy-sheet.jpg", "AG-232 · Third-Person Holds (Chainsaw GB-275 Landed vs Minigun Pre-GB-275)")
