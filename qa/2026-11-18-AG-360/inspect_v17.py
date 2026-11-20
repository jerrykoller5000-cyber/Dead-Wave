"""Read-only inspection of GP-20154 v17 Hunt26 receipt + tight comparison sheets."""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(r"C:\Users\Zero\Desktop\Tiny Trek")
V17 = ROOT / "review" / "GP-20154" / "hunt-motion-v17-pair-v1"
OUT = ROOT / "qa" / "2026-11-18-AG-360"
OUT.mkdir(parents=True, exist_ok=True)

rec = json.loads((V17 / "receipt.json").read_text(encoding="utf-8"))
rb_all = rec["results"][0]
ra_all = rec["results"][1]

rows_b = {r["frame"]: r for r in rb_all["rows"]}
rows_a = {r["frame"]: r for r in ra_all["rows"]}

print("=== 348-FRAME AGGREGATES ===")
for phase, rows in [("before", rb_all["rows"]), ("after", ra_all["rows"])]:
    total_reds = sum(len(r.get("reds", [])) for r in rows)
    min_gaps = {}
    for limb in ("wristL", "wristR", "ankleL", "ankleR"):
        vals = [r["terrain"][limb]["actualTerrainGap"] for r in rows]
        min_gaps[limb] = (round(min(vals) * 1000, 3), round(max(vals) * 1000, 3))
    adv_frames = []
    tilt_frames = []
    hand_iters = 0
    foot_iters = 0
    for r in rows:
        sup = r.get("support") or {}
        for S in ("L", "R"):
            h = (sup.get("hands") or {}).get(S) or {}
            f = (sup.get("feet") or {}).get(S) or {}
            if h.get("iterations", 0) > 0:
                hand_iters += 1
            if f.get("iterations", 0) > 0:
                foot_iters += 1
            if f.get("advanceUsed", 0) > 0:
                adv_frames.append((r["frame"], r["mode"], S, f["advanceUsed"], round(f["before"] * 1000, 2), round(f["after"] * 1000, 2)))
            if f.get("tiltUsed", 0) > 0:
                tilt_frames.append((r["frame"], r["mode"], S, f["tiltUsed"]))
    print(f"  {phase}: totalC5Reds={total_reds}, min_max_mm={min_gaps}")
    if phase == "after":
        print(f"    handSupportActiveLimbFrames={hand_iters}, footSupportActiveLimbFrames={foot_iters}")
        print(f"    advanceUsedFrames ({len(adv_frames)}): {adv_frames[:10]} ... maxAdv={max([x[3] for x in adv_frames], default=0)}")
        print(f"    tiltUsedFrames ({len(tilt_frames)}): maxTilt={max([x[3] for x in tilt_frames], default=0)}")

print("\n=== 13 CAPTURED SHOTS DETAIL ===")
for i, sb in enumerate(rb_all["shots"]):
    sa = ra_all["shots"][i]
    f = sb["frame"]
    row_b = rows_b[f]
    row_a = rows_a[f]
    reds_b = [(x.get("group", "neck"), x["joint"], x["value"]) for x in row_b.get("reds", [])]
    reds_a = [(x.get("group", "neck"), x["joint"], x["value"]) for x in row_a.get("reds", [])]
    tb = {k: round(v["actualTerrainGap"] * 1000, 2) for k, v in sb["terrain"].items()}
    ta = {k: round(v["actualTerrainGap"] * 1000, 2) for k, v in sa["terrain"].items()}
    print(f"{sb['file']} | f={f} mode={sb['mode']}")
    print(f"  terrain_mm B={tb} -> A={ta}")
    print(f"  reds B({len(reds_b)})={reds_b} -> A({len(reds_a)})={reds_a}")
    rb_rd = row_b["reading"]
    ra_rd = row_a["reading"]
    for grp in ("armL", "armR", "legL", "legR"):
        print(f"  {grp} B={rb_rd[grp]} | A={ra_rd[grp]}")
    print(f"  neckFlex B={rb_rd['neckFlex']} -> A={ra_rd['neckFlex']} | spineFlex B={rb_rd['spineFlex']} -> A={ra_rd['spineFlex']}")
    if row_a.get("support"):
        print(f"  support A={row_a['support']}")

try:
    font = ImageFont.truetype("arial.ttf", 16)
    font_sm = ImageFont.truetype("arial.ttf", 13)
except OSError:
    font = ImageFont.load_default()
    font_sm = font


def ndc_to_crop(ndc_b, ndc_a, w, h, pad_px=48, target_ratio=1.35):
    min_x = min(ndc_b["min"][0], ndc_a["min"][0])
    max_x = max(ndc_b["max"][0], ndc_a["max"][0])
    min_y = min(ndc_b["min"][1], ndc_a["min"][1])
    max_y = max(ndc_b["max"][1], ndc_a["max"][1])
    px0 = (min_x + 1.0) * 0.5 * w
    px1 = (max_x + 1.0) * 0.5 * w
    # Note: NDC +1 is top (y=0 in image)
    py0 = (1.0 - max_y) * 0.5 * h
    py1 = (1.0 - min_y) * 0.5 * h
    cx = (px0 + px1) * 0.5
    cy = (py0 + py1) * 0.5
    bw = max(px1 - px0 + pad_px * 2, 320)
    bh = max(py1 - py0 + pad_px * 2, 240)
    if bw / bh < target_ratio:
        bw = bh * target_ratio
    else:
        bh = bw / target_ratio
    x0 = max(0, int(round(cx - bw * 0.5)))
    y0 = max(0, int(round(cy - bh * 0.5)))
    x1 = min(w, int(round(x0 + bw)))
    y1 = min(h, int(round(y0 + bh)))
    if x1 - x0 < int(bw) and x0 > 0:
        x0 = max(0, x1 - int(bw))
    if y1 - y0 < int(bh) and y0 > 0:
        y0 = max(0, y1 - int(bh))
    return (x0, y0, x1, y1)


def build_sheet(indices, out_name):
    cell_w, cell_h = 620, 460
    hdr_h = 44
    pad = 10
    rows_n = len(indices)
    canvas = Image.new("RGB", (2 * cell_w + 3 * pad, rows_n * (cell_h + hdr_h + pad) + pad), (18, 20, 24))
    draw = ImageDraw.Draw(canvas)
    for row_i, idx in enumerate(indices):
        sb = rb_all["shots"][idx]
        sa = ra_all["shots"][idx]
        fname = sb["file"]
        f = sb["frame"]
        im_b = Image.open(V17 / "before" / fname).convert("RGB")
        im_a = Image.open(V17 / "after" / fname).convert("RGB")
        w, h = im_b.size
        box = ndc_to_crop(sb["ndc"], sa["ndc"], w, h, pad_px=56, target_ratio=cell_w / cell_h)
        y0 = pad + row_i * (cell_h + hdr_h + pad)
        for c_i, (phase, im, sh, row) in enumerate([("BEFORE", im_b, sb, rows_b[f]), ("AFTER", im_a, sa, rows_a[f])]):
            x0 = pad + c_i * (cell_w + pad)
            crop = im.crop(box).resize((cell_w, cell_h), Image.Resampling.LANCZOS)
            canvas.paste(crop, (x0, y0 + hdr_h))
            draw.rectangle([x0, y0, x0 + cell_w, y0 + hdr_h], fill=(32, 36, 44))
            tg = sh["terrain"]
            line1 = f"{phase} :: {fname} ({sh['mode']}, C5reds={len(row.get('reds', []))})"
            line2 = (
                f"wL:{tg['wristL']['actualTerrainGap']*1000:+.1f} "
                f"wR:{tg['wristR']['actualTerrainGap']*1000:+.1f} "
                f"aL:{tg['ankleL']['actualTerrainGap']*1000:+.1f} "
                f"aR:{tg['ankleR']['actualTerrainGap']*1000:+.1f} mm"
            )
            draw.text((x0 + 8, y0 + 3), line1, fill=(235, 240, 245), font=font)
            draw.text((x0 + 8, y0 + 24), line2, fill=(175, 215, 255), font=font_sm)
    out_path = OUT / out_name
    canvas.save(out_path, quality=94)
    print(f"Wrote {out_path} ({canvas.size[0]}x{canvas.size[1]})")


build_sheet(list(range(0, 7)), "sheet-v17-hunt-part1-stand-gallop-decel.jpg")
build_sheet(list(range(7, 13)), "sheet-v17-hunt-part2-windup-strike-recover.jpg")

# Extra 3x-zoom detail comparison for the specifically requested frames + stand/recover
KEY_INDICES = [0, 2, 7, 8, 9, 12]
cell_w, cell_h = 540, 420
hdr_h = 40
pad = 10
detail_canvas = Image.new("RGB", (2 * cell_w + 3 * pad, len(KEY_INDICES) * (cell_h + hdr_h + pad) + pad), (18, 20, 24))
d_draw = ImageDraw.Draw(detail_canvas)
for row_i, idx in enumerate(KEY_INDICES):
    sb = rb_all["shots"][idx]
    sa = ra_all["shots"][idx]
    fname = sb["file"]
    im_b = Image.open(V17 / "before" / fname).convert("RGB")
    im_a = Image.open(V17 / "after" / fname).convert("RGB")
    w, h = im_b.size
    box = ndc_to_crop(sb["ndc"], sa["ndc"], w, h, pad_px=18, target_ratio=cell_w / cell_h)
    y0 = pad + row_i * (cell_h + hdr_h + pad)
    for c_i, (phase, im, sh) in enumerate([("BEFORE", im_b, sb), ("AFTER", im_a, sa)]):
        x0 = pad + c_i * (cell_w + pad)
        crop = im.crop(box).resize((cell_w, cell_h), Image.Resampling.LANCZOS)
        detail_canvas.paste(crop, (x0, y0 + hdr_h))
        d_draw.rectangle([x0, y0, x0 + cell_w, y0 + hdr_h], fill=(32, 36, 44))
        tg = sh["terrain"]
        d_draw.text((x0 + 8, y0 + 4), f"{phase} ZOOM :: {fname} ({sh['mode']})", fill=(235, 240, 245), font=font)
        d_draw.text(
            (x0 + 8, y0 + 22),
            f"wL:{tg['wristL']['actualTerrainGap']*1000:+.1f} wR:{tg['wristR']['actualTerrainGap']*1000:+.1f} "
            f"aL:{tg['ankleL']['actualTerrainGap']*1000:+.1f} aR:{tg['ankleR']['actualTerrainGap']*1000:+.1f} mm",
            fill=(185, 225, 195),
            font=font_sm,
        )
detail_path = OUT / "sheet-v17-hunt-zoom-key-frames.jpg"
detail_canvas.save(detail_path, quality=94)
print(f"Wrote {detail_path} ({detail_canvas.size[0]}x{detail_canvas.size[1]})")
