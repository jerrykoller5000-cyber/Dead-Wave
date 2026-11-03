import json
import math
import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent.parent


def get_font(size=16, bold=False):
    candidates = [
        "C:/Windows/Fonts/consolab.ttf" if bold else "C:/Windows/Fonts/consola.ttf",
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
    ]
    for c in candidates:
        if os.path.exists(c):
            try:
                return ImageFont.truetype(c, size)
            except Exception:
                pass
    return ImageFont.load_default()


def dominant_freq_hz(vals, dt=1.0 / 30.0, f_min=0.5, f_max=14.8, df=0.02):
    n = len(vals)
    if n < 8:
        return 0.0
    mean_v = sum(vals) / n
    centered = [v - mean_v for v in vals]
    var = sum(x * x for x in centered)
    if var < 1e-9:
        return 0.0
    # Hann window to prevent spectral leakage
    windowed = [
        centered[i] * (0.5 - 0.5 * math.cos(2.0 * math.pi * i / (n - 1)))
        for i in range(n)
    ]
    best_f = 0.0
    best_p = -1.0
    steps = int(round((f_max - f_min) / df)) + 1
    for s in range(steps):
        f = f_min + s * df
        w = 2.0 * math.pi * f * dt
        re = sum(windowed[i] * math.cos(w * i) for i in range(n))
        im = sum(windowed[i] * math.sin(w * i) for i in range(n))
        p = re * re + im * im
        if p > best_p:
            best_p = p
            best_f = f
    return round(best_f, 2)


def compute_strip_metrics(frames, strip_name, width=1920, height=1080):
    if not frames:
        return {}
    # Use steady-state frames [15..89] for walk/run bob metrics, all frames for full-strip metrics
    ss = frames[15:] if len(frames) > 25 and strip_name in ("walk", "run") else frames
    mx = [f["muzzle"][0] for f in ss]
    my = [f["muzzle"][1] for f in ss]
    mx_all = [f["muzzle"][0] for f in frames]
    my_all = [f["muzzle"][1] for f in frames]

    # High-pass (> 4 Hz at 30 fps => subtract 7-frame centered moving average)
    def hp_rms(xs, ys):
        n = len(xs)
        if n < 7:
            return 0.0
        acc = 0.0
        cnt = 0
        for i in range(3, n - 3):
            bx = sum(xs[i - 3 : i + 4]) / 7.0
            by = sum(ys[i - 3 : i + 4]) / 7.0
            dx = xs[i] - bx
            dy = ys[i] - by
            acc += dx * dx + dy * dy
            cnt += 1
        return round(math.sqrt(acc / max(1, cnt)), 3)

    hp_ss = hp_rms(mx, my)
    hp_all = hp_rms(mx_all, my_all)

    step_deltas = [
        math.hypot(mx[i] - mx[i - 1], my[i] - my[i - 1]) for i in range(1, len(mx))
    ]
    step_rms = (
        round(math.sqrt(sum(d * d for d in step_deltas) / len(step_deltas)), 3)
        if step_deltas
        else 0.0
    )

    amp_x = round(max(mx) - min(mx), 2)
    amp_y = round(max(my) - min(my), 2)
    amp_x_pct = round(amp_x * 100.0 / width, 3)
    amp_y_pct = round(amp_y * 100.0 / height, 3)

    bob_hz_x = dominant_freq_hz(mx)
    bob_hz_y = dominant_freq_hz(my)

    vm_x = [f["vmPos"][0] * 1000.0 for f in ss if f.get("vmPos")]
    vm_y = [f["vmPos"][1] * 1000.0 for f in ss if f.get("vmPos")]
    vm_hz_x = dominant_freq_hz(vm_x) if len(vm_x) >= 16 else 0.0
    vm_hz_y = dominant_freq_hz(vm_y) if len(vm_y) >= 16 else 0.0

    # Strafe metrics
    strafe_tilt_deg = 0.0
    strafe_shift_px = 0.0
    if strip_name == "strafe" and len(frames) >= 80:
        rolls_a = [
            f["vmRot"][2] * 180.0 / math.pi
            for f in frames[15:42]
            if f.get("vmRot")
        ]
        rolls_d = [
            f["vmRot"][2] * 180.0 / math.pi
            for f in frames[60:88]
            if f.get("vmRot")
        ]
        if rolls_a and rolls_d:
            strafe_tilt_deg = round(
                abs(sum(rolls_d) / len(rolls_d) - sum(rolls_a) / len(rolls_a)) * 0.5, 2
            )
        xa = sum(f["muzzle"][0] for f in frames[15:42]) / 27.0
        xd = sum(f["muzzle"][0] for f in frames[60:88]) / 28.0
        strafe_shift_px = round(xd - xa, 2)

    # Flick90 metrics
    flick_peak_px = 0.0
    flick_lag_ms = 0.0
    flick_settle_s = 0.0
    flick_overshoot_pct = 0.0
    if strip_name == "flick90" and len(frames) >= 30:
        x0 = frames[0]["muzzle"][0]
        y0 = frames[0]["muzzle"][1]
        dists = [math.hypot(f["muzzle"][0] - x0, f["muzzle"][1] - y0) for f in frames]
        peak_idx = max(range(len(dists)), key=lambda i: dists[i])
        flick_peak_px = round(dists[peak_idx], 2)
        flick_lag_ms = round(max(0, (peak_idx - 5)) * (1000.0 / 30.0), 1)
        # Settle within 0.5 px of final resting position
        xf, yf = frames[-1]["muzzle"][0], frames[-1]["muzzle"][1]
        settle_idx = peak_idx
        for i in range(peak_idx, len(frames)):
            if math.hypot(frames[i]["muzzle"][0] - xf, frames[i]["muzzle"][1] - yf) > 0.5:
                settle_idx = i
        flick_settle_s = round((settle_idx - 8) / 30.0, 3)
        # Overshoot past final x
        dx_main = frames[peak_idx]["muzzle"][0] - xf
        opp = [
            -(f["muzzle"][0] - xf) if dx_main > 0 else (f["muzzle"][0] - xf)
            for f in frames[peak_idx:]
        ]
        max_opp = max([0.0] + opp)
        if flick_peak_px > 0.1:
            flick_overshoot_pct = round(max_opp * 100.0 / flick_peak_px, 2)

    return {
        "hpRmsPx": hp_ss,
        "hpRmsAllPx": hp_all,
        "stepDeltaRmsPx": step_rms,
        "ampXPx": amp_x,
        "ampYPx": amp_y,
        "ampXPct": amp_x_pct,
        "ampYPct": amp_y_pct,
        "bobHzX": bob_hz_x,
        "bobHzY": bob_hz_y,
        "vmBobHzX": vm_hz_x,
        "vmBobHzY": vm_hz_y,
        "strafeTiltDeg": strafe_tilt_deg,
        "strafeShiftXPx": strafe_shift_px,
        "flickPeakPx": flick_peak_px,
        "flickLagMs": flick_lag_ms,
        "flickSettleS": flick_settle_s,
        "flickOvershootPct": flick_overshoot_pct,
        "maxHullVerts": max((f.get("insideHullVerts", 0) for f in frames), default=0),
    }


def process_ag202_r1():
    r0_path = ROOT / "qa/2026-11-02-AG-202/traces.json"
    r1_dir = ROOT / "qa/2026-11-02-AG-202/r1-motion"
    r1_path = r1_dir / "traces-r1.json"
    if not r1_path.exists():
        print("[postprocess] traces-r1.json not found yet, skipping AG-202-R1.")
        return

    r0 = json.loads(r0_path.read_text(encoding="utf-8")) if r0_path.exists() else {"stills": {}, "strips": {}}
    r1 = json.loads(r1_path.read_text(encoding="utf-8"))

    weapons = ["pistol", "revolver", "m4"]
    strips = ["walk", "run", "strafe", "flick90"]
    comparison = {"weapons": {}}

    for w in weapons:
        comparison["weapons"][w] = {"stills": {}, "strips": {}}
        for st in ["hip", "sprint"]:
            k = f"tg-1080p-{w}-{st}"
            comparison["weapons"][w]["stills"][st] = {
                "r0": r0.get("stills", {}).get(k),
                "r1": r1.get("stills", {}).get(k),
            }
        for sp in strips:
            k = f"{w}-{sp}"
            f0 = r0.get("strips", {}).get(k, [])
            f1 = r1.get("strips", {}).get(k, [])
            m0 = compute_strip_metrics(f0, sp)
            m1 = compute_strip_metrics(f1, sp)
            comparison["weapons"][w]["strips"][sp] = {"r0": m0, "r1": m1}

            # Build animated GIF for R1
            frame_dir = r1_dir / "frames" / f"{w}-1080p"
            if frame_dir.exists():
                imgs = []
                for idx in range(90):
                    fp = frame_dir / f"{sp}-{idx:03d}.jpg"
                    if fp.exists():
                        im = Image.open(fp).convert("RGB")
                        d = ImageDraw.Draw(im)
                        d.rectangle([0, 0, 480, 22], fill=(12, 16, 22))
                        d.text(
                            (6, 3),
                            f"R1 CL-293p1 | {w.upper()} {sp.upper()} f={idx:02d}/90 | hp={m1.get('hpRmsPx')}px Hz=({m1.get('bobHzX')},{m1.get('bobHzY')})",
                            fill=(230, 240, 255),
                            font=get_font(12, True),
                        )
                        imgs.append(im)
                if imgs:
                    gif_path = r1_dir / f"{w}-{sp}-r1.gif"
                    imgs[0].save(
                        gif_path,
                        save_all=True,
                        append_images=imgs[1:],
                        duration=33,
                        loop=0,
                    )

    (r1_dir / "metrics-r1-vs-r0.json").write_text(
        json.dumps(comparison, indent=2), encoding="utf-8"
    )

    # Build comparison contact sheet: sheet-r1-motion.jpg
    W, H = 2200, 1780
    sheet = Image.new("RGB", (W, H), (14, 17, 22))
    draw = ImageDraw.Draw(sheet)
    f_title = get_font(24, True)
    f_sub = get_font(16, True)
    f_body = get_font(14, False)
    f_small = get_font(12, False)

    draw.text(
        (24, 18),
        "AG-202 Short Re-Shoot — Motion After CL-293 Part 1 (Pistol, Revolver, GW-4 M4) vs Round 0",
        fill=(240, 245, 255),
        font=f_title,
    )
    draw.text(
        (24, 50),
        "Training Ground (1080p, Jerry's RTX 5080 WebGPU) · Sprint Still (R0 vs R1) + Walk / Run / Strafe / Flick90 Traces, High-Pass px & Bob Hz",
        fill=(170, 185, 205),
        font=f_body,
    )

    # Row 1: Stills comparison (Hip R1, Sprint R0, Sprint R1) for Pistol, Revolver, M4
    y_cursor = 84
    col_w = 710
    for idx, w in enumerate(weapons):
        x0 = 24 + idx * (col_w + 12)
        draw.rectangle([x0, y_cursor, x0 + col_w, y_cursor + 430], outline=(45, 55, 70), width=2)
        draw.text(
            (x0 + 10, y_cursor + 8),
            f"{w.upper()} — HIP (R1) vs SPRINT STILL (R0 -> R1)",
            fill=(255, 220, 130),
            font=f_sub,
        )
        r0_sp_path = ROOT / f"qa/2026-11-02-AG-202/stills/tg-1080p/{w}-sprint.jpg"
        r1_hip_path = r1_dir / "stills" / f"{w}-hip.jpg"
        r1_sp_path = r1_dir / "stills" / f"{w}-sprint.jpg"

        for s_idx, (lbl, pth) in enumerate(
            [("R1 HIP", r1_hip_path), ("R0 SPRINT (No Pose)", r0_sp_path), ("R1 SPRINT (CL-293p1)", r1_sp_path)]
        ):
            sx = x0 + 10 + s_idx * 232
            sy = y_cursor + 36
            if pth.exists():
                im = Image.open(pth).convert("RGB").resize((224, 126), Image.Resampling.LANCZOS)
                sheet.paste(im, (sx, sy))
            draw.rectangle([sx, sy, sx + 224, sy + 126], outline=(80, 95, 120), width=1)
            draw.text((sx + 4, sy + 4), lbl, fill=(255, 255, 255), font=f_small)

        # Draw 4 strip trace comparison panels (walk, run, strafe, flick90)
        for sp_idx, sp in enumerate(strips):
            px = x0 + 10 + (sp_idx % 2) * 346
            py = y_cursor + 174 + (sp_idx // 2) * 122
            draw.rectangle([px, py, px + 338, py + 114], fill=(20, 25, 34), outline=(55, 68, 88))
            m0 = comparison["weapons"][w]["strips"][sp]["r0"]
            m1 = comparison["weapons"][w]["strips"][sp]["r1"]
            draw.text(
                (px + 6, py + 4),
                f"{sp.upper()} · R0 -> R1",
                fill=(130, 210, 255),
                font=f_small,
            )
            draw.text(
                (px + 6, py + 20),
                f"hpRms: {m0.get('hpRmsPx',0):.2f}px -> {m1.get('hpRmsPx',0):.2f}px",
                fill=(235, 240, 245),
                font=f_small,
            )
            if sp in ("walk", "run"):
                draw.text(
                    (px + 6, py + 36),
                    f"bobHz(X,Y): ({m0.get('bobHzX',0):.2f},{m0.get('bobHzY',0):.2f}) -> ({m1.get('bobHzX',0):.2f},{m1.get('bobHzY',0):.2f})Hz",
                    fill=(160, 245, 170),
                    font=f_small,
                )
                draw.text(
                    (px + 6, py + 52),
                    f"vmHz(X,Y):  ({m0.get('vmBobHzX',0):.2f},{m0.get('vmBobHzY',0):.2f}) -> ({m1.get('vmBobHzX',0):.2f},{m1.get('vmBobHzY',0):.2f})Hz",
                    fill=(190, 225, 195),
                    font=f_small,
                )
                draw.text(
                    (px + 6, py + 68),
                    f"amp(X,Y)%: ({m0.get('ampXPct',0):.2f},{m0.get('ampYPct',0):.2f}) -> ({m1.get('ampXPct',0):.2f},{m1.get('ampYPct',0):.2f})%",
                    fill=(210, 215, 225),
                    font=f_small,
                )
            elif sp == "strafe":
                draw.text(
                    (px + 6, py + 36),
                    f"tiltDeg: {m0.get('strafeTiltDeg',0):.2f}° -> {m1.get('strafeTiltDeg',0):.2f}°",
                    fill=(160, 245, 170),
                    font=f_small,
                )
                draw.text(
                    (px + 6, py + 52),
                    f"shiftX: {m0.get('strafeShiftXPx',0):.1f}px -> {m1.get('strafeShiftXPx',0):.1f}px",
                    fill=(210, 215, 225),
                    font=f_small,
                )
            elif sp == "flick90":
                draw.text(
                    (px + 6, py + 36),
                    f"peak: {m0.get('flickPeakPx',0):.1f}px -> {m1.get('flickPeakPx',0):.1f}px | lag: {m1.get('flickLagMs',0):.0f}ms",
                    fill=(160, 245, 170),
                    font=f_small,
                )
                draw.text(
                    (px + 6, py + 52),
                    f"settle: {m0.get('flickSettleS',0):.2f}s -> {m1.get('flickSettleS',0):.2f}s | over: {m1.get('flickOvershootPct',0):.1f}%",
                    fill=(210, 215, 225),
                    font=f_small,
                )

            # Plot mini time-series of Y (and X) muzzle trace R0 (red) vs R1 (cyan)
            f0 = r0.get("strips", {}).get(f"{w}-{sp}", [])
            f1 = r1.get("strips", {}).get(f"{w}-{sp}", [])
            gx0, gy0, gw, gh = px + 6, py + 84, 324, 24
            draw.rectangle([gx0, gy0, gx0 + gw, gy0 + gh], fill=(12, 15, 20))
            for series, col in [(f0, (235, 85, 85)), (f1, (80, 230, 255))]:
                if len(series) > 2:
                    ys = [s["muzzle"][1] if sp != "flick90" else s["muzzle"][0] for s in series]
                    lo, hi = min(ys), max(ys)
                    span = max(2.0, hi - lo)
                    pts = [
                        (
                            gx0 + int(i * gw / (len(ys) - 1)),
                            gy0 + gh - 2 - int((ys[i] - lo) / span * (gh - 4)),
                        )
                        for i in range(len(ys))
                    ]
                    draw.line(pts, fill=col, width=1)

    # Row 2: 6-frame filmstrips for Walk and Run (Pistol, Revolver, M4) + Summary Table
    y_film = 528
    for idx, w in enumerate(weapons):
        for s_i, sp in enumerate(["walk", "run", "strafe", "flick90"]):
            ry = y_film + (idx * 4 + s_i) * 98
            draw.text(
                (24, ry + 8),
                f"{w.upper()}\n{sp.upper()} (R1)",
                fill=(230, 240, 255),
                font=f_small,
            )
            frame_dir = r1_dir / "frames" / f"{w}-1080p"
            sample_indices = [12, 24, 36, 48, 60, 72, 84]
            for fi_idx, fnum in enumerate(sample_indices):
                fp = frame_dir / f"{sp}-{fnum:03d}.jpg"
                fx = 130 + fi_idx * 172
                if fp.exists():
                    im = Image.open(fp).convert("RGB").resize((166, 92), Image.Resampling.LANCZOS)
                    sheet.paste(im, (fx, ry))
                draw.rectangle([fx, ry, fx + 166, ry + 92], outline=(55, 65, 80), width=1)
                draw.text((fx + 4, ry + 2), f"f={fnum}", fill=(255, 230, 140), font=f_small)

    # Right-side detailed table panel
    tx0 = 1350
    ty0 = 528
    draw.rectangle([tx0, ty0, W - 24, H - 24], fill=(18, 22, 30), outline=(65, 80, 105), width=2)
    draw.text(
        (tx0 + 16, ty0 + 14),
        "ROUND 0 vs ROUND 1 (CL-293 Part 1) — NUMERICAL COMPARISON",
        fill=(255, 225, 130),
        font=f_sub,
    )
    ty = ty0 + 48
    headers = "WEAPON   STRIP     hpRms(R0->R1)   stepRms(R0->R1)  bobHzX(R0->R1)  bobHzY(R0->R1)  ampX%(R0->R1)  ampY%(R0->R1)"
    draw.text((tx0 + 14, ty), headers, fill=(150, 205, 255), font=f_small)
    ty += 24
    for w in weapons:
        for sp in strips:
            m0 = comparison["weapons"][w]["strips"][sp]["r0"]
            m1 = comparison["weapons"][w]["strips"][sp]["r1"]
            line = (
                f"{w:<8} {sp:<8} "
                f"{m0.get('hpRmsPx',0):>5.2f}->{m1.get('hpRmsPx',0):<5.2f}px  "
                f"{m0.get('stepDeltaRmsPx',0):>5.2f}->{m1.get('stepDeltaRmsPx',0):<5.2f}px  "
                f"{m0.get('bobHzX',0):>5.2f}->{m1.get('bobHzX',0):<5.2f}Hz "
                f"{m0.get('bobHzY',0):>5.2f}->{m1.get('bobHzY',0):<5.2f}Hz "
                f"{m0.get('ampXPct',0):>4.2f}->{m1.get('ampXPct',0):<4.2f}%  "
                f"{m0.get('ampYPct',0):>4.2f}->{m1.get('ampYPct',0):<4.2f}%"
            )
            draw.text((tx0 + 14, ty), line, fill=(230, 235, 245), font=f_small)
            ty += 22
        ty += 10

    ty += 12
    draw.text((tx0 + 14, ty), "SPRINT STILL POSE (tg-1080p) — MUZZLE & WRIST SCREEN COORDS (px):", fill=(255, 225, 130), font=f_small)
    ty += 22
    for w in weapons:
        s0 = comparison["weapons"][w]["stills"]["sprint"]["r0"] or {}
        s1 = comparison["weapons"][w]["stills"]["sprint"]["r1"] or {}
        h1 = comparison["weapons"][w]["stills"]["hip"]["r1"] or {}
        draw.text(
            (tx0 + 14, ty),
            f"{w.upper():<8} R1 Hip:    muzzle={h1.get('muzzle')} wristR={h1.get('wristR')} wristL={h1.get('wristL')}",
            fill=(190, 205, 225),
            font=f_small,
        )
        ty += 18
        draw.text(
            (tx0 + 14, ty),
            f"{w.upper():<8} R0 Sprint: muzzle={s0.get('muzzle')} wristR={s0.get('wristR')} wristL={s0.get('wristL')}",
            fill=(235, 150, 150),
            font=f_small,
        )
        ty += 18
        draw.text(
            (tx0 + 14, ty),
            f"{w.upper():<8} R1 Sprint: muzzle={s1.get('muzzle')} wristR={s1.get('wristR')} wristL={s1.get('wristL')}",
            fill=(150, 245, 175),
            font=f_small,
        )
        ty += 24

    sheet.save(r1_dir / "sheet-r1-motion.jpg", quality=92)
    print("[postprocess] Saved qa/2026-11-02-AG-202/r1-motion/sheet-r1-motion.jpg")


def process_ag200():
    d = ROOT / "qa/2026-11-02-AG-200"
    if not (d / "probe-summary.json").exists():
        print("[postprocess] AG-200 probe-summary.json not found yet.")
        return
    shots = [
        ("fp-unarmed-standing-feet.jpg", "1. 1P Unarmed Standing (Feet)"),
        ("fp-pistol-standing-feet.jpg", "2. 1P Pistol Standing (Feet)"),
        ("fp-pistol-walking-feet.jpg", "3. 1P Pistol Walking (Feet)"),
        ("fp-pistol-aiming-feet.jpg", "4. 1P Pistol Aiming ADS (Feet)"),
        ("tp-standing-feet-closeup.jpg", "5. 3P Standing Feet Close-Up"),
        ("tp-standing-live.jpg", "6. 3P Standing Live Camera"),
        ("tp-walking-feet-closeup.jpg", "7. 3P Walking Feet Close-Up"),
        ("tp-aiming-feet-closeup.jpg", "8. 3P Aiming Feet Close-Up"),
    ]
    W, H = 1960, 1060
    sheet = Image.new("RGB", (W, H), (14, 17, 22))
    draw = ImageDraw.Draw(sheet)
    f_title = get_font(22, True)
    f_lbl = get_font(14, True)
    draw.text(
        (20, 16),
        "AG-200 — The Sphere Between His Feet (J52; Training Ground, 1P & 3P, Standing / Walking / Aiming)",
        fill=(240, 245, 255),
        font=f_title,
    )
    cw, ch = 468, 263
    for i, (fn, lbl) in enumerate(shots):
        col = i % 4
        row = i // 4
        x = 20 + col * (cw + 14)
        y = 60 + row * (ch + 44)
        p = d / fn
        if p.exists():
            im = Image.open(p).convert("RGB").resize((cw, ch), Image.Resampling.LANCZOS)
            sheet.paste(im, (x, y))
        draw.rectangle([x, y, x + cw, y + ch], outline=(70, 85, 110), width=2)
        draw.text((x + 4, y + ch + 6), lbl, fill=(220, 230, 245), font=f_lbl)
    sheet.save(d / "sheet.jpg", quality=92)
    print("[postprocess] Saved qa/2026-11-02-AG-200/sheet.jpg")


def process_ag201():
    d = ROOT / "qa/2026-11-02-AG-201"
    if not (d / "camo-audit.json").exists():
        print("[postprocess] AG-201 camo-audit.json not found yet.")
        return
    shots = [
        ("01-uniform-body-unarmed-1p.jpg", "1. 1P Unarmed: 3P Body live-sleeve (boxProjectUV 2.38 rep/m = 42cm tile)"),
        ("02-uniform-vm-m4-1p.jpg", "2. 1P M4 Viewmodel: vm-forearm (loftRings 4.55 rep/m) & vm-cuff (25 rep/m) vs Hand (2.20 rep/m)"),
        ("03-uniform-and-gun-body-m4-pop-1p.jpg", "3. 1P CIF/Body Pop: 3P Body M4 (scale=0.78, fov=60) + live-sleeve (2.38 rep/m)"),
        ("04-weapon-ak-vm-1p.jpg", "4. 1P AK Viewmodel (scale=1.0, fov=50, local unscaled boxProjectUV)"),
        ("05-sniper-ads-before-pop.jpg", "5. 1P Sniper ADS (ads=0.78): Viewmodel Active (vm-forearm + vm-gun)"),
        ("06-sniper-ads-after-pop.jpg", "6. 1P Sniper Scope Pop (ads>=0.82): setEyeHide(false) Pops 3P Body Arms In!"),
        ("07-training-armory-rack-vs-viewmodel.jpg", "7. Training Ground Armory Rack (post-scale boxProjectUV) vs Viewmodel Shotgun"),
        ("08-heavy-launcher-body-sleeve-1p.jpg", "8. 1P Heavy Launcher (No Viewmodel): Pops Back to 3P live-sleeve (2.38 rep/m)"),
    ]
    W, H = 1960, 1080
    sheet = Image.new("RGB", (W, H), (14, 17, 22))
    draw = ImageDraw.Draw(sheet)
    f_title = get_font(22, True)
    f_lbl = get_font(12, True)
    draw.text(
        (20, 16),
        "AG-201 — The Camo That Changes Size in 1P Training Ground (J63: Uniform & Weapon Camo UV / Scale Pops)",
        fill=(240, 245, 255),
        font=f_title,
    )
    cw, ch = 468, 263
    for i, (fn, lbl) in enumerate(shots):
        col = i % 4
        row = i // 4
        x = 20 + col * (cw + 14)
        y = 60 + row * (ch + 48)
        p = d / fn
        if p.exists():
            im = Image.open(p).convert("RGB").resize((cw, ch), Image.Resampling.LANCZOS)
            sheet.paste(im, (x, y))
        draw.rectangle([x, y, x + cw, y + ch], outline=(70, 85, 110), width=2)
        draw.text((x + 4, y + ch + 6), lbl[:58], fill=(255, 225, 130), font=f_lbl)
        if len(lbl) > 58:
            draw.text((x + 4, y + ch + 22), lbl[58:], fill=(200, 215, 235), font=f_lbl)
    sheet.save(d / "sheet.jpg", quality=92)
    print("[postprocess] Saved qa/2026-11-02-AG-201/sheet.jpg")


def process_ag203():
    d = ROOT / "qa/2026-11-02-AG-203"
    if not (d / "sector-cull-audit.json").exists():
        print("[postprocess] AG-203 sector-cull-audit.json not found yet.")
        return
    spots = [
        ("spot1_choke_eye", "Spot 1: 1P Choke-Point Trail Gap"),
        ("spot2_oblique_face", "Spot 2: 3/4 Oblique Face (2.8-3.4m, Breach, Moss, Ivy)"),
        ("spot3_elevated_overview", "Spot 3: Elevated Overview & Behind-Band Occlusion"),
    ]
    lights = ["noon", "overcast", "dusk", "night"]
    W, H = 2040, 1480
    sheet = Image.new("RGB", (W, H), (14, 17, 22))
    draw = ImageDraw.Draw(sheet)
    f_title = get_font(22, True)
    f_sub = get_font(15, True)
    f_lbl = get_font(12, True)
    draw.text(
        (20, 16),
        "AG-203 — Stone Walls Against the Hedges (J67: Studio Dry-Stone Wall 2.5–3.5 m vs Today's Hedge, 3 Spots × 4 Lights)",
        fill=(240, 245, 255),
        font=f_title,
    )
    cw, ch = 320, 180
    for s_idx, (sp_id, sp_lbl) in enumerate(spots):
        for m_idx, (mode, m_lbl) in enumerate([("hedge", "TODAY'S HEDGE"), ("stone", "STUDIO STONE WALL (2.5-3.5m)")]):
            row = s_idx * 2 + m_idx
            y = 58 + row * (ch + 48)
            draw.text(
                (20, y - 20),
                f"{sp_lbl} — {m_lbl}",
                fill=(140, 230, 170) if mode == "stone" else (240, 190, 130),
                font=f_sub,
            )
            for l_idx, lt in enumerate(lights):
                x = 20 + l_idx * (cw + 14)
                p = d / f"{mode}-{sp_id}-{lt}.jpg"
                if p.exists():
                    im = Image.open(p).convert("RGB").resize((cw, ch), Image.Resampling.LANCZOS)
                    sheet.paste(im, (x, y))
                draw.rectangle([x, y, x + cw, y + ch], outline=(70, 85, 110), width=1)
                draw.text((x + 6, y + 6), f"{mode.upper()} · {lt.upper()}", fill=(255, 255, 255), font=f_lbl)

    # Right column: 5-seat sector cull summary
    audit = json.loads((d / "sector-cull-audit.json").read_text(encoding="utf-8"))
    tx = 1365
    ty = 58
    draw.rectangle([tx, ty, W - 20, H - 20], fill=(18, 22, 30), outline=(65, 80, 105), width=2)
    draw.text((tx + 14, ty + 14), "PART (B): 5-SEAT SECTOR CULL AUDIT", fill=(255, 225, 130), font=f_sub)
    ty += 46
    for seat in audit.get("seats", []):
        draw.text((tx + 14, ty), seat["label"], fill=(135, 210, 255), font=f_lbl)
        ty += 18
        sc = seat["sectorCullBehindBand"]
        ho = seat["heightOcclusionByWallHeight"]
        draw.text(
            (tx + 14, ty),
            f"  Frustum Total: {seat['totalFrustumDraws']} draws, {seat['totalFrustumTris']:,} tris (renderer calls={seat['rendererInfo']['calls']})",
            fill=(210, 220, 235),
            font=f_lbl,
        )
        ty += 16
        draw.text(
            (tx + 14, ty),
            f"  Behind Band (Sector Cull): {sc['drawsSkipped']} draws ({sc['pctDraws']}%), {sc['trisSkipped']:,} tris ({sc['pctTris']}%)",
            fill=(160, 245, 175),
            font=f_lbl,
        )
        ty += 16
        draw.text(
            (tx + 14, ty),
            f"  Sightline-Hidden by Wall: 2.5m={ho['h2_5m']['draws']}d/{ho['h2_5m']['tris']:,}t | 3.0m={ho['h3_0m']['draws']}d/{ho['h3_0m']['tris']:,}t | 3.5m={ho['h3_5m']['draws']}d/{ho['h3_5m']['tris']:,}t",
            fill=(240, 215, 150),
            font=f_lbl,
        )
        ty += 18
        for own, od in seat.get("byOwnerBehind", {}).items():
            draw.text(
                (tx + 22, ty),
                f"- {own}: {od.get('draws',0)} draws (+{od.get('partialInstancedDraws',0)} inst packs), {od.get('tris',0):,} tris",
                fill=(180, 190, 205),
                font=f_lbl,
            )
            ty += 15
        ty += 14

    sheet.save(d / "sheet.jpg", quality=92)
    print("[postprocess] Saved qa/2026-11-02-AG-203/sheet.jpg")


if __name__ == "__main__":
    process_ag200()
    process_ag202_r1()
    process_ag201()
    process_ag203()
