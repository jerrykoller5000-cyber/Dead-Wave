# qa/2026-11-18-AG-363/build_step4_sheets.py
# Generates AG-357 Step 4 (D-209 Final Shambler) comparison sheets in review/AG-357/:
#   10-shambler-step4-noon-compare.jpg
#   11-shambler-step4-seam-closeups.jpg
#   12-shambler-step4-night-check.jpg
import json
import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
QA = Path(__file__).resolve().parent
FRAMES = QA / "frames-step4"
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


F_TITLE = load_font(25, bold=True)
F_SUB = load_font(15, bold=False)
F_HDR = load_font(16, bold=True)
F_SMALL = load_font(13, bold=False)


def fit_tile(path, w, h):
    im = Image.open(path).convert("RGB")
    return im.resize((w, h), Image.Resampling.LANCZOS)


def make_grid_sheet(title, subtitle, col_labels, row_specs, out_name, tile_w=240, tile_h=300, footer_lines=()):
    pad = 14
    hdr_h = 80
    col_hdr_h = 46
    row_lbl_w = 228
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
            if cell is None:
                draw.rectangle([x, y, x + tile_w, y + tile_h], fill=(28, 32, 38))
                draw.text((x + 16, y + tile_h // 2), "N/A", fill=(120, 130, 140), font=F_HDR)
                continue
            fname, tag = cell if isinstance(cell, tuple) else (cell, None)
            fpath = FRAMES / fname
            if fpath.exists():
                tile = fit_tile(fpath, tile_w, tile_h)
                canvas.paste(tile, (x, y))
            else:
                draw.rectangle([x, y, x + tile_w, y + tile_h], fill=(45, 22, 22))
                draw.text((x + 12, y + 12), f"Missing: {fname}", fill=(255, 160, 160), font=F_SMALL)
            if tag:
                draw.rectangle([x + 6, y + tile_h - 24, x + tile_w - 6, y + tile_h - 6], fill=(12, 16, 22))
                draw.text((x + 10, y + tile_h - 22), tag, fill=(212, 226, 240), font=F_SMALL)
        y += tile_h + 8

    for fi, fline in enumerate(footer_lines):
        draw.text((pad, y + 6 + fi * 20), fline, fill=(176, 196, 214), font=F_SMALL)

    out_path = OUT / out_name
    canvas.save(out_path, quality=93)
    print(f"Wrote {out_path}")


def main():
    report = json.loads((QA / "step4-report.json").read_text(encoding="utf-8"))
    st = report["stats"]
    ps = report["protoStats"]
    s3 = report["step3Stats"]
    hm = report["headMetrics"]
    backend = report.get("backend", "WebGPU")

    hm_line = (
        f"crown={hm['crownY']}m | chin={hm['chinY']}m | collar={hm['collarY']}m | "
        f"chin-to-collar={hm['neckLengthChinToCollar']}m | gape={hm['mouthGapeM']}m"
    )

    # Sheet 10: Noon compare sheet (ours / proto / Step 4 atlas / Tripo + full head row!)
    cols_10 = [
        "FRONT",
        "3/4 ANGLE",
        "SIDE",
        "BACK",
        "HEAD FRONT",
        "HEAD 3/4",
        "HEAD SIDE",
        "HEAD BACK",
    ]
    views_10 = ["front", "3q", "side", "back", "head_front", "head_3q", "head_side", "head_back"]
    rows_10 = [
        (
            "OURS NOW\n(baseline GLB)",
            f"{st['ours']['tris']:,} tris\n{st['ours']['meshes']} mesh, {st['ours']['materials']} mat\nVertex colors",
            [f"noon-ours-{v}.png" for v in views_10],
        ),
        (
            "STEP 4 PROTO\n(shamble pose)",
            f"{ps['tris']:,} tris, {ps['meshCount']} meshes\n{ps['texCount']} tex ({ps['texBytes']/1048576:.1f} MB)\nShorter neck + hair cards",
            [f"noon-proto_shamble-{v}.png" for v in views_10],
        ),
        (
            "STEP 4 PROTO\n(A-pose ref)",
            f"{ps['tris']:,} tris, {ps['materials']} mats\nchin->collar {hm['neckLengthChinToCollar']} m\nNarrower cheeks + hair",
            [f"noon-proto_apose-{v}.png" for v in views_10],
        ),
        (
            "STEP 4 ATLAS 1K\n(FINAL 2 draws)",
            f"{s3['step3_1k']['tris']:,} tris | 2 draws\n1K atlas ({s3['step3_1k']['texBytes']/1048576:.1f} MB, 3 tex)\nMerged Skinned + eyes",
            [f"noon-step3_1k-{v}.png" for v in views_10],
        ),
        (
            "STEP 4 ATLAS 512\n(FINAL 2 draws)",
            f"{s3['step3_512']['tris']:,} tris | 2 draws\n512 atlas ({s3['step3_512']['texBytes']/1048576:.1f} MB, 3 tex)\nMerged Skinned + eyes",
            [f"noon-step3_512-{v}.png" for v in views_10],
        ),
        (
            "JERRY TRIPO\n(target look only)",
            f"{st['tripo']['tris']:,} tris\n{st['tripo']['meshes']} mesh\nCF-15: 0.122m neck",
            [f"noon-tripo-{v}.png" for v in views_10],
        ),
    ]
    make_grid_sheet(
        f"AG-357 STEP 4 (D-209 FINAL SHAMBLER) - NOON COMPARE + HEAD ROW ({backend})",
        f"Shorter neck ({hm['neckLengthChinToCollar']}m chin->collar), narrower cheeks, patchy dark hair + alpha cards, blended seams | Step 4 atlas delta vs Step 3 (43,472 tris): +{s3['step3_512']['tris'] - 43472:,} tris, STILL 2 draws / 3 tex",
        cols_10,
        rows_10,
        "10-shambler-step4-noon-compare.jpg",
        tile_w=230,
        tile_h=288,
        footer_lines=[f"Metrics (A-pose proto): {hm_line} | Errors: {len(report.get('errors', []))}"],
    )

    # Sheet 11: Close-up NOON seam verification sheet
    cols_11 = [
        "NECK-TO-TORSO FRONT\n(sternum / clavicles / SCM)",
        "NECK-TO-TORSO BACK\n(trapezius / collar / nape)",
        "NECK-TO-FACE\n(jaw / under-chin / throat)",
        "FACE-TO-SCALP\n(hairline / bald spots / cards)",
    ]
    seam_views = ["seam_neck_torso_front", "seam_neck_torso_back", "seam_neck_face", "seam_face_scalp"]
    rows_11 = [
        (
            "STEP 4 PROTO\n(unbaked reference)",
            f"{ps['tris']:,} tris\nShared skin base + 3D\nworld-space zone wash",
            [f"noon-proto_apose-{v}.png" for v in seam_views],
        ),
        (
            "STEP 4 ATLAS 1K\n(2 draws, 12 MB)",
            f"{s3['step3_1k']['tris']:,} tris | 2 draws\nPadded atlas gutters +\nalpha hair cards",
            [f"noon-step3_1k-{v}.png" for v in seam_views],
        ),
        (
            "STEP 4 ATLAS 512\n(2 draws, 3 MB)",
            f"{s3['step3_512']['tris']:,} tris | 2 draws\nPacked ORM + alpha hair\nProduction shambler mesh",
            [f"noon-step3_512-{v}.png" for v in seam_views],
        ),
        (
            "JERRY TRIPO\n(look reference)",
            f"{st['tripo']['tris']:,} tris\nMatched lighting & FOV\nTarget head/neck/hair",
            [f"noon-tripo-{v}.png" for v in seam_views],
        ),
    ]
    make_grid_sheet(
        f"AG-357 STEP 4 - CLOSE-UP NOON SEAM VERIFICATION ({backend})",
        "Inspecting all 4 D-209 transitions: neck-to-torso front, neck-to-torso back, neck-to-face, face-to-scalp",
        cols_11,
        rows_11,
        "11-shambler-step4-seam-closeups.jpg",
        tile_w=340,
        tile_h=425,
        footer_lines=[f"All closeups rendered on {backend} at Noon directional+sky IBL | {hm_line}"],
    )

    # Sheet 12: Quick NIGHT check (shamble + glowing eyes + silhouettes + cost check)
    cols_12 = ["FRONT (Night)", "3/4 ANGLE (Night)", "BACK (Night)", "HEAD 3/4 (Night)"]
    n_views = ["front", "3q", "back", "head_3q"]
    rows_12 = [
        (
            "OURS NOW\n(baseline GLB)",
            f"{st['ours']['tris']:,} tris\nNo glowing eyes",
            [f"night-ours-{v}.png" for v in n_views],
        ),
        (
            "STEP 4 PROTO\n(shamble pose)",
            f"{ps['tris']:,} tris\nGlowing eye sockets\nAlpha hair breakup",
            [f"night-proto_shamble-{v}.png" for v in n_views],
        ),
        (
            "STEP 4 ATLAS 1K\n(2 draws, 12 MB)",
            f"{s3['step3_1k']['tris']:,} tris | 2 draws\n1K atlas, A-pose",
            [f"night-step3_1k-{v}.png" for v in n_views],
        ),
        (
            "STEP 4 ATLAS 512\n(2 draws, 3 MB)",
            f"{s3['step3_512']['tris']:,} tris | 2 draws\nStep 3 was 43,472 tris\nDelta: +{s3['step3_512']['tris'] - 43472:,} tris (+{100*(s3['step3_512']['tris'] - 43472)/43472:.2f}%)",
            [f"night-step3_512-{v}.png" for v in n_views],
        ),
        (
            "JERRY TRIPO\n(reference)",
            f"{st['tripo']['tris']:,} tris\nMoonlit silhouette",
            [f"night-tripo-{v}.png" for v in n_views],
        ),
    ]
    make_grid_sheet(
        f"AG-357 STEP 4 - NIGHT MOONLIGHT + EYES + SILHOUETTE CHECK ({backend})",
        f"Step 4 draw/VRAM cost unchanged (2 draws, 3 textures, 3.00 MB @ 512); +({s3['step3_512']['tris'] - 43472}) hair-card tris vs Step 3 (43,472)",
        cols_12,
        rows_12,
        "12-shambler-step4-night-check.jpg",
        tile_w=320,
        tile_h=400,
        footer_lines=[
            f"Per-shambler Step 4 LOD0={s3['step3_512']['tris']:,} tris, LOD1={s3['step3_lod1']['tris']:,} tris | 2 draws (SkinnedMesh + eyes) | 3 textures (3.00 MB @ 512)",
        ],
    )


if __name__ == "__main__":
    main()
