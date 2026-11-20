"""Verify all AG-355 (J167 LANDED GP152 Leaper) 1200x1200 WebGPU PNGs and build Jerry-facing contact sheets."""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path("C:/Users/Zero/Desktop/Tiny Trek")
OUT_DIR = ROOT / "qa/2026-11-17-AG-355"


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


def build_group_sheet(summary, group_name, state_keys, out_file, subtitle):
    by_sv = {(s["state"], s["light"], s["view"]): s for s in summary["shots"]}
    views = ["front", "3q", "side", "back"]
    lights = ["noon", "night"]

    tw, th = 320, 320
    pad = 10
    hdr = 60
    sec_h = 26
    lbl = 34
    cols = 4
    W = pad + cols * (tw + pad)
    H = hdr + len(state_keys) * (sec_h + 2 * (th + lbl + pad)) + pad

    sheet = Image.new("RGB", (W, H), (18, 20, 24))
    d = ImageDraw.Draw(sheet)
    f_hdr = load_font(18, bold=True)
    f_sub = load_font(12)
    f_sec = load_font(13, bold=True)
    f_lbl = load_font(11, bold=True)
    f_meta = load_font(10)

    idx_md5 = summary["initialHashes"]["index.html"]["md5"]
    mot_md5 = summary["initialHashes"]["game/leaper-motion.js"]["md5"]
    sup_md5 = summary["initialHashes"]["game/leaper-support.js"]["md5"]
    d.text((pad, 8), f"J167 LANDED GP152 Leaper Floor — {group_name} (RTX 5080 WebGPU, AG341 1200x1200 FOV34)", fill=(244, 214, 118), font=f_hdr)
    d.text((pad, 33), f"LIVE index {idx_md5} | leaper-motion {mot_md5} | leaper-support {sup_md5} | {subtitle}", fill=(185, 210, 228), font=f_sub)

    y = hdr + 2
    for sk in state_keys:
        st = summary["states"][sk]
        bg = st.get("minBodyGap")
        cg = st.get("coreGap")
        bg_txt = f"{bg*1000:+.2f}mm" if bg is not None else f"{st['floorGapMmByCams']:+.2f}mm"
        cg_txt = f" | coreGap={cg*1000:+.2f}mm" if cg is not None else ""
        sup = st.get("supports") or {}
        sup_txt = " | " + " ".join(f"{k}={v*1000:+.1f}mm" for k, v in sup.items()) if sup else ""
        v_cnt = len(st.get("violations") or [])
        d.text(
            (pad, y + 4),
            f"{st['title']}   [bodyGap={bg_txt}{cg_txt}{sup_txt} | h={st['boundsH']:.2f}m | C5_red={v_cnt}]",
            fill=(140, 205, 255),
            font=f_sec,
        )
        y += sec_h

        for light in lights:
            border_col = (240, 200, 110) if light == "noon" else (120, 175, 255)
            for c, view in enumerate(views):
                s = by_sv[(sk, light, view)]
                x = pad + c * (tw + pad)
                im = Image.open(ROOT / s["file"]).convert("RGB").resize((tw, th), Image.Resampling.LANCZOS)
                sheet.paste(im, (x, y))
                d.rectangle([x - 1, y - 1, x + tw, y + th + lbl], outline=border_col, width=2)
                d.rectangle([x, y + th, x + tw, y + th + lbl], fill=(28, 32, 38))
                d.text((x + 6, y + th + 3), s["label"], fill=border_col, font=f_lbl)
                d.text((x + 6, y + th + 18), f"fill={s['fillHeightPct']:.1f}%x{s['fillWidthPct']:.1f}% | md5={s['md5']}", fill=(210, 220, 230), font=f_meta)
            y += th + lbl + pad

    out = OUT_DIR / out_file
    sheet.save(out, quality=92)
    print(f"Wrote {out.name} ({W}x{H}, {out.stat().st_size} bytes)")


def build_overview_sheet(summary):
    """One compact Jerry-facing overview sheet: 11 states side+3q across Noon & Night."""
    by_sv = {(s["state"], s["light"], s["view"]): s for s in summary["shots"]}
    states = [
        "statue", "live-idle", "walk", "body-hit",
        "cave-sleep", "cave-getup", "cave-awake",
        "crush-prone", "crush-prone-getup", "crush-supine", "crush-supine-getup",
    ]
    tw, th = 310, 310
    pad = 8
    hdr = 58
    lbl = 34
    cols = 4  # Noon 3/4, Noon Side, Night 3/4, Night Side
    W = pad + cols * (tw + pad)
    H = hdr + len(states) * (th + lbl + pad) + pad

    sheet = Image.new("RGB", (W, H), (18, 20, 24))
    d = ImageDraw.Draw(sheet)
    f_hdr = load_font(17, bold=True)
    f_sub = load_font(11)
    f_lbl = load_font(11, bold=True)
    f_meta = load_font(10)

    idx_md5 = summary["initialHashes"]["index.html"]["md5"]
    mot_md5 = summary["initialHashes"]["game/leaper-motion.js"]["md5"]
    sup_md5 = summary["initialHashes"]["game/leaper-support.js"]["md5"]
    d.text((pad, 8), "J167 LANDED GP152 Leaper Overview — All 11 States (Noon & Night, 3/4 + Side, 1200x1200 AG341)", fill=(244, 214, 118), font=f_hdr)
    d.text((pad, 31), f"LIVE index {idx_md5} | leaper-motion {mot_md5} | leaper-support {sup_md5} | exact same cameras noon vs night, visible ground", fill=(185, 210, 228), font=f_sub)

    specs = [("noon", "3q"), ("noon", "side"), ("night", "3q"), ("night", "side")]
    y = hdr + 2
    for sk in states:
        st = summary["states"][sk]
        bg = st.get("minBodyGap")
        bg_mm = bg * 1000 if bg is not None else st["floorGapMmByCams"]
        for c, (light, view) in enumerate(specs):
            s = by_sv[(sk, light, view)]
            x = pad + c * (tw + pad)
            im = Image.open(ROOT / s["file"]).convert("RGB").resize((tw, th), Image.Resampling.LANCZOS)
            sheet.paste(im, (x, y))
            col = (240, 200, 110) if light == "noon" else (120, 175, 255)
            d.rectangle([x - 1, y - 1, x + tw, y + th + lbl], outline=col, width=2)
            d.rectangle([x, y + th, x + tw, y + th + lbl], fill=(28, 32, 38))
            d.text((x + 5, y + th + 3), f"{sk} · {light} {view}", fill=col, font=f_lbl)
            d.text((x + 5, y + th + 18), f"bodyGap={bg_mm:+.2f}mm | fill={s['fillHeightPct']:.0f}%x{s['fillWidthPct']:.0f}%", fill=(210, 220, 230), font=f_meta)
        y += th + lbl + pad

    out = OUT_DIR / "sheet-gp152-landed-overview.jpg"
    sheet.save(out, quality=92)
    print(f"Wrote {out.name} ({W}x{H}, {out.stat().st_size} bytes)")


def main():
    summary = json.loads((OUT_DIR / "summary.json").read_text(encoding="utf-8"))
    shots = summary["shots"]
    assert len(shots) == 88, f"Expected 88 shots, got {len(shots)}"
    hashes = {s["sha1"] for s in shots}
    assert len(hashes) == 88, f"Duplicate pixel hashes found: {len(hashes)}/88"

    build_overview_sheet(summary)
    build_group_sheet(
        summary,
        "Part 1: Statue, Live Idle, Walk & Body Hit",
        ["statue", "live-idle", "walk", "body-hit"],
        "sheet-part1-normal.jpg",
        "Front / 3/4 / Side / Back across Noon & Night",
    )
    build_group_sheet(
        summary,
        "Part 2: Actual ROOT Cave Sleep, Noise Wake Get-Up & Awake",
        ["cave-sleep", "cave-getup", "cave-awake"],
        "sheet-part2-cave.jpg",
        "Actual ROOT warren + public noise wake, Front / 3/4 / Side / Back across Noon & Night",
    )
    build_group_sheet(
        summary,
        "Part 3: Public Crush Forward (Prone + Get-Up) & Back (Supine + Get-Up)",
        ["crush-prone", "crush-prone-getup", "crush-supine", "crush-supine-getup"],
        "sheet-part3-crush.jpg",
        "Public damageZombie kind='crush' + fixed 60Hz knockStep, Front / 3/4 / Side / Back across Noon & Night",
    )
    print("ALL AG-355 GP152 LANDED SHEETS VERIFIED (88/88 unique).")


if __name__ == "__main__":
    main()
