# qa/2026-11-18-AG-367/build_step4b_sheets.py
# Generates AG-357 Step 4b Pass 3 (Claude 5 CE-14 FIX + D-209/D-210 priorities) comparison sheets in review/AG-357/:
#   13-shambler-step4b-noon-compare.jpg
#   14-shambler-step4b-head-closeups.jpg
#   15-shambler-step4b-tank-compare.jpg
#   16-shambler-step4b-seam-closeups.jpg
#   17-shambler-step4b-night-check.jpg
import json
import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
QA = Path(__file__).resolve().parent
FRAMES = QA / "frames-step4b"
PREV_FRAMES = ROOT / "qa" / "2026-11-18-AG-363" / "frames-step4"
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
    row_lbl_w = 236
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
            if isinstance(cell, tuple):
                fpath, tag = cell
            else:
                fpath, tag = cell, None
            fpath = Path(fpath) if os.path.isabs(str(fpath)) else FRAMES / fpath
            if fpath.exists():
                tile = fit_tile(fpath, tile_w, tile_h)
                canvas.paste(tile, (x, y))
            else:
                draw.rectangle([x, y, x + tile_w, y + tile_h], fill=(45, 22, 22))
                draw.text((x + 12, y + 12), f"Missing: {fpath.name}", fill=(255, 160, 160), font=F_SMALL)
            if tag:
                draw.rectangle([x + 6, y + tile_h - 24, x + tile_w - 6, y + tile_h - 6], fill=(12, 16, 22))
                draw.text((x + 10, y + tile_h - 22), tag, fill=(212, 226, 240), font=F_SMALL)
        y += tile_h + 8

    for fi, fline in enumerate(footer_lines):
        draw.text((pad, y + 6 + fi * 20), fline, fill=(176, 196, 214), font=F_SMALL)

    out_path = OUT / out_name
    tmp_path = OUT / f".{out_name}.tmp.jpg"
    canvas.save(tmp_path, format="JPEG", quality=93)
    os.replace(tmp_path, out_path)
    print(f"Wrote {out_path}")


def main():
    report = json.loads((QA / "step4b-report.json").read_text(encoding="utf-8"))
    st = report["stats"]
    ps = report["protoStats"]
    s3 = report["step3Stats"]
    hm = report["headMetrics"]
    backend = report.get("backend", "WebGPU")

    hm_line = (
        f"crown={hm['crownY']}m | chin={hm['chinY']}m | collar={hm['collarY']}m | "
        f"chin-to-collar={hm['neckLengthChinToCollar']}m | gape={hm['mouthGapeM']}m | "
        f"craniumW={hm.get('craniumWidthM')}m / neckTopW={hm.get('neckTopWidthM')}m ({hm.get('craniumToNeckRatio')}x) | jawW={hm.get('jawGonionWidthM')}m"
    )

    # Sheet 13: Noon full compare + head row
    cols_13 = ["FRONT", "3/4 ANGLE", "SIDE", "BACK", "HEAD FRONT", "HEAD 3/4", "HEAD SIDE", "HEAD BACK"]
    views_13 = ["front", "3q", "side", "back", "head_front", "head_3q", "head_side", "head_back"]
    rows_13 = [
        (
            "OURS NOW\n(baseline GLB)",
            f"{st['ours']['tris']:,} tris\n{st['ours']['meshes']} mesh, {st['ours']['materials']} mat\nVertex colors",
            [f"noon-ours-{v}.png" for v in views_13],
        ),
        (
            "STEP 4b PROTO\n(shamble pose)",
            f"{ps['tris']:,} tris, {ps['meshCount']} meshes\n{ps['texCount']} tex ({ps['texBytes']/1048576:.1f} MB)\nRound skull + wide scream",
            [f"noon-proto_shamble-{v}.png" for v in views_13],
        ),
        (
            "STEP 4b PROTO\n(A-pose ref)",
            f"{ps['tris']:,} tris, {ps['materials']} mats\ngape {hm['mouthGapeM']} m\ncranium/neck {hm.get('craniumToNeckRatio')}x",
            [f"noon-proto_apose-{v}.png" for v in views_13],
        ),
        (
            "STEP 4b ATLAS 1K\n(FINAL 2 draws)",
            f"{s3['step3_1k']['tris']:,} tris | 2 draws\n1K atlas ({s3['step3_1k']['texBytes']/1048576:.1f} MB, 3 tex)\nMerged Skinned + eyes",
            [f"noon-step3_1k-{v}.png" for v in views_13],
        ),
        (
            "STEP 4b ATLAS 512\n(FINAL 2 draws)",
            f"{s3['step3_512']['tris']:,} tris | 2 draws\n512 atlas ({s3['step3_512']['texBytes']/1048576:.1f} MB, 3 tex)\nMerged Skinned + eyes",
            [f"noon-step3_512-{v}.png" for v in views_13],
        ),
        (
            "JERRY TRIPO\n(target look only)",
            f"{st['tripo']['tris']:,} tris\n{st['tripo']['meshes']} mesh\nCF-15: 0.122m neck",
            [f"noon-tripo-{v}.png" for v in views_13],
        ),
    ]
    make_grid_sheet(
        f"AG-357 STEP 4b (D-209 / JERRY PRIORITIES) - NOON COMPARE + HEAD ROW ({backend})",
        f"Round skull base ({hm.get('craniumToNeckRatio')}x neck), wide U-jaw + tall scream ({hm['mouthGapeM']}m), big upper/lower teeth, sculpted forms, flush patchy hair, U-scoop tank",
        cols_13,
        rows_13,
        "13-shambler-step4b-noon-compare.jpg",
        tile_w=230,
        tile_h=288,
        footer_lines=[f"Metrics (A-pose proto): {hm_line} | Errors: {len(report.get('errors', []))}"],
    )

    # Sheet 14: High-Res Head Close-ups (Jerry's 3q + Back-of-head + Side + 3q back + Front + Step 4 before/after + White clay sculpt proof!)
    cols_14 = [
        "HEAD 3/4\n(Jerry 3q face check)",
        "HEAD BACK\n(skull base vs neck + hair)",
        "HEAD 3/4 BACK\n(occiput overhang + nape)",
        "HEAD SIDE\n(profile + jaw + brow)",
        "HEAD FRONT\n(wide U-jaw + teeth + SCM)",
    ]
    views_14 = ["head_3q", "head_back", "head_3q_back", "head_side", "head_front"]
    rows_14 = [
        (
            "STEP 4 (previous)\n(before 4b)",
            "43,616 tris (AG-363)\nPinched skull base\nPuppet mouth + helmet hair",
            [
                PREV_FRAMES / "noon-step3_512-head_3q.png" if (PREV_FRAMES / "noon-step3_512-head_3q.png").exists() else None,
                PREV_FRAMES / "noon-step3_512-head_back.png" if (PREV_FRAMES / "noon-step3_512-head_back.png").exists() else None,
                PREV_FRAMES / "noon-step3_512-seam_neck_torso_back.png" if (PREV_FRAMES / "noon-step3_512-seam_neck_torso_back.png").exists() else None,
                PREV_FRAMES / "noon-step3_512-head_side.png" if (PREV_FRAMES / "noon-step3_512-head_side.png").exists() else None,
                PREV_FRAMES / "noon-step3_512-head_front.png" if (PREV_FRAMES / "noon-step3_512-head_front.png").exists() else None,
            ],
        ),
        (
            "STEP 4b WHITE CLAY\n(3D sculpt proof)",
            "Unpainted AO clay only\nProves sculpted brow, orbit,\nnose hole, cheek & tendons",
            [f"noon-white_apose-{v}.png" for v in views_14],
        ),
        (
            "STEP 4b PROTO\n(unbaked reference)",
            f"{ps['tris']:,} tris\ngape {hm['mouthGapeM']}m\njawW {hm.get('jawGonionWidthM')}m",
            [f"noon-proto_apose-{v}.png" for v in views_14],
        ),
        (
            "STEP 4b ATLAS 512\n(FINAL 2 draws)",
            f"{s3['step3_512']['tris']:,} tris | 2 draws\n512 atlas (3.0 MB, 3 tex)\nFlush patchy hair variant",
            [f"noon-step3_512-{v}.png" for v in views_14],
        ),
        (
            "JERRY TRIPO\n(target look only)",
            f"{st['tripo']['tris']:,} tris\nRound skull ~1.8x neck\nTall scream + big teeth",
            [f"noon-tripo-{v}.png" for v in views_14],
        ),
    ]
    make_grid_sheet(
        f"AG-357 STEP 4b - HEAD CLOSE-UPS (3Q FACE, BACK-OF-SKULL, HAIR & SCULPT PROOF) ({backend})",
        "Comparing Step 4 (before) -> Step 4b White Sculpt -> Step 4b Proto & 512 Atlas -> Jerry Tripo",
        cols_14,
        rows_14,
        "14-shambler-step4b-head-closeups.jpg",
        tile_w=280,
        tile_h=350,
        footer_lines=[f"Metrics: {hm_line}"],
    )

    # Sheet 15: Tank Top Shape Compare (Front / 3Q / Side / Back vs Tripo)
    cols_15 = [
        "TANK FRONT\n(deep U-scoop + rim + hem)",
        "TANK 3/4\n(loose drape + ribs + hole)",
        "TANK SIDE\n(deep armhole + ribcage)",
        "TANK BACK\n(U-scoop back + 3.7cm straps)",
    ]
    views_15 = ["torso_front", "torso_3q", "torso_side", "torso_back"]
    rows_15 = [
        (
            "STEP 4b WHITE CLAY\n(garment shape proof)",
            "Rolled binding rim\n3.7cm traps straps\nLoose chest/back drape",
            [f"noon-white_apose-{v}.png" for v in views_15],
        ),
        (
            "STEP 4b PROTO\n(unbaked reference)",
            f"{ps['tris']:,} tris\nFront/back U-scoop\nDeep armholes + torn holes",
            [f"noon-proto_apose-{v}.png" for v in views_15],
        ),
        (
            "STEP 4b ATLAS 512\n(FINAL 2 draws)",
            f"{s3['step3_512']['tris']:,} tris | 2 draws\nRagged hem over belt\nWeave + alpha holes",
            [f"noon-step3_512-{v}.png" for v in views_15],
        ),
        (
            "JERRY TRIPO\n(target look only)",
            f"{st['tripo']['tris']:,} tris\nTarget tank U-scoop,\nstraps & drape",
            [f"noon-tripo-{v}.png" for v in views_15],
        ),
    ]
    make_grid_sheet(
        f"AG-357 STEP 4b ADD - TANK TOP SHAPE COMPARISON ({backend})",
        "U-scoop front & back with rolled binding rim, ~3.7 cm straps on traps, deep rib-exposing armholes, loose drape + ragged hem over belt",
        cols_15,
        rows_15,
        "15-shambler-step4b-tank-compare.jpg",
        tile_w=340,
        tile_h=425,
        footer_lines=[f"Noon directional + sky IBL | Errors: {len(report.get('errors', []))}"],
    )

    # Sheet 16: Close-up Noon Seam Verification (Neck back + Neck front + Neck-to-face + Face-to-scalp)
    cols_16 = [
        "NECK-TO-TORSO FRONT\n(clavicles / sternum / SCM)",
        "NECK-TO-TORSO BACK\n(nuchal cords / mottled skin)",
        "NECK-TO-FACE\n(wide jaw / throat / tendrils)",
        "FACE-TO-SCALP\n(flush hair / V-nape / no ledge)",
    ]
    seam_views = ["seam_neck_torso_front", "seam_neck_torso_back", "seam_neck_face", "seam_face_scalp"]
    rows_16 = [
        (
            "STEP 4 (previous)\n(before 4b)",
            "Previous nape helmet edge\n& neck-back step fold",
            [PREV_FRAMES / f"noon-step3_512-{v}.png" if (PREV_FRAMES / f"noon-step3_512-{v}.png").exists() else None for v in seam_views],
        ),
        (
            "STEP 4b PROTO\n(unbaked reference)",
            f"{ps['tris']:,} tris\nFlush trapezius wrap +\nshared corpse mottling",
            [f"noon-proto_apose-{v}.png" for v in seam_views],
        ),
        (
            "STEP 4b ATLAS 512\n(FINAL 2 draws)",
            f"{s3['step3_512']['tris']:,} tris | 2 draws\nPacked ORM + normal boost\nZero seam step",
            [f"noon-step3_512-{v}.png" for v in seam_views],
        ),
        (
            "JERRY TRIPO\n(look reference)",
            f"{st['tripo']['tris']:,} tris\nMatched lighting & FOV\nTarget seams & skin",
            [f"noon-tripo-{v}.png" for v in seam_views],
        ),
    ]
    make_grid_sheet(
        f"AG-357 STEP 4b - CLOSE-UP NOON SEAM & BACK-OF-HEAD VERIFICATION ({backend})",
        "Inspecting all 4 D-209 transitions + mottled back neck / trapezius + flush V-tapered patchy hair",
        cols_16,
        rows_16,
        "16-shambler-step4b-seam-closeups.jpg",
        tile_w=340,
        tile_h=425,
        footer_lines=[f"All closeups rendered on {backend} at Noon | {hm_line}"],
    )

    # Sheet 17: Quick NIGHT check
    cols_17 = ["FRONT (Night)", "3/4 ANGLE (Night)", "BACK (Night)", "HEAD 3/4 (Night)"]
    n_views = ["front", "3q", "back", "head_3q"]
    rows_17 = [
        ("OURS NOW\n(baseline GLB)", f"{st['ours']['tris']:,} tris\nNo glowing eyes", [f"night-ours-{v}.png" for v in n_views]),
        ("STEP 4b PROTO\n(shamble pose)", f"{ps['tris']:,} tris\nDeep glowing sockets", [f"night-proto_shamble-{v}.png" for v in n_views]),
        ("STEP 4b ATLAS 1K\n(2 draws, 12 MB)", f"{s3['step3_1k']['tris']:,} tris | 2 draws\n1K atlas, A-pose", [f"night-step3_1k-{v}.png" for v in n_views]),
        ("STEP 4b ATLAS 512\n(2 draws, 3 MB)", f"{s3['step3_512']['tris']:,} tris | 2 draws\n512 atlas, 3 tex", [f"night-step3_512-{v}.png" for v in n_views]),
        ("JERRY TRIPO\n(reference)", f"{st['tripo']['tris']:,} tris\nMoonlit silhouette", [f"night-tripo-{v}.png" for v in n_views]),
    ]
    make_grid_sheet(
        f"AG-357 STEP 4b - NIGHT MOONLIGHT + EYES + SILHOUETTE CHECK ({backend})",
        "Deep socketed glowing eyes + skull/jaw silhouette under night lighting; 2 draws / 3 textures / 3.00 MB @ 512",
        cols_17,
        rows_17,
        "17-shambler-step4b-night-check.jpg",
        tile_w=320,
        tile_h=400,
        footer_lines=[
            f"Per-shambler Step 4b LOD0={s3['step3_512']['tris']:,} tris, LOD1={s3['step3_lod1']['tris']:,} tris | 2 draws (SkinnedMesh + eyes) | 3 textures (3.00 MB @ 512)",
        ],
    )


if __name__ == "__main__":
    main()
