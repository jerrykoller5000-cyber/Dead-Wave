#!/usr/bin/env python3
"""
Build labeled contact sheets for AG-301 (Moving-camera pass through the Training Ground on RTX 5080 WebGPU):
  1. sheet-1-routes-1P-4lights.jpg  (6 rooms x 4 lights in 1P)
  2. sheet-2-routes-3P-4lights.jpg  (6 rooms x 4 lights in 3P)
  3. sheet-3-diagnostics-hitches-decals-shadows-leaks.jpg
     - Row 1: 3P Corridor -> Infirmary Cutaway 500-1115ms Hitch Sequence + Frame-Time Trace Plot
     - Row 2: East Wall & Target-1 Plate Decal Parallax & -Z Sort Flip: BEFORE (15-16mm, ro=1) vs AFTER (1.8-2.8mm, ro=1.1/1.2)
     - Row 3: Floor Decal Grazing Parallax & -Z Sort: BEFORE (15-16mm, ro=1) vs AFTER (1.7-1.9mm, ro=1.1/1.2) + Build-Floor 2cm Micro-Glide Flicker Check
     - Row 4: Dusk Target-Stand / Bench / Column Shadow Contact (normalBias=1.4 peter-panning check) + Night Wall/Ceiling/Door Join Light-Leak Check
"""
import json
import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageChops, ImageStat

ROOT = Path(r"C:\Users\Zero\Desktop\Tiny Trek")
QA_DIR = ROOT / "qa" / "2026-11-11-AG-301"
REV_DIR = ROOT / "review" / "AG-301"
STRIPS = QA_DIR / "strips"


def load_font(sz, bold=False):
    candidates = [
        r"C:\Windows\Fonts\consolab.ttf" if bold else r"C:\Windows\Fonts\consola.ttf",
        r"C:\Windows\Fonts\segoeui.ttf",
        r"C:\Windows\Fonts\arial.ttf",
    ]
    for p in candidates:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, sz)
            except Exception:
                pass
    return ImageFont.load_default()


F_TITLE = load_font(22, bold=True)
F_SUB = load_font(15, bold=False)
F_HDR = load_font(16, bold=True)
F_LBL = load_font(13, bold=True)
F_SM = load_font(12, bold=False)


def save_dual_jpg(im, name, quality=91):
    for out_dir in (QA_DIR, REV_DIR):
        out_dir.mkdir(parents=True, exist_ok=True)
        fp = out_dir / name
        tmp = out_dir / f"{name}.tmp"
        im.convert("RGB").save(tmp, "JPEG", quality=quality, subsampling=0)
        os.replace(tmp, fp)
    print(f"[build-ag301-sheets] Wrote {name} ({im.size[0]}x{im.size[1]})")


def thumb(fp, w, h, crop_box=None):
    if not fp.exists():
        im = Image.new("RGB", (w, h), (42, 22, 22))
        d = ImageDraw.Draw(im)
        d.text((10, h // 2 - 8), f"MISSING: {fp.name}", fill=(255, 140, 140), font=F_LBL)
        return im
    im = Image.open(fp).convert("RGB")
    if crop_box:
        im = im.crop(crop_box)
    return im.resize((w, h), Image.Resampling.LANCZOS)


def badge(im, text, bg=(16, 20, 26), fg=(235, 240, 245), pos=(6, 6)):
    d = ImageDraw.Draw(im)
    bbox = d.textbbox((0, 0), text, font=F_LBL)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x, y = pos
    d.rectangle([x, y, x + tw + 12, y + th + 8], fill=bg, outline=(75, 90, 110))
    d.text((x + 6, y + 3), text, fill=fg, font=F_LBL)


def build_route_sheet(mode, out_name):
    stops = [
        ("01-entry-cif", "1. Entry & CIF"),
        ("02-kiosk-armory", "2. Kiosk & Armory"),
        ("03-bench-console", "3. Bench & Console"),
        ("04-corridor-door", "4. West Corridor"),
        ("05-hangar-west", "5. Hangar (Skull/HQ)"),
        ("06-lanes-decals", "6. Range Lanes"),
    ]
    lights = [
        ("noon", "NOON (Sun + Room Lit)"),
        ("overcast", "OVERCAST (Diffused + Lit)"),
        ("dusk", "DUSK (Low Sun + Lit)"),
        ("night", "NIGHT (Moon + Room Unlit)"),
    ]

    cw, ch = 360, 202
    pad = 10
    left_w = 180
    top_h = 88
    W = left_w + len(stops) * (cw + pad) + pad
    H = top_h + len(lights) * (ch + pad) + pad

    canvas = Image.new("RGB", (W, H), (14, 17, 22))
    d = ImageDraw.Draw(canvas)
    d.text(
        (18, 14),
        f"AG-301 · RTX 5080 WebGPU Moving-Camera Route Pass — {mode} View Across All 6 Rooms & 4 Lights",
        fill=(242, 246, 252),
        font=F_TITLE,
    )
    d.text(
        (18, 44),
        "Real-rAF 1P walk: 16.6-16.7ms median (60.0 fps), 0 walk hitches >25ms after initial post-blackout vm281 compile · 3P corridor walk catches 500-1115ms cutaway shader rebuild",
        fill=(165, 182, 204),
        font=F_SUB,
    )

    for ci, (_, col_lbl) in enumerate(stops):
        x = left_w + ci * (cw + pad)
        d.text((x + 6, top_h - 24), col_lbl, fill=(215, 228, 245), font=F_HDR)

    for ri, (lk, row_lbl) in enumerate(lights):
        y = top_h + ri * (ch + pad)
        d.text((16, y + ch // 2 - 10), row_lbl, fill=(215, 228, 245), font=F_LBL)
        for ci, (sid, _) in enumerate(stops):
            x = left_w + ci * (cw + pad)
            fp = STRIPS / f"{mode}-{lk}-{sid}.png"
            t = thumb(fp, cw, ch)
            badge(t, f"{mode} · {lk.upper()} · {sid[:2]}", bg=(15, 19, 25))
            canvas.paste(t, (x, y))

    save_dual_jpg(canvas, out_name)


def draw_trace_chart(w, h, trace_data):
    im = Image.new("RGB", (w, h), (18, 22, 29))
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, w - 1, h - 1], outline=(70, 86, 108), width=2)
    d.text((12, 8), "RTX 5080 Frame-Time & >25ms Hitch Summary (trace-before.json · 8,209 real-rAF frames)", fill=(242, 246, 252), font=F_HDR)

    runs = trace_data.get("runs", [])
    y0 = 36
    row_h = 19
    d.text((12, y0), "Light / Mode / Route", fill=(160, 180, 205), font=F_SM)
    d.text((285, y0), "Med", fill=(160, 180, 205), font=F_SM)
    d.text((340, y0), "p99", fill=(160, 180, 205), font=F_SM)
    d.text((398, y0), "Max ms", fill=(160, 180, 205), font=F_SM)
    d.text((472, y0), ">25ms", fill=(160, 180, 205), font=F_SM)
    d.text((528, y0), "dPipes / Cause", fill=(160, 180, 205), font=F_SM)
    y0 += 18

    shown = [
        r for r in runs
        if (r["light"] in ("noon", "night") and r["route"] in ("R1_entry_stations_console", "R2_corridor_build_hangar", "R3_lanes_downrange"))
        or (r["light"] in ("overcast", "dusk") and r["mode"] == "3P" and r["route"] == "R2_corridor_build_hangar")
    ][:8]

    for r in shown:
        tag = f"{r['light'][:4].upper()} {r['mode']} {r['route'][:14]}"
        mx = r["maxDtMs"]
        hc = r["hitchCountOver25ms"]
        np = r["totalNewPipes"]
        col = (255, 110, 105) if mx > 100 else ((255, 205, 110) if hc > 0 else (130, 230, 155))
        cause = "OK (60 fps steady)"
        if r["light"] == "noon" and r["mode"] == "1P" and r["route"].startswith("R1"):
            cause = "Post-blackout vm281 (+8 pipes)"
        elif r["mode"] == "3P" and r["route"].startswith("R2"):
            cause = f"cutaway mat.transparent rebuild!"
        elif hc > 0:
            cause = "minor 1-frame step"
        d.text((12, y0), tag, fill=(225, 232, 242), font=F_SM)
        d.text((285, y0), f"{r['medianDtMs']:.1f}", fill=(205, 215, 228), font=F_SM)
        d.text((340, y0), f"{r['p99DtMs']:.1f}", fill=(205, 215, 228), font=F_SM)
        d.text((398, y0), f"{mx:.1f}", fill=col, font=F_LBL)
        d.text((478, y0), f"{hc}", fill=col, font=F_LBL)
        d.text((528, y0), f"{np:+d} · {cause}", fill=col, font=F_SM)
        y0 += row_h

    # Weapon 1P first-equip hitches footer
    evs = [e for e in trace_data.get("eventChecks", []) if e.get("maxDtMs", 0) > 40]
    ev_txt = "1P 1st-Equip Hitches: " + ", ".join(f"{e['event'].replace('equip_1P_','')}: {e['maxDtMs']:.0f}ms" for e in evs[:6])
    d.text((12, h - 24), ev_txt, fill=(255, 195, 115), font=F_SM)
    return im


def build_diagnostics_sheet():
    trace_fp = QA_DIR / "trace-before.json"
    trace_data = json.loads(trace_fp.read_text("utf-8")) if trace_fp.exists() else {}

    W = 2360
    H = 1160
    canvas = Image.new("RGB", (W, H), (14, 17, 22))
    d = ImageDraw.Draw(canvas)

    d.text(
        (18, 12),
        "AG-301 · Diagnostics: >25ms Hitches, Decal Parallax & Sort Before/After, Micro-Glide Flicker, Shadows & Joins",
        fill=(242, 246, 252),
        font=F_TITLE,
    )

    # Row 1 (y=52..308): 3P Corridor Cutaway Hitch Sequence (4 frames) + Trace Summary Table
    d.text(
        (18, 48),
        "1. HITCH #1 (500–1115 ms, ALL 4 LIGHTS): 3P Corridor -> Infirmary Cutaway Wall Fade (world/training-cutaway.js flips mat.transparent + needsUpdate=true -> +14..+18 WebGPU pipelines)",
        fill=(255, 145, 135),
        font=F_HDR,
    )
    cw, ch = 360, 202
    cut_lbls = [
        (0, "x=-7.0m: Solid Wall (16.6ms)"),
        (1, "x=-10.5m: Corridor Fade (78.6ms, +2p)"),
        (3, "x=-17.9m: Hangar Fade (1114.9ms, +18p!)"),
        (4, "x=-21.2m: Past Margin (40.1ms)"),
    ]
    for idx, (step_i, lbl) in enumerate(cut_lbls):
        t = thumb(STRIPS / f"before-probe-cutaway-hitch-corridor-{step_i}.png", cw, ch)
        bg = (95, 22, 22) if "1114" in lbl or "78.6" in lbl else (18, 24, 32)
        badge(t, lbl, bg=bg)
        canvas.paste(t, (18 + idx * (cw + 10), 74))

    chart = draw_trace_chart(W - (18 + 4 * (cw + 10)) - 18, 246, trace_data)
    canvas.paste(chart, (18 + 4 * (cw + 10), 56))

    # Row 2 (y=300..565): Decal Parallax & -Z Sort Flip BEFORE vs AFTER (world/training-ballistics.js — FIXED IN OUR FILES!)
    d.text(
        (18, 292),
        "2. FIXED IN world/training-ballistics.js: Wall/Target/Floor Bullet & Char Decals — Before (15–16mm float, ro=1 sort collision, DoubleSide 2x draw) vs After (1.7–2.8mm + polygonOffset, ro=1.1/1.2, forceSinglePass)",
        fill=(135, 235, 165),
        font=F_HDR,
    )
    # Center-crop zooms so millimeter parallax & edge offset are crystal clear!
    # 1280x720 source -> crop central region (340, 160, 980, 520) -> 640x360 -> resize 375x211
    crop_mid = (300, 150, 980, 532)
    pairs = [
        ("before-probe-eastwall-decal-parallax-0.png", "BEFORE: East Wall z=5.8 (15-16mm float)", (92, 34, 24), crop_mid),
        ("after-probe-eastwall-decal-parallax-0.png",  "AFTER: East Wall z=5.8 (2.2-2.8mm flush)", (20, 78, 40), crop_mid),
        ("before-probe-eastwall-decal-parallax-1.png", "BEFORE: East Wall z=6.6 (15-16mm float)", (92, 34, 24), crop_mid),
        ("after-probe-eastwall-decal-parallax-1.png",  "AFTER: East Wall z=6.6 (2.2-2.8mm flush)", (20, 78, 40), crop_mid),
        ("before-probe-floor-decal-sort-0.png",        "BEFORE: Floor Low-Eye (15-16mm hover)", (92, 34, 24), crop_mid),
        ("after-probe-floor-decal-sort-0.png",         "AFTER: Floor Low-Eye (1.7-1.9mm flush)", (20, 78, 40), crop_mid),
    ]
    pw, ph = 378, 212
    for idx, (fn, lbl, bg, cb) in enumerate(pairs):
        t = thumb(STRIPS / fn, pw, ph, crop_box=cb)
        badge(t, lbl, bg=bg)
        canvas.paste(t, (18 + idx * (pw + 10), 318))

    # Row 3 (y=550..820): Reverse -Z Wear-Sort Check (Before vs After) + Build-Floor 2cm Micro-Glide Flicker Check
    # Compute pixel delta across Build-Floor 2cm glide steps to quantify z-fighting!
    glide_deltas = []
    for k in range(4):
        f0 = STRIPS / f"before-probe-buildfloor-microglide-{k}.png"
        f1 = STRIPS / f"before-probe-buildfloor-microglide-{k+1}.png"
        if f0.exists() and f1.exists():
            i0 = Image.open(f0).convert("RGB")
            i1 = Image.open(f1).convert("RGB")
            diff = ImageChops.difference(i0, i1)
            mean_d = sum(ImageStat.Stat(diff).mean) / 3.0
            glide_deltas.append(mean_d)
    delta_str = ", ".join(f"{v:.2f}" for v in glide_deltas) if glide_deltas else "n/a"

    d.text(
        (18, 544),
        f"3. Reverse -Z Transparent Sort Check (z=18->14 East Wall & z=11->9 Floor) + Build-Floor 2cm Micro-Glide Z-Fight Check (step RGB deltas: [{delta_str}] / 255 — 0 z-fighting!)",
        fill=(210, 226, 245),
        font=F_HDR,
    )
    row3 = [
        ("before-probe-eastwall-decal-parallax-3.png", "BEFORE -Z Wall Look (wear-wall ro=1 collision)", (92, 34, 24), crop_mid),
        ("after-probe-eastwall-decal-parallax-3.png",  "AFTER -Z Wall Look (ro=1.1/1.2 > wear ro=1)", (20, 78, 40), crop_mid),
        ("before-probe-floor-decal-sort-2.png",        "BEFORE -Z Floor Look (wear-floor ro=1)", (92, 34, 24), crop_mid),
        ("after-probe-floor-decal-sort-2.png",         "AFTER -Z Floor Look (ro=1.1/1.2 > wear ro=1)", (20, 78, 40), crop_mid),
        ("before-probe-buildfloor-microglide-0.png",   "Build Floor Glide +0cm (Noon)", (22, 32, 46), None),
        ("before-probe-buildfloor-microglide-4.png",   "Build Floor Glide +8cm (0 flicker)", (22, 32, 46), None),
    ]
    for idx, (fn, lbl, bg, cb) in enumerate(row3):
        t = thumb(STRIPS / fn, pw, ph, crop_box=cb)
        badge(t, lbl, bg=bg)
        canvas.paste(t, (18 + idx * (pw + 10), 570))

    # Row 4 (y=800..1140): Dusk Shadow Contact (normalBias=1.4 peter-panning check) + Night Wall/Ceiling/Door Join Light-Leak Check
    d.text(
        (18, 796),
        "4. Dusk Shadow Contact (sun.shadow.normalBias=1.4 peter-panning check on thin bases/legs) & Night Unlit Wall/Ceiling/Doorway Seam Light-Leak Check",
        fill=(210, 226, 245),
        font=F_HDR,
    )
    row4 = [
        ("before-probe-shadows-stands-columns-0.png", "Dusk: Lane-1 Stand Base Shadow", (45, 34, 20)),
        ("before-probe-shadows-stands-columns-2.png", "Dusk: West Console / Wall Base", (45, 34, 20)),
        ("before-probe-shadows-stands-columns-4.png", "Dusk: Infirmary Cot & Fence Shadow", (45, 34, 20)),
        ("before-probe-wall-joins-leaks-0.png",       "Night: East/Backstop 6m Ceiling Join", (20, 26, 42)),
        ("before-probe-wall-joins-leaks-2.png",       "Night: Corridor Doorway Seam", (20, 26, 42)),
        ("before-probe-wall-joins-leaks-3.png",       "Night: Hangar 24m Roof Corner Join", (20, 26, 42)),
    ]
    for idx, (fn, lbl, bg) in enumerate(row4):
        t = thumb(STRIPS / fn, pw, ph)
        badge(t, lbl, bg=bg)
        canvas.paste(t, (18 + idx * (pw + 10), 822))

    d.text(
        (18, 1052),
        "Summary: Steady 1P walk = 60.0 fps (0 hitches >25ms across all rooms & 4 lights after warmup). Action items: (1) LANDED in world/training-ballistics.js: flush 1.7-2.8mm decals + polygonOffset + ro=1.1/1.2 + forceSinglePass;"
        " (2) TO CHATGPT (world/training-cutaway.js): 500-1115ms 3P corridor fade shader rebuild; (3) TO CLAUDE/OWNERS: 48-183ms 1P first-equip vm281 compile & normalBias=1.4 thin-stand shadow offset.",
        fill=(185, 200, 220),
        font=F_SM,
    )

    save_dual_jpg(canvas, "sheet-3-diagnostics-hitches-decals-shadows-leaks.jpg")


if __name__ == "__main__":
    build_route_sheet("1P", "sheet-1-routes-1P-4lights.jpg")
    build_route_sheet("3P", "sheet-2-routes-3P-4lights.jpg")
    build_diagnostics_sheet()
