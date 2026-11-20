# qa/2026-11-18-AG-371/build_night_sheet.py
# Builds review/AG-357/19-shambler-final-night.jpg comparing Pass 6 Shambler vs Jerry Tripo
# under exact game night settings (moonlight-only and player flashlight SpotLight).
import json
import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
QA = Path(__file__).resolve().parent
FRAMES = QA / "frames-night"
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
F_TINY = load_font(10, bold=False)


def main():
    report = json.loads((QA / "night-report.json").read_text(encoding="utf-8"))
    backend = report.get("backend", "WebGPU")
    s3 = report["step3Stats"]["step3_512"]
    s3_sh = report["step3Stats"]["step3_512_shamble"]
    tr = report["stats"]["tripo"]
    frames_meta = report["frames"]

    cols = [
        "FRONT\n(Full Body)",
        "3/4 ANGLE\n(Full Body)",
        "SIDE\n(Full Body)",
        "BACK\n(Full Body)",
        "HEAD 3/4\n(Close-up)",
        "HEAD SIDE\n(Profile)",
    ]
    views = ["front", "3q", "side", "back", "head_3q", "head_side"]

    fl_full = frames_meta.get("game_night_flash-step3_512-front", {}).get("flashlight", {})
    fl_head = frames_meta.get("game_night_flash-step3_512-head_3q", {}).get("flashlight", {})

    rows = [
        (
            "GAME NIGHT · NO FLASHLIGHT\nPass 6 Atlas 512 (Shamble)",
            f"{s3_sh['tris']:,} tris | 2 draws\nNoToneMapping, sun=0.025\nhemi=0.15, amb=0.06, moon=0.40",
            "game_night",
            "step3_512_shamble",
        ),
        (
            "GAME NIGHT · NO FLASHLIGHT\nPass 6 Atlas 512 (A-pose)",
            f"{s3['tris']:,} tris | 2 draws\nMoon (-12,20,-8) @ 0.40\nFog (0x020508, 18, 65)",
            "game_night",
            "step3_512",
        ),
        (
            "GAME NIGHT · NO FLASHLIGHT\nJerry Tripo (Target Ref)",
            f"{tr['tris']:,} tris | 1 mesh\nIdentical game night lights\nNoToneMapping, moon=0.40",
            "game_night",
            "tripo",
        ),
        (
            "GAME NIGHT + FLASHLIGHT\nPass 6 Atlas 512 (Shamble)",
            f"Spot 0xfff2d0, angle=0.42\npenumbra=0.74, decay=1.1\nFull I={fl_full.get('intensity','?')} @ {fl_full.get('dist','?')}m",
            "game_night_flash",
            "step3_512_shamble",
        ),
        (
            "GAME NIGHT + FLASHLIGHT\nPass 6 Atlas 512 (A-pose)",
            f"AG-289 cap: min(42, 2.35*d^1.1)\nHead I={fl_head.get('intensity','?')} @ {fl_head.get('dist','?')}m\n512 ORM + Normal Map",
            "game_night_flash",
            "step3_512",
        ),
        (
            "GAME NIGHT + FLASHLIGHT\nJerry Tripo (Target Ref)",
            f"{tr['tris']:,} tris | 1 mesh\nIdentical game night + cone\nDirect roughness/value ref",
            "game_night_flash",
            "tripo",
        ),
    ]

    pad = 14
    hdr_h = 80
    col_hdr_h = 46
    row_lbl_w = 258
    tile_w, tile_h = 270, 320
    footer_lines = [
        f"Exact index.html deep-night settings (NoToneMapping, exp=1.0, sun=0.025, hemi=0.15, ambFill=0x223344@0.06, moon=0x8899cc@0.40 @ [-12,20,-8], fog 18..65).",
        f"Player flashlight: SpotLight(0xfff2d0, min(42, 2.35*d^1.1), 26, 0.42, 0.74, 1.1) | Captured on {backend} | Errors: {len(report.get('errors', []))}",
    ]
    footer_h = 24 + len(footer_lines) * 20

    W = pad * 2 + row_lbl_w + len(cols) * tile_w + (len(cols) - 1) * 8
    H = pad * 2 + hdr_h + col_hdr_h + len(rows) * tile_h + (len(rows) - 1) * 8 + footer_h
    canvas = Image.new("RGB", (W, H), (14, 17, 22))
    draw = ImageDraw.Draw(canvas)

    draw.text((pad, pad), f"AG-357 FINAL SHAMBLER (PASS 6) - REAL GAME NIGHT & FLASHLIGHT ({backend})", fill=(242, 246, 250), font=F_TITLE)
    draw.text((pad, pad + 34), "index.html exact night ambient/moon/fog + SpotLight flashlight cone | Moonlight silhouette & gameplay illumination vs Tripo", fill=(176, 190, 204), font=F_SUB)

    y0 = pad + hdr_h
    for ci, cl in enumerate(cols):
        x = pad + row_lbl_w + ci * (tile_w + 8)
        draw.rectangle([x, y0, x + tile_w, y0 + col_hdr_h - 4], fill=(28, 34, 42))
        for li, cline in enumerate(cl.split("\n")):
            f = F_HDR if li == 0 else F_SMALL
            c = (224, 232, 240) if li == 0 else (164, 184, 204)
            draw.text((x + 10, y0 + 5 + li * 19), cline, fill=c, font=f)

    y = y0 + col_hdr_h
    for r_label, r_sub, light, subj in rows:
        is_flash = light == "game_night_flash"
        lbl_bg = (30, 34, 42) if is_flash else (22, 26, 33)
        draw.rectangle([pad, y, pad + row_lbl_w - 8, y + tile_h], fill=lbl_bg)
        lbl_lines = r_label.split("\n")
        for li, lline in enumerate(lbl_lines):
            col = (255, 226, 166) if (li == 0 and is_flash) else (150, 190, 255) if li == 0 else (238, 242, 248)
            draw.text((pad + 10, y + 14 + li * 21), lline, fill=col, font=F_HDR)
        sub_y = y + 20 + len(lbl_lines) * 21 + 8
        for li, sline in enumerate(r_sub.split("\n")):
            draw.text((pad + 10, sub_y + li * 18), sline, fill=(166, 182, 198), font=F_SMALL)

        for ci, v in enumerate(views):
            x = pad + row_lbl_w + ci * (tile_w + 8)
            key = f"{light}-{subj}-{v}"
            fpath = FRAMES / f"{key}.png"
            if fpath.exists():
                tile = Image.open(fpath).convert("RGB").resize((tile_w, tile_h), Image.Resampling.LANCZOS)
                canvas.paste(tile, (x, y))
                if is_flash:
                    fl = frames_meta.get(key, {}).get("flashlight", {})
                    if fl:
                        draw.rectangle([x + 4, y + tile_h - 20, x + 118, y + tile_h - 4], fill=(10, 14, 18))
                        draw.text((x + 8, y + tile_h - 17), f"fl d={fl.get('dist')}m I={fl.get('intensity')}", fill=(255, 232, 175), font=F_TINY)
        y += tile_h + 8

    for fi, fline in enumerate(footer_lines):
        draw.text((pad, y + 6 + fi * 20), fline, fill=(170, 190, 210), font=F_SMALL)

    out_path = OUT / "19-shambler-final-night.jpg"
    tmp_path = OUT / ".19-shambler-final-night.tmp.jpg"
    canvas.save(tmp_path, format="JPEG", quality=93)
    os.replace(tmp_path, out_path)
    print(f"Wrote {out_path}")


if __name__ == "__main__":
    main()
