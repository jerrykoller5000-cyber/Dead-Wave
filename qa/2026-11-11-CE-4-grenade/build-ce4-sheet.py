# qa/2026-11-11-CE-4-grenade/build-ce4-sheet.py
import json
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = "C:/Users/Zero/Desktop/Tiny Trek"
SHOTS = os.path.join(ROOT, "review/CE-4/gpu/shots")
SUMMARY_PATH = os.path.join(ROOT, "review/CE-4/gpu/ce4-summary.json")
OUT_REV = os.path.join(ROOT, "review/CE-4/gpu")
OUT_QA = os.path.join(ROOT, "qa/2026-11-11-CE-4-grenade")
os.makedirs(OUT_REV, exist_ok=True)
os.makedirs(OUT_QA, exist_ok=True)

def load_font(sz):
    for p in ["C:/Windows/Fonts/consolab.ttf", "C:/Windows/Fonts/segoeui.ttf", "C:/Windows/Fonts/arial.ttf"]:
        if os.path.exists(p):
            return ImageFont.truetype(p, sz)
    return ImageFont.load_default()

F_TITLE = load_font(19)
F_LBL = load_font(12)

with open(SUMMARY_PATH, "r", encoding="utf-8") as f:
    summary = json.load(f)

LIGHTS = ["noon", "overcast", "dusk", "night"]

# Sheet 1: CE-4 Part 1 (1P Grenade Throw, 8 columns x 4 lights)
tw, th = 300, 169
pad = 10
hdr_h = 52
lbl_h = 24
cols_g = 8

w_g = pad + cols_g * (tw + pad)
h_g = hdr_h + len(LIGHTS) * (th + lbl_h + pad) + pad
canvas_g = Image.new("RGB", (w_g, h_g), (15, 18, 22))
drw_g = ImageDraw.Draw(canvas_g)
drw_g.text(
    (pad, 14),
    "CE-4 Part 1 · 1P Grenade Throw at Eye Across 4 Lights (RTX 5080 WebGPU): Cocked Right of HUD Panel, Loose Open Release, Smooth Return to Grip",
    fill=(238, 244, 252),
    font=F_TITLE,
)

for r_idx, lk in enumerate(LIGHTS):
    frames = summary["lights"].get(lk, [])
    y0 = hdr_h + r_idx * (th + lbl_h + pad)
    for c_idx, item in enumerate(frames[:cols_g]):
        x0 = pad + c_idx * (tw + pad)
        g = item.get("grenade") or {}
        ph_str = f"{g.get('phase') or 'gun'}:{g.get('t', 0):.2f}" if g else item["label"]
        drw_g.rectangle([x0, y0, x0 + tw, y0 + lbl_h], fill=(28, 35, 44))
        drw_g.text((x0 + 6, y0 + 5), f"{lk.upper()} · {item['label']} ({ph_str})", fill=(215, 228, 245), font=F_LBL)
        fpath = os.path.join(SHOTS, item["file"])
        if os.path.exists(fpath):
            im = Image.open(fpath).convert("RGB").resize((tw, th), Image.Resampling.LANCZOS)
            canvas_g.paste(im, (x0, y0 + lbl_h))

for dest in [OUT_REV, OUT_QA]:
    canvas_g.save(os.path.join(dest, "CE-4-grenade-4lights-5080.jpg"), quality=92)
print("Saved CE-4-grenade-4lights-5080.jpg", canvas_g.size)

# Sheet 2: CE-4 Part 2 (1P Knife Slash, 9 columns f00..f14 + f20 x 4 lights)
cols_k = 9
tw_k, th_k = 280, 158
w_k = pad + cols_k * (tw_k + pad)
h_k = hdr_h + len(LIGHTS) * (th_k + lbl_h + pad) + pad
canvas_k = Image.new("RGB", (w_k, h_k), (15, 18, 22))
drw_k = ImageDraw.Draw(canvas_k)
drw_k.text(
    (pad, 14),
    "CE-4 Part 2 · 1P Combat Knife Slash at Eye Across 4 Lights (RTX 5080 WebGPU, Every 2 Frames @ 60/s): Wind-Up Right -> Edge-First Cut -> Left Follow -> Pistol",
    fill=(238, 244, 252),
    font=F_TITLE,
)

for r_idx, lk in enumerate(LIGHTS):
    frames = summary.get("knifeLights", {}).get(lk, [])
    y0 = hdr_h + r_idx * (th_k + lbl_h + pad)
    for c_idx, item in enumerate(frames[:cols_k]):
        x0 = pad + c_idx * (tw_k + pad)
        kt = item.get("knifeAnimT", 0)
        drw_k.rectangle([x0, y0, x0 + tw_k, y0 + lbl_h], fill=(28, 35, 44))
        drw_k.text((x0 + 5, y0 + 5), f"{lk.upper()} · {item['label']} (t={kt:.2f}s)", fill=(215, 228, 245), font=F_LBL)
        fpath = os.path.join(SHOTS, item["file"])
        if os.path.exists(fpath):
            im = Image.open(fpath).convert("RGB").resize((tw_k, th_k), Image.Resampling.LANCZOS)
            canvas_k.paste(im, (x0, y0 + lbl_h))

for dest in [OUT_REV, OUT_QA]:
    canvas_k.save(os.path.join(dest, "CE-4-knife-4lights-5080.jpg"), quality=92)
print("Saved CE-4-knife-4lights-5080.jpg", canvas_k.size)
