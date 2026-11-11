import os
import time
from PIL import Image, ImageDraw, ImageFont

ROOT  = r"C:\Users\Zero\Desktop\Tiny Trek"
QA    = os.path.join(ROOT, "qa", "2026-11-11-AG-297")
AG297 = os.path.join(ROOT, "review", "AG-297")
GP87  = os.path.join(ROOT, "review", "GP-20087", "gpu")
GP88  = os.path.join(ROOT, "review", "GP-20088", "gpu")
GP91  = os.path.join(ROOT, "review", "GP-20091", "gpu")
GP92  = os.path.join(ROOT, "review", "GP-20092", "gpu")
GP93  = os.path.join(ROOT, "review", "GP-20093", "gpu")
CE2   = os.path.join(ROOT, "review", "CE-2", "gpu")
CE3   = os.path.join(ROOT, "review", "CE-3", "gpu")
AG292 = os.path.join(ROOT, "qa", "2026-11-11-AG-292", "cross-owner")

for d in (QA, AG297, GP87, GP88, GP91, GP92, GP93, CE2, CE3):
    os.makedirs(d, exist_ok=True)

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

def make_grid(title, sub, rows_spec, tw=500, th=281, pad=8, hdr=64):
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
    for p in paths:
        os.makedirs(os.path.dirname(p), exist_ok=True)
        base, ext = os.path.splitext(p)
        fmt = "JPEG" if ext.lower() in [".jpg", ".jpeg"] else "PNG"
        tmp = f"{base}.tmp-{os.getpid()}-{int(time.time()*1000)}{ext}"
        im.save(tmp, format=fmt, quality=91, subsampling=0)
        if os.path.exists(p):
            try:
                os.remove(p)
            except Exception:
                pass
        os.replace(tmp, p)
        print(f"Saved {p} ({os.path.getsize(p)//1024} kB)")

if __name__ == "__main__":
    # 1. GP-20087 + GP-20091 + GP-20095 Close Training Camera 4-Light Sheet (10 spots + <0.6m fadeWall)
    gp91_spots = ["cif", "kiosk", "armory", "hqPanel", "skullWindow", "lightSwitch", "rangeConsole", "corridor", "armoryRoom", "rangeBench", "fadeWall"]
    rows_91 = [
        [(os.path.join(GP91, f"gp91-{s}-{l}.png"), f"{s.upper()} · {l.upper()}", (135, 245, 165)) for l in LIGHTS]
        for s in gp91_spots
    ]
    im91 = make_grid(
        "GP-20087 + GP-20091 + GP-20095 — RTX 5080 WebGPU Close Training Camera & Fade (4 Lights)",
        "All 10 stations/rooms + <0.6m fadeWall across Noon/Overcast/Dusk/Night · E prompts in frame · Corridor/RangeBench marine centered (GP-20095)",
        rows_91, tw=460, th=258
    )
    save_multi(im91, [
        os.path.join(GP91, "sheet-4lights.jpg"),
        os.path.join(GP87, "sheet-4lights.jpg"),
        os.path.join(AG297, "sheet-gp20087-gp20091-4lights.jpg"),
        os.path.join(QA, "gp20091-sheet-4lights.jpg"),
    ])

    # 2. GP-20092 Continuous Station Approach Walk (4 Lights x 5 distances: 4.0m -> 2.4m -> 1.6m -> 0.8m -> 0.0m)
    steps = [40, 24, 16, 8, 0]
    rows_92 = [
        [(os.path.join(GP92, f"gp92-cif-{l}-step{st:02d}.png"), f"CIF {l.upper()} · d={st*0.1:.1f}m", (135, 225, 255)) for st in steps]
        for l in LIGHTS
    ]
    rows_92.append([
        (os.path.join(GP92, f"gp92-armory-noon-step{st:02d}.png"), f"ARMORY NOON · d={st*0.1:.1f}m", (255, 215, 120)) for st in steps
    ])
    rows_92.append([
        (os.path.join(GP92, f"gp92-armory-night-step{st:02d}.png"), f"ARMORY NIGHT · d={st*0.1:.1f}m", (200, 185, 255)) for st in steps
    ])
    im92 = make_grid(
        "GP-20092 — RTX 5080 WebGPU Continuous Station Approach Walk (4.0m -> 0.0m, Zero 5.42m Snap)",
        "Rows 1-4: CIF continuous walk in 4 lights · Rows 5-6: Armory walk in Noon & Night (0 inside-solid frames, smooth <0.5m/step)",
        rows_92, tw=410, th=230
    )
    save_multi(im92, [
        os.path.join(GP92, "approach-filmstrip-4lights.jpg"),
        os.path.join(AG297, "sheet-gp20092-approach-4lights.jpg"),
        os.path.join(QA, "gp20092-approach-filmstrip-4lights.jpg"),
    ])

    # 3. GP-20093 3P Range Aim & Station Framing (rangeBench & rangeConsole, hip & ADS x 4 Lights)
    rows_93 = []
    for spot in ["rangeBench", "rangeConsole"]:
        for aim in ["hip", "ads"]:
            rows_93.append([
                (os.path.join(GP93, f"gp93-{spot}-{aim}-{l}.png"), f"{spot} · {aim.upper()} · {l.upper()}", (135, 245, 165))
                for l in LIGHTS
            ])
    im93 = make_grid(
        "GP-20093 — RTX 5080 WebGPU 3P Range Aim & Crosshair Alignment (Hip & ADS, 4 Lights)",
        "Facing +z lane at rangeBench & rangeConsole: shoulder blend drops out so forward/aimTarget match baseline (<0.001m) & crosshair stays on lane",
        rows_93, tw=480, th=270
    )
    save_multi(im93, [
        os.path.join(GP93, "sheet-4lights.jpg"),
        os.path.join(AG297, "sheet-gp20093-aim-4lights.jpg"),
        os.path.join(QA, "gp20093-sheet-4lights.jpg"),
    ])

    # 4. GP-20088 Cross-Owner 01-04 Retake (AG-292 Before vs RTX 5080 4-Light After)
    ag292_map = {
        "01-perimeter": "cross-01-perimeter-post-embedded.png",
        "02-infirmary": "cross-02-infirmary-fence-wall-poke.png",
        "03-monitor":   "cross-03-range-monitor-pillar-clip.png",
        "04-cif":       "cross-04-cif-window-floating-gap.png",
    }
    rows_88 = []
    for cid in ["01-perimeter", "02-infirmary", "03-monitor", "04-cif"]:
        row = [(os.path.join(AG292, ag292_map[cid]), f"AG-292 BEFORE · {cid}", (240, 140, 120))]
        for l in LIGHTS:
            row.append((os.path.join(GP88, f"gp88-{cid}-{l}.png"), f"GP-20088 AFTER · {l.upper()}", (135, 245, 165)))
        rows_88.append(row)
    im88 = make_grid(
        "GP-20088 — RTX 5080 WebGPU Retake of AG-292 Cross-Owner Cameras (Before vs 4 Lights After)",
        "Col 1: AG-292 Before · Cols 2-5: RTX 5080 WebGPU After across Noon / Overcast / Dusk / Night (same sidecar cameras)",
        rows_88, tw=410, th=230
    )
    save_multi(im88, [
        os.path.join(GP88, "sheet-4lights.jpg"),
        os.path.join(AG297, "sheet-gp20088-props.jpg"),
        os.path.join(QA, "gp20088-sheet-4lights.jpg"),
    ])

    # 5. CE-2b Revolver 0.12s DA Pull + Pistol Trigger Index (4 Lights on Firing Line)
    rev_beats = [("0-rest", "REST"), ("1-mid", "MID PULL (~50ms)"), ("2-cock", "FULL COCK (~117ms)"), ("3-break", "SHOT BREAK (~133ms)")]
    rows_ce2_rev = [
        [(os.path.join(CE2, f"revolver-pull-{bk}-{l}.png"), f"REVOLVER {bl} · {l.upper()}", (255, 215, 120)) for bk, bl in rev_beats]
        for l in LIGHTS
    ]
    im_ce2_rev = make_grid(
        "CE-2b — RTX 5080 WebGPU 1P Revolver 0.12s Double-Action Pull on Firing Line (4 Lights)",
        "Hammer rises & cylinder advances one chamber smoothly from Rest -> Mid Pull -> Full Cock -> Shot Break across Noon / Overcast / Dusk / Night",
        rows_ce2_rev, tw=480, th=270
    )
    save_multi(im_ce2_rev, [
        os.path.join(CE2, "revolver-pull-4lights.jpg"),
        os.path.join(AG297, "sheet-ce2-controls.jpg"),
        os.path.join(QA, "ce2b-revolver-pull-4lights.jpg"),
    ])

    rows_ce2_pis = [
        [(os.path.join(CE2, f"pistol-index-0-rest-{l}.png"), f"PISTOL REST · {l.upper()}", (135, 225, 255)) for l in LIGHTS],
        [(os.path.join(CE2, f"pistol-index-1-press-{l}.png"), f"PISTOL SHOT (~33ms) · {l.upper()}", (135, 245, 165)) for l in LIGHTS],
        [(os.path.join(CE3, f"pistol-rack-beat-{l}.png"), f"CE-3c SLIDE RACK · {l.upper()}", (255, 210, 120)) for l in LIGHTS],
        [(os.path.join(CE3, f"kr7-handle-pull-{l}.png"), f"J77 KR-7 HANDLE PULL · {l.upper()}", (255, 195, 140)) for l in LIGHTS],
        [(os.path.join(CE3, f"revolver-reload-crane-{l}.png"), f"J78 REVOLVER CRANE · {l.upper()}", (205, 185, 255)) for l in LIGHTS],
    ]
    im_ce2_pis = make_grid(
        "CE-2b + CE-3 — RTX 5080 WebGPU 1P Pistol Index, Slide Rack, KR-7 Handle & Revolver Crane (4 Lights)",
        "Rows 1-2: Pistol index rest vs shot · Row 3: Pistol empty slide rack · Row 4: KR-7 canted handle pull · Row 5: Revolver cylinder crane reload",
        rows_ce2_pis, tw=480, th=270
    )
    save_multi(im_ce2_pis, [
        os.path.join(CE2, "pistol-index-4lights.jpg"),
        os.path.join(CE3, "reloads-4lights.jpg"),
        os.path.join(AG297, "sheet-ce3-reloads.jpg"),
        os.path.join(QA, "ce2b-ce3-pistol-kr7-revolver-4lights.jpg"),
    ])

    # 6. CE-3 Pump Shotgun KeyX Birdshot -> Buckshot Switch (4 Lights with HUD Ammo Line!)
    sg_beats = [
        ("0-rest", "0 BIRDSHOT REST"),
        ("1-unload-hull", "1 UNLOAD RED HULL OUT"),
        ("2-load-buck", "2 LOAD BLUE BUCK IN"),
        ("3-done", "3 BUCKSHOT READY"),
    ]
    rows_ce3_sg = [
        [(os.path.join(CE3, f"shotgun-x-{bk}-{l}.png"), f"{bl} · {l.upper()}", (135, 245, 165)) for bk, bl in sg_beats]
        for l in LIGHTS
    ]
    im_ce3_sg = make_grid(
        "CE-3 — RTX 5080 WebGPU 1P Pump Shotgun KeyX Ammo Switch: Birdshot -> Buckshot (4 Lights)",
        "Gun rolled 20 deg left -> forend worked per shell, red birdshot hull out of port -> blue buckshot shell loaded into port -> settled ready",
        rows_ce3_sg, tw=480, th=270
    )
    save_multi(im_ce3_sg, [
        os.path.join(CE3, "shotgun-x-change-4lights.jpg"),
        os.path.join(AG297, "sheet-ce3-shotgun-x-4lights.jpg"),
        os.path.join(QA, "ce3-shotgun-x-4lights.jpg"),
    ])

    # 7. Master Composite Sheet
    master_rows = [
        [
            (os.path.join(GP91, "gp91-cif-noon.png"), "GP-20091 CIF Orbit Pull (Noon)", (135, 245, 165)),
            (os.path.join(GP91, "gp91-corridor-noon.png"), "GP-20095 Corridor Framing (Noon)", (135, 245, 165)),
            (os.path.join(GP91, "gp91-fadeWall-noon.png"), "GP-20091 Close Wall Fade (Noon)", (135, 245, 165)),
            (os.path.join(GP92, "gp92-cif-noon-step00.png"), "GP-20092 CIF Arrival (Noon)", (135, 225, 255)),
        ],
        [
            (os.path.join(GP93, "gp93-rangeBench-hip-noon.png"), "GP-20093 RangeBench Aim (Noon)", (135, 245, 165)),
            (os.path.join(GP93, "gp93-rangeConsole-ads-noon.png"), "GP-20093 RangeConsole ADS (Noon)", (135, 245, 165)),
            (os.path.join(GP88, "gp88-02-infirmary-noon.png"), "GP-20088 Infirmary Fence (Noon)", (255, 215, 120)),
            (os.path.join(GP88, "gp88-03-monitor-noon.png"), "GP-20088 Range Monitor (Noon)", (255, 215, 120)),
        ],
        [
            (os.path.join(CE2, "revolver-pull-0-rest-noon.png"), "CE-2b Revolver Rest (Noon)", (255, 215, 120)),
            (os.path.join(CE2, "revolver-pull-2-cock-noon.png"), "CE-2b Revolver Full Cock (Noon)", (255, 215, 120)),
            (os.path.join(CE2, "revolver-pull-3-break-noon.png"), "CE-2b Revolver Shot Break (Noon)", (255, 215, 120)),
            (os.path.join(CE2, "pistol-index-1-press-noon.png"), "CE-2b Pistol Index Shot (Noon)", (135, 245, 165)),
        ],
        [
            (os.path.join(CE3, "pistol-rack-beat-noon.png"), "CE-3c Pistol Slide Rack (Noon)", (255, 210, 120)),
            (os.path.join(CE3, "kr7-handle-pull-noon.png"), "CE-3 KR-7 Handle Pull (Noon)", (255, 195, 140)),
            (os.path.join(CE3, "shotgun-x-1-unload-hull-noon.png"), "CE-3 Shotgun Hull Eject (Noon)", (135, 245, 165)),
            (os.path.join(CE3, "revolver-reload-crane-noon.png"), "CE-3 Revolver Crane Reload (Noon)", (205, 185, 255)),
        ]
    ]
    im_master = make_grid(
        "AG-297 Master Review Sheet — GPU Looks & 4-Light Shots on NVIDIA GeForce RTX 5080 WebGPU",
        "Row 1: GP-20087/91/92/95 Camera Collision & Approaches · Row 2: GP-20093 Range Aim & GP-20088 Prop Seating · Row 3: CE-2b Controls · Row 4: CE-3 Reloads",
        master_rows, tw=460, th=258
    )
    save_multi(im_master, [
        os.path.join(AG297, "sheet.jpg"),
        os.path.join(QA, "sheet.jpg")
    ])
    print("All AG-297 composite sheets created successfully!")
