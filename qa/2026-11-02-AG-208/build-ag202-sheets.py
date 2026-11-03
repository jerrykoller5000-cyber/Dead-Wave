import json
import math
import os
import glob
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

BASE_DIR = Path("qa/2026-11-02-AG-202")
R1_DIR = BASE_DIR / "round1"
STILLS_DIR = R1_DIR / "stills"
FRAMES_DIR = R1_DIR / "frames"
GIFS_DIR = R1_DIR / "gifs"
GIFS_DIR.mkdir(parents=True, exist_ok=True)

WEAPONS = [
    ("pistol", "Pistol"),
    ("revolver", "Revolver"),
    ("m4", "GW-4 (M4)")
]

STILL_NAMES = ["hip", "ads", "sprint", "fire-peak", "reload-out", "reload-in", "reload-home"]
STRIP_NAMES = ["walk", "run", "strafe", "flick90", "burst", "jump"]

def compute_strip_metrics(frames, strip_name, res_w=1920, res_h=1080):
    if not frames:
        return {}
    mx = [f["muzzle"][0] for f in frames]
    my = [f["muzzle"][1] for f in frames]

    box_hulls = [f.get("insideBoxHullVerts", 0) for f in frames]
    int_hulls = [f.get("insideInteriorVerts", 0) for f in frames]
    wrist_seps = [f.get("wristSeparationM", 0) for f in frames]
    forearm_bottoms = [f.get("forearmBottomY", 0) for f in frames]

    steady = slice(18, 89)
    smx, smy = mx[steady], my[steady]

    # Laplacian high-pass RMS
    hp_sq = []
    for i in range(19, len(frames) - 1):
        hx = mx[i] - 0.5 * (mx[i - 1] + mx[i + 1])
        hy = my[i] - 0.5 * (my[i - 1] + my[i + 1])
        hp_sq.append(hx * hx + hy * hy)
    hp_rms = math.sqrt(sum(hp_sq) / len(hp_sq)) if hp_sq else 0.0

    # Step delta RMS
    deltas = [math.hypot(mx[i] - mx[i - 1], my[i] - my[i - 1]) for i in range(19, len(frames))]
    step_delta_rms = math.sqrt(sum(d * d for d in deltas) / len(deltas)) if deltas else 0.0

    def dominant_hz(sig, dt=1.0 / 30.0):
        mean = sum(sig) / len(sig) if sig else 0
        zc = 0
        for i in range(1, len(sig)):
            if (sig[i - 1] - mean) * (sig[i] - mean) < 0:
                zc += 1
        dur = len(sig) * dt
        return +(zc / (2.0 * dur)) if dur > 0 else 0.0

    hz_x = dominant_hz(smx)
    hz_y = dominant_hz(smy)

    amp_x = (max(smx) - min(smx)) if smx else 0.0
    amp_y = (max(smy) - min(smy)) if smy else 0.0
    amp_x_pct = (amp_x / res_w) * 100.0
    amp_y_pct = (amp_y / res_h) * 100.0

    res = {
        "strip": strip_name,
        "hpRmsPx": round(hp_rms, 2),
        "stepDeltaRmsPx": round(step_delta_rms, 2),
        "bobHzX": round(hz_x, 2),
        "bobHzY": round(hz_y, 2),
        "ampXPx": round(amp_x, 1),
        "ampYPx": round(amp_y, 1),
        "ampXPct": round(amp_x_pct, 2),
        "ampYPct": round(amp_y_pct, 2),
        "maxInsideBoxHullVerts": max(box_hulls) if box_hulls else 0,
        "maxInsideInteriorVerts": max(int_hulls) if int_hulls else 0,
        "minWristSeparationM": min(wrist_seps) if wrist_seps else 0,
        "maxForearmBottomY": max(forearm_bottoms) if forearm_bottoms else 0
    }

    if strip_name == "flick90":
        base_x = mx[4] if len(mx) > 4 else 0
        devs = [abs(x - base_x) for x in mx[5:]]
        max_dev = max(devs) if devs else 0
        res["peakDevPx"] = round(max_dev, 1)

    return res

def build_gifs():
    print("[AG-202-R1] Building 90-frame Animated GIFs for pistol, revolver, m4...")
    for w_key, w_lbl in WEAPONS:
        frame_dir = FRAMES_DIR / f"{w_key}-1080p"
        if not frame_dir.exists():
            print(f"  Frame dir not found: {frame_dir}")
            continue
        for strip in STRIP_NAMES:
            pattern = str(frame_dir / f"{strip}-*.jpg")
            files = sorted(glob.glob(pattern))
            if not files:
                print(f"  No files matching {pattern}")
                continue
            assert len(files) == 90, f"Expected 90 frames for {w_key} {strip}, got {len(files)}"

            images = []
            for f_idx, f in enumerate(files):
                im = Image.open(f).resize((480, 270), Image.Resampling.LANCZOS)
                p_im = im.convert("P", palette=Image.Palette.ADAPTIVE, colors=256)
                # Ensure Pillow does not drop consecutive identical frames
                p_im.putpixel((0, 0), (f_idx + 1) % 256)
                images.append(p_im)

            out_gif = GIFS_DIR / f"{w_key}-{strip}-r1.gif"
            if images:
                # Save at 30 fps (33ms per frame, 3.0s total)
                images[0].save(
                    out_gif,
                    save_all=True,
                    append_images=images[1:],
                    duration=33,
                    loop=0,
                    optimize=False
                )
                saved_gif = Image.open(out_gif)
                n_frames = getattr(saved_gif, "n_frames", 1)
                assert n_frames == 90, f"ASSERTION FAILED: {out_gif} has {n_frames} frames, expected 90"
                print(f"  -> {out_gif} (verified {n_frames} frames, {os.path.getsize(out_gif)/1024:.1f} KB)")

def build_contact_sheet(traces):
    print("[AG-202-R1] Building Contact Sheet...")
    cols = STILL_NAMES
    rows = WEAPONS
    cw, ch = 384, 216  # 1/5th 1080p
    pad_x, pad_y = 12, 12
    margin_top = 80
    margin_left = 140

    total_w = margin_left + len(cols) * (cw + pad_x) + pad_x
    total_h = margin_top + len(rows) * (ch + pad_y) + pad_y

    sheet = Image.new("RGB", (total_w, total_h), (22, 24, 28))
    draw = ImageDraw.Draw(sheet)

    # Title
    draw.text((margin_left, 16), "AG-202 Round 1 Contact Sheet · CL-293 Part 1-2 (RTX 5080 WebGPU)", fill=(240, 240, 240))
    draw.text((margin_left, 42), "Pistol (elbowFollow, support socket) | Revolver (motion, long sleeve) | GW-4 (no mid-air stump)", fill=(180, 185, 190))

    # Header columns
    for c_idx, c_name in enumerate(cols):
        x = margin_left + c_idx * (cw + pad_x)
        draw.text((x + cw//4, 60), c_name.upper(), fill=(200, 220, 255))

    for r_idx, (w_key, w_lbl) in enumerate(rows):
        y = margin_top + r_idx * (ch + pad_y)
        draw.text((16, y + ch//2 - 10), w_lbl, fill=(230, 230, 230))

        for c_idx, c_name in enumerate(cols):
            x = margin_left + c_idx * (cw + pad_x)
            # Use woods-1080p if available, else tg-1080p
            still_path = STILLS_DIR / "woods-1080p" / f"{w_key}-{c_name}.jpg"
            if not still_path.exists():
                still_path = STILLS_DIR / "tg-1080p" / f"{w_key}-{c_name}.jpg"

            if still_path.exists():
                im = Image.open(still_path).resize((cw, ch), Image.Resampling.BILINEAR)
                sheet.paste(im, (x, y))
                draw.rectangle([x, y, x + cw, y + ch], outline=(60, 65, 75), width=1)
            else:
                draw.rectangle([x, y, x + cw, y + ch], fill=(40, 42, 46), outline=(60, 65, 75))
                draw.text((x + 20, y + ch//2), f"MISSING\n{w_key}-{c_name}", fill=(180, 100, 100))

    out_sheet = R1_DIR / "sheet-round1.jpg"
    sheet.save(out_sheet, quality=88)
    print(f"  -> Contact sheet written: {out_sheet} ({os.path.getsize(out_sheet)/1024:.1f} KB)")

def main():
    traces_path = R1_DIR / "traces.json"
    if not traces_path.exists():
        print(f"traces.json not found at {traces_path}")
        return

    with open(traces_path, "r", encoding="utf-8") as f:
        traces = json.load(f)

    metrics = {}
    for w_key, w_lbl in WEAPONS:
        metrics[w_key] = {}
        for strip in STRIP_NAMES:
            strip_key = f"{w_key}-{strip}"
            frames = traces.get("strips", {}).get(strip_key, [])
            metrics[w_key][strip] = compute_strip_metrics(frames, strip)

    metrics_path = R1_DIR / "metrics-summary.json"
    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)
    print(f"  -> Metrics summary written: {metrics_path}")

    build_gifs()
    build_contact_sheet(traces)
    print("[AG-202-R1] Sheets and 90-frame GIFs successfully built and verified!")

if __name__ == "__main__":
    main()
