# qa/2026-11-11-AG-304/build-ag304-sheet.py
import json
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = r"C:\Users\Zero\Desktop\Tiny Trek"
REV = os.path.join(ROOT, "review", "AG-304")

with open(os.path.join(REV, "trace-before.json"), "r", encoding="utf-8") as f:
    bef = json.load(f)
with open(os.path.join(REV, "trace-after.json"), "r", encoding="utf-8") as f:
    aft = json.load(f)

def get_font(sz, bold=False):
    for p in [
        r"C:\Windows\Fonts\consolab.ttf" if bold else r"C:\Windows\Fonts\consola.ttf",
        r"C:\Windows\Fonts\segoeuib.ttf" if bold else r"C:\Windows\Fonts\segoeui.ttf",
    ]:
        if os.path.exists(p):
            return ImageFont.truetype(p, sz)
    return ImageFont.load_default()

f_h1 = get_font(26, True)
f_h2 = get_font(18, True)
f_mono = get_font(15, False)
f_monob = get_font(15, True)

W, H = 1960, 1520
canvas = Image.new("RGB", (W, H), (14, 17, 22))
d = ImageDraw.Draw(canvas)

d.rectangle([0, 0, W, 86], fill=(22, 27, 35))
d.text((28, 18), "AG-304 · Training Ground Entry Blackout Optimization (Before vs After on RTX 5080 WebGPU)", fill=(242, 246, 252), font=f_h1)
b1 = bef["pass1P"]["enterTrainingMs"]
b3 = bef["pass3P"]["enterTrainingMs"]
a1 = aft["pass1P"]["enterTrainingMs"]
a3 = aft["pass3P"]["enterTrainingMs"]
d.text(
    (28, 52),
    f"Entry Blackout: 1P {b1} ms -> {a1} ms ({b1/max(1,a1):.2f}x faster)  |  3P {b3} ms -> {a3} ms ({b3/max(1,a3):.2f}x faster)  |  Single-Pass Parallel Warm-Up (Keeper Meshes + All Weapons Pre-Compiled)",
    fill=(110, 231, 183),
    font=f_h2,
)

# Bar chart comparison of Entry Blackout (AG-301 -> AG-304 Before -> AG-304 After)
d.rectangle([28, 106, 960, 410], fill=(20, 25, 33), outline=(48, 58, 74))
d.text((46, 120), "1. Entry Blackout Wall Time (ms) — Target <= 5,000–6,000 ms", fill=(250, 204, 21), font=f_h2)

bars = [
    ("AG-301 Pre-Warmup Baseline (had live freezes)", 4898, (148, 163, 184)),
    ("AG-304 BEFORE (1P Cold Entry, 8792e73d2)", b1, (239, 68, 68)),
    ("AG-304 BEFORE (3P Cold Entry, 8792e73d2)", b3, (220, 38, 38)),
    ("AG-304 AFTER  (1P Cold Entry, Two-Phase)", a1, (34, 197, 94)),
    ("AG-304 AFTER  (3P Cold Entry, Two-Phase)", a3, (16, 185, 129)),
]
max_ms = max(14000, b1, b3)
for idx, (lbl, val, col) in enumerate(bars):
    y = 160 + idx * 46
    d.text((46, y), lbl, fill=(215, 222, 232), font=f_mono)
    bx0 = 470
    bw = int((val / max_ms) * 380)
    d.rectangle([bx0, y + 2, bx0 + bw, y + 22], fill=col)
    d.text((bx0 + bw + 10, y), f"{val:,} ms ({val/1000:.2f} s)", fill=(245, 248, 252), font=f_monob)

# Right box: Sub-phase breakdown & Corridor / Post-blackout summary
d.rectangle([984, 106, W - 28, 410], fill=(20, 25, 33), outline=(48, 58, 74))
d.text((1002, 120), "2. Why 12.2 s -> Sub-5 s Worked & In-Play Hitch Checks", fill=(250, 204, 21), font=f_h2)

bd_b = bef.get("breakdown", {})
bd_a = aft.get("breakdown", {})
ev_b = [e for e in bd_b.get("events", []) if e.get("kind") == "compileAsync"]
ev_a = [e for e in bd_a.get("events", []) if e.get("kind") == "compileAsync"]

b_comp_str = " + ".join([f"{e['totalMs']}ms ({e['visMeshes']} meshes)" for e in ev_b])
a_comp_str = " + ".join([f"{e['totalMs']}ms ({e['visMeshes']} meshes)" for e in ev_a])

lines_r = [
    f"BEFORE compileAsync passes: {b_comp_str}",
    f"AFTER  compileAsync pass  : {a_comp_str}",
    f"Post-Blackout (1P / 3P)   : +{bef['pass1P']['postBlackout']['newPipelines']}p -> +{aft['pass1P']['postBlackout']['newPipelines']}p (1P max {aft['pass1P']['postBlackout']['maxDtMs']}ms, p99 {aft['pass1P']['postBlackout']['p99DtMs']}ms; 3P p99 {aft['pass3P']['postBlackout']['p99DtMs']}ms)",
    f"R1 Entry Walk (1P / 3P)   : 1P max {bef['pass1P']['entryWalk']['maxDtMs']}ms -> {aft['pass1P']['entryWalk']['maxDtMs']}ms (+{aft['pass1P']['entryWalk']['newPipelines']}p) | 3P max {bef['pass3P']['entryWalk']['maxDtMs']}ms -> {aft['pass3P']['entryWalk']['maxDtMs']}ms (+{aft['pass3P']['entryWalk']['newPipelines']}p)",
]
for cw_b, cw_a in zip(bef["pass3P"].get("cutawayWalks", []), aft["pass3P"].get("cutawayWalks", [])):
    lt = cw_a["light"]
    lines_r.append(
        f"R2 Cutaway/Fade [{lt:<8}] : {cw_b['maxDtMs']:>5.1f}ms (+{cw_b['newPipelines']}p) -> {cw_a['maxDtMs']:>5.1f}ms (+{cw_a['newPipelines']}p, median {cw_a['medianDtMs']}ms)"
    )

for i, ln in enumerate(lines_r):
    d.text((1002, 156 + i * 30), ln, fill=(220, 228, 238), font=f_mono)

# Middle table: All 12 Weapons First-Draw Frame Time & New Pipelines (1P & 3P)
d.rectangle([28, 430, W - 28, 860], fill=(20, 25, 33), outline=(48, 58, 74))
d.text((46, 444), "3. All 12 Weapons First-Draw Max Frame Time & New Pipelines (Before vs After)", fill=(250, 204, 21), font=f_h2)

headers = "Weapon         | 1P Before (max / pipes) | 1P After (max / pipes / draws) | 3P Before (max / pipes) | 3P After (max / pipes / draws)"
d.text((46, 478), headers, fill=(148, 163, 184), font=f_monob)
d.line([46, 500, W - 46, 500], fill=(55, 65, 81), width=1)

w1_b = {w["weapon"]: w for w in bef["pass1P"]["weaponDraws"]}
w1_a = {w["weapon"]: w for w in aft["pass1P"]["weaponDraws"]}
w3_b = {w["weapon"]: w for w in bef["pass3P"]["weaponDraws"]}
w3_a = {w["weapon"]: w for w in aft["pass3P"]["weaponDraws"]}

for idx, wk in enumerate([w["weapon"] for w in aft["pass1P"]["weaponDraws"]]):
    y = 508 + idx * 28
    b1w, a1w = w1_b[wk], w1_a[wk]
    b3w, a3w = w3_b[wk], w3_a[wk]
    row = (
        f"{wk:<14} | "
        f"{b1w['maxDtMs']:>6.2f} ms / +{b1w['newPipelines']:<2}       | "
        f"{a1w['maxDtMs']:>6.2f} ms / +{a1w['newPipelines']:<2} / {a1w['avgDraws']:>3} drw     | "
        f"{b3w['maxDtMs']:>6.2f} ms / +{b3w['newPipelines']:<2}       | "
        f"{a3w['maxDtMs']:>6.2f} ms / +{a3w['newPipelines']:<2} / {a3w['avgDraws']:>3} drw"
    )
    ok = a1w["newPipelines"] == 0 and a3w["newPipelines"] == 0 and a1w["maxDtMs"] <= 35.0 and a3w["maxDtMs"] <= 35.0
    d.text((46, y), row, fill=(167, 243, 208) if ok else (253, 224, 71), font=f_mono)

# Bottom visual sanity strip: Before vs After 1P weapons after warm-up
d.rectangle([28, 880, W - 28, H - 24], fill=(20, 25, 33), outline=(48, 58, 74))
d.text((46, 894), "4. Visual Parity Sanity Check (Before vs After 1P Drawn Weapons Post-Warmup)", fill=(250, 204, 21), font=f_h2)

sample_keys = ["pistol", "revolver", "m4", "ak", "launcher", "chainsaw"]
tw = (W - 92 - 5 * 10) // 6
th = int(tw * 9 / 16)
for r_idx, tag in enumerate(["before", "after"]):
    ry = 932 + r_idx * (th + 46)
    d.text((46, ry - 20), f"{tag.upper()} 1P:", fill=(190, 205, 225), font=f_monob)
    for c_idx, wk in enumerate(sample_keys):
        fp = os.path.join(REV, "shots", f"{tag}-1P-{wk}.jpg")
        cx = 46 + c_idx * (tw + 10)
        if os.path.exists(fp):
            im = Image.open(fp).convert("RGB").resize((tw, th), Image.Resampling.LANCZOS)
            canvas.paste(im, (cx, ry))
            d.rectangle([cx, ry, cx + tw, ry + th], outline=(64, 76, 94))
            d.rectangle([cx + 4, ry + 4, cx + 110, ry + 24], fill=(12, 15, 20))
            d.text((cx + 8, ry + 6), wk, fill=(235, 240, 248), font=f_mono)

out_fp = os.path.join(REV, "sheet-ag304-before-after.jpg")
canvas.save(out_fp, quality=92)
print("Saved", out_fp)
