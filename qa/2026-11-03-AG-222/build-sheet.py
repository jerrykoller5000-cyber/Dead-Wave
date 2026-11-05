import json
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFont

OUT_DIR = Path(__file__).resolve().parent
WALKS_DIR = OUT_DIR / "walks"


def get_font(size: int, bold: bool = False):
    candidates = (
        ["C:/Windows/Fonts/consolab.ttf", "C:/Windows/Fonts/segoeuib.ttf", "C:/Windows/Fonts/arialbd.ttf"]
        if bold
        else ["C:/Windows/Fonts/consola.ttf", "C:/Windows/Fonts/segoeui.ttf", "C:/Windows/Fonts/arial.ttf"]
    )
    for c in candidates:
        if Path(c).exists():
            try:
                return ImageFont.truetype(c, size)
            except Exception:
                pass
    return ImageFont.load_default()


def make_diff_image(img_a: Image.Image, img_b: Image.Image, gain: float = 8.0) -> Image.Image:
    diff = ImageChops.difference(img_a.convert("RGB"), img_b.convert("RGB"))
    return ImageEnhance.Brightness(diff).enhance(gain)


def build_seats_and_shadows_sheet(telemetry: dict):
    f_title = get_font(24, True)
    f_sub = get_font(15, False)
    f_sec = get_font(18, True)
    f_lbl = get_font(14, True)
    f_meta = get_font(13, False)

    thumb_w, thumb_h = 560, 315
    pad = 18
    cols = 3  # OFF, ON, Diff x8
    canvas_w = pad + cols * (thumb_w + pad)

    seats = telemetry.get("seatsAudit", [])
    shadows = telemetry.get("shadowAudit", [])

    header_h = 110
    row_h = thumb_h + 62
    sec_h = 40
    canvas_h = header_h + sec_h + len(seats) * row_h + sec_h + len(shadows) * row_h + pad

    sheet = Image.new("RGB", (canvas_w, canvas_h), (14, 17, 22))
    draw = ImageDraw.Draw(sheet)

    draw.text(
        (pad, 18),
        "AG-222 — GB-273 Walls' Cull: AG-203 Five Seats A/B + Dawn & Dusk Shadow Audit (1080p WebGPU)",
        fill=(240, 244, 250),
        font=f_title,
    )
    wc_warm = telemetry.get("warmupStats", {}).get("wallCullDbg", {})
    draw.text(
        (pad, 52),
        f"Default Stone Walls + wallCull ON vs ?wallcull=0 OFF  |  wallCull cells={wc_warm.get('cells')}  segments={wc_warm.get('segments')}  |  Target: draws behind band down >= 66.7% (2/3)",
        fill=(170, 188, 210),
        font=f_sub,
    )
    off_chk = telemetry.get("urlOffFlagCheck", {})
    draw.text(
        (pad, 76),
        f"?wallcull=0 URL flag check: TT.wallCullDbg() = {off_chk.get('wallCullDbg')} (cleanly disabled)",
        fill=(130, 215, 160),
        font=f_meta,
    )

    y = header_h
    draw.text((pad, y), "PART 1: AG-203'S FIVE FIRST-PERSON SEATS — wallCull OFF vs wallCull ON vs AMPLIFIED PIXEL DIFF (x8)", fill=(120, 200, 255), font=f_sec)
    y += sec_h

    for s in seats:
        short = s["short"]
        off_path = OUT_DIR / f"{short}-off.jpg"
        on_path = OUT_DIR / f"{short}-on.jpg"
        if not off_path.exists() or not on_path.exists():
            continue

        im_off = Image.open(off_path).convert("RGB")
        im_on = Image.open(on_path).convert("RGB")
        im_diff = make_diff_image(im_off, im_on, gain=8.0)

        cmp = s["comparison"]
        wc_on = s["on"].get("wallCullDbg") or {}
        d_off = cmp["behindBandDrawsOff"]
        d_on = cmp["behindBandDrawsOn"]
        pct = cmp["pctBehindBandDrawsDropped"]
        met = "PASS (>= 66.7%)" if cmp["targetTwoThirdsMet"] else f"PARTIAL ({pct}% < 66.7%)"
        met_col = (100, 235, 140) if cmp["targetTwoThirdsMet"] else (255, 195, 90)

        draw.text(
            (pad, y),
            f"{s['label']}  |  pos=({s['on']['seatPos']['x']}, {s['on']['seatPos']['z']})  distToWall={s['on']['distToWallM']}m",
            fill=(235, 240, 248),
            font=f_lbl,
        )
        draw.text(
            (pad, y + 20),
            f"Behind-Band Draws: {d_off} (OFF) -> {d_on} (ON)  [-{cmp['behindBandDrawsDropped']} draws / -{pct}% · {met}]  |  Frustum Draws: {cmp['frustumDrawsOff']} -> {cmp['frustumDrawsOn']}  |  Renderer Calls: {cmp['rendererCallsOff']} -> {cmp['rendererCallsOn']} (-{cmp['rendererCallsSaved']})  |  wallCull hidden={wc_on.get('hidden')}/{wc_on.get('cells')} ({wc_on.get('ms')}ms)",
            fill=met_col,
            font=f_meta,
        )

        panels = [
            (im_off, f"{short} · wallCull OFF (?wallcull=0) · behind={d_off} draws"),
            (im_on, f"{short} · wallCull ON (default) · behind={d_on} draws (-{pct}%)"),
            (im_diff, f"Amplified Diff |ON - OFF| x8 · pxDiff>8={cmp['pixelDiffOnVsOff']['pctDiffOver8']}% (mean={cmp['pixelDiffOnVsOff']['meanAbsDiff']})"),
        ]
        for ci, (pim, cap) in enumerate(panels):
            x = pad + ci * (thumb_w + pad)
            ty = y + 44
            th = pim.resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
            sheet.paste(th, (x, ty))
            draw.rectangle([x, ty, x + thumb_w - 1, ty + 24], fill=(10, 12, 16))
            draw.text((x + 8, ty + 4), cap, fill=(230, 236, 245), font=f_meta)
            draw.rectangle([x, ty, x + thumb_w - 1, ty + thumb_h - 1], outline=(55, 65, 80), width=1)

        y += row_h

    draw.text((pad, y), "PART 3: DAWN (06:30) & DUSK (17:30) SHADOW CHECK BEHIND STONE WALLS — wallCull OFF vs ON", fill=(255, 200, 110), font=f_sec)
    y += sec_h

    for sh in shadows:
        sid = sh["id"]
        off_path = OUT_DIR / f"shadow-{sid}-off.jpg"
        on_path = OUT_DIR / f"shadow-{sid}-on.jpg"
        if not off_path.exists() or not on_path.exists():
            continue

        im_off = Image.open(off_path).convert("RGB")
        im_on = Image.open(on_path).convert("RGB")
        im_diff = make_diff_image(im_off, im_on, gain=8.0)

        gdiff = sh["groundShadowBandDiff"]
        fdiff = sh["fullFrameDiff"]
        draw.text((pad, y), f"{sh['label']}  |  sunIntensity={sh['sunIntensity']}  sunOffset=({sh['sunOffsetFromPlayer']['dx']}, {sh['sunOffsetFromPlayer']['dy']}, {sh['sunOffsetFromPlayer']['dz']})", fill=(235, 240, 248), font=f_lbl)
        draw.text(
            (pad, y + 20),
            f"Behind-Band Draws: {sh['behindBandDrawsOff']} (OFF) -> {sh['behindBandDrawsOn']} (ON)  |  Ground Shadow Band Pixel Diff (>8/255): {gdiff['pctDiffOver8']}% (mean={gdiff['meanAbsDiff']})  |  Full Frame Diff (>8/255): {fdiff['pctDiffOver8']}%",
            fill=(130, 225, 165),
            font=f_meta,
        )

        panels = [
            (im_off, f"{sid} · wallCull OFF · behind={sh['behindBandDrawsOff']} draws"),
            (im_on, f"{sid} · wallCull ON · behind={sh['behindBandDrawsOn']} draws"),
            (im_diff, f"Amplified Diff |ON - OFF| x8 · groundShadowDiff={gdiff['pctDiffOver8']}%"),
        ]
        for ci, (pim, cap) in enumerate(panels):
            x = pad + ci * (thumb_w + pad)
            ty = y + 44
            th = pim.resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
            sheet.paste(th, (x, ty))
            draw.rectangle([x, ty, x + thumb_w - 1, ty + 24], fill=(10, 12, 16))
            draw.text((x + 8, ty + 4), cap, fill=(230, 236, 245), font=f_meta)
            draw.rectangle([x, ty, x + thumb_w - 1, ty + thumb_h - 1], outline=(55, 65, 80), width=1)

        y += row_h

    out_file = OUT_DIR / "seats-and-shadows-sheet.jpg"
    sheet.save(out_file, quality=92)
    print(f"[AG-222] Saved {out_file} ({sheet.size[0]}x{sheet.size[1]})")


def build_walks_sheet(telemetry: dict):
    f_title = get_font(22, True)
    f_sub = get_font(14, False)
    f_lbl = get_font(14, True)
    f_meta = get_font(12, False)

    walks = telemetry.get("walksAudit", [])
    cols = 6
    thumb_w, thumb_h = 340, 191
    pad = 14
    header_h = 84
    row_h = thumb_h + 54
    canvas_w = pad + cols * (thumb_w + pad)
    canvas_h = header_h + len(walks) * row_h + pad

    sheet = Image.new("RGB", (canvas_w, canvas_h), (14, 17, 22))
    draw = ImageDraw.Draw(sheet)

    draw.text(
        (pad, 16),
        "AG-222 — GB-273 Part 2: Walking Along the HQ Ring & Through Each Gap (Hysteresis & Pop Check)",
        fill=(240, 244, 250),
        font=f_title,
    )
    draw.text(
        (pad, 48),
        "6 Checkpoints per 72-frame walk (f00, f14, f28, f42, f56, f71)  |  Two hidden reads to hide, one seen read to show — cells unhide BEFORE entering sightline through gap",
        fill=(170, 188, 210),
        font=f_sub,
    )

    y = header_h
    for w in walks:
        wid = w["id"]
        draw.text(
            (pad, y),
            f"{w['label']}  |  hiddenCells=[{w['hiddenCellsMin']}..{w['hiddenCellsMax']}]  shownEvents={w['totalCellsShownDuringWalk']}  hiddenEvents={w['totalCellsHiddenDuringWalk']}  avgWallMs={w['avgWallMs']}ms  maxOnVsOffDiff={w['maxCheckpointOnVsOffDiffPct']}%",
            fill=(130, 215, 255),
            font=f_lbl,
        )
        ck_map = {c["f"]: c for c in w.get("checkpointDiffs", [])}
        for ci, fno in enumerate(w.get("checkpoints", [])):
            img_path = WALKS_DIR / f"{wid}-f{fno:02d}.jpg"
            x = pad + ci * (thumb_w + pad)
            ty = y + 26
            if img_path.exists():
                im = Image.open(img_path).convert("RGB").resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
                sheet.paste(im, (x, ty))
            ck = ck_map.get(fno, {})
            pos = ck.get("pos", {})
            hid = ck.get("hiddenCells", "?")
            df = ck.get("pctDiffOver8", 0)
            draw.rectangle([x, ty, x + thumb_w - 1, ty + 22], fill=(10, 12, 16))
            draw.text(
                (x + 6, ty + 4),
                f"f{fno:02d} ({pos.get('x','?')},{pos.get('z','?')}) hid={hid} diff={df}%",
                fill=(230, 236, 245),
                font=f_meta,
            )
            draw.rectangle([x, ty, x + thumb_w - 1, ty + thumb_h - 1], outline=(55, 65, 80), width=1)
        y += row_h

    out_file = OUT_DIR / "ring-and-gaps-walk-sheet.jpg"
    sheet.save(out_file, quality=92)
    print(f"[AG-222] Saved {out_file} ({sheet.size[0]}x{sheet.size[1]})")


if __name__ == "__main__":
    tel = json.loads((OUT_DIR / "telemetry.json").read_text(encoding="utf-8"))
    build_seats_and_shadows_sheet(tel)
    build_walks_sheet(tel)
