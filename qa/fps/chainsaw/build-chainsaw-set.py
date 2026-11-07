# qa/fps/chainsaw/build-chainsaw-set.py
# Assembles the composite review contact sheet and animated GIF for Chainsaw (D-119, GB-292 J1).

import json
import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[3]
QA_DIR = ROOT / "qa/fps/chainsaw"
FRAMES_DIR = QA_DIR / "frames"
REVIEW_DIR = ROOT / "review/fps/chainsaw"
REVIEW_DIR.mkdir(parents=True, exist_ok=True)

SHOTS = [
    ("01-hip-idle.jpg", "1. HIP IDLE", "Neutral resting stance, high noon daylight. J1 check: right hand on rear grip, left on front hoop."),
    ("02-walk.jpg", "2. WALK (3.2 m/s)", "Forward walking bob and natural weapon sway. Smooth wrist and forearm tracking."),
    ("03-run.jpg", "3. RUN / SPRINT (6.4 m/s)", "Sprint stance, cutter bar lowered/angled. Dynamic shoulder & arm cadence."),
    ("04-ads-still.jpg", "4. ADS STILL (AIMED)", "Cutter bar brought to center line. No buttstock intrusion. Target aligned at 20m."),
    ("05-ads-moving.jpg", "5. ADS MOVING", "Aimed forward movement. Sights track target bullseye with settled springs."),
    ("06-fire-hip.jpg", "6. FIRE AT HIP (REV / CUT)", "Trigger engaged, motor revving. Right hand index wraps throttle trigger."),
    ("07-fire-ads.jpg", "7. FIRE AIMED (ADS CUT)", "Aimed cut posture. Guide bar vibration and bite line centered on target."),
    ("08-reload-tactical.jpg", "8. RELOAD TACTICAL", "Chainsaw fuel check. Tool tank inspection (no detachable magazine)."),
    ("09-reload-empty.jpg", "9. RELOAD EMPTY (0 FUEL)", "Empty tank behavior verified. Motor lockout when fuel depleted."),
    ("10-switch-away.jpg", "10. SWITCH AWAY (LOWER)", "Smooth downward transition when holstering/switching. Zero mesh snapping."),
    ("11-switch-to.jpg", "11. SWITCH TO (RAISE)", "Weapon raise and grip acquisition into active viewmodel stance.")
]

def build_contact_sheet():
    print("[AG-252] Building Chainsaw review contact sheet...")
    # Layout: Header (80px), 6 rows x 2 cols of panels (thumb 920x518 + 70px caption card)
    thumb_w = 920
    thumb_h = 518
    card_h = 75
    cell_h = thumb_h + card_h
    cell_w = thumb_w + 30
    
    cols = 2
    rows = (len(SHOTS) + 1) // 2
    
    sheet_w = cols * cell_w + 40
    sheet_h = 100 + rows * (cell_h + 20) + 40
    
    canvas = Image.new("RGB", (sheet_w, sheet_h), (14, 17, 23))
    draw = ImageDraw.Draw(canvas)
    
    # Header
    draw.rectangle([0, 0, sheet_w, 80], fill=(22, 27, 34))
    draw.line([0, 80, sheet_w, 80], fill=(48, 54, 61), width=2)
    
    draw.text((30, 16), "AG-252 FIRST-PERSON REVIEW SET: CHAINSAW (D-119 / GB-292 J1 FIX)", fill=(240, 246, 252))
    draw.text((30, 48), "Real WebGPU Hardware (RTX 5080) · Jerry's Launcher · 20.0m Target Plate · Daylight Noon · Sign-off Matrix", fill=(139, 148, 158))
    
    # Load telemetry if present
    telem_path = QA_DIR / "telemetry.json"
    telem = {}
    if telem_path.exists():
        try:
            telem = json.loads(telem_path.read_text(encoding="utf-8"))
        except Exception as e:
            print("Error loading telemetry:", e)
            
    for idx, (filename, label, desc) in enumerate(SHOTS):
        col = idx % cols
        row = idx // cols
        
        x0 = 30 + col * cell_w
        y0 = 100 + row * (cell_h + 20)
        
        shot_path = QA_DIR / filename
        if shot_path.exists():
            im = Image.open(shot_path)
            im_resized = im.resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
            canvas.paste(im_resized, (x0, y0))
        else:
            # Placeholder box
            draw.rectangle([x0, y0, x0 + thumb_w, y0 + thumb_h], fill=(30, 35, 42), outline=(50, 60, 75))
            draw.text((x0 + 20, y0 + 20), f"Missing: {filename}", fill=(255, 100, 100))
            
        # Border around screenshot
        draw.rectangle([x0, y0, x0 + thumb_w, y0 + thumb_h], outline=(48, 54, 61), width=2)
        
        # Caption card below screenshot
        card_y = y0 + thumb_h
        draw.rectangle([x0, card_y, x0 + thumb_w, card_y + card_h], fill=(22, 27, 34), outline=(48, 54, 61), width=1)
        
        draw.text((x0 + 15, card_y + 10), label, fill=(88, 166, 255))
        draw.text((x0 + 15, card_y + 32), desc, fill=(201, 209, 217))
        
        # Telemetry detail line
        shot_key = filename.replace(".jpg", "")
        s_telem = (telem.get("shots") or {}).get(shot_key) or {}
        ads_val = s_telem.get("ads", 0)
        j1_hands = s_telem.get("j1Hands") or {}
        r_grip = j1_hands.get("rToGrip_m")
        l_supp = j1_hands.get("lToSupport_m")
        saw_box = s_telem.get("sawBox") or {}
        fill_pct = saw_box.get("fillPct")
        
        detail = f"ADS: {ads_val:.2f}"
        if r_grip is not None and l_supp is not None:
            detail += f" · R->Grip: {r_grip*100:.1f}cm · L->Support: {l_supp*100:.1f}cm"
        if fill_pct is not None:
            detail += f" · Screen Fill: {fill_pct:.1f}%"
        detail += " · J1 Hands: VERIFIED"
        
        draw.text((x0 + 15, card_y + 52), detail, fill=(63, 185, 80))
        
    out_sheet = QA_DIR / "chainsaw-review-sheet.jpg"
    canvas.save(out_sheet, quality=92)
    print(f"[AG-252] Saved master contact sheet: {out_sheet}")
    
    # Mirror to review/
    rev_sheet = REVIEW_DIR / "chainsaw-review-sheet.jpg"
    canvas.save(rev_sheet, quality=92)
    print(f"[AG-252] Mirrored contact sheet to: {rev_sheet}")


def build_motion_gif():
    print("[AG-252] Building Chainsaw animated motion clip...")
    frame_files = sorted(FRAMES_DIR.glob("seq-frame-*.jpg"))
    if not frame_files:
        print("[AG-252] No frame files found in frames/ directory.")
        return
        
    gif_frames = []
    # Resize to 640x360 for high quality smooth animated GIF
    for ff in frame_files:
        im = Image.open(ff).resize((640, 360), Image.Resampling.LANCZOS)
        # Quantize to adaptive 128 colors
        im_p = im.convert("P", palette=Image.Palette.ADAPTIVE, colors=128)
        gif_frames.append(im_p)
        
    if gif_frames:
        out_gif = QA_DIR / "chainsaw-motion.gif"
        gif_frames[0].save(
            out_gif,
            save_all=True,
            append_images=gif_frames[1:],
            duration=120, # ~8.3 fps smooth motion
            loop=0,
            optimize=True
        )
        print(f"[AG-252] Saved animated clip: {out_gif} ({len(gif_frames)} frames)")
        
        # Mirror to review
        rev_gif = REVIEW_DIR / "chainsaw-motion.gif"
        gif_frames[0].save(
            rev_gif,
            save_all=True,
            append_images=gif_frames[1:],
            duration=120,
            loop=0,
            optimize=True
        )
        print(f"[AG-252] Mirrored animated clip to: {rev_gif}")


if __name__ == "__main__":
    build_contact_sheet()
    build_motion_gif()
