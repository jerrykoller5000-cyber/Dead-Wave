import os
import json
from PIL import Image, ImageDraw, ImageFont

ROOT = r"C:\Users\Zero\Desktop\Tiny Trek"
REV = os.path.join(ROOT, "review", "AG-296")
QA = os.path.join(ROOT, "qa", "2026-11-11-AG-296")
os.makedirs(REV, exist_ok=True)
os.makedirs(QA, exist_ok=True)

LIGHTS = ["noon", "overcast", "dusk", "night"]

def get_font(sz):
    for p in [r"C:\Windows\Fonts\consolab.ttf", r"C:\Windows\Fonts\arialbd.ttf", r"C:\Windows\Fonts\segoeui.ttf"]:
        if os.path.exists(p):
            return ImageFont.truetype(p, sz)
    return ImageFont.load_default()

F_TITLE = get_font(22)
F_SUB = get_font(15)
F_TAG = get_font(14)

def save_both(im, name):
    for d in (REV, QA):
        out = os.path.join(d, name)
        im.save(out, quality=92, subsampling=0)
        print(f"Saved {out} ({os.path.getsize(out)//1024} kB)")

def load_tile(path, w, h, badge, badge_col=(255, 195, 70)):
    if os.path.exists(path):
        im = Image.open(path).convert("RGB").resize((w, h), Image.Resampling.LANCZOS)
    else:
        im = Image.new("RGB", (w, h), (28, 22, 22))
        d0 = ImageDraw.Draw(im)
        d0.text((16, h // 2 - 10), f"MISSING: {os.path.basename(path)}", fill=(255, 90, 90), font=F_TAG)
    d = ImageDraw.Draw(im, "RGBA")
    tw = int(d.textlength(badge, font=F_TAG))
    d.rectangle([8, 8, 20 + tw, 31], fill=(12, 14, 18, 205), outline=(70, 78, 92, 220))
    d.text((14, 11), badge, fill=badge_col, font=F_TAG)
    return im

def load_metrics(phase):
    p = os.path.join(REV, f"{phase}-rope", "rope-metrics.json")
    if os.path.exists(p):
        with open(p, "r", encoding="utf-8") as f:
            return json.load(f).get("metrics", {})
    return {}

def build_4x4_rope_sheet(view_prefix, view_title, out_name):
    tw, th = 560, 315
    pad = 10
    hdr = 68
    W = pad + 4 * (tw + pad)
    H = hdr + 4 * (th + pad) + pad
    canvas = Image.new("RGB", (W, H), (14, 16, 20))
    d = ImageDraw.Draw(canvas)
    d.text((16, 12), f"AG-296 (J120 Return Item 1) — {view_title}", fill=(245, 247, 250), font=F_TITLE)
    d.text((16, 40), "Same camera & Lane 1 stance (x=+5.62, z=-0.25) across Noon / Overcast / Dusk / Night · BEFORE (5c9b8901e) vs AFTER (Pressurized Burning-Fuel Rope -> 8m Target & 30m Back-Wall Fireball)", fill=(175, 186, 202), font=F_SUB)

    m_before = load_metrics("before")
    m_after = load_metrics("after")

    k1 = "side1" if view_prefix == "side" else "s1"
    k2 = "side2" if view_prefix == "side" else "s2"
    rows = [
        ("before", "1s", "BEFORE · 1.0s HELD", (235, 140, 120), m_before, "s1"),
        ("after",  "1s", "AFTER  · 1.0s HELD", (125, 245, 155), m_after,  k1),
        ("before", "2s", "BEFORE · 2.0s HELD", (235, 140, 120), m_before, "s2"),
        ("after",  "2s", "AFTER  · 2.0s HELD", (125, 245, 155), m_after,  k2),
    ]
    for r_idx, (phase, dur, rlabel, bcol, mdict, skey) in enumerate(rows):
        for c_idx, light in enumerate(LIGHTS):
            p = os.path.join(REV, f"{phase}-rope", f"{view_prefix}-{dur}-{light}.png")
            st = mdict.get(light, {}).get(skey, {})
            reach = st.get("maxRelZ", "?")
            badge = f"{rlabel} · {light.upper()} (reach {reach}m)"
            tile = load_tile(p, tw, th, badge, bcol)
            x = pad + c_idx * (tw + pad)
            y = hdr + r_idx * (th + pad)
            canvas.paste(tile, (x, y))
    save_both(canvas, out_name)

def build_target_and_char_sheet():
    tw, th = 560, 315
    pad = 10
    hdr = 66
    W = pad + 4 * (tw + pad)
    H = hdr + 3 * (th + pad) + pad
    canvas = Image.new("RGB", (W, H), (14, 16, 20))
    d = ImageDraw.Draw(canvas)
    d.text((16, 12), "AG-296 — Direct 8m Target Rope Splash (Before vs After) & Carbon Char / Render-Sort (4 Lights)", fill=(245, 247, 250), font=F_TITLE)
    d.text((16, 40), "Row 1: BEFORE (0.57s, falls short of 8m target) · Row 2: AFTER (0.57s, thin rope widens & splashes onto 8m target) · Row 3: Accepted Carbon Char & Render-Order Sorting (4 Lights)", fill=(175, 186, 202), font=F_SUB)

    row1 = [
        (os.path.join(REV, "before-rope", "target8m-eye-noon.png"),  "BEFORE · 8m EYE · NOON",  (235, 140, 120)),
        (os.path.join(REV, "before-rope", "target8m-side-noon.png"), "BEFORE · 8m SIDE · NOON", (235, 140, 120)),
        (os.path.join(REV, "before-rope", "target8m-eye-night.png"), "BEFORE · 8m EYE · NIGHT", (235, 140, 120)),
        (os.path.join(REV, "before-rope", "target8m-side-night.png"),"BEFORE · 8m SIDE · NIGHT",(235, 140, 120)),
    ]
    row2 = [
        (os.path.join(REV, "after-rope", "target8m-eye-noon.png"),   "AFTER · 8m EYE · NOON",   (125, 245, 155)),
        (os.path.join(REV, "after-rope", "target8m-side-noon.png"),  "AFTER · 8m SIDE · NOON",  (125, 245, 155)),
        (os.path.join(REV, "after-rope", "target8m-eye-night.png"),  "AFTER · 8m EYE · NIGHT",  (125, 245, 155)),
        (os.path.join(REV, "after-rope", "target8m-side-night.png"), "AFTER · 8m SIDE · NIGHT", (125, 245, 155)),
    ]
    row3 = [
        (os.path.join(REV, "after", f"char-marks-{l}.png"), f"CHAR + SORT · {l.upper()}", (255, 208, 102))
        for l in LIGHTS
    ]
    for r_idx, row in enumerate([row1, row2, row3]):
        for c_idx, (p, badge, col) in enumerate(row):
            tile = load_tile(p, tw, th, badge, col)
            canvas.paste(tile, (pad + c_idx * (tw + pad), hdr + r_idx * (th + pad)))
    save_both(canvas, "strip-3-8m-target-and-char-4lights.jpg")

if __name__ == "__main__":
    build_4x4_rope_sheet("eye", "1P Eye Camera — Held Trigger at 1.0 s & 2.0 s (4 Lights)", "strip-1-eye-1s-2s-4lights.jpg")
    build_4x4_rope_sheet("side", "Side Lane-Wall Camera Looking Across — Held Trigger at 1.0 s & 2.0 s (4 Lights)", "strip-2-side-1s-2s-4lights.jpg")
    build_target_and_char_sheet()
