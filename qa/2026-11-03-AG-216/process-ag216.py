# AG-216: Story Places Rings Night 3 Verification Contact Sheet Generator
import json
import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(".")
OUT_DIR = ROOT / "qa/2026-11-03-AG-216"

def get_font(size):
    try:
        return ImageFont.truetype("arial.ttf", size)
    except Exception:
        return ImageFont.load_default()

def process_night_sheet():
    print("[Python] Building 9-panel Night 3 Story Rings Shut vs Open comparison sheet...")
    panels = [
        # Row 1: Depot Shut
        ("night-depot-shut-00s.png", "1. Depot (Shut) · 00s: 24 Dead Spawned Outside (Screamers Active)"),
        ("night-depot-shut-30s.png", "2. Depot (Shut) · 30s: Wall Holds · Screamer Howl Spawns Feral Inside (FAIL)"),
        ("night-depot-shut-60s.png", "3. Depot (Shut) · 60s: Watch End · 5 Dead Clawed Inside via Line 59918 (FAIL)"),

        # Row 2: Hikers Shut
        ("night-hikers-shut-00s.png", "4. Hikers Camp (Shut) · 00s: 24 Dead Spawned Outside (Screamers Active)"),
        ("night-hikers-shut-30s.png", "5. Hikers Camp (Shut) · 30s: Thicket Holds · Screamer Direct Spawn Leaked (FAIL)"),
        ("night-hikers-shut-60s.png", "6. Hikers Camp (Shut) · 60s: Watch End · 5 Dead Trapped on Inside Wall Face (FAIL)"),

        # Row 3: Depot Open
        ("night-depot-open-00s.png", "7. Depot (Open) · 00s: Price Key Opens Gate · Leaves Swung 1.0"),
        ("night-depot-open-30s.png", "8. Depot (Open) · 30s: Dead Breach Corridor · Entering Through Open Gate (PASS)"),
        ("night-depot-open-60s.png", "9. Depot (Open) · 60s: Clearing Swarmed · 32 Dead Freely Enter via Gate (PASS)")
    ]

    p_w, p_h = 480, 270
    cols = 3
    rows = 3
    header_h = 145
    footer_h = 45

    canvas_w = cols * p_w + 40 # 1440 + 40 = 1480
    canvas_h = header_h + rows * p_h + 35 + footer_h # 145 + 810 + 35 + 45 = 1035

    canvas = Image.new("RGB", (canvas_w, canvas_h), color=(12, 16, 22))
    draw = ImageDraw.Draw(canvas)

    font_title = get_font(22)
    font_hdr = get_font(14)
    font_bold = get_font(13)
    font_text = get_font(11)

    # Header background
    draw.rectangle([0, 0, canvas_w, header_h], fill=(18, 24, 34))
    draw.line([0, header_h, canvas_w, header_h], fill=(45, 65, 90), width=2)

    draw.text((25, 14), "CL-296 / AG-216 — Night 3 Dead Containment at Story Rings (Recheck)", fill=(255, 215, 80), font=font_title)
    draw.text((25, 46), "Hardware: Jerry's Desktop (NVIDIA RTX 5080 WebGPU) · First-Person Launcher View · ?gates=1&chaingates=1", fill=(180, 205, 230), font=font_hdr)

    # Status Pill: DEFECT ISOLATED
    draw.rectangle([canvas_w - 290, 16, canvas_w - 25, 54], fill=(130, 30, 25), outline=(220, 60, 50), width=2)
    draw.text((canvas_w - 275, 24), "DEFECT ISOLATED (1/3 PASS)", fill=(255, 255, 255), font=font_title)

    draw.text((25, 78), "CL-296 Fix Verification: screamerPull & groundRiseSpotOk held (0 riseOk leaks). Open Depot watch: 100% PASS (32 dead in).", fill=(100, 220, 150), font=font_bold)
    draw.text((25, 100), "Remaining Defect: index.html:59913-59922 screamer direct howl spawn loop lacks storyRingShut(spot2.x, spot2.z) check.", fill=(255, 120, 110), font=font_bold)
    draw.text((25, 120), "When zombies.length < MAX_ZOMBIES, screamer calls spawnZombie directly at r=13-21m, clawing shambler/ferals inside shut rings.", fill=(180, 195, 215), font=font_text)

    for idx, (fname, label) in enumerate(panels):
        fpath = OUT_DIR / fname
        col = idx % cols
        row = idx // cols
        x = 15 + col * (p_w + 6)
        y = header_h + 10 + row * (p_h + 8)

        if fpath.exists():
            pim = Image.open(fpath).resize((p_w, p_h), Image.Resampling.LANCZOS)
            canvas.paste(pim, (x, y))
        else:
            draw.rectangle([x, y, x + p_w, y + p_h], fill=(30, 35, 45))

        # Border color based on row (shut vs open)
        border_col = (180, 50, 40) if idx < 6 else (50, 160, 80)
        draw.rectangle([x, y, x + p_w, y + p_h], outline=border_col, width=2)
        draw.rectangle([x, y + p_h - 24, x + p_w, y + p_h], fill=(10, 14, 20, 220))
        draw.text((x + 8, y + p_h - 20), label, fill=(240, 240, 240), font=font_text)

    # Footer
    draw.rectangle([0, canvas_h - footer_h, canvas_w, canvas_h], fill=(16, 21, 28))
    draw.line([0, canvas_h - footer_h, canvas_w, canvas_h - footer_h], fill=(35, 50, 70), width=1)
    footer_text = "Google Antigravity Real-GPU Visual Testing · Tiny Trek v1.2 · Evidence generated under shared game-test slot"
    draw.text((25, canvas_h - 32), footer_text, fill=(130, 150, 175), font=font_text)

    out_sheet = OUT_DIR / "story-rings-night3-shut-vs-open.jpg"
    canvas.save(out_sheet, quality=90)
    print(f"[Python] Saved Night 3 comparison sheet: {out_sheet}")

if __name__ == "__main__":
    process_night_sheet()
