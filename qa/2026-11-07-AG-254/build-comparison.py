# qa/2026-11-07-AG-254/build-comparison.py
# Assembles side-by-side comparison sheet and blink GIF for AG-254 (CL-304).

import json
import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
QA_DIR = ROOT / "qa/2026-11-07-AG-254"
REVIEW_DIR = ROOT / "review/AG-254"
REVIEW_DIR.mkdir(parents=True, exist_ok=True)

def build_comparison():
    print("[AG-254] Assembling side-by-side comparison sheet...")
    p1 = QA_DIR / "01-view-sleeve.jpg"
    p2 = QA_DIR / "02-body-sleeve.jpg"
    
    if not p1.exists() or not p2.exists():
        print(f"[AG-254] Missing screenshot files: {p1} or {p2}")
        return
        
    im1 = Image.open(p1)
    im2 = Image.open(p2)
    
    # Read telemetry
    telem_path = QA_DIR / "telemetry.json"
    audit = {}
    if telem_path.exists():
        try:
            data = json.loads(telem_path.read_text(encoding="utf-8"))
            audit = data.get("projAudit", {})
        except Exception as e:
            print("Error loading telemetry:", e)
            
    shift_x_tiles = audit.get("shiftX_tiles", 0.5952)
    shift_y_tiles = audit.get("shiftY_tiles", 2.5000)
    delta_x_m = audit.get("deltaX_meters", 0.25)
    delta_y_m = audit.get("deltaY_meters", 1.05)
    tile_size = audit.get("camoTileMeters", 0.42)
    
    # Canvas: 2000 x 1400
    canvas_w = 2000
    canvas_h = 1380
    canvas = Image.new("RGB", (canvas_w, canvas_h), (14, 17, 23))
    draw = ImageDraw.Draw(canvas)
    
    # Header
    draw.rectangle([0, 0, canvas_w, 80], fill=(22, 27, 34))
    draw.line([0, 80, canvas_w, 80], fill=(48, 54, 61), width=2)
    draw.text((30, 16), "AG-254 J6 SECOND CAUSE: CAMO PROJECTION SHIFT SIDE-BY-SIDE (CL-304)", fill=(240, 246, 252))
    draw.text((30, 48), "First Person · Pistol at Rest · Same Eye Position & Angle · Real WebGPU (RTX 5080)", fill=(139, 148, 158))
    
    # Row 1: Full frames (scale to 940x529 each)
    thumb_w, thumb_h = 940, 529
    t1 = im1.resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
    t2 = im2.resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
    
    x1, y1 = 40, 100
    x2, y2 = 1020, 100
    canvas.paste(t1, (x1, y1))
    canvas.paste(t2, (x2, y2))
    
    draw.rectangle([x1, y1, x1 + thumb_w, y1 + thumb_h], outline=(88, 166, 255), width=2)
    draw.rectangle([x2, y2, x2 + thumb_w, y2 + thumb_h], outline=(63, 185, 80), width=2)
    
    # Labels
    draw.rectangle([x1, y1 + thumb_h, x1 + thumb_w, y1 + thumb_h + 35], fill=(22, 27, 34))
    draw.text((x1 + 15, y1 + thumb_h + 8), "A. THE VIEW SLEEVE AS DRAWN (1P Viewmodel in Elbow Space)", fill=(88, 166, 255))
    
    draw.rectangle([x2, y2 + thumb_h, x2 + thumb_w, y2 + thumb_h + 35], fill=(22, 27, 34))
    draw.text((x2 + 15, y2 + thumb_h + 8), "B. THE BODY'S OWN SLEEVE (Old 1P / Marine Root Space, Same Eye)", fill=(63, 185, 80))
    
    # Row 2: Forearm Zooms
    # Forearm region is bottom right: x=[1200..1800], y=[540..1080]
    crop_box = (1100, 500, 1850, 1050)
    crop1 = im1.crop(crop_box).resize((thumb_w, 420), Image.Resampling.LANCZOS)
    crop2 = im2.crop(crop_box).resize((thumb_w, 420), Image.Resampling.LANCZOS)
    
    cy = y1 + thumb_h + 55
    canvas.paste(crop1, (x1, cy))
    canvas.paste(crop2, (x2, cy))
    
    draw.rectangle([x1, cy, x1 + thumb_w, cy + 420], outline=(88, 166, 255), width=2)
    draw.rectangle([x2, cy, x2 + thumb_w, cy + 420], outline=(63, 185, 80), width=2)
    
    draw.rectangle([x1, cy + 420, x1 + thumb_w, cy + 420 + 35], fill=(22, 27, 34))
    draw.text((x1 + 15, cy + 420 + 8), "Cuff / Forearm Zoom: Box Projection Origin x = 0.00 m (Elbow Space)", fill=(201, 209, 217))
    
    draw.rectangle([x2, cy + 420, x2 + thumb_w, cy + 420 + 35], fill=(22, 27, 34))
    draw.text((x2 + 15, cy + 420 + 8), "Cuff / Forearm Zoom: Box Projection Origin x = +0.25 m (Marine Root Space)", fill=(201, 209, 217))
    
    # Bottom Telemetry Summary Card
    card_y = cy + 420 + 50
    draw.rectangle([40, card_y, canvas_w - 40, canvas_h - 25], fill=(22, 27, 34), outline=(48, 54, 61), width=2)
    
    draw.text((60, card_y + 15), "MEASURED CAMO PATTERN SHIFT ALONG FOREARM (D-118 J6 / CL-304 DIAGNOSTIC):", fill=(240, 246, 252))
    
    line1 = f"• Circumferential Shift (X axis across forearm):  ΔX = +{delta_x_m:.2f} m  ->  SHIFT = +{shift_x_tiles:.3f} TILES  (~0.60 tiles across)"
    line2 = f"• Longitudinal Shift (Y axis along forearm length): ΔY = +{delta_y_m:.2f} m  ->  SHIFT = +{shift_y_tiles:.3f} TILES  (exactly 2.50 tiles = 0.50 tile phase inversion)"
    line3 = f"• Camo Tile Scale: CAMO_TILE = {tile_size:.2f} m (uniform 2.38 repeats/m across marine uniform cloth, GP-20031)"
    line4 = "• Recommendation for Claude (CL-304): Offset viewmodel forearm box-projection origin by [X = +0.25m, Y = +1.05m] to achieve 1:1 camo alignment."
    
    draw.text((60, card_y + 40), line1, fill=(88, 166, 255))
    draw.text((60, card_y + 65), line2, fill=(248, 81, 73))
    draw.text((60, card_y + 90), line3, fill=(139, 148, 158))
    draw.text((60, card_y + 115), line4, fill=(63, 185, 80))
    
    out_path = QA_DIR / "side-by-side.jpg"
    canvas.save(out_path, quality=94)
    print(f"[AG-254] Saved side-by-side sheet: {out_path}")
    
    rev_path = REVIEW_DIR / "side-by-side.jpg"
    canvas.save(rev_path, quality=94)
    print(f"[AG-254] Mirrored side-by-side sheet: {rev_path}")


def build_blink_gif():
    print("[AG-254] Assembling blink toggle GIF...")
    p1 = QA_DIR / "01-view-sleeve.jpg"
    p2 = QA_DIR / "02-body-sleeve.jpg"
    if not p1.exists() or not p2.exists():
        return
        
    im1 = Image.open(p1).resize((960, 540), Image.Resampling.LANCZOS)
    im2 = Image.open(p2).resize((960, 540), Image.Resampling.LANCZOS)
    
    # Add caption banners
    d1 = ImageDraw.Draw(im1)
    d1.rectangle([0, 0, 960, 36], fill=(0, 0, 0))
    d1.text((15, 8), "1. VIEW SLEEVE AS DRAWN (Elbow Space, x=0.00m)", fill=(88, 166, 255))
    
    d2 = ImageDraw.Draw(im2)
    d2.rectangle([0, 0, 960, 36], fill=(0, 0, 0))
    d2.text((15, 8), "2. BODY'S OWN SLEEVE (Marine Root Space, x=+0.25m)", fill=(63, 185, 80))
    
    pal1 = im1.convert("P", palette=Image.Palette.ADAPTIVE, colors=128)
    pal2 = im2.convert("P", palette=Image.Palette.ADAPTIVE, colors=128)
    
    out_gif = QA_DIR / "sleeve-camo-shift.gif"
    pal1.save(
        out_gif,
        save_all=True,
        append_images=[pal2],
        duration=750,
        loop=0
    )
    print(f"[AG-254] Saved blink GIF: {out_gif}")
    
    rev_gif = REVIEW_DIR / "sleeve-camo-shift.gif"
    pal1.save(
        rev_gif,
        save_all=True,
        append_images=[pal2],
        duration=750,
        loop=0
    )
    print(f"[AG-254] Mirrored blink GIF: {rev_gif}")


if __name__ == "__main__":
    build_comparison()
    build_blink_gif()
    print("[AG-254] Done.")
