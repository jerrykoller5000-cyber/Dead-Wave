"""Build CC-357 c v2 (AG-350) 5080 WebGPU BEFORE (ag-c2-live, 668e97a3) vs AFTER (ag-c2, 26c68820) pair sheets and 3x inspection crops."""
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path("C:/Users/Zero/Desktop/Tiny Trek")
LIVE_DIR = ROOT / "review/CC-357/ag-c2-live"
C_DIR = ROOT / "review/CC-357/ag-c2"
B_DIR = ROOT / "review/CC-357/ag-b"


def load_font(sz, bold=False):
    cands = (
        ["C:/Windows/Fonts/consolab.ttf", "C:/Windows/Fonts/arialbd.ttf", "C:/Windows/Fonts/segoeuib.ttf"]
        if bold
        else ["C:/Windows/Fonts/consola.ttf", "C:/Windows/Fonts/arial.ttf", "C:/Windows/Fonts/segoeui.ttf"]
    )
    for p in cands:
        if Path(p).exists():
            return ImageFont.truetype(p, sz)
    return ImageFont.load_default()


def md5_short(p):
    return hashlib.md5(Path(p).read_bytes()).hexdigest()[:8]


def img_stats(im):
    small = im.resize((160, 160), Image.Resampling.BILINEAR)
    px = list(small.get_flattened_data() if hasattr(small, "get_flattened_data") else small.getdata())
    n = len(px)
    return (
        round(sum(c[0] for c in px) / n, 1),
        round(sum(c[1] for c in px) / n, 1),
        round(sum(c[2] for c in px) / n, 1),
    )


def verify_dir(d):
    summary = json.loads((d / "summary.json").read_text(encoding="utf-8"))
    hashes = {}
    for pose_id, pdata in summary.get("poses", {}).items():
        gear = pdata.get("gear") or {}
        assert all(not v for v in gear.values()), f"Loadout not all gear off in {d.name}/{pose_id}: {gear}"
    for s in summary["shots"]:
        fp = d / Path(s["file"]).name
        h = md5_short(fp)
        hashes[fp.name] = h
        st = img_stats(Image.open(fp).convert("RGB"))
        print(f"  [{d.name}] {fp.name:34s} md5={h} meanRGB={st} fill={s.get('fillHeightPct')}%")
    uniq = len(set(hashes.values()))
    print(f"[{d.name}] verified {len(summary['shots'])} PNGs, unique MD5={uniq}, gear=all-off")
    assert uniq == len(summary["shots"]), f"Duplicate frames in {d}: {uniq}/{len(summary['shots'])}"
    return summary


def build_stand_pair_sheet():
    cell = 300
    pad = 12
    hdr = 60
    sec_h = 26
    lbl = 24
    views = [("front", "Front"), ("side", "Side (Left)"), ("back", "Back"), ("3q", "3/4 Front-Left"), ("fight3q", "Fight 4.5 m")]
    cols = len(views)
    sections = [
        ("unarmed", "noon", "UNARMED · NOON"),
        ("unarmed", "night", "UNARMED · NIGHT"),
        ("pistol", "noon", "PISTOL · NOON"),
        ("pistol", "night", "PISTOL · NIGHT"),
    ]
    W = pad + cols * (cell + pad)
    H = hdr + len(sections) * (sec_h + 2 * (cell + lbl + pad)) + pad
    canvas = Image.new("RGB", (W, H), (20, 22, 26))
    d = ImageDraw.Draw(canvas)
    f_hdr = load_font(18, bold=True)
    f_sub = load_font(12)
    f_sec = load_font(13, bold=True)
    f_lbl = load_font(11, bold=True)

    d.text((pad, 10), "BEFORE (LIVE 668e97a3) vs AFTER (CC-357 c v2 26c68820) — STANDING (5080 WebGPU)", fill=(244, 214, 118), font=f_hdr)
    d.text((pad, 34), "Top row per block: BEFORE (ag-c2-live, all gear off) | Bottom row: AFTER (ag-c2: c body 0d761307 + face + hats + bands + seated belt mags)", fill=(185, 200, 214), font=f_sub)

    y = hdr + 4
    for pose, light, title in sections:
        d.text((pad, y + 4), title, fill=(140, 200, 255), font=f_sec)
        y += sec_h
        for tag, base_dir, border_col in [("BEFORE (LIVE)", LIVE_DIR, (220, 120, 90)), ("AFTER (CC-357 c v2)", C_DIR, (90, 200, 130))]:
            for c, (vid, vlabel) in enumerate(views):
                p = base_dir / f"marine-{pose}-{light}-{vid}.png"
                im = Image.open(p).convert("RGB").resize((cell, cell), Image.Resampling.LANCZOS)
                x = pad + c * (cell + pad)
                canvas.paste(im, (x, y))
                d.rectangle([x - 1, y - 1, x + cell, y + cell + lbl], outline=border_col, width=2)
                d.rectangle([x, y + cell, x + cell, y + cell + lbl], fill=(32, 36, 42))
                d.text((x + 6, y + cell + 5), f"{tag} · {vlabel}", fill=(236, 240, 244), font=f_lbl)
            y += cell + lbl + pad

    out = C_DIR / "pair-sheet-stand.jpg"
    canvas.save(out, quality=92)
    return out


def build_aims_pair_sheet():
    cell = 310
    pad = 12
    hdr = 60
    sec_h = 26
    lbl = 24
    views = [("3q", "3/4 Front-Left"), ("side", "Side (His Left)"), ("sideR", "Side (His Right)"), ("front", "Front"), ("back", "Back"), ("fight3q", "Fight 4.5 m")]
    cols = len(views)
    W = pad + cols * (cell + pad)
    H = hdr + 2 * sec_h + 4 * (cell + lbl + pad) + pad
    canvas = Image.new("RGB", (W, H), (20, 22, 26))
    d = ImageDraw.Draw(canvas)
    f_hdr = load_font(18, bold=True)
    f_sub = load_font(12)
    f_sec = load_font(13, bold=True)
    f_lbl = load_font(11, bold=True)

    d.text((pad, 10), "AIMS BEFORE (LIVE 668e97a3) vs AFTER (CC-357 c v2) — Pistol & M4 Shouldered (5080 WebGPU, Noon)", fill=(244, 214, 118), font=f_hdr)
    d.text((pad, 34), "Top row per block: BEFORE (ag-c2-live, all gear off) | Bottom row: AFTER (ag-c2: sleeve seam reseated, tongue lowered, pouches in, mags seated, bands fitted)", fill=(185, 200, 214), font=f_sub)

    y = hdr + 4
    for pose, title in [("pistolaim", "PISTOL SHOULDERED (AIM) · NOON"), ("rifleaim", "M4 SHOULDERED (AIM) · NOON")]:
        d.text((pad, y + 4), title, fill=(140, 200, 255), font=f_sec)
        y += sec_h
        for tag, base_dir, border_col in [("BEFORE (LIVE)", LIVE_DIR, (220, 120, 90)), ("AFTER (CC-357 c v2)", C_DIR, (90, 200, 130))]:
            for c, (vid, vlabel) in enumerate(views):
                p = base_dir / f"marine-{pose}-noon-{vid}.png"
                im = Image.open(p).convert("RGB").resize((cell, cell), Image.Resampling.LANCZOS)
                x = pad + c * (cell + pad)
                canvas.paste(im, (x, y))
                d.rectangle([x - 1, y - 1, x + cell, y + cell + lbl], outline=border_col, width=2)
                d.rectangle([x, y + cell, x + cell, y + cell + lbl], fill=(32, 36, 42))
                d.text((x + 6, y + cell + 5), f"{tag} · {vlabel}", fill=(236, 240, 244), font=f_lbl)
            y += cell + lbl + pad

    out = C_DIR / "pair-sheet-aims.jpg"
    canvas.save(out, quality=92)
    return out


def build_crop_sheet(title, subtitle, rows_spec, out_path, scale=3):
    """rows_spec: list of (row_title, [(label, path, (x0,y0,x1,y1), border_col), ...])"""
    pad = 14
    hdr = 60
    lbl = 26
    sec_h = 26
    gap = 10

    row_dims = []
    max_w = 0
    total_h = hdr
    for row_title, tiles in rows_spec:
        tws = [(b[2] - b[0]) * scale for _, _, b, _ in tiles]
        ths = [(b[3] - b[1]) * scale for _, _, b, _ in tiles]
        rw = sum(tws) + gap * (len(tiles) - 1)
        rh = max(ths)
        row_dims.append((tws, ths, rw, rh))
        if rw > max_w:
            max_w = rw
        total_h += sec_h + rh + lbl + pad

    W = pad * 2 + max_w
    H = total_h + pad
    canvas = Image.new("RGB", (W, H), (20, 22, 26))
    d = ImageDraw.Draw(canvas)
    f_hdr = load_font(18, bold=True)
    f_sub = load_font(12)
    f_sec = load_font(13, bold=True)
    f_lbl = load_font(12, bold=True)

    d.text((pad, 10), title, fill=(244, 214, 118), font=f_hdr)
    d.text((pad, 34), subtitle, fill=(185, 200, 214), font=f_sub)

    y = hdr
    for (row_title, tiles), (tws, ths, rw, rh) in zip(rows_spec, row_dims):
        d.text((pad, y + 4), row_title, fill=(140, 200, 255), font=f_sec)
        y += sec_h
        x = pad
        for (label, p, box, border_col), tw, th in zip(tiles, tws, ths):
            im = Image.open(p).convert("RGB").crop(box).resize((tw, th), Image.Resampling.LANCZOS)
            canvas.paste(im, (x, y))
            d.rectangle([x - 1, y - 1, x + tw, y + th + lbl], outline=border_col, width=2)
            d.rectangle([x, y + th, x + tw, y + th + lbl], fill=(32, 36, 42))
            d.text((x + 8, y + th + 6), label, fill=(236, 240, 244), font=f_lbl)
            x += tw + gap
        y += rh + lbl + pad

    canvas.save(out_path)
    return out_path


def main():
    verify_dir(LIVE_DIR)
    verify_dir(C_DIR)

    s1 = build_stand_pair_sheet()
    s2 = build_aims_pair_sheet()

    s3 = build_crop_sheet(
        "CC-357 c v2 (3x Crop 1): Forearm Seam / Wrist Cord — Pistol Aim (ag-b vs ag-c2, 5080 WebGPU)",
        "Same loadout (all gear off): cord stuck out ~2-3 cm in ag-b; lies flush on sleeve in ag-c2 (both left & right forearms)",
        [
            ("LEFT FOREARM / WRIST (pistolaim · side · 3x native crop)", [
                ("BEFORE b (ag-b)", B_DIR / "marine-pistolaim-noon-side.png", (560, 270, 800, 470), (220, 120, 90)),
                ("AFTER c v2 (ag-c2)", C_DIR / "marine-pistolaim-noon-side.png", (560, 270, 800, 470), (90, 200, 130)),
            ]),
            ("RIGHT FOREARM / WRIST (pistolaim · sideR · 3x native crop)", [
                ("BEFORE b (ag-b)", B_DIR / "marine-pistolaim-noon-sideR.png", (800, 270, 1040, 470), (220, 120, 90)),
                ("AFTER c v2 (ag-c2)", C_DIR / "marine-pistolaim-noon-sideR.png", (800, 270, 1040, 470), (90, 200, 130)),
            ]),
        ],
        C_DIR / "crop-wrist-3x.png",
        scale=3,
    )

    s4 = build_crop_sheet(
        "CC-357 c v2 (3x Crop 2): Boot Cuffs & Tongue Top — Stand Unarmed (ag-c2-live vs ag-b vs ag-c2, 5080 WebGPU)",
        "J164 boot slimming + c tongue top lowered under cuff edge",
        [
            ("BOOT CUFFS · FRONT (unarmed · noon · 3x native crop)", [
                ("LIVE (668e97a3)", LIVE_DIR / "marine-unarmed-noon-front.png", (625, 1255, 975, 1435), (220, 120, 90)),
                ("CC-357 b (ag-b)", B_DIR / "marine-unarmed-noon-front.png", (625, 1255, 975, 1435), (220, 180, 90)),
                ("CC-357 c v2 (ag-c2)", C_DIR / "marine-unarmed-noon-front.png", (625, 1255, 975, 1435), (90, 200, 130)),
            ]),
            ("BOOT CUFFS · 3/4 FRONT-LEFT (unarmed · noon · 3x native crop)", [
                ("LIVE (668e97a3)", LIVE_DIR / "marine-unarmed-noon-3q.png", (565, 1260, 925, 1440), (220, 120, 90)),
                ("CC-357 b (ag-b)", B_DIR / "marine-unarmed-noon-3q.png", (565, 1260, 925, 1440), (220, 180, 90)),
                ("CC-357 c v2 (ag-c2)", C_DIR / "marine-unarmed-noon-3q.png", (565, 1260, 925, 1440), (90, 200, 130)),
            ]),
        ],
        C_DIR / "crop-boots-3x.png",
        scale=3,
    )

    s5 = build_crop_sheet(
        "CC-357 c v2 (3x Crop 3): Belt Pouches & Thigh Bands — Stand Unarmed (ag-c2-live vs ag-c2, 5080 WebGPU)",
        "Front pouches 13 mm in, dump pouch 25 mm toward centre, belt mags seated inside pouches (MAG_AT -> +-0.112, 0.70, 0.135), thigh bands fitted",
        [
            ("BELT & FRONT POUCHES · FRONT (unarmed · noon · 3x native crop)", [
                ("BEFORE (ag-c2-live)", LIVE_DIR / "marine-unarmed-noon-front.png", (605, 625, 995, 785), (220, 120, 90)),
                ("AFTER (ag-c2)", C_DIR / "marine-unarmed-noon-front.png", (605, 625, 995, 785), (90, 200, 130)),
            ]),
            ("BELT & DUMP POUCH · BACK (unarmed · noon · 3x native crop)", [
                ("BEFORE (ag-c2-live)", LIVE_DIR / "marine-unarmed-noon-back.png", (555, 630, 975, 830), (220, 120, 90)),
                ("AFTER (ag-c2)", C_DIR / "marine-unarmed-noon-back.png", (555, 630, 975, 830), (90, 200, 130)),
            ]),
            ("THIGH BANDS · FRONT (unarmed · noon · 3x native crop)", [
                ("BEFORE (ag-c2-live)", LIVE_DIR / "marine-unarmed-noon-front.png", (600, 790, 1000, 1010), (220, 120, 90)),
                ("AFTER (ag-c2)", C_DIR / "marine-unarmed-noon-front.png", (600, 790, 1000, 1010), (90, 200, 130)),
            ]),
            ("THIGH BANDS · 3/4 FRONT-LEFT (unarmed · noon · 3x native crop)", [
                ("BEFORE (ag-c2-live)", LIVE_DIR / "marine-unarmed-noon-3q.png", (570, 790, 960, 1010), (220, 120, 90)),
                ("AFTER (ag-c2)", C_DIR / "marine-unarmed-noon-3q.png", (570, 790, 960, 1010), (90, 200, 130)),
            ]),
        ],
        C_DIR / "crop-belt-bands-3x.png",
        scale=3,
    )

    s6 = build_crop_sheet(
        "CC-357 c v2 (3x Right-Thigh Close): Dark-Square Pick Spot — Unarmed Noon Front & 3/4 (ag-c2-live vs ag-c2)",
        "Spot of AG-340 pick (686, 850): right pouch front, upper right thigh, and thigh band; checking dark box gone & pouch front clean",
        [
            ("RIGHT THIGH & RIGHT POUCH · FRONT (unarmed · noon · 3x native crop)", [
                ("BEFORE (ag-c2-live)", LIVE_DIR / "marine-unarmed-noon-front.png", (590, 640, 860, 970), (220, 120, 90)),
                ("AFTER (ag-c2)", C_DIR / "marine-unarmed-noon-front.png", (590, 640, 860, 970), (90, 200, 130)),
            ]),
            ("RIGHT THIGH & RIGHT POUCH · 3/4 FRONT-LEFT (unarmed · noon · 3x native crop)", [
                ("BEFORE (ag-c2-live)", LIVE_DIR / "marine-unarmed-noon-3q.png", (555, 640, 835, 970), (220, 120, 90)),
                ("AFTER (ag-c2)", C_DIR / "marine-unarmed-noon-3q.png", (555, 640, 835, 970), (90, 200, 130)),
            ]),
        ],
        C_DIR / "crop-right-thigh-3x.png",
        scale=3,
    )

    print("Built sheets:", s1, s2, s3, s4, s5, s6)


if __name__ == "__main__":
    main()
