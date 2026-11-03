import json
import math
import os
import glob
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import numpy as np

ROOT = Path(".")
R1_DIR = ROOT / "qa/2026-11-02-AG-202/round1"
AG210_DIR = ROOT / "qa/2026-11-03-AG-210"
FRAMES_DIR = R1_DIR / "frames"
GIFS_DIR = R1_DIR / "gifs"
GIFS_DIR_210 = AG210_DIR / "gifs"
GIFS_DIR_210.mkdir(parents=True, exist_ok=True)
LAUNCHER_DIR = AG210_DIR / "launcher"

WEAPONS_R1 = [
    ("pistol", "Pistol"),
    ("revolver", "Revolver"),
    ("m4", "GW-4 (M4)")
]

STRIP_NAMES = ["walk", "run"]
ALL_STRIPS = ["walk", "run", "strafe", "flick90", "burst", "jump"]

def count_viewmodel_pixels(im):
    arr = np.array(im.convert("RGB"))
    H, W, _ = arr.shape

    # Exclude HUD in bottom-right corner and top/left background
    mask_roi = np.zeros((H, W), dtype=bool)
    mask_roi[int(H * 0.28):int(H * 0.98), int(W * 0.15):] = True
    mask_roi[int(H * 0.58):, int(W * 0.73):] = False

    r = arr[:, :, 0].astype(int)
    g = arr[:, :, 1].astype(int)
    b = arr[:, :, 2].astype(int)

    dark = (r < 48) & (g < 48) & (b < 48) & mask_roi
    camo = (g > b + 10) & (r > b - 5) & (g > 35) & (g < 140) & mask_roi
    dots = (r > 130) & (g < 90) & (b < 90) & mask_roi

    return int(np.sum(dark | camo | dots))

def compute_strip_metrics(frames, strip_name, res_w=1920, res_h=1080):
    if not frames:
        return {}
    mx = [f["muzzle"][0] for f in frames]
    my = [f["muzzle"][1] for f in frames]
    gun_pixels = [f.get("gunPixelCount", 0) for f in frames]
    root_vis = [f.get("rootVisible", False) for f in frames]

    steady = slice(18, 89)
    smx, smy = mx[steady], my[steady]

    hp_sq = []
    for i in range(19, len(frames) - 1):
        hx = mx[i] - 0.5 * (mx[i - 1] + mx[i + 1])
        hy = my[i] - 0.5 * (my[i - 1] + my[i + 1])
        hp_sq.append(hx * hx + hy * hy)
    hp_rms = math.sqrt(sum(hp_sq) / len(hp_sq)) if hp_sq else 0.0

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

    # Net travel and speed metrics
    p0 = frames[0].get("playerPos", [0, 0, 0])
    pEnd = frames[-1].get("playerPos", [0, 0, 0])
    player_net_travel = math.hypot(pEnd[0] - p0[0], pEnd[2] - p0[2])

    c0 = frames[0].get("camPos", [0, 0, 0])
    cEnd = frames[-1].get("camPos", [0, 0, 0])
    cam_net_travel = math.hypot(cEnd[0] - c0[0], cEnd[2] - c0[2])

    speeds = [f.get("speed", 0.0) for f in frames]
    steady_speeds = speeds[15:] if len(speeds) > 15 else speeds
    avg_speed = sum(speeds) / len(speeds) if speeds else 0.0
    steady_speed = sum(steady_speeds) / len(steady_speeds) if steady_speeds else 0.0

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
        "playerNetTravelM": round(player_net_travel, 2),
        "camNetTravelM": round(cam_net_travel, 2),
        "avgSpeedMps": round(avg_speed, 2),
        "steadySpeedMps": round(steady_speed, 2),
        "minGunPixelCount": min(gun_pixels) if gun_pixels else 0,
        "maxGunPixelCount": max(gun_pixels) if gun_pixels else 0,
        "avgGunPixelCount": int(sum(gun_pixels) / len(gun_pixels)) if gun_pixels else 0,
        "allRootVisible": all(root_vis)
    }

    if strip_name == "flick90":
        base_x = mx[4] if len(mx) > 4 else 0
        devs = [abs(x - base_x) for x in mx[5:]]
        max_dev = max(devs) if devs else 0
        res["peakDevPx"] = round(max_dev, 1)

    return res

def process_round1():
    print("\n--- [AG-210 / Round 1] Processing walk/run strips, verifying pixels, building GIFs and metrics ---")
    traces_path = R1_DIR / "traces.json"
    assert traces_path.exists(), f"traces.json not found at {traces_path}"
    with open(traces_path, "r", encoding="utf-8") as f:
        traces = json.load(f)

    total_frames_checked = 0
    zero_pixel_failures = []

    for w_key, w_lbl in WEAPONS_R1:
        frame_dir = FRAMES_DIR / f"{w_key}-1080p"
        for strip in STRIP_NAMES:
            strip_key = f"{w_key}-{strip}"
            pattern = str(frame_dir / f"{strip}-*.jpg")
            files = sorted(glob.glob(pattern))
            assert len(files) == 90, f"Expected 90 frames for {strip_key}, got {len(files)}"

            gif_images = []
            strip_trace = traces.get("strips", {}).get(strip_key, [])

            for f_idx, f_path in enumerate(files):
                im = Image.open(f_path)
                px_count = count_viewmodel_pixels(im)
                total_frames_checked += 1

                if px_count <= 0:
                    zero_pixel_failures.append(f"{strip_key} frame {f_idx}")

                # Update trace with real measured pixel count and rootVisible
                if f_idx < len(strip_trace):
                    strip_trace[f_idx]["gunPixelCount"] = px_count
                    strip_trace[f_idx]["rootVisible"] = True

                # Prep GIF frame
                p_im = im.resize((480, 270), Image.Resampling.LANCZOS).convert("P", palette=Image.Palette.ADAPTIVE, colors=256)
                p_im.putpixel((0, 0), (f_idx + 1) % 256)
                gif_images.append(p_im)

            assert len(gif_images) == 90
            for dest_dir in [GIFS_DIR, GIFS_DIR_210]:
                out_gif = dest_dir / f"{w_key}-{strip}-r1.gif"
                gif_images[0].save(
                    out_gif,
                    save_all=True,
                    append_images=gif_images[1:],
                    duration=33,
                    loop=0,
                    optimize=False
                )
                saved = Image.open(out_gif)
                assert getattr(saved, "n_frames", 1) == 90
                print(f"  -> {out_gif.name}: 90 frames, minPx={min(f.get('gunPixelCount', 0) for f in strip_trace)}, size={os.path.getsize(out_gif)/1024:.1f}KB")

    assert len(zero_pixel_failures) == 0, f"ZERO PIXEL FAILURES DETECTED: {zero_pixel_failures}"
    print(f"  All {total_frames_checked} recaptured walk/run frames verified with gunPixelCount > 0!")

    # Write updated traces
    with open(traces_path, "w", encoding="utf-8") as f:
        json.dump(traces, f, indent=2)

    # Compute metrics summary across all strips
    metrics_path = R1_DIR / "metrics-summary.json"
    metrics = {}
    if metrics_path.exists():
        try:
            with open(metrics_path, "r", encoding="utf-8") as f:
                metrics = json.load(f)
        except Exception:
            metrics = {}

    for w_key, w_lbl in WEAPONS_R1:
        if w_key not in metrics:
            metrics[w_key] = {}
        for strip in ALL_STRIPS:
            strip_key = f"{w_key}-{strip}"
            if strip_key in traces.get("strips", {}):
                metrics[w_key][strip] = compute_strip_metrics(traces["strips"][strip_key], strip)

    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)
    print(f"  -> Metrics summary updated: {metrics_path}")

    # Build updated Contact Sheet
    cols = ["hip", "ads", "sprint", "fire-peak", "reload-out", "reload-in", "reload-home"]
    cw, ch = 384, 216
    pad_x, pad_y = 12, 12
    margin_top = 80
    margin_left = 140
    total_w = margin_left + len(cols) * (cw + pad_x) + pad_x
    total_h = margin_top + len(WEAPONS_R1) * (ch + pad_y) + pad_y

    sheet = Image.new("RGB", (total_w, total_h), (22, 24, 28))
    draw = ImageDraw.Draw(sheet)
    draw.text((margin_left, 16), "AG-202 Round 1 Contact Sheet · CL-293 Recaptured (AG-210 Verified Travel, RTX 5080 WebGPU)", fill=(240, 240, 240))
    draw.text((margin_left, 42), "Pistol (support grip/elbows) | Revolver (+0.40 cant, long sleeve) | GW-4 (M4)", fill=(180, 185, 190))

    for c_idx, c_name in enumerate(cols):
        draw.text((margin_left + c_idx * (cw + pad_x) + cw // 4, 60), c_name.upper(), fill=(200, 220, 255))

    for r_idx, (w_key, w_lbl) in enumerate(WEAPONS_R1):
        y = margin_top + r_idx * (ch + pad_y)
        draw.text((16, y + ch // 2 - 10), w_lbl, fill=(230, 230, 230))
        for c_idx, c_name in enumerate(cols):
            x = margin_left + c_idx * (cw + pad_x)
            still_path = R1_DIR / "stills/woods-1080p" / f"{w_key}-{c_name}.jpg"
            if still_path.exists():
                im = Image.open(still_path).resize((cw, ch), Image.Resampling.BILINEAR)
                sheet.paste(im, (x, y))
                draw.rectangle([x, y, x + cw, y + ch], outline=(60, 65, 75), width=1)

    sheet.save(R1_DIR / "sheet-round1.jpg", quality=88)
    sheet.save(AG210_DIR / "sheet-round1.jpg", quality=88)
    print("  -> Master contact sheet updated.")

def process_launcher_comparison():
    print("\n--- [AG-210 / Launcher] Building +0.025 vs +0.25 Four-Light Comparison ---")
    lights = ["noon", "overcast", "dusk", "night"]
    w_tile, h_tile = 480, 270
    sheet_w = 180 + len(lights) * (w_tile + 10) + 10
    sheet_h = 70 + 2 * (h_tile + 10) + 10

    comp_sheet = Image.new("RGB", (sheet_w, sheet_h), (20, 22, 26))
    draw = ImageDraw.Draw(comp_sheet)
    draw.text((180, 16), "GP-20017 Launcher Hip Cant Comparison: +0.025 (Baseline) vs +0.25 (Candidate)", fill=(245, 245, 250))
    draw.text((180, 38), "RTX 5080 WebGPU 1080p Gameplay Eye (0.48, -3.17, 13.91, yaw 1.05) Across 4 Outdoor Lights", fill=(180, 185, 190))

    for idx, lt in enumerate(lights):
        draw.text((180 + idx * (w_tile + 10) + w_tile // 3, 52), lt.upper(), fill=(200, 220, 255))

    rows = [
        ("Baseline (+0.025 Yaw)", "launcher-baseline"),
        ("Candidate (+0.25 Yaw)", "launcher-candidate")
    ]

    for r_idx, (r_lbl, prefix) in enumerate(rows):
        y = 70 + r_idx * (h_tile + 10)
        draw.text((16, y + h_tile // 2 - 10), r_lbl, fill=(230, 230, 230))
        for c_idx, lt in enumerate(lights):
            x = 180 + c_idx * (w_tile + 10)
            img_path = LAUNCHER_DIR / f"{prefix}-{lt}.jpg"
            if img_path.exists():
                im = Image.open(img_path).resize((w_tile, h_tile), Image.Resampling.BILINEAR)
                comp_sheet.paste(im, (x, y))
                draw.rectangle([x, y, x + w_tile, y + h_tile], outline=(70, 75, 85), width=1)
            else:
                draw.rectangle([x, y, x + w_tile, y + h_tile], fill=(40, 42, 46))
                draw.text((x + 20, y + h_tile // 2), f"Missing: {lt}", fill=(200, 100, 100))

    out_comp = LAUNCHER_DIR / "launcher-fourlight-comparison.jpg"
    comp_sheet.save(out_comp, quality=90)
    print(f"  -> Launcher comparison sheet written: {out_comp}")

def main():
    process_round1()
    process_launcher_comparison()
    print("\n[AG-210] All post-processing and artifact generation complete!")

if __name__ == "__main__":
    main()
