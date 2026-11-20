from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(r"C:\Users\Zero\Desktop\Tiny Trek")
GOOD = ROOT / "review" / "GT-20124" / "native-mag-short-ag-v1-668e" / "before" / "unarmed-front.png"
FAIL = ROOT / "review" / "GT-20124" / "native-mag-landed-ag-v1" / "landed" / "unarmed-front.png"
QA = ROOT / "qa" / "2026-11-18-AG-362"
QA.mkdir(parents=True, exist_ok=True)


def get_font(size, bold=False):
    for p in [
        r"C:\Windows\Fonts\consolab.ttf" if bold else r"C:\Windows\Fonts\consola.ttf",
        r"C:\Windows\Fonts\arialbd.ttf" if bold else r"C:\Windows\Fonts\arial.ttf",
    ]:
        if Path(p).exists():
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


F_T = get_font(20, True)
F_S = get_font(14, False)
F_H = get_font(15, True)

W_CELL = 560
PAD = 14
TOP = 76
HDR = 34
can = Image.new("RGB", (PAD * 3 + W_CELL * 2, TOP + HDR + W_CELL + PAD), (22, 26, 31))
d = ImageDraw.Draw(can)
d.text((PAD, 12), "AG-362 / GT-20124 LOOK BARRIER FAILURE PROOF (72e543b4)", fill=(240, 244, 248), font=F_T)
d.text((PAD, 42), "Refused FIRST-CELL-LOOKED.txt: WebGPU compositor froze on enterTraining() FIRING LINE frame instead of studio Marine closeup.", fill=(240, 150, 130), font=F_S)

items = [
    ("EXPECTED FRAMING (AG-358 historical before)", GOOD, (92, 214, 141)),
    ("CAPTURED IN AG-362 (landed/unarmed-front.png -> REFUSED)", FAIL, (235, 110, 95)),
]
for i, (lbl, p, col) in enumerate(items):
    x = PAD + i * (W_CELL + PAD)
    d.rectangle([x, TOP, x + W_CELL, TOP + HDR - 4], fill=(32, 37, 44), outline=col, width=2)
    d.text((x + 8, TOP + 6), lbl, fill=col, font=F_H)
    im = Image.open(p).convert("RGB").resize((W_CELL, W_CELL), Image.Resampling.LANCZOS)
    can.paste(im, (x, TOP + HDR))
    d.rectangle([x, TOP + HDR, x + W_CELL, TOP + HDR + W_CELL], outline=col, width=2)

out = QA / "diag-barrier-fail.jpg"
can.save(out, quality=93)
print("Wrote", out, can.size)
