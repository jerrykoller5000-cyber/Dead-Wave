# qa/2026-11-18-AG-370/build_pass6_sheets.py
# Builds Pass 6 updated sheets 13, 14, 16 AND the D-211 Final Jerry Sheet 18-shambler-final-jerry.jpg
# including the Pass 6 same-scale side-by-side Shamble vs A-pose vs Tripo row + Head Measurements Table.
import json
import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
QA = Path(__file__).resolve().parent
FRAMES = QA / "frames-pass6"
PREV_FRAMES = ROOT / "qa" / "2026-11-18-AG-363" / "frames-step4"
PASS5_FRAMES = ROOT / "qa" / "2026-11-18-AG-368" / "frames-pass5"
OUT = ROOT / "review" / "AG-357"
OUT.mkdir(parents=True, exist_ok=True)


def load_font(size, bold=False):
    candidates = [
        "C:/Windows/Fonts/consolab.ttf" if bold else "C:/Windows/Fonts/consola.ttf",
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/segoeui.ttf",
    ]
    for c in candidates:
        if os.path.exists(c):
            try:
                return ImageFont.truetype(c, size)
            except Exception:
                pass
    return ImageFont.load_default()


F_TITLE = load_font(24, bold=True)
F_SUB = load_font(14, bold=False)
F_HDR = load_font(15, bold=True)
F_SMALL = load_font(12, bold=False)
F_TINY = load_font(11, bold=False)
F_CARD = load_font(10, bold=False)


def fit_tile(path, w, h):
    im = Image.open(path).convert("RGB")
    return im.resize((w, h), Image.Resampling.LANCZOS)


def annotate_head_calipers(tile, metrics, label_prefix, accent):
    """Draw non-occluding width/height caliper bars around the head silhouette in a profile tile."""
    w, h = tile.size
    px = tile.load()
    # Find crown_y, occiput_min_x, brow_max_x using per-row left/right edge background
    min_x, max_x, min_y = w, 0, h
    scan_max_y = int(h * 0.72)
    for py in range(10, scan_max_y):
        bg_r = (px[2, py][0] + px[w - 3, py][0]) // 2
        bg_g = (px[2, py][1] + px[w - 3, py][1]) // 2
        bg_b = (px[2, py][2] + px[w - 3, py][2]) // 2
        row_hit = False
        for px_i in range(8, w - 8):
            r, g, b = px[px_i, py]
            if abs(r - bg_r) + abs(g - bg_g) + abs(b - bg_b) > 18:
                row_hit = True
                if py < min_y:
                    min_y = py
                if px_i < min_x:
                    min_x = px_i
                if px_i > max_x:
                    max_x = px_i
        if not row_hit and min_y < h and py > min_y + 40:
            # Keep scanning down to jaw/brow extrema
            pass

    if max_x <= min_x or min_y >= h:
        return tile

    draw = ImageDraw.Draw(tile)
    depth_cm = (metrics.get("headDepthBrowM") or 0) * 100
    depth_pct = metrics.get("headDepthBrowPct") or 0
    h_closed_cm = (metrics.get("headHeightClosedM") or 0) * 100
    h_closed_pct = metrics.get("headHeightClosedPct") or 0
    ovh_cm = (metrics.get("occiputOverhangM") or 0) * 100
    join_pct = metrics.get("neckCenterPctFromBack") or 0

    # Top horizontal caliper bar: occiput back -> brow front (Depth)
    bar_y = max(24, min_y - 10)
    draw.line([(min_x, bar_y), (max_x, bar_y)], fill=accent, width=2)
    draw.line([(min_x, bar_y - 4), (min_x, bar_y + 5)], fill=accent, width=2)
    draw.line([(max_x, bar_y - 4), (max_x, bar_y + 5)], fill=accent, width=2)
    d_txt = f"{label_prefix} D {depth_cm:.1f}cm ({depth_pct}%)"
    draw.rectangle([max(4, (min_x + max_x) // 2 - 70), max(2, bar_y - 18), min(w - 4, (min_x + max_x) // 2 + 70), max(16, bar_y - 3)], fill=(14, 18, 24))
    draw.text((max(6, (min_x + max_x) // 2 - 66), max(3, bar_y - 16)), d_txt, fill=accent, font=F_CARD)

    # Right-side vertical bar for Closed H + Overhang badge
    bar_x = min(w - 8, max_x + 10)
    h_open_px = int((max_x - min_x) * ((metrics.get("headHeightOpenM") or 0.33) / max(0.20, metrics.get("headDepthBrowM") or 0.29)))
    chin_y = min(h - 36, min_y + h_open_px)
    draw.line([(bar_x, min_y), (bar_x, chin_y)], fill=(235, 240, 245), width=2)
    draw.line([(bar_x - 4, min_y), (bar_x + 4, min_y)], fill=(235, 240, 245), width=2)
    draw.line([(bar_x - 4, chin_y), (bar_x + 4, chin_y)], fill=(235, 240, 245), width=2)

    badge_y = min(h - 48, max(min_y + 6, (min_y + chin_y) // 2 - 20))
    draw.rectangle([w - 104, badge_y, w - 4, badge_y + 38], fill=(14, 18, 24), outline=accent, width=1)
    draw.text((w - 100, badge_y + 3), f"Hc {h_closed_cm:.1f} ({h_closed_pct}%)", fill=(235, 245, 250), font=F_CARD)
    draw.text((w - 100, badge_y + 19), f"J {join_pct}% Ov {ovh_cm:.1f}", fill=accent, font=F_CARD)
    return tile


def draw_metrics_card(draw, x, y, w, h, hc):
    draw.rectangle([x, y, x + w, y + h], fill=(22, 27, 34), outline=(74, 96, 118), width=1)
    draw.text((x + 8, y + 7), "HEAD & SKULL MEASUREMENTS", fill=(138, 212, 255), font=F_HDR)
    draw.text((x + 8, y + 26), "(Normalized H = 1.800 m)", fill=(162, 178, 194), font=F_CARD)

    p6 = hc["ours_pass6"]
    tr = hc["tripo"]
    lv = hc["ours_live"]

    def fmt(m, k_m, k_p=None):
        v = m.get(k_m)
        if v is None:
            return "—"
        cm = f"{v * 100:.1f}"
        if k_p and m.get(k_p) is not None:
            return f"{cm} ({m[k_p]}%)"
        return f"{cm}cm"

    c0, c1, c2 = x + 8, x + 98, x + 186
    cy = y + 46
    draw.line([(x + 6, cy - 3), (x + w - 6, cy - 3)], fill=(56, 70, 86), width=1)
    draw.text((c0, cy), "Measure", fill=(210, 222, 234), font=F_CARD)
    draw.text((c1, cy), "Ours P6", fill=(140, 230, 170), font=F_CARD)
    draw.text((c2, cy), "Tripo", fill=(255, 200, 120), font=F_CARD)
    cy += 16
    draw.line([(x + 6, cy - 2), (x + w - 6, cy - 2)], fill=(56, 70, 86), width=1)

    rows = [
        ("H (closed)", fmt(p6, "headHeightClosedM", "headHeightClosedPct"), fmt(tr, "headHeightClosedM", "headHeightClosedPct")),
        ("H (open)", fmt(p6, "headHeightOpenM", "headHeightOpenPct"), fmt(tr, "headHeightOpenM", "headHeightOpenPct")),
        ("Depth brow", fmt(p6, "headDepthBrowM", "headDepthBrowPct"), fmt(tr, "headDepthBrowM", "headDepthBrowPct")),
        ("Depth max", fmt(p6, "headDepthMaxM", "headDepthMaxPct"), fmt(tr, "headDepthMaxM", "headDepthMaxPct")),
        ("Cranium W", fmt(p6, "craniumWidthM", "craniumWidthPct"), fmt(tr, "craniumWidthM", "craniumWidthPct")),
        ("Jaw W", f"{(p6.get('jawGonionWidthM') or 0)*100:.1f}cm", "—"),
        ("Neck W", f"{(p6.get('neckTopWidthM') or 0)*100:.1f}cm", f"{(tr.get('neckTopWidthM') or 0)*100:.1f}cm"),
        ("Chin-Collar", f"{(p6.get('neckLengthChinToCollar') or 0)*100:.1f}cm", "—"),
        ("Overhang", f"{(p6.get('occiputOverhangM') or 0)*100:.1f}cm", f"{(tr.get('occiputOverhangM') or 0)*100:.1f}cm"),
        ("Neck Join%", f"{p6.get('neckCenterPctFromBack')}%", f"{tr.get('neckCenterPctFromBack')}%"),
    ]
    for label, v1, v2 in rows:
        draw.text((c0, cy), label, fill=(182, 196, 210), font=F_CARD)
        draw.text((c1, cy), v1, fill=(224, 244, 230), font=F_CARD)
        draw.text((c2, cy), v2, fill=(246, 228, 198), font=F_CARD)
        cy += 19

    cy += 4
    draw.line([(x + 6, cy), (x + w - 6, cy)], fill=(56, 70, 86), width=1)
    cy += 6
    draw.text((c0, cy), f"Live GLB: W={(lv.get('craniumWidthM') or 0)*100:.1f}cm  D={(lv.get('headDepthBrowM') or 0)*100:.1f}cm ({lv.get('headDepthBrowPct')}%)", fill=(140, 154, 168), font=F_CARD)
    draw.text((c0, cy + 15), f"Open/Closed H={(lv.get('headHeightOpenM') or 0)*100:.1f}/{(lv.get('headHeightClosedM') or 0)*100:.1f}cm", fill=(140, 154, 168), font=F_CARD)


def make_grid_sheet(title, subtitle, col_labels, row_specs, out_name, tile_w=240, tile_h=300, footer_lines=(), custom_drawer=None):
    pad = 14
    hdr_h = 80
    col_hdr_h = 46
    row_lbl_w = 248
    footer_h = 26 + len(footer_lines) * 20
    cols = len(col_labels)
    rows = len(row_specs)

    W = pad * 2 + row_lbl_w + cols * tile_w + (cols - 1) * 8
    H = pad * 2 + hdr_h + col_hdr_h + rows * tile_h + (rows - 1) * 8 + footer_h
    canvas = Image.new("RGB", (W, H), (18, 22, 27))
    draw = ImageDraw.Draw(canvas)

    draw.text((pad, pad), title, fill=(242, 246, 250), font=F_TITLE)
    draw.text((pad, pad + 34), subtitle, fill=(176, 190, 204), font=F_SUB)

    y0 = pad + hdr_h
    for ci, cl in enumerate(col_labels):
        x = pad + row_lbl_w + ci * (tile_w + 8)
        draw.rectangle([x, y0, x + tile_w, y0 + col_hdr_h - 4], fill=(32, 39, 48))
        for li, cline in enumerate(cl.split("\n")):
            f = F_HDR if li == 0 else F_SMALL
            c = (224, 232, 240) if li == 0 else (164, 184, 204)
            draw.text((x + 10, y0 + 5 + li * 19), cline, fill=c, font=f)

    y = y0 + col_hdr_h
    for r_label, r_sub, cells in row_specs:
        draw.rectangle([pad, y, pad + row_lbl_w - 8, y + tile_h], fill=(26, 32, 39))
        lbl_lines = r_label.split("\n")
        for li, lline in enumerate(lbl_lines):
            draw.text((pad + 10, y + 14 + li * 21), lline, fill=(240, 244, 248), font=F_HDR)
        sub_y = y + 18 + len(lbl_lines) * 21 + 8
        if r_sub:
            for li, line in enumerate(r_sub.split("\n")):
                draw.text((pad + 10, sub_y + li * 18), line, fill=(162, 178, 194), font=F_SMALL)
        for ci, cell in enumerate(cells):
            x = pad + row_lbl_w + ci * (tile_w + 8)
            if isinstance(cell, dict) and cell.get("custom") == "metrics" and custom_drawer:
                custom_drawer(draw, x, y, tile_w, tile_h)
                continue
            if cell is None:
                draw.rectangle([x, y, x + tile_w, y + tile_h], fill=(28, 32, 38))
                draw.text((x + 16, y + tile_h // 2), "N/A", fill=(120, 130, 140), font=F_HDR)
                continue
            if isinstance(cell, tuple):
                fpath, tag = cell[0], cell[1]
                overlay_fn = cell[2] if len(cell) > 2 else None
            else:
                fpath, tag, overlay_fn = cell, None, None
            fpath = Path(fpath) if os.path.isabs(str(fpath)) else FRAMES / fpath
            if fpath.exists():
                tile = fit_tile(fpath, tile_w, tile_h)
                if overlay_fn:
                    tile = overlay_fn(tile)
                canvas.paste(tile, (x, y))
            else:
                draw.rectangle([x, y, x + tile_w, y + tile_h], fill=(45, 22, 22))
                draw.text((x + 12, y + 12), f"Missing: {fpath.name}", fill=(255, 160, 160), font=F_SMALL)
            if tag:
                draw.rectangle([x + 6, y + tile_h - 24, x + tile_w - 6, y + tile_h - 6], fill=(12, 16, 22))
                draw.text((x + 10, y + tile_h - 22), tag, fill=(212, 226, 240), font=F_TINY)
        y += tile_h + 8

    for fi, fline in enumerate(footer_lines):
        draw.text((pad, y + 6 + fi * 20), fline, fill=(176, 196, 214), font=F_SMALL)

    out_path = OUT / out_name
    tmp_path = OUT / f".{out_name}.tmp.jpg"
    canvas.save(tmp_path, format="JPEG", quality=93)
    os.replace(tmp_path, out_path)
    print(f"Wrote {out_path}")


def main():
    report = json.loads((QA / "pass6-report.json").read_text(encoding="utf-8"))
    st = report["stats"]
    ps = report["protoStats"]
    s3 = report["step3Stats"]
    hm = report["headMetrics"]
    hc = report["headComparison"]
    tr = hc["tripo"]
    backend = report.get("backend", "WebGPU")

    hm_line = (
        f"closedH={hm['headHeightClosedM']}m ({hm['headHeightClosedPct']}%) | openH={hm['headHeightOpenM']}m | "
        f"depth={hm['headDepthBrowM']}m ({hm['headDepthBrowPct']}%) | craniumW={hm['craniumWidthM']}m ({hm['craniumWidthPct']}%) | "
        f"neckW={hm['neckTopWidthM']}m | chin-collar={hm['neckLengthChinToCollar']}m | overhang={hm['occiputOverhangM']}m"
    )

    cols_18 = [
        "FRONT\n(Full Body)",
        "3/4 ANGLE\n(Full Body)",
        "SIDE\n(Full Body)",
        "BACK\n(Full Body)",
        "HEAD 3/4\n(Close-up)",
        "HEAD BACK\n(Skull + Hair)",
    ]
    views_18 = ["front", "3q", "side", "back", "head_3q", "head_back"]
    rows_18 = [
        (
            "NOON · FINAL ATLAS 512\n(A-pose compare)",
            f"{s3['step3_512']['tris']:,} tris (LOD1 {s3['step3_lod1']['tris']:,})\n2 draws | 3 tex (3.0 MB @ 512)\nDepth {hm['headDepthBrowM']}m | Cranium {hm['craniumWidthM']}m",
            [f"noon-step3_512-{v}.png" for v in views_18],
        ),
        (
            "NOON · FINAL ATLAS 512\n(Shamble pose)",
            f"{s3['step3_512_shamble']['tris']:,} tris | 2 draws\nSame scale as A-pose\nNeck {hm['neckLengthChinToCollar']}m | Overhang {hm['occiputOverhangM']}m",
            [f"noon-step3_512_shamble-{v}.png" for v in views_18],
        ),
        (
            "NOON · JERRY TRIPO\n(Target look ref)",
            f"{st['tripo']['tris']:,} tris | 1 mesh\nDepth {tr['headDepthBrowM']}m ({tr['headDepthBrowPct']}%)\nCranium {tr['craniumWidthM']}m ({tr['craniumWidthPct']}%)",
            [f"noon-tripo-{v}.png" for v in views_18],
        ),
        (
            "PASS 6 SIDE-BY-SIDE\n(Same 1.80m camera)",
            "Shamble vs A-pose vs Tripo\nExact same distance & FOV\nHead profiles + table",
            [
                ("samescale-step3_512_shamble-full.png", f"Shamble side | H={hm['headHeightClosedM']*100:.1f}cm D={hm['headDepthBrowM']*100:.1f}cm"),
                ("samescale-step3_512-full.png", f"A-pose side | W={hm['craniumWidthM']*100:.1f}cm ({hm['craniumWidthPct']}%)"),
                ("samescale-tripo-full.png", f"Tripo side | H={tr['headHeightClosedM']*100:.1f}cm D={tr['headDepthBrowM']*100:.1f}cm"),
                ("samescale-step3_512-head.png", f"Ours profile | {hm['neckCenterPctFromBack']}% join, {hm['occiputOverhangM']*100:.1f}cm ovh", lambda t: annotate_head_calipers(t, hm, "Ours", (140, 230, 170))),
                ("samescale-tripo-head.png", f"Tripo profile | {tr['neckCenterPctFromBack']}% join, {tr['occiputOverhangM']*100:.1f}cm ovh", lambda t: annotate_head_calipers(t, tr, "Tripo", (255, 200, 120))),
                {"custom": "metrics"},
            ],
        ),
        (
            "NIGHT · FINAL ATLAS 512\n(A-pose moonlight)",
            f"{s3['step3_512']['tris']:,} tris | 2 draws\nDeep glowing eye sockets\nMoonlit silhouette",
            [f"night-step3_512-{v}.png" for v in views_18],
        ),
        (
            "NIGHT · JERRY TRIPO\n(Target look ref)",
            f"{st['tripo']['tris']:,} tris\nMoonlit look reference\nA-pose, 1.80m scale",
            [f"night-tripo-{v}.png" for v in views_18],
        ),
    ]
    make_grid_sheet(
        f"AG-357 FINAL SHAMBLER (PASS 6) - BIGGER SKULL + NECK-MIDDLE OVERHANG VS TRIPO ({backend})",
        f"D-211 Review-only Final | Depth {hm['headDepthBrowM']*100:.1f}cm ({hm['headDepthBrowPct']}%) vs Tripo {tr['headDepthBrowM']*100:.1f}cm ({tr['headDepthBrowPct']}%) | Neck {hm['neckLengthChinToCollar']*100:.1f}cm | Overhang {hm['occiputOverhangM']*100:.1f}cm",
        cols_18,
        rows_18,
        "18-shambler-final-jerry.jpg",
        tile_w=270,
        tile_h=320,
        footer_lines=[
            f"Pass 6 Metrics: {hm_line} | LOD0={s3['step3_512']['tris']:,} tris, LOD1={s3['step3_lod1']['tris']:,} tris | Errors: {len(report.get('errors', []))}",
        ],
        custom_drawer=lambda d, x, y, w, h: draw_metrics_card(d, x, y, w, h, hc),
    )

    cols_14 = [
        "HEAD 3/4\n(Jerry 3q face check)",
        "HEAD BACK\n(skull base vs neck + hair)",
        "HEAD 3/4 BACK\n(occiput overhang + nape)",
        "HEAD SIDE\n(profile + jaw + overhang)",
        "HEAD FRONT\n(wide U-jaw + teeth + SCM)",
    ]
    views_14 = ["head_3q", "head_back", "head_3q_back", "head_side", "head_front"]
    rows_14 = [
        ("PASS 5 (previous)\n(small skull)", "Pass 5 skull (~21.5cm deep)\nNeck at back of small skull", [PASS5_FRAMES / f"noon-step3_512-{v}.png" if (PASS5_FRAMES / f"noon-step3_512-{v}.png").exists() else None for v in views_14]),
        ("PASS 6 WHITE CLAY\n(3D sculpt proof)", "Unpainted AO clay only\nNeck under middle + overhang", [f"noon-white_apose-{v}.png" for v in views_14]),
        ("PASS 6 PROTO\n(unbaked reference)", f"{ps['tris']:,} tris\nDepth {hm['headDepthBrowM']}m\nCranium {hm['craniumWidthM']}m", [f"noon-proto_apose-{v}.png" for v in views_14]),
        ("PASS 6 ATLAS 512\n(FINAL 2 draws)", f"{s3['step3_512']['tris']:,} tris | 2 draws\n512 atlas (3.0 MB, 3 tex)\nOverhang {hm['occiputOverhangM']*100:.1f}cm", [f"noon-step3_512-{v}.png" for v in views_14]),
        ("JERRY TRIPO\n(target look only)", f"{st['tripo']['tris']:,} tris\nDepth {tr['headDepthBrowM']}m\nCranium {tr['craniumWidthM']}m", [f"noon-tripo-{v}.png" for v in views_14]),
    ]
    make_grid_sheet(
        f"AG-357 STEP 4b PASS 6 - HEAD CLOSE-UPS (PASS 5 VS PASS 6 VS TRIPO) ({backend})",
        f"Pass 6: deeper/taller cranium ({hm['headDepthBrowM']}m D, {hm['craniumWidthM']}m W), neck under middle ({hm['neckCenterPctFromBack']}%), occiput overhang {hm['occiputOverhangM']*100:.1f}cm",
        cols_14,
        rows_14,
        "14-shambler-step4b-head-closeups.jpg",
        tile_w=280,
        tile_h=350,
        footer_lines=[f"Metrics: {hm_line}"],
    )

    cols_13 = ["FRONT", "3/4 ANGLE", "SIDE", "BACK", "HEAD FRONT", "HEAD 3/4", "HEAD SIDE", "HEAD BACK"]
    views_13 = ["front", "3q", "side", "back", "head_front", "head_3q", "head_side", "head_back"]
    rows_13 = [
        ("OURS NOW\n(baseline GLB)", f"{st['ours']['tris']:,} tris\n{st['ours']['meshes']} mesh, {st['ours']['materials']} mat\nVertex colors", [f"noon-ours-{v}.png" for v in views_13]),
        ("PASS 6 PROTO\n(shamble pose)", f"{ps['tris']:,} tris, {ps['meshCount']} meshes\nSame scale as A-pose\nDeep skull + overhang", [f"noon-proto_shamble-{v}.png" for v in views_13]),
        ("PASS 6 PROTO\n(A-pose ref)", f"{ps['tris']:,} tris, {ps['materials']} mats\ngape {hm['mouthGapeM']} m\ncranium/neck {hm.get('craniumToNeckRatio')}x", [f"noon-proto_apose-{v}.png" for v in views_13]),
        ("PASS 6 ATLAS 1K\n(FINAL 2 draws)", f"{s3['step3_1k']['tris']:,} tris | 2 draws\n1K atlas ({s3['step3_1k']['texBytes']/1048576:.1f} MB, 3 tex)\nMerged Skinned + eyes", [f"noon-step3_1k-{v}.png" for v in views_13]),
        ("PASS 6 ATLAS 512\n(FINAL 2 draws)", f"{s3['step3_512']['tris']:,} tris | 2 draws\n512 atlas ({s3['step3_512']['texBytes']/1048576:.1f} MB, 3 tex)\nMerged Skinned + eyes", [f"noon-step3_512-{v}.png" for v in views_13]),
        ("JERRY TRIPO\n(target look only)", f"{st['tripo']['tris']:,} tris\nDepth {tr['headDepthBrowM']}m\nCranium {tr['craniumWidthM']}m", [f"noon-tripo-{v}.png" for v in views_13]),
    ]
    make_grid_sheet(
        f"AG-357 STEP 4b PASS 6 - NOON COMPARE + HEAD ROW ({backend})",
        f"Bigger cranium ({hm['headDepthBrowM']}m D, {hm['craniumWidthM']}m W) + neck-middle join + {hm['occiputOverhangM']*100:.1f}cm occiput overhang, thin {hm['neckLengthChinToCollar']*100:.1f}cm neck",
        cols_13,
        rows_13,
        "13-shambler-step4b-noon-compare.jpg",
        tile_w=230,
        tile_h=288,
        footer_lines=[f"Metrics (A-pose proto): {hm_line} | Errors: {len(report.get('errors', []))}"],
    )

    cols_16 = ["NECK-TO-TORSO FRONT\n(clavicles / sternum / SCM)", "NECK-TO-TORSO BACK\n(nuchal cords / overhang)", "NECK-TO-FACE\n(wide jaw / throat / tendrils)", "FACE-TO-SCALP\n(flush hair / V-nape / no ledge)"]
    seam_views = ["seam_neck_torso_front", "seam_neck_torso_back", "seam_neck_face", "seam_face_scalp"]
    rows_16 = [
        ("PASS 5 (previous)\n(small skull)", "Pass 5 smaller skull\nSmall occiput overhang", [PASS5_FRAMES / f"noon-step3_512-{v}.png" if (PASS5_FRAMES / f"noon-step3_512-{v}.png").exists() else None for v in seam_views]),
        ("PASS 6 PROTO\n(unbaked reference)", f"{ps['tris']:,} tris\nFlush trapezius + deep\nocciput overhang", [f"noon-proto_apose-{v}.png" for v in seam_views]),
        ("PASS 6 ATLAS 512\n(FINAL 2 draws)", f"{s3['step3_512']['tris']:,} tris | 2 draws\nPacked ORM + normal boost\nZero seam notch", [f"noon-step3_512-{v}.png" for v in seam_views]),
        ("JERRY TRIPO\n(look reference)", f"{st['tripo']['tris']:,} tris\nMatched lighting & FOV\nTarget seams & overhang", [f"noon-tripo-{v}.png" for v in seam_views]),
    ]
    make_grid_sheet(
        f"AG-357 STEP 4b PASS 6 - CLOSE-UP NOON SEAM & OVERHANG VERIFICATION ({backend})",
        "Inspecting all 4 D-209 transitions + Pass 6 neck-to-skull middle join & occiput overhang",
        cols_16,
        rows_16,
        "16-shambler-step4b-seam-closeups.jpg",
        tile_w=340,
        tile_h=425,
        footer_lines=[f"All closeups rendered on {backend} at Noon | {hm_line}"],
    )


if __name__ == "__main__":
    main()
