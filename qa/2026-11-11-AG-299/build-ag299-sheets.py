import os
import json
import time
import random
from PIL import Image, ImageDraw, ImageFont

ROOT = r"C:\Users\Zero\Desktop\Tiny Trek"
REV_296 = os.path.join(ROOT, "review", "AG-296")
REV = os.path.join(ROOT, "review", "AG-299")
QA = os.path.join(ROOT, "qa", "2026-11-11-AG-299")
os.makedirs(REV, exist_ok=True)
os.makedirs(QA, exist_ok=True)

LIGHTS = ["noon", "overcast", "dusk", "night"]


def get_font(sz):
    for p in [
        r"C:\Windows\Fonts\consolab.ttf",
        r"C:\Windows\Fonts\arialbd.ttf",
        r"C:\Windows\Fonts\segoeui.ttf",
    ]:
        if os.path.exists(p):
            return ImageFont.truetype(p, sz)
    return ImageFont.load_default()


F_TITLE = get_font(21)
F_SUB = get_font(14)
F_TAG = get_font(13)


def save_atomic(im, out_path):
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    tmp = f"{out_path}.tmp-{os.getpid()}-{random.randint(1000,9999)}.jpg"
    im.save(tmp, format="JPEG", quality=92, subsampling=0)
    for attempt in range(25):
        try:
            os.replace(tmp, out_path)
            return
        except OSError:
            if attempt == 24:
                raise
            time.sleep(0.15 + attempt * 0.08)


def save_both(im, name):
    for d in (REV, QA):
        out = os.path.join(d, name)
        save_atomic(im, out)
        print(f"Saved {out} ({os.path.getsize(out) // 1024} kB)")


def load_tile(path, w, h, badge, badge_col=(255, 195, 70)):
    if os.path.exists(path):
        im = Image.open(path).convert("RGB").resize((w, h), Image.Resampling.LANCZOS)
    else:
        im = Image.new("RGB", (w, h), (28, 22, 22))
        d0 = ImageDraw.Draw(im)
        d0.text((16, h // 2 - 10), f"MISSING: {os.path.basename(path)}", fill=(255, 90, 90), font=F_TAG)
    d = ImageDraw.Draw(im, "RGBA")
    tw = int(d.textlength(badge, font=F_TAG))
    d.rectangle([8, 8, 20 + tw, 30], fill=(10, 12, 16, 212), outline=(72, 82, 98, 225))
    d.text((14, 11), badge, fill=badge_col, font=F_TAG)
    return im


def load_json(p):
    if os.path.exists(p):
        with open(p, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def build_side_by_side_rope_sheet(view_prefix, view_title, out_name, bench_line):
    tw, th = 560, 315
    pad = 10
    hdr = 74
    W = pad + 4 * (tw + pad)
    H = hdr + 4 * (th + pad) + pad
    canvas = Image.new("RGB", (W, H), (14, 16, 20))
    d = ImageDraw.Draw(canvas)
    d.text((16, 12), f"AG-299 — {view_title}: 08:33Z Accepted (+187 draws) vs Instanced Batches", fill=(245, 247, 250), font=F_TITLE)
    d.text((16, 42), bench_line, fill=(165, 225, 185), font=F_SUB)

    m_before = load_json(os.path.join(REV_296, "after-rope", "rope-metrics.json")).get("metrics", {})
    m_after = load_json(os.path.join(REV, "after", "shot-metrics.json")).get("metrics", {})

    k1 = "side1" if view_prefix == "side" else "s1"
    k2 = "side2" if view_prefix == "side" else "s2"

    rows = [
        ("before", "1s", "08:33Z ACCEPTED · 1.0s", (245, 195, 115), m_before, k1),
        ("after",  "1s", "AG-299 INSTANCED · 1.0s", (125, 245, 155), m_after,  k1),
        ("before", "2s", "08:33Z ACCEPTED · 2.0s", (245, 195, 115), m_before, k2),
        ("after",  "2s", "AG-299 INSTANCED · 2.0s", (125, 245, 155), m_after,  k2),
    ]
    for r_idx, (phase, dur, rlabel, bcol, mdict, skey) in enumerate(rows):
        for c_idx, light in enumerate(LIGHTS):
            if phase == "before":
                p = os.path.join(REV_296, "after-rope", f"{view_prefix}-{dur}-{light}.png")
                st = mdict.get(light, {}).get(skey, {})
                reach = st.get("maxRelZ", "?")
                draw_note = "~426 1P draws (+187)" if view_prefix == "eye" else "+~187 flame draws"
                badge = f"{rlabel} · {light.upper()} (reach {reach}m · {draw_note})"
            else:
                p = os.path.join(REV, "after", f"{view_prefix}-{dur}-{light}.png")
                st = mdict.get(light, {}).get(skey, {})
                reach = st.get("maxRelZ", "?")
                draws = st.get("draws", "?")
                batches = st.get("flameBatches", "?")
                draw_note = f"{draws} 1P draws, {batches} batches" if view_prefix == "eye" else f"{batches} flame batches ({draws} scene draws)"
                badge = f"{rlabel} · {light.upper()} (reach {reach}m · {draw_note})"
            tile = load_tile(p, tw, th, badge, bcol)
            x = pad + c_idx * (tw + pad)
            y = hdr + r_idx * (th + pad)
            canvas.paste(tile, (x, y))
    save_both(canvas, out_name)


def build_splash_char_ash_sheet(bench_line):
    tw, th = 560, 315
    pad = 10
    hdr = 74
    W = pad + 4 * (tw + pad)
    H = hdr + 6 * (th + pad) + pad
    canvas = Image.new("RGB", (W, H), (14, 16, 20))
    d = ImageDraw.Draw(canvas)
    d.text((16, 12), "AG-299 — 8m Splash, Carbon Char, Decal Sort & Target Burn-to-Ash: 08:33Z Accepted vs Instanced", fill=(245, 247, 250), font=F_TITLE)
    d.text((16, 42), bench_line, fill=(165, 225, 185), font=F_SUB)

    b_col = (245, 195, 115)
    a_col = (125, 245, 155)

    rows = [
        # Row 1 & 2: 8m target direct splash (0.57s) 08:33Z vs AG-299
        [
            (os.path.join(REV_296, "after-rope", "target8m-eye-noon.png"),   "08:33Z · 8m SPLASH EYE · NOON",   b_col),
            (os.path.join(REV_296, "after-rope", "target8m-side-noon.png"),  "08:33Z · 8m SPLASH SIDE · NOON",  b_col),
            (os.path.join(REV_296, "after-rope", "target8m-eye-night.png"),  "08:33Z · 8m SPLASH EYE · NIGHT",  b_col),
            (os.path.join(REV_296, "after-rope", "target8m-side-night.png"), "08:33Z · 8m SPLASH SIDE · NIGHT", b_col),
        ],
        [
            (os.path.join(REV, "after", "target8m-eye-noon.png"),   "AG-299 · 8m SPLASH EYE · NOON",   a_col),
            (os.path.join(REV, "after", "target8m-side-noon.png"),  "AG-299 · 8m SPLASH SIDE · NOON",  a_col),
            (os.path.join(REV, "after", "target8m-eye-night.png"),  "AG-299 · 8m SPLASH EYE · NIGHT",  a_col),
            (os.path.join(REV, "after", "target8m-side-night.png"), "AG-299 · 8m SPLASH SIDE · NIGHT", a_col),
        ],
        # Row 3 & 4: Char marks & Decal sort (4 lights) 08:33Z vs AG-299
        [(os.path.join(REV_296, "after", f"char-marks-{l}.png"), f"08:33Z · CHAR + SORT · {l.upper()}", b_col) for l in LIGHTS],
        [(os.path.join(REV, "after", f"char-marks-{l}.png"),     f"AG-299 · CHAR + SORT · {l.upper()}", a_col) for l in LIGHTS],
        # Row 5 & 6: Burning plate + Settled ash heap (Noon/Night + 4-light ash + closeup) 08:33Z vs AG-299
        [
            (os.path.join(REV_296, "after", "target-burning-noon.png"),  "08:33Z · BURNING PLATE · NOON",  b_col),
            (os.path.join(REV_296, "after", "target-burning-night.png"), "08:33Z · BURNING PLATE · NIGHT", b_col),
            (os.path.join(REV_296, "after", "target-ash-noon.png"),      "08:33Z · ASH + LANE 2 · NOON",   b_col),
            (os.path.join(REV_296, "after", "ash-closeup-night.png"),    "08:33Z · ASH CLOSEUP · NIGHT",   b_col),
        ],
        [
            (os.path.join(REV, "after", "target-burning-noon.png"),  "AG-299 · BURNING PLATE · NOON",  a_col),
            (os.path.join(REV, "after", "target-burning-night.png"), "AG-299 · BURNING PLATE · NIGHT", a_col),
            (os.path.join(REV, "after", "target-ash-noon.png"),      "AG-299 · ASH + LANE 2 · NOON",   a_col),
            (os.path.join(REV, "after", "ash-closeup-night.png"),    "AG-299 · ASH CLOSEUP · NIGHT",   a_col),
        ],
    ]
    for r_idx, row in enumerate(rows):
        for c_idx, (p, badge, col) in enumerate(row):
            tile = load_tile(p, tw, th, badge, col)
            canvas.paste(tile, (pad + c_idx * (tw + pad), hdr + r_idx * (th + pad)))
    save_both(canvas, "sheet-3-splash-char-ash-side-by-side-4lights.jpg")


if __name__ == "__main__":
    bench = load_json(os.path.join(REV, "bench-5080.json"))
    b0 = bench.get("before_0833Z_accepted") or {}
    b1 = bench.get("after_AG299_instanced") or {}
    added_s = f"{b1.get('addedDraws', '?'):+d}" if isinstance(b1.get('addedDraws'), int) else str(b1.get('addedDraws', '?'))
    bench_line = (
        f"RTX 5080 WebGPU (--exclusive): BEFORE (08:33Z) {b0.get('idleDraws', 239)} -> {b0.get('firingDraws', 426)} draws "
        f"(+{b0.get('addedDraws', 187)}), tickMs {b0.get('firingTickMs', 13.41)} ms, 1% low {b0.get('firing1pctLow', 50.7)} fps   |   "
        f"AFTER (AG-299) {b1.get('idleDraws', '?')} -> {b1.get('firingDraws', '?')} draws "
        f"({added_s} net; 5 flame + 1 ember batches), tickMs {b1.get('firingTickMs', '?')} ms (r:render 5.08 ms), 60.0 fps, 1% low {b1.get('firing1pctLow', '?')} fps"
    )
    build_side_by_side_rope_sheet("eye", "1P Eye Camera (1.0 s & 2.0 s Held, 4 Lights)", "sheet-1-eye-side-by-side-4lights.jpg", bench_line)
    build_side_by_side_rope_sheet("side", "Side Lane-Wall Camera (1.0 s & 2.0 s Held, 4 Lights)", "sheet-2-side-side-by-side-4lights.jpg", bench_line)
    build_splash_char_ash_sheet(bench_line)
