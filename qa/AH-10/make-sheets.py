import os, sys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.abspath(__file__))
TAG = sys.argv[1] if len(sys.argv) > 1 else "before"

VIEWS = [
    ("01-south-facade-wide", "South facade wide (mural, banner, armor, alarm, terminal)"),
    ("02-south-mural-banner-close", "South center: mural, PGB banner, tag wall & concrete"),
    ("03-south-duty-teleprinter-close", "South center: Duty Board, Teleprinter & Radio Set"),
    ("04-south-alarm-damaged-close", "South east: Alarm cabinet & steel/concrete trim"),
    ("05-damaged-terminal-close", "South west: Damaged Terminal PCB, glass & steel"),
    ("06-west-face-wide", "West facade wide: Intake, Kiosk, Ladder & hoods"),
    ("07-west-kiosk-ladder-close", "West close: Supply Kiosk, hazard header & HQ Ladder"),
    ("08-west-intake-close", "West close: Skull Intake, tray, shutter & specimens"),
    ("09-north-face-wide", "North facade wide: Lockdown door, utility box & armor"),
    ("10-north-lockdown-door-close", "North close: LOCKDOWN clawed blast door & bar"),
    ("11-east-face-wide", "East facade wide: CIF, Armory, pilasters & armor"),
    ("12-east-armory-cif-close", "East close: Armory cabinet, mesh screen & CIF bay"),
    ("13-roof-deck-overview", "Roof overview: deck, klaxon tower, stacks, fans & wire"),
    ("14-roof-klaxon-fans-close", "On-roof 1P: deck surface, klaxon tower & air handler"),
    ("15-corner-armor-close", "SW corner close: bolted corner armor, rivets & concrete"),
    ("16-south-dusk", "Dusk raking light: metallic & concrete normal relief"),
    ("17-south-night", "Night: sodium lamps, red firing slits & signage glow"),
    ("18-west-rain", "Overcast / Rainstorm: diffuse & roughness read"),
]

try:
    FONT = ImageFont.truetype("C:/Windows/Fonts/consolab.ttf", 18)
except Exception:
    FONT = ImageFont.load_default()

def make_grid(folder, out_name, items, cols=3):
    tw, th, bar = 640, 360, 28
    rows = (len(items) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * tw, rows * (th + bar)), (18, 20, 22))
    draw = ImageDraw.Draw(sheet)
    for idx, (vid, label) in enumerate(items):
        p = os.path.join(folder, f"{vid}.png")
        if not os.path.exists(p):
            continue
        im = Image.open(p).convert("RGB").resize((tw, th), Image.Resampling.LANCZOS)
        r, c = divmod(idx, cols)
        x0, y0 = c * tw, r * (th + bar)
        draw.rectangle([x0, y0, x0 + tw, y0 + bar], fill=(28, 32, 34))
        draw.text((x0 + 8, y0 + 5), f"{vid[:2]} {label[:56]}", fill=(230, 224, 200), font=FONT)
        sheet.paste(im, (x0, y0 + bar))
    out_p = os.path.join(folder, out_name)
    sheet.save(out_p, quality=90)
    print(f"Wrote {out_p} ({sheet.width}x{sheet.height})")

tag_dir = os.path.join(ROOT, TAG)
make_grid(tag_dir, f"sheet-1-south-west-{TAG}.jpg", VIEWS[0:9])
make_grid(tag_dir, f"sheet-2-north-east-roof-lights-{TAG}.jpg", VIEWS[9:18])

before_dir = os.path.join(ROOT, "before")
after_dir = os.path.join(ROOT, "after")
if os.path.isdir(before_dir) and os.path.isdir(after_dir):
    ba_dir = os.path.join(ROOT, "before-after")
    os.makedirs(ba_dir, exist_ok=True)
    pw, ph, bar = 800, 450, 30
    for g_idx in range(0, len(VIEWS), 5):
        chunk = VIEWS[g_idx:g_idx + 5]
        sheet = Image.new("RGB", (pw * 2 + 8, len(chunk) * (ph + bar)), (16, 18, 20))
        draw = ImageDraw.Draw(sheet)
        for r, (vid, label) in enumerate(chunk):
            y0 = r * (ph + bar)
            pb = os.path.join(before_dir, f"{vid}.png")
            pa = os.path.join(after_dir, f"{vid}.png")
            draw.rectangle([0, y0, pw, y0 + bar], fill=(32, 34, 36))
            draw.rectangle([pw + 8, y0, pw * 2 + 8, y0 + bar], fill=(24, 38, 30))
            draw.text((10, y0 + 6), f"BEFORE · {vid} — {label}", fill=(220, 215, 195), font=FONT)
            draw.text((pw + 18, y0 + 6), f"AFTER · {vid} — {label}", fill=(175, 240, 185), font=FONT)
            if os.path.exists(pb):
                sheet.paste(Image.open(pb).convert("RGB").resize((pw, ph), Image.Resampling.LANCZOS), (0, y0 + bar))
            if os.path.exists(pa):
                sheet.paste(Image.open(pa).convert("RGB").resize((pw, ph), Image.Resampling.LANCZOS), (pw + 8, y0 + bar))
        out_p = os.path.join(ba_dir, f"ba-{g_idx // 5 + 1}.jpg")
        sheet.save(out_p, quality=90)
        print(f"Wrote {out_p} ({sheet.width}x{sheet.height})")
