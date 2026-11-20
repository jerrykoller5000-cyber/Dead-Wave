"""Read-only inspection of GP-20154 v19 Hunt26 (current J164 base) + matched comparison sheets."""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(r"C:\Users\Zero\Desktop\Tiny Trek")
V19 = ROOT / "review" / "GP-20154" / "hunt-motion-v19-pair-v1"
V17 = ROOT / "review" / "GP-20154" / "hunt-motion-v17-pair-v1"
OUT = ROOT / "qa" / "2026-11-18-AG-361"
OUT.mkdir(parents=True, exist_ok=True)

rec = json.loads((V19 / "receipt.json").read_text(encoding="utf-8"))
rec17 = json.loads((V17 / "receipt.json").read_text(encoding="utf-8"))
audit = json.loads((V19 / "independent-provenance-contact-audit.json").read_text(encoding="utf-8"))

rb_all = rec["results"][0]
ra_all = rec["results"][1]
ra17_all = rec17["results"][1]

rows_b = {r["frame"]: r for r in rb_all["rows"]}
rows_a = {r["frame"]: r for r in ra_all["rows"]}
rows_a17 = {r["frame"]: r for r in ra17_all["rows"]}

print("=== PROVENANCE & PARITY ===")
print("before index:", audit["served"][0]["index"][:16], "world:", audit["served"][0]["world"][:16], "shape:", audit["served"][0]["shape"][:16])
print("after  index:", audit["served"][1]["index"][:16], "world:", audit["served"][1]["world"][:16], "shape:", audit["served"][1]["shape"][:16])
print("camera:", audit["camera"], "birthExact:", audit["birthExact"], "originExact:", audit["originExact"], "gfxExact:", audit["gfxExact"])
print("bossTrajectoryExactToV18:", audit["bossTrajectoryExactToV18"])
print("originalC5:", audit["originalC5"]["before"], "->", audit["originalC5"]["after"])
print("terrain:", audit["terrain"])
print("slide:", audit["slide"])
print("afterUnresolved:", audit["afterUnresolved"], "invalidSurfaceQueries:", audit["invalidSurfaceQueries"])

print("\n=== 348-FRAME AGGREGATES & V17 COMPARISON ===")
for phase, rows in [("before", rb_all["rows"]), ("after", ra_all["rows"])]:
    total_reds = sum(len(r.get("reds", [])) for r in rows)
    min_gaps = {}
    for limb in ("wristL", "wristR", "ankleL", "ankleR"):
        vals = [r["terrain"][limb]["actualTerrainGap"] for r in rows]
        min_gaps[limb] = (round(min(vals) * 1000, 3), round(max(vals) * 1000, 3))
    print(f"  {phase}: totalC5Reds={total_reds}, min_max_mm={min_gaps}")

# Check shot-by-shot parity between v19 after and v17 after on CaveGuard readings + terrain
max_read_diff = 0.0
max_terr_diff = 0.0
for f in rows_a:
    for grp in ("armL", "armR", "legL", "legR"):
        for k, v in rows_a[f]["reading"][grp].items():
            v17 = rows_a17[f]["reading"][grp][k]
            if isinstance(v, (int, float)) and isinstance(v17, (int, float)):
                max_read_diff = max(max_read_diff, abs(v - v17))
    for k in ("neckFlex", "spineFlex"):
        max_read_diff = max(max_read_diff, abs(rows_a[f]["reading"][k] - rows_a17[f]["reading"][k]))
    for limb in ("wristL", "wristR", "ankleL", "ankleR"):
        max_terr_diff = max(max_terr_diff, abs(rows_a[f]["terrain"][limb]["actualTerrainGap"] - rows_a17[f]["terrain"][limb]["actualTerrainGap"]))
print(f"v19 vs v17 max reading diff across 348 frames: {max_read_diff}, max terrain diff: {max_terr_diff}")

print("\n=== 13 CAPTURED SHOTS DETAIL ===")
for i, sb in enumerate(rb_all["shots"]):
    sa = ra_all["shots"][i]
    f = sb["frame"]
    row_b = rows_b[f]
    row_a = rows_a[f]
    tb = {k: round(v["actualTerrainGap"] * 1000, 2) for k, v in sb["terrain"].items()}
    ta = {k: round(v["actualTerrainGap"] * 1000, 2) for k, v in sa["terrain"].items()}
    print(f"{sb['file']} | f={f} mode={sb['mode']} | C5 {len(row_b.get('reds', []))}->{len(row_a.get('reds', []))} | terr B={tb} -> A={ta}")

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
        im_b = Image.open(V19 / "before" / fname).convert("RGB")
        im_a = Image.open(V19 / "after" / fname).convert("RGB")
        w, h = im_b.size
        box = ndc_to_crop(sb["ndc"], sa["ndc"], w, h, pad_px=56, target_ratio=cell_w / cell_h)
        y0 = pad + row_i * (cell_h + hdr_h + pad)
        for c_i, (phase, im, sh, row) in enumerate([("BEFORE (live 72e)", im_b, sb, rows_b[f]), ("AFTER (v19 2f23)", im_a, sa, rows_a[f])]):
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


build_sheet(list(range(0, 7)), "sheet-v19-hunt-part1-stand-gallop-decel.jpg")
build_sheet(list(range(7, 13)), "sheet-v19-hunt-part2-windup-strike-recover.jpg")

# 8-frame pixel-exact actor+marine closeup + v17 vs v19 marine crop check
KEY_INDICES = [0, 1, 2, 4, 7, 8, 9, 12]
cw, ch = 520, 440
hdr = 24
pad = 6
canvas = Image.new("RGB", (2 * cw + 3 * pad, len(KEY_INDICES) * (ch + hdr + pad) + pad), (15, 17, 20))
draw = ImageDraw.Draw(canvas)
for r_i, idx in enumerate(KEY_INDICES):
    sb, sa = rb_all["shots"][idx], ra_all["shots"][idx]
    fn = sb["file"]
    ib = Image.open(V19 / "before" / fn).convert("RGB")
    ia = Image.open(V19 / "after" / fn).convert("RGB")
    w, h = ib.size
    box = ndc_to_crop(sb["ndc"], sa["ndc"], w, h, pad_px=12, target_ratio=cw / ch)
    y_top = pad + r_i * (ch + hdr + pad)
    for c_i, (ph, im) in enumerate([("BEFORE (72e)", ib), ("AFTER (v19 2f23)", ia)]):
        x_left = pad + c_i * (cw + pad)
        crop = im.crop(box).resize((cw, ch), Image.Resampling.NEAREST)
        canvas.paste(crop, (x_left, y_top + hdr))
        draw.rectangle([x_left, y_top, x_left + cw, y_top + hdr], fill=(30, 34, 42))
        draw.text((x_left + 6, y_top + 4), f"{ph} :: {fn} ({sb['mode']})", fill=(240, 240, 245), font=font_sm)
canvas.save(OUT / "closeup-pixel-8frames.png")
print("Wrote", OUT / "closeup-pixel-8frames.png", canvas.size)

# Marine + CaveGuard reach comparison: v17 after vs v19 after (shows J164 marine update in scene)
mcw, mch = 560, 420
mhdr = 26
mpad = 8
M_IDX = [0, 7, 8, 9]
mcan = Image.new("RGB", (2 * mcw + 3 * mpad, len(M_IDX) * (mch + mhdr + mpad) + mpad), (15, 17, 20))
mdraw = ImageDraw.Draw(mcan)
for r_i, idx in enumerate(M_IDX):
    sa = ra_all["shots"][idx]
    fn = sa["file"]
    i17 = Image.open(V17 / "after" / fn).convert("RGB")
    i19 = Image.open(V19 / "after" / fn).convert("RGB")
    w, h = i19.size
    # Frame covering boss right paw + updated J164 marine around screen center
    box = (int(w * 0.25), int(h * 0.30), int(w * 0.62), int(h * 0.72))
    y_top = mpad + r_i * (mch + mhdr + mpad)
    for c_i, (ph, im) in enumerate([("v17 AFTER (pre-J164 marine)", i17), ("v19 AFTER (J164 72e marine)", i19)]):
        x_left = mpad + c_i * (mcw + mpad)
        crop = im.crop(box).resize((mcw, mch), Image.Resampling.NEAREST)
        mcan.paste(crop, (x_left, y_top + mhdr))
        mdraw.rectangle([x_left, y_top, x_left + mcw, y_top + mhdr], fill=(30, 34, 42))
        mdraw.text((x_left + 6, y_top + 5), f"{ph} :: {fn}", fill=(240, 240, 245), font=font_sm)
mcan.save(OUT / "closeup-v17-vs-v19-marine-j164.png")
print("Wrote", OUT / "closeup-v17-vs-v19-marine-j164.png", mcan.size)
