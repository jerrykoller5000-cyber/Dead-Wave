import json
import math
import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT_DIR = Path("qa/2026-11-02-AG-202")
STILLS_DIR = OUT_DIR / "stills"
FRAMES_DIR = OUT_DIR / "frames"
SHEETS_DIR = OUT_DIR / "sheets"
STRIPS_DIR = OUT_DIR / "strips"
GIFS_DIR = OUT_DIR / "gifs"

for d in [SHEETS_DIR, STRIPS_DIR, GIFS_DIR]:
    d.mkdir(parents=True, exist_ok=True)

WEAPONS = [
    ("pistol", "Pistol"),
    ("revolver", "Revolver"),
    ("uzi", "Wasp (Uzi)"),
    ("m4", "GW-4 (M4)"),
    ("ak", "AK"),
    ("shotgun", "Shotgun"),
    ("aa12", "Breacher-12"),
    ("sniper", "Sniper"),
    ("launcher", "Launcher"),
    ("minigun", "Minigun"),
    ("flamer", "Flamer"),
    ("chainsaw", "Chainsaw"),
    ("akimbo-pistol", "Akimbo Pistols"),
    ("akimbo-uzi", "Akimbo Wasps"),
    ("medpen", "MedPen"),
    ("knife", "Knife"),
    ("machete", "Machete"),
    ("katana", "Katana"),
    ("grenade", "Grenade"),
]

STILL_NAMES = ["hip", "ads", "sprint", "fire-peak", "reload-out", "reload-in", "reload-home"]
STRIP_NAMES = ["walk", "run", "strafe", "flick90", "burst", "jump"]


def compute_strip_metrics(frames, strip_name, res_w=1920, res_h=1080):
    if not frames:
        return {}
    mx = [f["muzzle"][0] for f in frames]
    my = [f["muzzle"][1] for f in frames]
    rx = [f["wristR"][0] for f in frames]
    ry = [f["wristR"][1] for f in frames]
    lx = [f["wristL"][0] for f in frames]
    ly = [f["wristL"][1] for f in frames]
    hull_counts = [f.get("insideHullVerts", 0) for f in frames]

    # Steady window for walk/run (frames 18..88)
    steady = slice(18, 89)
    smx, smy = mx[steady], my[steady]

    # 1. Second-difference (Laplacian) high-pass RMS: h_t = p_t - 0.5*(p_{t-1} + p_{t+1})
    hp_sq = []
    for i in range(19, len(frames) - 1):
        hx = mx[i] - 0.5 * (mx[i - 1] + mx[i + 1])
        hy = my[i] - 0.5 * (my[i - 1] + my[i + 1])
        hp_sq.append(hx * hx + hy * hy)
    hp_rms_px = math.sqrt(sum(hp_sq) / max(1, len(hp_sq)))

    # Frame-to-frame step delta RMS
    d1_sq = []
    for i in range(19, len(frames)):
        dx = mx[i] - mx[i - 1]
        dy = my[i] - my[i - 1]
        d1_sq.append(dx * dx + dy * dy)
    step_delta_rms_px = math.sqrt(sum(d1_sq) / max(1, len(d1_sq)))

    # Peak-to-peak amplitude in steady window
    amp_x_px = (max(smx) - min(smx)) if smx else 0.0
    amp_y_px = (max(smy) - min(smy)) if smy else 0.0
    amp_x_pct = (amp_x_px / res_w) * 100.0
    amp_y_pct = (amp_y_px / res_h) * 100.0

    # Strafe tilt check (compare mean roll/pos in first half f=18..42 vs second half f=63..87)
    strafe_tilt_deg = 0.0
    strafe_shift_x_px = 0.0
    if strip_name == "strafe" and len(frames) >= 88:
        a_slice = frames[18:43]
        d_slice = frames[63:88]
        strafe_shift_x_px = (
            sum(f["muzzle"][0] for f in d_slice) / len(d_slice)
            - sum(f["muzzle"][0] for f in a_slice) / len(a_slice)
        )
        if a_slice[0].get("vmRot") and d_slice[0].get("vmRot"):
            rz_a = sum(f["vmRot"][2] for f in a_slice) / len(a_slice)
            rz_d = sum(f["vmRot"][2] for f in d_slice) / len(d_slice)
            strafe_tilt_deg = math.degrees(abs(rz_d - rz_a)) * 0.5

    # Flick90 metrics (flick runs f=5..8, stops at f=8, t=0.267s)
    flick_peak_px = 0.0
    flick_lag_ms = 0.0
    flick_settle_s = 0.0
    flick_overshoot_pct = 0.0
    if strip_name == "flick90" and len(frames) >= 45:
        base_x = mx[4]
        base_y = my[4]
        end_x = mx[-1]
        end_y = my[-1]
        dists = [math.hypot(mx[i] - end_x, my[i] - end_y) for i in range(5, len(frames))]
        if dists:
            flick_peak_px = max(dists)
            peak_idx = 5 + dists.index(flick_peak_px)
            flick_lag_ms = (peak_idx - 5) * (1000.0 / 30.0)
            if flick_peak_px > 0.5:
                thresh = max(0.5, flick_peak_px * 0.05)
                settle_idx = len(frames) - 1
                for i in range(len(frames) - 1, 8, -1):
                    if math.hypot(mx[i] - end_x, my[i] - end_y) > thresh:
                        settle_idx = min(len(frames) - 1, i + 1)
                        break
                flick_settle_s = max(0.0, (settle_idx - 8) / 30.0)
                # Overshoot opposite to peak displacement direction
                dx_peak = mx[peak_idx] - end_x
                if abs(dx_peak) > 0.5:
                    opp = [-(mx[i] - end_x) * (1 if dx_peak > 0 else -1) for i in range(peak_idx + 1, len(frames))]
                    max_opp = max([0.0] + opp)
                    flick_overshoot_pct = (max_opp / abs(dx_peak)) * 100.0

    # Jump landing dip (jump at f=5, lands around f=22..28)
    landing_dip_px = 0.0
    if strip_name == "jump" and len(frames) >= 45:
        rest_y = my[2]
        post_land_y = my[18:45]
        if post_land_y:
            landing_dip_px = max(0.0, max(post_land_y) - rest_y)

    # Burst recoil & camera shake
    burst_peak_kick_px = 0.0
    cam_shake_rms_cm = 0.0
    if strip_name == "burst" and len(frames) >= 35:
        rest_x, rest_y = mx[0], my[0]
        burst_dists = [math.hypot(mx[i] - rest_x, my[i] - rest_y) for i in range(1, 35)]
        burst_peak_kick_px = max(burst_dists) if burst_dists else 0.0
        # Camera position high-pass shake in cm
        cpos = [f.get("camPos", [0, 0, 0]) for f in frames[:35]]
        csq = []
        for i in range(2, len(cpos) - 1):
            cx = cpos[i][0] - 0.5 * (cpos[i - 1][0] + cpos[i + 1][0])
            cy = cpos[i][1] - 0.5 * (cpos[i - 1][1] + cpos[i + 1][1])
            cz = cpos[i][2] - 0.5 * (cpos[i - 1][2] + cpos[i + 1][2])
            csq.append((cx * cx + cy * cy + cz * cz) * 10000.0)
        cam_shake_rms_cm = math.sqrt(sum(csq) / max(1, len(csq)))

    return {
        "hpRmsPx": round(hp_rms_px, 3),
        "stepDeltaRmsPx": round(step_delta_rms_px, 3),
        "ampXPx": round(amp_x_px, 2),
        "ampYPx": round(amp_y_px, 2),
        "ampXPct": round(amp_x_pct, 3),
        "ampYPct": round(amp_y_pct, 3),
        "strafeTiltDeg": round(strafe_tilt_deg, 2),
        "strafeShiftXPx": round(strafe_shift_x_px, 2),
        "flickPeakPx": round(flick_peak_px, 2),
        "flickLagMs": round(flick_lag_ms, 1),
        "flickSettleS": round(flick_settle_s, 3),
        "flickOvershootPct": round(flick_overshoot_pct, 2),
        "landingDipPx": round(landing_dip_px, 2),
        "burstPeakKickPx": round(burst_peak_kick_px, 2),
        "camShakeRmsCm": round(cam_shake_rms_cm, 3),
        "maxHullVerts": max(hull_counts) if hull_counts else 0,
        "totalHullFrames": sum(1 for c in hull_counts if c > 0),
        "vmActive": bool(frames[0].get("vmActive", False)),
    }


def draw_trace_panel(draw, x0, y0, w, h, frames, strip_name, metrics):
    # Background box
    draw.rectangle([x0, y0, x0 + w, y0 + h], fill=(18, 22, 28), outline=(55, 65, 80), width=1)
    if not frames:
        return

    # Left sub-plot: x(t) and y(t) relative to frame 0 over 90 frames
    pw = int(w * 0.62)
    ph = h - 28
    px0 = x0 + 8
    py0 = y0 + 22
    draw.rectangle([px0, py0, px0 + pw, py0 + ph], fill=(12, 15, 20), outline=(40, 48, 60))

    # Zero line
    mid_y = py0 + ph // 2
    draw.line([px0, mid_y, px0 + pw, mid_y], fill=(45, 55, 68), width=1)

    # Extract delta signals
    m0x, m0y = frames[0]["muzzle"][0], frames[0]["muzzle"][1]
    r0x, r0y = frames[0]["wristR"][0], frames[0]["wristR"][1]
    l0x, l0y = frames[0]["wristL"][0], frames[0]["wristL"][1]

    dmx = [f["muzzle"][0] - m0x for f in frames]
    dmy = [f["muzzle"][1] - m0y for f in frames]
    drx = [f["wristR"][0] - r0x for f in frames]
    dlx = [f["wristL"][0] - l0x for f in frames]

    max_dev = max(8.0, max(abs(v) for v in dmx + dmy + drx + dlx))
    scale = (ph * 0.44) / max_dev

    def plot_series(vals, color):
        pts = []
        for i, v in enumerate(vals):
            sx = px0 + int((i / max(1, len(vals) - 1)) * pw)
            sy = int(max(py0 + 2, min(py0 + ph - 2, mid_y - v * scale)))
            pts.append((sx, sy))
        if len(pts) > 1:
            draw.line(pts, fill=color, width=2)

    plot_series(drx, (60, 200, 255))   # Wrist R X (cyan)
    plot_series(dlx, (100, 235, 120))  # Wrist L X (green)
    plot_series(dmy, (255, 190, 60))   # Muzzle Y (amber)
    plot_series(dmx, (255, 85, 85))    # Muzzle X (red)

    # Right sub-plot: 2D (x, y) muzzle trajectory in screen space
    xy_w = w - pw - 24
    xy_x0 = px0 + pw + 8
    draw.rectangle([xy_x0, py0, xy_x0 + xy_w, py0 + ph], fill=(12, 15, 20), outline=(40, 48, 60))
    cx = xy_x0 + xy_w // 2
    cy = py0 + ph // 2
    draw.line([xy_x0, cy, xy_x0 + xy_w, cy], fill=(35, 42, 52), width=1)
    draw.line([cx, py0, cx, py0 + ph], fill=(35, 42, 52), width=1)

    steady_frames = frames[15:] if len(frames) > 20 else frames
    mean_mx = sum(f["muzzle"][0] for f in steady_frames) / len(steady_frames)
    mean_my = sum(f["muzzle"][1] for f in steady_frames) / len(steady_frames)
    span_2d = max(
        6.0,
        max(abs(f["muzzle"][0] - mean_mx) for f in steady_frames),
        max(abs(f["muzzle"][1] - mean_my) for f in steady_frames),
    )
    sc2 = (min(xy_w, ph) * 0.42) / span_2d
    pts_2d = []
    for f in steady_frames:
        sx = int(max(xy_x0 + 2, min(xy_x0 + xy_w - 2, cx + (f["muzzle"][0] - mean_mx) * sc2)))
        sy = int(max(py0 + 2, min(py0 + ph - 2, cy + (f["muzzle"][1] - mean_my) * sc2)))
        pts_2d.append((sx, sy))
    if len(pts_2d) > 1:
        draw.line(pts_2d, fill=(255, 110, 80), width=2)

    # Header text with quantitative metrics
    hdr = (
        f"{strip_name.upper()} | hpRMS:{metrics['hpRmsPx']:.2f}px "
        f"amp:{metrics['ampXPx']:.1f}x{metrics['ampYPx']:.1f}px ({metrics['ampXPct']:.2f}%) "
        f"hull:{metrics['maxHullVerts']}v"
    )
    if strip_name == "flick90":
        hdr += f" lag:{metrics['flickLagMs']:.0f}ms set:{metrics['flickSettleS']:.2f}s ov:{metrics['flickOvershootPct']:.1f}%"
    elif strip_name == "strafe":
        hdr += f" tilt:{metrics['strafeTiltDeg']:.2f}deg dx:{metrics['strafeShiftXPx']:.1f}px"
    elif strip_name == "jump":
        hdr += f" dip:{metrics['landingDipPx']:.1f}px"
    elif strip_name == "burst":
        hdr += f" kick:{metrics['burstPeakKickPx']:.1f}px camShake:{metrics['camShakeRmsCm']:.2f}cm"

    draw.text((x0 + 8, y0 + 5), hdr, fill=(230, 236, 245))


def main():
    traces_path = OUT_DIR / "traces.json"
    if not traces_path.exists():
        print("traces.json not found!")
        return

    data = json.loads(traces_path.read_text(encoding="utf-8"))
    stills_data = data.get("stills", {})
    strips_data = data.get("strips", {})
    res1440_data = data.get("res1440pCheck", {})

    summary = {"weapons": {}, "res1440p": {}}

    # 1. Build per-weapon Stills Contact Sheets (TG 1080p, TG 1440p, Woods 1080p)
    tw, th = 320, 180
    rows = [("tg-1080p", "TG 1080p"), ("tg-1440p", "TG 1440p"), ("woods-1080p", "Woods Noon 1080p")]
    for w_key, w_label in WEAPONS:
        sheet_w = len(STILL_NAMES) * tw + 16
        sheet_h = len(rows) * (th + 24) + 36
        canvas = Image.new("RGB", (sheet_w, sheet_h), (14, 16, 20))
        draw = ImageDraw.Draw(canvas)
        draw.text((12, 8), f"AG-202 Stills Contact Sheet — {w_label} ({w_key}) — index.html?solid=1", fill=(240, 244, 250))

        for r_idx, (seat_res, row_label) in enumerate(rows):
            y_off = 32 + r_idx * (th + 24)
            for c_idx, st_name in enumerate(STILL_NAMES):
                x_off = 8 + c_idx * tw
                img_path = STILLS_DIR / seat_res / f"{w_key}-{st_name}.jpg"
                if img_path.exists():
                    im = Image.open(img_path).resize((tw, th), Image.Resampling.LANCZOS)
                    canvas.paste(im, (x_off, y_off + 18))
                trace_id = f"{seat_res}-{w_key}-{st_name}"
                tr = stills_data.get(trace_id, {})
                mz = tr.get("muzzle", [0, 0])
                draw.text(
                    (x_off + 4, y_off + 2),
                    f"{row_label} · {st_name} ({mz[0]:.0f},{mz[1]:.0f})",
                    fill=(200, 210, 225),
                )
        canvas.save(SHEETS_DIR / f"{w_key}-stills.jpg", quality=86)

    # 2. Build Master Overview Sheets (All 19 weapons x [hip, ads, sprint, fire-peak, reload-in])
    overview_cols = ["hip", "ads", "sprint", "fire-peak", "reload-in"]
    ov_tw, ov_th = 280, 158
    for seat_res in ["tg-1080p", "tg-1440p", "woods-1080p"]:
        ov_w = len(overview_cols) * ov_tw + 160
        ov_h = len(WEAPONS) * (ov_th + 6) + 40
        ov_img = Image.new("RGB", (ov_w, ov_h), (12, 14, 18))
        ov_draw = ImageDraw.Draw(ov_img)
        ov_draw.text((12, 10), f"AG-202 First-Person Master Contact Sheet ({seat_res})", fill=(245, 248, 252))
        for c_idx, st_name in enumerate(overview_cols):
            ov_draw.text((156 + c_idx * ov_tw, 12), st_name.upper(), fill=(180, 200, 230))
        for r_idx, (w_key, w_label) in enumerate(WEAPONS):
            y_off = 34 + r_idx * (ov_th + 6)
            ov_draw.text((10, y_off + ov_th // 2 - 8), f"{w_label}\n({w_key})", fill=(225, 232, 242))
            for c_idx, st_name in enumerate(overview_cols):
                x_off = 152 + c_idx * ov_tw
                img_path = STILLS_DIR / seat_res / f"{w_key}-{st_name}.jpg"
                if img_path.exists():
                    im = Image.open(img_path).resize((ov_tw, ov_th), Image.Resampling.LANCZOS)
                    ov_img.paste(im, (x_off, y_off))
        ov_img.save(OUT_DIR / f"Sheet-Overview-{seat_res}.jpg", quality=85)

    # 3. Build Strips + Traces Contact Sheets AND Animated GIFs per weapon
    strip_thumb_w, strip_thumb_h = 192, 108
    num_strip_thumbs = 8
    trace_panel_w = 520

    for w_key, w_label in WEAPONS:
        summary["weapons"][w_key] = {"label": w_label, "strips": {}, "hipMuzzle1080p": None, "sprintMuzzle1080p": None}
        hip_tr = stills_data.get(f"tg-1080p-{w_key}-hip")
        spr_tr = stills_data.get(f"tg-1080p-{w_key}-sprint")
        ads_tr = stills_data.get(f"tg-1080p-{w_key}-ads")
        if hip_tr:
            summary["weapons"][w_key]["hipMuzzle1080p"] = hip_tr.get("muzzle")
            summary["weapons"][w_key]["hipWristR1080p"] = hip_tr.get("wristR")
            summary["weapons"][w_key]["hipWristL1080p"] = hip_tr.get("wristL")
        if spr_tr:
            summary["weapons"][w_key]["sprintMuzzle1080p"] = spr_tr.get("muzzle")
        if ads_tr:
            summary["weapons"][w_key]["adsMuzzle1080p"] = ads_tr.get("muzzle")

        sheet_w = num_strip_thumbs * strip_thumb_w + trace_panel_w + 24
        sheet_h = len(STRIP_NAMES) * (strip_thumb_h + 24) + 36
        s_canvas = Image.new("RGB", (sheet_w, sheet_h), (14, 16, 20))
        s_draw = ImageDraw.Draw(s_canvas)
        s_draw.text(
            (12, 8),
            f"AG-202 3s @ 30fps Motion Strips & Screen-Pixel Traces — {w_label} ({w_key}) — Red:MuzzleX Amber:MuzzleY Cyan:WristR Green:WristL",
            fill=(240, 245, 252),
        )

        w_frame_dir = FRAMES_DIR / f"{w_key}-1080p"

        for s_idx, strip_name in enumerate(STRIP_NAMES):
            y_off = 32 + s_idx * (strip_thumb_h + 24)
            frames = strips_data.get(f"{w_key}-{strip_name}", [])
            metrics = compute_strip_metrics(frames, strip_name, 1920, 1080)
            summary["weapons"][w_key]["strips"][strip_name] = metrics

            # Collect saved frame images for this strip
            saved_imgs = sorted(w_frame_dir.glob(f"{strip_name}-*.jpg")) if w_frame_dir.exists() else []
            if saved_imgs:
                # Paste 8 evenly spaced frames into the strip contact sheet
                for k in range(num_strip_thumbs):
                    pick = saved_imgs[min(len(saved_imgs) - 1, int(k * (len(saved_imgs) - 1) / max(1, num_strip_thumbs - 1)))]
                    im = Image.open(pick).resize((strip_thumb_w, strip_thumb_h), Image.Resampling.LANCZOS)
                    s_canvas.paste(im, (8 + k * strip_thumb_w, y_off + 16))
                    s_draw.text((12 + k * strip_thumb_w, y_off + 2), f"{strip_name} {pick.stem.split('-')[-1]}", fill=(185, 195, 210))

                # Build animated GIF (3s total duration)
                gif_frames = []
                step = max(1, len(saved_imgs) // 30)  # Up to 30 frames per 3s GIF
                sampled = saved_imgs[::step]
                for gf_path in sampled:
                    gim = Image.open(gf_path).resize((384, 216), Image.Resampling.LANCZOS).convert("P", palette=Image.Palette.ADAPTIVE, colors=128)
                    gif_frames.append(gim)
                if gif_frames:
                    dur_ms = max(33, int(3000 / len(gif_frames)))
                    gif_frames[0].save(
                        GIFS_DIR / f"{w_key}-{strip_name}.gif",
                        save_all=True,
                        append_images=gif_frames[1:],
                        duration=dur_ms,
                        loop=0,
                        optimize=True,
                    )

            # Draw trace plot beside the strip
            trace_x0 = 12 + num_strip_thumbs * strip_thumb_w
            draw_trace_panel(s_draw, trace_x0, y_off + 2, trace_panel_w, strip_thumb_h + 14, frames, strip_name, metrics)

        s_canvas.save(STRIPS_DIR / f"{w_key}-strips.jpg", quality=86)

    # 4. Compute 1440p check metrics
    for k, frames in res1440_data.items():
        strip_name = k.split("-")[-1]
        summary["res1440p"][k] = compute_strip_metrics(frames, strip_name, 2560, 1440)

    (OUT_DIR / "metrics-summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print("[AG-202] Built all contact sheets, trace plots, GIFs, and metrics-summary.json.")


if __name__ == "__main__":
    main()
