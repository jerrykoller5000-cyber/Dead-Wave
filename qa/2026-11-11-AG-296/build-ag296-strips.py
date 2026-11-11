import json
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = r"C:\Users\Zero\Desktop\Tiny Trek"
REV = os.path.join(ROOT, "review", "AG-296")
QA = os.path.join(ROOT, "qa", "2026-11-11-AG-296")

LIGHTS = ["noon", "overcast", "dusk", "night"]
LIGHT_TITLES = {"noon": "NOON", "overcast": "OVERCAST", "dusk": "DUSK", "night": "NIGHT"}


def get_font(size, bold=False):
    candidates = [
        r"C:\Windows\Fonts\consolab.ttf" if bold else r"C:\Windows\Fonts\consola.ttf",
        r"C:\Windows\Fonts\segoeuib.ttf" if bold else r"C:\Windows\Fonts\segoeui.ttf",
        r"C:\Windows\Fonts\arialbd.ttf" if bold else r"C:\Windows\Fonts\arial.ttf",
    ]
    for p in candidates:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


FONT_H1 = get_font(24, True)
FONT_H2 = get_font(18, True)
FONT_SUB = get_font(15, False)


def save_dual(canvas, filename):
    for d in (REV, QA):
        os.makedirs(d, exist_ok=True)
        out_p = os.path.join(d, filename)
        canvas.save(out_p, quality=93, subsampling=0)
        print(f"Saved {out_p} ({os.path.getsize(out_p)//1024} kB)")


def build_4light_strip(prefix, title, subtitle, filename):
    tw, th = 640, 360
    pad = 12
    left_lbl = 112
    top_hdr = 82
    col_hdr = 34

    W = left_lbl + 4 * tw + 5 * pad
    H = top_hdr + col_hdr + 2 * th + 3 * pad
    canvas = Image.new("RGB", (W, H), (16, 18, 22))
    draw = ImageDraw.Draw(canvas)

    draw.text((pad + 6, 14), title, fill=(246, 204, 56), font=FONT_H1)
    draw.text((pad + 6, 46), subtitle, fill=(196, 204, 214), font=FONT_SUB)

    for ci, lk in enumerate(LIGHTS):
        cx = left_lbl + pad + ci * (tw + pad)
        draw.rectangle([cx, top_hdr, cx + tw, top_hdr + col_hdr - 4], fill=(28, 33, 40))
        draw.text((cx + 14, top_hdr + 6), LIGHT_TITLES[lk], fill=(235, 240, 246), font=FONT_H2)

        for ri, phase in enumerate(["before", "after"]):
            ry = top_hdr + col_hdr + pad + ri * (th + pad)
            if ci == 0:
                badge_col = (145, 52, 42) if phase == "before" else (38, 124, 68)
                draw.rectangle([pad, ry, left_lbl, ry + th], fill=(24, 28, 34))
                draw.rectangle([pad, ry, pad + 6, ry + th], fill=badge_col)
                lbl = "BEFORE" if phase == "before" else "AFTER"
                sub = "Baseline" if phase == "before" else "AG-296"
                draw.text((pad + 14, ry + th // 2 - 22), lbl, fill=(245, 247, 250), font=FONT_H2)
                draw.text((pad + 14, ry + th // 2 + 4), sub, fill=(175, 184, 196), font=FONT_SUB)

            src = os.path.join(REV, phase, f"{prefix}-{lk}.png")
            if os.path.exists(src):
                im = Image.open(src).convert("RGB").resize((tw, th), Image.Resampling.LANCZOS)
                canvas.paste(im, (cx, ry))
                border = (95, 52, 48) if phase == "before" else (58, 142, 82)
                draw.rectangle([cx, ry, cx + tw - 1, ry + th - 1], outline=border, width=2)

    save_dual(canvas, filename)


def crop_zoom(path, box, out_size):
    im = Image.open(path).convert("RGB")
    w, h = im.size
    x0 = max(0, min(w - 1, int(box[0] * w)))
    y0 = max(0, min(h - 1, int(box[1] * h)))
    x1 = max(x0 + 1, min(w, int(box[2] * w)))
    y1 = max(y0 + 1, min(h, int(box[3] * h)))
    return im.crop((x0, y0, x1, y1)).resize(out_size, Image.Resampling.LANCZOS)


def build_detail_sheet():
    cw, ch = 560, 360
    pad = 14
    hdr = 84
    lbl_h = 34
    cols = 4
    rows = 2

    W = pad + cols * (cw + pad)
    H = hdr + rows * (ch + lbl_h + pad) + pad
    canvas = Image.new("RGB", (W, H), (16, 18, 22))
    draw = ImageDraw.Draw(canvas)

    b_path = os.path.join(REV, "before", "bench-summary.json")
    a_path = os.path.join(REV, "after", "bench-summary.json")
    bench_line = "RTX 5080 WebGPU High"
    if os.path.exists(b_path) and os.path.exists(a_path):
        with open(b_path, "r", encoding="utf-8") as f:
            bb = json.load(f)["bench"]["activeFire"]
        with open(a_path, "r", encoding="utf-8") as f:
            ab = json.load(f)["bench"]["activeFire"]
        bench_line = (
            f"RTX 5080 Exclusive Active-Fire Bench — BEFORE: {bb['fps']} fps (1% low {bb['low1pct']} fps, tick {bb['prof']['tickMs']} ms, newPipes {bb['prof']['newPipelines']})  |  "
            f"AFTER: {ab['fps']} fps (1% low {ab['low1pct']} fps, tick {ab['prof']['tickMs']} ms, newPipes {ab['prof']['newPipelines']})"
        )

    draw.text((pad + 4, 14), "AG-296 (J120) — Zoomed Detail Inspection: Flame Tips, Decal/Wisp Sort, Active Burn & Settled Ash Pile", fill=(246, 204, 56), font=FONT_H1)
    draw.text((pad + 4, 48), bench_line, fill=(192, 228, 198), font=FONT_SUB)

    panels = [
        # Row 0: BEFORE crops
        ("BEFORE · Noon Stream & Wisp Over Fire (2.2x)", os.path.join(REV, "before", "stream-backwall-noon.png"), (0.30, 0.24, 0.78, 0.78), False),
        ("BEFORE · Noon Char Dots & Octagon Blobs (2.2x)", os.path.join(REV, "before", "char-marks-noon.png"), (0.28, 0.30, 0.86, 0.90), False),
        ("BEFORE · Active Target Burn (Noon, 2.2x)", os.path.join(REV, "before", "target-burning-noon.png"), (0.32, 0.24, 0.80, 0.76), False),
        ("BEFORE · Settled 'Ash' = Orange Cone! (2.6x)", os.path.join(REV, "before", "target-ash-noon.png"), (0.48, 0.42, 0.84, 0.78), False),
        # Row 1: AFTER crops + close-ups
        ("AFTER · Noon Licking Tongues & Clean Sort (2.2x)", os.path.join(REV, "after", "stream-backwall-noon.png"), (0.30, 0.24, 0.78, 0.78), True),
        ("AFTER · Noon Carbon Soot Char & Floor Scorch (2.2x)", os.path.join(REV, "after", "char-marks-noon.png"), (0.28, 0.30, 0.86, 0.90), True),
        ("AFTER · Active Target Burn (Noon, 2.2x)", os.path.join(REV, "after", "target-burning-noon.png"), (0.32, 0.24, 0.80, 0.76), True),
        ("AFTER · Settled Charcoal/Grey Ash Heap Close-Up", os.path.join(REV, "after", "ash-closeup-noon.png"), (0.08, 0.08, 0.92, 0.92), True),
    ]

    for idx, (label, p, box, is_after) in enumerate(panels):
        r = idx // cols
        c = idx % cols
        x = pad + c * (cw + pad)
        y = hdr + r * (ch + lbl_h + pad)
        bg = (28, 48, 34) if is_after else (52, 30, 28)
        draw.rectangle([x, y, x + cw, y + lbl_h], fill=bg)
        draw.text((x + 10, y + 7), label, fill=(242, 245, 248), font=FONT_SUB)
        if os.path.exists(p):
            im = crop_zoom(p, box, (cw, ch))
            canvas.paste(im, (x, y + lbl_h))
            border = (64, 152, 88) if is_after else (138, 62, 54)
            draw.rectangle([x, y, x + cw - 1, y + lbl_h + ch - 1], outline=border, width=2)

    save_dual(canvas, "strip-4-burn-and-ash-detail.jpg")


if __name__ == "__main__":
    build_4light_strip(
        "stream-backwall",
        "AG-296 · Strip 1: Flamethrower Stream Fidelity & Bullet-Hole / Barrel-Wisp Sorting (Eye, 4 Lights)",
        "Same eye position (O.x+1.0, z=-0.25) firing toward bullet-peppered back wall: cohesive curling/thinning tongues + embers; 0 decals or wisps over fire.",
        "strip-1-stream-backwall-4lights.jpg",
    )
    build_4light_strip(
        "char-marks",
        "AG-296 · Strip 2: Black Carbon Char Marks on Wall & Floor + Live Flame Sorting (Eye, 4 Lights)",
        "Same eye position (O.x+4.8, z=-0.35) after sweeping wall & floor: organic carbon-soot char marks fade slowly; live fire renders cleanly over char & holes.",
        "strip-2-char-marks-4lights.jpg",
    )
    build_4light_strip(
        "target-ash",
        "AG-296 · Strip 3: Sustained-Hit Target Burn to Ash Pile + Unburned Target Free-Shooting (Eye, 4 Lights)",
        "Same eye position (O.x+4.8, z=-0.25): Lane 1 burned to slumped charcoal/grey ash heap on stand; unburned Lane 2 shot with live round and folding normally.",
        "strip-3-target-burn-ash-4lights.jpg",
    )
    build_detail_sheet()
