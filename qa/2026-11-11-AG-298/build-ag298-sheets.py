import os
from PIL import Image, ImageDraw, ImageFont

ROOT = r"C:\Users\Zero\Desktop\Tiny Trek"
GPU  = os.path.join(ROOT, "review", "GT-20082", "gpu")
BEF  = os.path.join(ROOT, "review", "GT-20082", "before")
QA   = os.path.join(ROOT, "qa", "2026-11-11-AG-298")

os.makedirs(GPU, exist_ok=True)
os.makedirs(QA, exist_ok=True)

LIGHTS = ["noon", "overcast", "dusk", "night"]

def get_font(sz):
    for p in [r"C:\Windows\Fonts\consolab.ttf", r"C:\Windows\Fonts\arialbd.ttf", r"C:\Windows\Fonts\segoeui.ttf"]:
        if os.path.exists(p):
            return ImageFont.truetype(p, sz)
    return ImageFont.load_default()

F_TITLE = get_font(21)
F_SUB   = get_font(14)
F_TAG   = get_font(13)

def load_tile(path, w, h, badge, col=(140, 245, 165)):
    if os.path.exists(path):
        im = Image.open(path).convert("RGB").resize((w, h), Image.Resampling.LANCZOS)
    else:
        im = Image.new("RGB", (w, h), (30, 22, 22))
        d0 = ImageDraw.Draw(im)
        d0.text((14, h // 2 - 10), f"MISSING: {os.path.basename(path)}", fill=(255, 95, 95), font=F_TAG)
    d = ImageDraw.Draw(im, "RGBA")
    tw = int(d.textlength(badge, font=F_TAG))
    d.rectangle([7, 7, 19 + tw, 29], fill=(12, 14, 18, 210), outline=(72, 80, 96, 220))
    d.text((13, 10), badge, fill=col, font=F_TAG)
    return im

def make_grid(title, sub, rows_spec, tw=480, th=270, pad=8, hdr=64):
    cols = max(len(r) for r in rows_spec)
    W = pad + cols * (tw + pad)
    H = hdr + len(rows_spec) * (th + pad) + pad
    cv = Image.new("RGB", (W, H), (14, 16, 20))
    d = ImageDraw.Draw(cv)
    d.text((14, 10), title, fill=(246, 248, 252), font=F_TITLE)
    d.text((14, 38), sub, fill=(176, 188, 204), font=F_SUB)
    for r_i, row in enumerate(rows_spec):
        for c_i, (p, badge, col) in enumerate(row):
            tile = load_tile(p, tw, th, badge, col)
            cv.paste(tile, (pad + c_i * (tw + pad), hdr + r_i * (th + pad)))
    return cv

def save_multi(im, paths):
    import time, random
    for p in paths:
        os.makedirs(os.path.dirname(p), exist_ok=True)
        tmp = f"{p}.tmp-{os.getpid()}-{random.randint(1000,9999)}.jpg"
        im.save(tmp, format="JPEG", quality=92, subsampling=0)
        for a in range(20):
            try:
                os.replace(tmp, p)
                break
            except OSError:
                if a == 19:
                    raise
                time.sleep(0.12)
        print(f"Saved {p} ({os.path.getsize(p)//1024} kB)")

if __name__ == "__main__":
    # Sheet 1: Factory 1P Hip, 1P Aimed, 1P Canted, 3P Held, Armory Rack across 4 Lights
    rows_fac = [
        [(os.path.join(GPU, f"kr7-factory-hip-{l}.png"),    f"FACTORY 1P HIP · {l.upper()}", (135, 245, 165)) for l in LIGHTS],
        [(os.path.join(GPU, f"kr7-factory-aimed-{l}.png"),  f"FACTORY 1P AIMED · {l.upper()}", (135, 225, 255)) for l in LIGHTS],
        [(os.path.join(GPU, f"kr7-factory-canted-{l}.png"), f"FACTORY 1P CANTED · {l.upper()}", (255, 215, 120)) for l in LIGHTS],
        [(os.path.join(GPU, f"kr7-factory-held-{l}.png"),   f"FACTORY 3P HELD · {l.upper()}", (205, 185, 255)) for l in LIGHTS],
        [(os.path.join(GPU, f"kr7-factory-rack-{l}.png"),   f"FACTORY RACK · {l.upper()}", (255, 195, 140)) for l in LIGHTS],
    ]
    im_fac = make_grid(
        "GT-20082 (J135) — Independent RTX 5080 WebGPU Look: KR-7 Laminated Wood Furniture (Factory, 4 Lights)",
        "1P Hip · 1P Aimed (30cm comb) · 1P Canted (stock+grip+handguard) · 3P Held · Armory Rack across Noon / Overcast / Dusk / Night",
        rows_fac, tw=480, th=270
    )
    save_multi(im_fac, [os.path.join(GPU, "sheet-factory-4lights.jpg"), os.path.join(QA, "sheet-factory-4lights.jpg")])

    # Sheet 2: M81 Camo Verification (1P Hip, 1P Aimed, 3P Held, Armory Rack across 4 Lights — zero camo bleed on wood!)
    rows_m81 = [
        [(os.path.join(GPU, f"kr7-m81-hip-{l}.png"),   f"M81 1P HIP · {l.upper()}", (135, 245, 165)) for l in LIGHTS],
        [(os.path.join(GPU, f"kr7-m81-aimed-{l}.png"), f"M81 1P AIMED · {l.upper()}", (135, 225, 255)) for l in LIGHTS],
        [(os.path.join(GPU, f"kr7-m81-held-{l}.png"),  f"M81 3P HELD · {l.upper()}", (205, 185, 255)) for l in LIGHTS],
        [(os.path.join(GPU, f"kr7-m81-rack-{l}.png"),  f"M81 RACK · {l.upper()}", (255, 195, 140)) for l in LIGHTS],
    ]
    im_m81 = make_grid(
        "GT-20082 (J135) — Independent RTX 5080 WebGPU Look: KR-7 Wood Under M81 Paint (Zero Camo Bleed, 4 Lights)",
        "Receiver & metal parts take M81 camo while stock, pistol grip & handguard retain lacquered wood grain across eye, held & rack copies",
        rows_m81, tw=480, th=270
    )
    save_multi(im_m81, [os.path.join(GPU, "sheet-m81-4lights.jpg"), os.path.join(QA, "sheet-m81-4lights.jpg")])
