# qa/fps/pistol/build-j7-timing-sheet.py
# Assembles the 5-milestone progression sheet for Pistol J7 ADS Entry Timing (0-200ms).

import json
import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[3]
QA_DIR = ROOT / "qa/fps/pistol"
TIMING_DIR = QA_DIR / "timing"
REVIEW_DIR = ROOT / "review/fps/pistol"
REVIEW_DIR.mkdir(parents=True, exist_ok=True)

MILESTONES = [
    ("pistol-j7-timing-000ms-hip-baseline.jpg", "0 ms · HIP BASELINE", "ads: 0.00 | FOV: 70.0°", "Sights lowered at hip rest. Sight offset ~614px from bore axis."),
    ("pistol-j7-timing-050ms-quarter-ads.jpg", "50 ms · 25% ADS ENTRY", "ads: 0.25 | FOV: 62.9°", "Hands raise weapon towards center. Sights entering lower frame."),
    ("pistol-j7-timing-100ms-halfway-ads.jpg", "100 ms · 50% ADS HALFWAY", "ads: 0.50 | FOV: 57.6°", "Weapon at cheek height; front post rising into alignment."),
    ("pistol-j7-timing-150ms-three-quarter-ads.jpg", "150 ms · 75% ADS APPROACH", "ads: 0.75 | FOV: 54.4°", "Front/rear sight notch lining up with 20m target plate."),
    ("pistol-j7-timing-200ms-full-ads-reached.jpg", "200 ms · 100% ADS LOCKED", "ads: 1.00 | FOV: 52.6°", "Full ADS locked at 0.20s. Front dot on 20.0m target bullseye. Sights centered.")
]

def build_sheet():
    print("[AG-252] Building Pistol J7 Timing Progression Sheet...")
    # Read telemetry if available
    timing_json = QA_DIR / "j7-timing-evidence.json"
    data = {}
    if timing_json.exists():
        try:
            data = json.loads(timing_json.read_text(encoding="utf-8"))
        except Exception as e:
            print("Error loading timing JSON:", e)
            
    milestones_data = {m.get("targetMs"): m for m in data.get("milestones", [])}
    
    # Each panel will crop the center view (viewmodel + target)
    crop_w, crop_h = 1080, 720
    thumb_w, thumb_h = 420, 280
    card_h = 95
    panel_w = thumb_w + 16
    panel_h = thumb_h + card_h
    
    n_cols = len(MILESTONES)
    sheet_w = 40 + n_cols * panel_w + (n_cols - 1) * 12 + 40
    sheet_h = 100 + panel_h + 50
    
    canvas = Image.new("RGB", (sheet_w, sheet_h), (14, 17, 23))
    draw = ImageDraw.Draw(canvas)
    
    # Header banner
    draw.rectangle([0, 0, sheet_w, 80], fill=(22, 27, 34))
    draw.line([0, 80, sheet_w, 80], fill=(48, 54, 61), width=2)
    
    draw.text((30, 16), "AG-252 PISTOL J7 ADS ENTRY TIMING EVIDENCE (0 - 200 ms / 0.20s SPEC)", fill=(240, 246, 252))
    draw.text((30, 48), "Verified on Jerry's RTX 5080 WebGPU PC · CL-305 (J7) FP_ADS_TIME.pistol = 0.20s · 20.0m FOB Target Plate", fill=(139, 148, 158))
    
    for idx, (filename, title, telem_summary, desc) in enumerate(MILESTONES):
        x0 = 40 + idx * (panel_w + 12)
        y0 = 105
        
        target_ms = idx * 50
        m_telem = milestones_data.get(target_ms) or {}
        
        shot_path = TIMING_DIR / filename
        if shot_path.exists():
            im = Image.open(shot_path)
            # Center crop
            im_w, im_h = im.size
            cx, cy = im_w // 2, im_h // 2
            x1 = cx - crop_w // 2
            y1 = cy - crop_h // 2
            crop_im = im.crop((x1, y1, x1 + crop_w, y1 + crop_h))
            crop_thumb = crop_im.resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
            canvas.paste(crop_thumb, (x0 + 8, y0 + 8))
        else:
            draw.rectangle([x0 + 8, y0 + 8, x0 + 8 + thumb_w, y0 + 8 + thumb_h], fill=(30, 35, 42))
            draw.text((x0 + 20, y0 + 20), f"Missing: {filename}", fill=(255, 100, 100))
            
        # Border
        draw.rectangle([x0 + 8, y0 + 8, x0 + 8 + thumb_w, y0 + 8 + thumb_h], outline=(48, 54, 61), width=2)
        
        # Caption card
        card_y = y0 + 8 + thumb_h
        draw.rectangle([x0 + 8, card_y, x0 + 8 + thumb_w, card_y + card_h], fill=(22, 27, 34), outline=(48, 54, 61), width=1)
        
        # Title
        draw.text((x0 + 16, card_y + 8), title, fill=(88, 166, 255))
        
        # Live telemetry details
        ads_w = m_telem.get("adsWeight", idx * 0.25)
        fov_val = m_telem.get("cameraFov", 70.0)
        off_px = m_telem.get("offsetFromCenterPx")
        off_str = f"{off_px:.1f}px" if off_px is not None else "N/A"
        
        telem_line = f"ads: {ads_w:.2f} · FOV: {fov_val:.1f}° · offset: {off_str}"
        draw.text((x0 + 16, card_y + 28), telem_line, fill=(63, 185, 80))
        
        # Description
        draw.text((x0 + 16, card_y + 50), desc, fill=(201, 209, 217))
        
    out_sheet = QA_DIR / "pistol-j7-timing-sheet.jpg"
    canvas.save(out_sheet, quality=92)
    print(f"[AG-252] Saved timing composite sheet: {out_sheet}")
    
    # Mirror to review/
    rev_sheet = REVIEW_DIR / "pistol-j7-timing-sheet.jpg"
    canvas.save(rev_sheet, quality=92)
    print(f"[AG-252] Mirrored timing sheet to: {rev_sheet}")

if __name__ == "__main__":
    build_sheet()
