# qa/fps/wasp/build-wasp-set.py
# Assembles the composite review contact sheet and animated GIF for Wasp SMG (D-119).

import json
import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[3]
QA_DIR = ROOT / "qa/fps/wasp"
FRAMES_DIR = QA_DIR / "frames"
REVIEW_DIR = ROOT / "review/fps/wasp"
REVIEW_DIR.mkdir(parents=True, exist_ok=True)

SHOTS = [
    ("01-hip-idle.jpg", "1. HIP IDLE", "Neutral resting hold, high noon daylight. Stockless MAC-10 framing (GP-20023, J11)."),
    ("02-walk.jpg", "2. WALK (3.2 m/s)", "Forward walking cadence and natural weapon sway. Smooth forearm and wrist bobbing."),
    ("03-run.jpg", "3. RUN / SPRINT (6.4 m/s)", "Sprint carry stance. No elbow pop up/down; wrist twist rate-limited."),
    ("04-ads-still.jpg", "4. ADS STILL (AIMED)", "Aimed sight picture. Sight tower aligned on 20.0m target plate. Stockless rear clear."),
    ("05-ads-moving.jpg", "5. ADS MOVING", "Aimed forward movement (2.0 m/s). Point of aim tracks target with settled springs."),
    ("06-fire-hip.jpg", "6. FIRE AT HIP", "Mid-action shot: muzzle flash & gold tracer line leaving barrel; slide cycling rearward."),
    ("07-fire-ads.jpg", "7. FIRE AIMED (ADS FIRE)", "Mid-action aimed fire: muzzle flash & tracer streak down bore axis; sights track target."),
    ("08-reload-tactical.jpg", "8. RELOAD TACTICAL (10/32, u=0.60)", "Tactical swap (rounds left): left hand retrieves fresh stick mag from pouch into well."),
    ("09-reload-empty.jpg", "9. RELOAD EMPTY (0/32, u=0.60)", "Empty reload: fresh mag seated; charging pull (CL-306 low and ahead) follows."),
    ("10-switch-away.jpg", "10. SWITCH AWAY (LOWER)", "Downward holstering transition when swapping weapons. Zero mesh clipping or popping."),
    ("11-switch-to.jpg", "11. SWITCH TO (RAISE)", "Weapon raise and grip acquisition returning to active viewmodel ready stance.")
]

def build_contact_sheet():
    print("[AG-252] Building Wasp SMG review contact sheet...")
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
    
    draw.text((30, 16), "AG-252 FIRST-PERSON REVIEW SET: WASP SMG (D-119)", fill=(240, 246, 252))
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
            draw.rectangle([x0, y0, x0 + thumb_w, y0 + thumb_h], fill=(30, 35, 42), outline=(50, 60, 75))
            draw.text((x0 + 20, y0 + 20), f"Missing: {filename}", fill=(255, 100, 100))
            
        draw.rectangle([x0, y0, x0 + thumb_w, y0 + thumb_h], outline=(48, 54, 61), width=2)
        
        card_y = y0 + thumb_h
        draw.rectangle([x0, card_y, x0 + thumb_w, card_y + card_h], fill=(22, 27, 34), outline=(48, 54, 61), width=1)
        
        draw.text((x0 + 15, card_y + 10), label, fill=(88, 166, 255))
        draw.text((x0 + 15, card_y + 32), desc, fill=(201, 209, 217))
        
        shot_key = filename.replace(".jpg", "")
        s_telem = (telem.get("shots") or {}).get(shot_key) or {}
        ads_val = s_telem.get("ads", 0)
        wrist_r = s_telem.get("wristBendR")
        wrist_l = s_telem.get("wristBendL")
        gun_box = s_telem.get("gunBox") or {}
        fill_pct = gun_box.get("fillPct")
        screen_err = s_telem.get("screenError")
        reload_u = s_telem.get("reloadU")
        
        detail = f"ADS: {ads_val:.2f}"
        if reload_u is not None:
            detail += f" · Reload Progress u: {reload_u:.2f}"
        elif wrist_r is not None and wrist_l is not None:
            detail += f" · Wrist Bend R: {wrist_r:.2f}rad L: {wrist_l:.2f}rad (max 0.87)"
        if fill_pct is not None:
            detail += f" · Screen Fill: {fill_pct:.1f}%"
        if screen_err:
            detail += f" · ERROR: {screen_err[:30]}"
            draw.text((x0 + 15, card_y + 52), detail, fill=(248, 81, 73))
        else:
            detail += " · Console Errors: 0"
            draw.text((x0 + 15, card_y + 52), detail, fill=(63, 185, 80))
        
    out_sheet = QA_DIR / "wasp-review-sheet.jpg"
    canvas.save(out_sheet, quality=92)
    print(f"[AG-252] Saved master contact sheet: {out_sheet}")
    
    rev_sheet = REVIEW_DIR / "wasp-review-sheet.jpg"
    canvas.save(rev_sheet, quality=92)
    print(f"[AG-252] Mirrored contact sheet to: {rev_sheet}")


def build_motion_gif():
    print("[AG-252] Building Wasp SMG animated motion clip...")
    frame_files = sorted(FRAMES_DIR.glob("seq-frame-*.jpg"))
    if not frame_files:
        print("[AG-252] No frame files found in frames/ directory.")
        return
        
    gif_frames = []
    for ff in frame_files:
        im = Image.open(ff).resize((640, 360), Image.Resampling.LANCZOS)
        pal_im = im.convert("P", palette=Image.Palette.ADAPTIVE, colors=128)
        gif_frames.append(pal_im)
        
    out_gif = QA_DIR / "wasp-motion.gif"
    gif_frames[0].save(
        out_gif,
        save_all=True,
        append_images=gif_frames[1:],
        duration=100,
        loop=0,
        optimize=True
    )
    print(f"[AG-252] Saved motion GIF: {out_gif} ({len(gif_frames)} frames)")
    
    rev_gif = REVIEW_DIR / "wasp-motion.gif"
    gif_frames[0].save(
        rev_gif,
        save_all=True,
        append_images=gif_frames[1:],
        duration=100,
        loop=0,
        optimize=True
    )
    print(f"[AG-252] Mirrored motion GIF to: {rev_gif}")


if __name__ == "__main__":
    build_contact_sheet()
    build_motion_gif()
    print("[AG-252] Wasp SMG review assets generated successfully.")
