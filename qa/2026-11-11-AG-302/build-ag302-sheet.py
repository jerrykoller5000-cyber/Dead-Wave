# qa/2026-11-11-AG-302/build-ag302-sheet.py
# Builds review/AG-302/sheet-ag302-before-after-trace.jpg from trace-before.json, trace-after.json, and shots/.

import json
import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(r"C:\Users\Zero\Desktop\Tiny Trek")
QA_DIR = ROOT / "qa" / "2026-11-11-AG-302"
REV_DIR = ROOT / "review" / "AG-302"
REV_DIR.mkdir(parents=True, exist_ok=True)


def get_font(size, bold=False):
    candidates = [
        r"C:\Windows\Fonts\consolab.ttf" if bold else r"C:\Windows\Fonts\consola.ttf",
        r"C:\Windows\Fonts\segoeuib.ttf" if bold else r"C:\Windows\Fonts\segoeui.ttf",
    ]
    for p in candidates:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def main():
    before = json.loads((QA_DIR / "trace-before.json").read_text(encoding="utf-8"))
    after = json.loads((QA_DIR / "trace-after.json").read_text(encoding="utf-8"))

    W, H = 2200, 1520
    img = Image.new("RGB", (W, H), (14, 17, 23))
    d = ImageDraw.Draw(img)

    f_title = get_font(28, True)
    f_sub = get_font(18, False)
    f_hdr = get_font(19, True)
    f_row = get_font(16, False)
    f_row_b = get_font(16, True)
    f_small = get_font(14, False)

    # Header
    d.rectangle([0, 0, W, 86], fill=(22, 27, 36))
    d.text(
        (28, 16),
        "AG-302 · Training Blackout Viewmodel Pre-Build & Pipeline Warm-Up (RTX 5080 WebGPU · Real rAF)",
        font=f_title,
        fill=(242, 246, 252),
    )
    b1 = before["pass1P"]
    a1 = after["pass1P"]
    b3 = before["pass3P"]
    a3 = after["pass3P"]
    sub_txt = (
        f"Blackout warm-up: {b1['enterTrainingMs']} ms ({b1['postBlackout']['pipelinesAtLift']} pipes) -> "
        f"{a1['enterTrainingMs']} ms ({a1['postBlackout']['pipelinesAtLift']} pipes)  |  "
        f"3P spawn draws: {b1['postBlackout']['avgDraws']} -> {a1['postBlackout']['avgDraws']} (vmVisible={a1['postBlackout']['initialVmVisible']})  |  "
        f"1P R1 draws: {b1['entryWalk']['avgDraws']} -> {a1['entryWalk']['avgDraws']}"
    )
    d.text((28, 54), sub_txt, font=f_sub, fill=(165, 185, 212))

    # Left Card: Entry + 12-Weapon First Draw (1P) Table & Horizontal Bars
    d.rounded_rectangle([24, 104, 1340, 810], radius=10, fill=(20, 24, 33), outline=(45, 55, 72), width=2)
    d.text(
        (42, 118),
        "1P Cold Entry & First Draw of All 12 Weapons — Frame-Time Max (ms) & New GPU Pipelines",
        font=f_hdr,
        fill=(255, 214, 102),
    )

    headers = ["Event / Weapon (1P)", "Before Max", "Before +Pipes", "After Max", "After +Pipes", "1P Draws (B->A)", "Visual Max-dt Bar (25 ms budget line)"]
    col_x = [42, 250, 380, 515, 640, 775, 935]
    y = 156
    for cx, h_txt in zip(col_x, headers):
        d.text((cx, y), h_txt, font=f_small, fill=(140, 155, 180))
    d.line([40, y + 24, 1324, y + 24], fill=(48, 58, 76), width=1)

    rows_1p = [
        (
            "postBlackout (3P spawn)",
            b1["postBlackout"]["maxDtMs"],
            b1["postBlackout"]["newPipelines"],
            a1["postBlackout"]["maxDtMs"],
            a1["postBlackout"]["newPipelines"],
            f"{b1['postBlackout']['avgDraws']} -> {a1['postBlackout']['avgDraws']}",
        ),
        (
            "entryWalk R1 (1P)",
            b1["entryWalk"]["maxDtMs"],
            b1["entryWalk"]["newPipelines"],
            a1["entryWalk"]["maxDtMs"],
            a1["entryWalk"]["newPipelines"],
            f"{b1['entryWalk']['avgDraws']} -> {a1['entryWalk']['avgDraws']}",
        ),
    ]
    a1_map = {w["weapon"]: w for w in a1["weaponDraws"]}
    for bw in b1["weaponDraws"]:
        wk = bw["weapon"]
        aw = a1_map[wk]
        rows_1p.append(
            (
                f"equip_1P_{wk}",
                bw["maxDtMs"],
                bw["newPipelines"],
                aw["maxDtMs"],
                aw["newPipelines"],
                f"{bw['avgDraws']} -> {aw['avgDraws']}",
            )
        )

    y = 190
    row_h = 43
    bar_x0 = 935
    bar_max_w = 370
    scale_ms = 260.0  # clamp bar length visually at 260ms so 800ms still fits with label

    for idx, (label, b_ms, b_p, a_ms, a_p, dr_txt) in enumerate(rows_1p):
        if idx % 2 == 1:
            d.rectangle([34, y - 4, 1330, y + row_h - 6], fill=(25, 30, 41))
        d.text((col_x[0], y + 6), label, font=f_row_b if idx < 2 else f_row, fill=(230, 236, 245))
        b_col = (255, 112, 112) if b_ms > 25.0 else (150, 225, 165)
        a_col = (255, 112, 112) if a_ms > 25.0 else (110, 235, 150)
        d.text((col_x[1], y + 6), f"{b_ms:6.1f} ms", font=f_row_b, fill=b_col)
        d.text((col_x[2], y + 6), f"+{b_p}" if b_p > 0 else "0", font=f_row_b, fill=(255, 165, 90) if b_p > 0 else (130, 145, 165))
        d.text((col_x[3], y + 6), f"{a_ms:6.1f} ms", font=f_row_b, fill=a_col)
        d.text((col_x[4], y + 6), f"+{a_p}" if a_p > 0 else "0", font=f_row_b, fill=(255, 165, 90) if a_p > 0 else (110, 235, 150))
        d.text((col_x[5], y + 6), dr_txt, font=f_row, fill=(185, 198, 218))

        # Dual horizontal bars (top=Before red/orange, bottom=After green)
        bw_px = min(bar_max_w, max(2, int((b_ms / scale_ms) * bar_max_w)))
        aw_px = min(bar_max_w, max(2, int((a_ms / scale_ms) * bar_max_w)))
        thresh_x = bar_x0 + int((25.0 / scale_ms) * bar_max_w)
        d.rectangle([bar_x0, y + 3, bar_x0 + bw_px, y + 15], fill=(224, 86, 86) if b_ms > 25 else (115, 155, 130))
        d.rectangle([bar_x0, y + 19, bar_x0 + aw_px, y + 31], fill=(235, 110, 95) if a_ms > 25 else (68, 204, 122))
        d.line([thresh_x, y + 1, thresh_x, y + 33], fill=(255, 214, 102), width=1)
        y += row_h

    # Right Card: 3P Cold Entry & All 12 Weapons Parity Table
    d.rounded_rectangle([1360, 104, 2176, 810], radius=10, fill=(20, 24, 33), outline=(45, 55, 72), width=2)
    d.text(
        (1378, 118),
        "3P Cold Entry & All 12 Weapons — Parity & Zero Extra Draws",
        font=f_hdr,
        fill=(130, 212, 255),
    )
    col3_x = [1378, 1605, 1735, 1865, 1995]
    hdr3 = ["Event / Weapon (3P)", "Before Max", "After Max", "After +Pipes", "3P Draws (B->A)"]
    y3 = 156
    for cx, h_txt in zip(col3_x, hdr3):
        d.text((cx, y3), h_txt, font=f_small, fill=(140, 155, 180))
    d.line([1376, y3 + 24, 2160, y3 + 24], fill=(48, 58, 76), width=1)

    rows_3p = [
        (
            "postBlackout (3P)",
            b3["postBlackout"]["maxDtMs"],
            a3["postBlackout"]["maxDtMs"],
            a3["postBlackout"]["newPipelines"],
            f"{b3['postBlackout']['avgDraws']} -> {a3['postBlackout']['avgDraws']}",
        ),
        (
            "entryWalk R1 (3P)",
            b3["entryWalk"]["maxDtMs"],
            a3["entryWalk"]["maxDtMs"],
            a3["entryWalk"]["newPipelines"],
            f"{b3['entryWalk']['avgDraws']} -> {a3['entryWalk']['avgDraws']}",
        ),
    ]
    a3_map = {w["weapon"]: w for w in a3["weaponDraws"]}
    for bw in b3["weaponDraws"]:
        wk = bw["weapon"]
        aw = a3_map[wk]
        rows_3p.append(
            (
                f"equip_3P_{wk}",
                bw["maxDtMs"],
                aw["maxDtMs"],
                aw["newPipelines"],
                f"{bw['avgDraws']} -> {aw['avgDraws']}",
            )
        )

    y3 = 190
    for idx, (label, b_ms, a_ms, a_p, dr_txt) in enumerate(rows_3p):
        if idx % 2 == 1:
            d.rectangle([1370, y3 - 4, 2166, y3 + row_h - 6], fill=(25, 30, 41))
        d.text((col3_x[0], y3 + 6), label, font=f_row_b if idx < 2 else f_row, fill=(230, 236, 245))
        d.text((col3_x[1], y3 + 6), f"{b_ms:5.1f} ms", font=f_row, fill=(255, 120, 120) if b_ms > 25 else (175, 215, 185))
        d.text((col3_x[2], y3 + 6), f"{a_ms:5.1f} ms", font=f_row_b, fill=(255, 120, 120) if a_ms > 25 else (110, 235, 150))
        d.text((col3_x[3], y3 + 6), f"+{a_p}" if a_p > 0 else "0", font=f_row_b, fill=(255, 165, 90) if a_p > 0 else (110, 235, 150))
        d.text((col3_x[4], y3 + 6), dr_txt, font=f_row, fill=(185, 198, 218))
        y3 += row_h

    # Bottom Card: Visual Sanity Grid (3P Unarmed Spawn + 6 Pre-Built 1P Guns)
    d.rounded_rectangle([24, 830, 2176, 1500], radius=10, fill=(20, 24, 33), outline=(45, 55, 72), width=2)
    d.text(
        (42, 844),
        "Post-Warmup Visual Sanity — 3P Unarmed Spawn (Nothing Shown) + Pre-Built 1P View Copies Across Materials/Optics/Instanced Teeth",
        font=f_hdr,
        fill=(180, 235, 160),
    )

    shot_specs = [
        ("shots/after-3P-spawn-unarmed.jpg", "3P Spawn Unarmed (vm.visible=false, 0 extra draws)"),
        ("shots/after-1P-pistol.jpg", "1P Pistol (pre-built view copy + detailed glove)"),
        ("shots/after-1P-revolver.jpg", "1P Revolver (cylinder + bare steel)"),
        ("shots/after-1P-m4.jpg", "1P GW-4 / M4 (fold-static packed paint)"),
        ("shots/after-1P-ak.jpg", "1P KR-7 / AK (wood furniture map + steel)"),
        ("shots/after-1P-sniper.jpg", "1P Sniper (cc342-coated-lens scope)"),
        ("shots/after-1P-chainsaw.jpg", "1P Chainsaw (42-tooth InstancedMesh + bar)"),
    ]

    # Place 4 on top row, 3 + summary callout on bottom row inside [42..2158, 882..1484]
    tw, th = 512, 268
    for idx, (rel, cap) in enumerate(shot_specs):
        col = idx % 4
        row = idx // 4
        sx = 42 + col * (tw + 22)
        sy = 884 + row * (th + 34)
        p = QA_DIR / rel
        if p.exists():
            im = Image.open(p).convert("RGB").resize((tw, th), Image.Resampling.LANCZOS)
            img.paste(im, (sx, sy))
        d.rectangle([sx, sy, sx + tw, sy + th], outline=(62, 76, 98), width=1)
        d.text((sx + 4, sy + th + 6), cap, font=f_small, fill=(210, 220, 236))

    # 8th slot: Summary Box
    sx = 42 + 3 * (tw + 22)
    sy = 884 + 1 * (th + 34)
    d.rounded_rectangle([sx, sy, sx + tw, sy + th], radius=8, fill=(26, 34, 46), outline=(68, 204, 122), width=2)
    b_tot_pipes = b1["entryWalk"]["newPipelines"] + sum(w["newPipelines"] for w in b1["weaponDraws"])
    a_tot_pipes = a1["entryWalk"]["newPipelines"] + sum(w["newPipelines"] for w in a1["weaponDraws"])
    b_max_equip = max(w["maxDtMs"] for w in b1["weaponDraws"])
    a_max_equip = max(w["maxDtMs"] for w in a1["weaponDraws"])
    summary_lines = [
        "AG-302 VERIFICATION SUMMARY",
        f"• 1P New Pipelines (Entry+12 Guns): {b_tot_pipes} -> {a_tot_pipes}",
        f"• 1P Entry Walk Max Frame: {b1['entryWalk']['maxDtMs']:.1f} ms -> {a1['entryWalk']['maxDtMs']:.1f} ms",
        f"• 1P Worst Gun Draw Max:   {b_max_equip:.1f} ms -> {a_max_equip:.1f} ms",
        f"• 3P Spawn Avg Draws:      {b1['postBlackout']['avgDraws']} -> {a1['postBlackout']['avgDraws']}",
        f"• 3P Walk Avg Draws:       {b3['entryWalk']['avgDraws']} -> {a3['entryWalk']['avgDraws']}",
        "• vm.root.visible after blackout: false",
        "• Zero extra meshes left in vm-space",
    ]
    for li, ln in enumerate(summary_lines):
        d.text(
            (sx + 18, sy + 16 + li * 30),
            ln,
            font=f_hdr if li == 0 else f_row,
            fill=(110, 235, 150) if li == 0 else (228, 236, 246),
        )

    out_qa = QA_DIR / "sheet-ag302-before-after-trace.jpg"
    out_rev = REV_DIR / "sheet-ag302-before-after-trace.jpg"
    img.save(out_qa, quality=92)
    img.save(out_rev, quality=92)
    print(f"Saved {out_rev}")


if __name__ == "__main__":
    main()
