import os
from PIL import Image, ImageDraw, ImageFont

V1 = r"C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-31-AG-168"
V2 = r"C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-31-AG-168\v2"
AG164 = r"C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-31-AG-164"

def make_grid(rows, out_path, title):
    TW, TH = 480, 270
    PAD = 14
    HEADER_H = 54
    ROW_TITLE_H = 28
    LABEL_H = 24
    cols = 4
    total_w = PAD + cols * (TW + PAD)
    total_h = HEADER_H + len(rows) * (ROW_TITLE_H + TH + LABEL_H + PAD) + PAD
    sheet = Image.new("RGB", (total_w, total_h), (16, 18, 22))
    draw = ImageDraw.Draw(sheet)
    try:
        f_title = ImageFont.truetype("arialbd.ttf", 22)
        f_row = ImageFont.truetype("arialbd.ttf", 15)
        f_lbl = ImageFont.truetype("arial.ttf", 13)
    except:
        f_title = f_row = f_lbl = ImageFont.load_default()

    draw.text((PAD, 14), title, fill=(240, 244, 248), font=f_title)
    y = HEADER_H
    for r_title, items in rows:
        draw.text((PAD, y), r_title, fill=(130, 195, 255), font=f_row)
        y += ROW_TITLE_H
        x = PAD
        for path, lbl in items:
            if os.path.exists(path):
                im = Image.open(path).convert("RGB").resize((TW, TH), Image.Resampling.LANCZOS)
                sheet.paste(im, (x, y))
            else:
                draw.rectangle([x, y, x + TW, y + TH], fill=(40, 24, 24), outline=(180, 60, 60))
                draw.text((x + 12, y + 120), f"MISSING: {os.path.basename(path)}", fill=(255, 120, 120), font=f_lbl)
            draw.rectangle([x, y, x + TW, y + TH], outline=(65, 72, 82), width=1)
            draw.text((x + 4, y + TH + 4), lbl, fill=(215, 220, 228), font=f_lbl)
            x += TW + PAD
        y += TH + LABEL_H + PAD

    sheet.save(out_path, quality=92)
    print("Saved:", out_path, sheet.size)

rows_vm = [
    ("Row 1: Hip & ADS — CL-281 v2 (After Twists & Wide Elbows) vs v1 vs ?vm=0", [
        (os.path.join(V2, "vm-hip.png"), "CL-281 v2: vm-hip (Pistol out 0.46m, wide elbows)"),
        (os.path.join(V1, "vm-hip.png"), "CL-281 v1: vm-hip (Before fix)"),
        (os.path.join(V2, "vm-ads.png"), "CL-281 v2: vm-ads (Notch 0.42m)"),
        (os.path.join(V2, "old-hip.png"), "Old FP (?vm=0): old-hip"),
    ]),
    ("Row 2: Reload Beats 1-4 in CL-281 v2 (Grab, Pouch, Seat, Slide)", [
        (os.path.join(V2, "vm-reload-grab.png"), "CL-281 v2: vm-reload-grab (u=0.18)"),
        (os.path.join(V2, "vm-reload-pouch.png"), "CL-281 v2: vm-reload-pouch (u=0.45)"),
        (os.path.join(V2, "vm-reload-seat.png"), "CL-281 v2: vm-reload-seat (u=0.62, mirrored +x)"),
        (os.path.join(V2, "vm-reload-slide.png"), "CL-281 v2: vm-reload-slide (u=0.83, mirrored +x)"),
    ]),
    ("Row 3: Look Down, Look Up, Turn Sway, and Post-ADS Return (v2)", [
        (os.path.join(V2, "vm-look-down.png"), "CL-281 v2: vm-look-down (pitch=-0.9)"),
        (os.path.join(V2, "vm-look-up.png"), "CL-281 v2: vm-look-up (pitch=+0.5)"),
        (os.path.join(V2, "vm-turn.png"), "CL-281 v2: vm-turn (sway)"),
        (os.path.join(V2, "vm-hip-again.png"), "CL-281 v2: vm-hip-again (post-ADS)"),
    ]),
    ("Row 4: HQ Wall Walk, Roof Shade vs Outdoor Sun (v2)", [
        (os.path.join(V2, "vm-wall-hip.png"), "CL-281 v2: vm-wall-hip (Against HQ Wall)"),
        (os.path.join(V2, "vm-wall-ads.png"), "CL-281 v2: vm-wall-ads (Against HQ Wall)"),
        (os.path.join(V2, "vm-hq-roof-hip.png"), "CL-281 v2: vm-hq-roof-hip (In HQ Roof Shade)"),
        (os.path.join(V2, "vm-outdoor-sun-hip.png"), "CL-281 v2: vm-outdoor-sun-hip (Direct Sun)"),
    ]),
    ("Row 5: Night 20 & Night NVG Goggles (v2)", [
        (os.path.join(V2, "vm-night20-hip.png"), "CL-281 v2: vm-night20-hip (Night 20 No NVG)"),
        (os.path.join(V2, "vm-night20-ads.png"), "CL-281 v2: vm-night20-ads (Night 20 No NVG)"),
        (os.path.join(V2, "vm-night20-nvg-hip.png"), "CL-281 v2: vm-night20-nvg-hip (Night 20 NVG ON)"),
        (os.path.join(V2, "vm-night20-nvg-ads.png"), "CL-281 v2: vm-night20-nvg-ads (Night 20 NVG ON)"),
    ]),
]

rows_cl283_284 = [
    ("Row 1: CL-283 (J37) — NVG Goggles Down at Noon (HQ & Valley Washout)", [
        (os.path.join(V2, "cl283-hq-noon-nvg-off.png"), "CL-283: HQ Noon (NVG Off)"),
        (os.path.join(V2, "cl283-hq-noon-nvg-on.png"), "CL-283: HQ Noon (NVG ON - nvgImageTubeDay)"),
        (os.path.join(V2, "cl283-valley-noon-nvg-off.png"), "CL-283: Valley Noon (NVG Off)"),
        (os.path.join(V2, "cl283-valley-noon-nvg-on.png"), "CL-283: Valley Noon (NVG ON - nvgImageTubeDay)"),
    ]),
    ("Row 2: CL-284 (J41, J42) — HQ East Side (CIF & Armory Doors Clear), Yard Above & South Gap Ruts", [
        (os.path.join(V2, "cl284-hq-east-from-cif-door.png"), "CL-284: From CIF Door (Crates/Tent Cleared)"),
        (os.path.join(V2, "cl284-hq-east-from-armory-door.png"), "CL-284: From Armory Door (Crates at NE 7.7, 7.7)"),
        (os.path.join(V2, "cl284-yard-above.png"), "CL-284: FOB Yard From Above (Blend & Layout)"),
        (os.path.join(V2, "cl284-south-gap-ruts.png"), "CL-284: South Gap Draped Tyre Ruts (fob-tyre-ruts)"),
    ]),
    ("Row 3: CL-284 (J43, J44) — Relay No Cone & Mast Skeleton Boots Yank / Spread-Eagle Fall", [
        (os.path.join(V2, "cl284-relay-no-cone.png"), "CL-284: Relay Cabinet/Vault (No Floating Cone)"),
        (os.path.join(V2, "cl284-mast-1-pull.png"), "CL-284: Mast Skeleton Pull 1 (Legs Dragged)"),
        (os.path.join(V2, "cl284-mast-2-boots-half-off.png"), "CL-284: Mast Skeleton Pull 3 (Boots Half Off Shins)"),
        (os.path.join(V2, "cl284-mast-3-fall.png"), "CL-284: Mast Skeleton Falling Spread-Eagled"),
    ]),
    ("Row 4: CL-284 — Mast Skeleton Landed Spread-Eagled & HQ East Wide View", [
        (os.path.join(V2, "cl284-mast-4-ground.png"), "CL-284: Mast Skeleton Landed Spread-Eagled at Foot"),
        (os.path.join(V2, "cl284-hq-east-wide.png"), "CL-284: HQ East Wide View (CIF & Armory Doors Clear)"),
        (os.path.join(V2, "cl284-yard-above.png"), "CL-284: FOB Yard From Above (fob-ground-blend)"),
        (os.path.join(V2, "cl284-south-gap-ruts.png"), "CL-284: South Gap Draped Tyre Ruts (fob-tyre-ruts)"),
    ]),
]

make_grid(rows_vm, os.path.join(V2, "sheet.jpg"), "AG-168 v2: CL-281 Stage 1 Pistol View Gun (After 20:30Z Fixes)")
make_grid(rows_cl283_284, os.path.join(V2, "cl283-284-sheet.jpg"), "AG-168: CL-283 Noon NVG Washout & CL-284 Yard, Ruts, Relay & Mast Skeleton")
