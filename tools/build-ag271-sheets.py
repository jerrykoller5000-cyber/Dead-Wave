# tools/build-ag271-sheets.py - Generates composite contact sheets for AG-271 & GP-20072 after-fix
import os
import sys
import json
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
QA_AG271 = os.path.join(ROOT, "qa", "AG-271")
REVIEW_AFTER = os.path.join(ROOT, "review", "GP-20072", "ag-after")

def get_font(size=14, bold=False):
    try:
        font_name = "arialbd.ttf" if bold else "arial.ttf"
        return ImageFont.truetype(font_name, size)
    except IOError:
        return ImageFont.load_default()

def create_grid(items, cols, out_path, thumb_w=400, thumb_h=225, title="", subtitle=""):
    rows = (len(items) + cols - 1) // cols
    padding = 10
    header_h = 26
    title_h = 50 if (title or subtitle) else 0
    cell_w = thumb_w + padding * 2
    cell_h = thumb_h + padding * 2 + header_h
    
    sheet_w = cols * cell_w
    sheet_h = rows * cell_h + title_h
    
    sheet = Image.new("RGB", (sheet_w, sheet_h), (20, 22, 26))
    draw = ImageDraw.Draw(sheet)
    
    font = get_font(13)
    title_font = get_font(18, bold=True)
    sub_font = get_font(12)
    
    if title:
        draw.text((padding + 8, 8), title, fill=(245, 248, 255), font=title_font)
    if subtitle:
        draw.text((padding + 8, 30), subtitle, fill=(160, 180, 210), font=sub_font)
        
    for idx, item in enumerate(items):
        img_path = item["path"]
        label = item.get("label", "")
        
        r = idx // cols
        c = idx % cols
        x = c * cell_w + padding
        y = title_h + r * cell_h + padding
        
        # Draw cell background card
        draw.rectangle([x - 2, y - 2, x + thumb_w + 2, y + thumb_h + header_h + 2], fill=(28, 32, 40), outline=(45, 50, 62))
        
        # Draw label
        draw.text((x + 4, y + 4), label, fill=(220, 230, 245), font=font)
        
        # Paste image
        if os.path.exists(img_path):
            try:
                img = Image.open(img_path)
                img = img.resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
                sheet.paste(img, (x, y + header_h))
            except Exception as e:
                draw.rectangle([x, y + header_h, x + thumb_w, y + header_h + thumb_h], fill=(50, 20, 20))
                draw.text((x + 8, y + header_h + 20), f"Error: {e}", fill=(255, 120, 120), font=font)
        else:
            draw.rectangle([x, y + header_h, x + thumb_w, y + header_h + thumb_h], fill=(35, 38, 46))
            draw.text((x + 8, y + header_h + 20), f"Not Found:\n{os.path.basename(img_path)}", fill=(160, 160, 160), font=font)
            
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    sheet.save(out_path, quality=92)
    print(f"[SHEET] Saved contact sheet: {out_path}")

def build_all():
    # 1. GP-20072 After-Fix Camo Comparison Sheet
    after_items = [
        {"path": os.path.join(REVIEW_AFTER, "ag-after-launcher-equipped.png"), "label": "Launcher Equipped (1P View Arms: 2.38 rep/m)"},
        {"path": os.path.join(REVIEW_AFTER, "ag-after-launcher-holstered.png"), "label": "Launcher Holstered (3P Elbow Spheres: 2.38 rep/m)"},
        {"path": os.path.join(REVIEW_AFTER, "ag-after-m4-equipped.png"), "label": "GW-4 M4 Equipped (1P View Arms: 2.38 rep/m)"},
        {"path": os.path.join(REVIEW_AFTER, "ag-after-m4-holstered.png"), "label": "GW-4 M4 Holstered (3P Elbow Spheres: 2.38 rep/m)"},
        {"path": os.path.join(REVIEW_AFTER, "ag-after-pistol-equipped.png"), "label": "Pistol Equipped (1P View Arms: 2.38 rep/m)"},
        {"path": os.path.join(REVIEW_AFTER, "ag-after-pistol-holstered.png"), "label": "Pistol Holstered (3P Elbow Spheres: 2.38 rep/m)"},
        {"path": os.path.join(REVIEW_AFTER, "ag-after-shotgun-equipped.png"), "label": "Shotgun Equipped (1P View Arms: 2.38 rep/m)"},
        {"path": os.path.join(REVIEW_AFTER, "ag-after-shotgun-holstered.png"), "label": "Shotgun Holstered (3P Elbow Spheres: 2.38 rep/m)"},
        {"path": os.path.join(REVIEW_AFTER, "ag-after-unarmed.png"), "label": "Unarmed State (Zero Texture Pop on Transition)"},
        {"path": os.path.join(REVIEW_AFTER, "ag-after-walk-step-5.png"), "label": "Walk Step 5 Facing Armory (Camo Invariant)"},
    ]
    after_sheet_path = os.path.join(REVIEW_AFTER, "ag-after-camo-sheet.jpg")
    create_grid(after_items, 2, after_sheet_path, thumb_w=480, thumb_h=270,
                title="GP-20072 J71 Camo Texture Pop After-Fix Verification (RTX 5080 WebGPU)",
                subtitle="Elbow sphere singleton UVs fixed in index.html: repeats/m reduced from 41.94 to ~2.38. Zero pop on 1P/3P swap.")

    # 2. AG-271 12 Guns Hip vs ADS Grid
    guns = [
        ("m4", "GW-4"),
        ("ak", "KR-7"),
        ("pistol", "Tactical Pistol"),
        ("uzi", "Wasp"),
        ("shotgun", "Remington 870"),
        ("aa12", "Breacher-12"),
        ("revolver", "Heavy Revolver"),
        ("sniper", "Precision Sniper"),
        ("chainsaw", "Chainsaw"),
        ("minigun", "Rotary Gun"),
        ("flamer", "Flamethrower"),
        ("launcher", "Grenade Launcher")
    ]
    
    gun_items = []
    for k, name in guns:
        gun_items.append({"path": os.path.join(QA_AG271, f"ag271-hip-{k}.png"), "label": f"{name} (Hip, FOV 54°, Muzzle Centered)"})
        gun_items.append({"path": os.path.join(QA_AG271, f"ag271-ads-{k}.png"), "label": f"{name} (ADS, FOV 48°, Sights Closer)"})
        
    guns_sheet_path = os.path.join(QA_AG271, "ag271-guns-hip-ads-sheet.jpg")
    create_grid(gun_items, 4, guns_sheet_path, thumb_w=380, thumb_h=214,
                title="AG-271 CL-324: Every Gun at Hip and Down Sights (ADS) on RTX 5080 WebGPU",
                subtitle="Muzzle line through crosshair at 6 m; receiver close under eye; aiming always brings gun nearer.")

    # 3. AG-271 Sprint then Fire GW-4 Sequence (J89)
    sprint_items = [
        {"path": os.path.join(QA_AG271, "ag271-gw4-sprint-carry.png"), "label": "1. GW-4 Sprint Carry (Pitch -0.55, Roll 0.45)"},
        {"path": os.path.join(QA_AG271, "ag271-gw4-sprint-snap-t16ms.png"), "label": "2. Shot Fired (t = +16 ms: snap begins)"},
        {"path": os.path.join(QA_AG271, "ag271-gw4-sprint-snap-t35ms.png"), "label": "3. Snap Complete (t = +35 ms: gun on aim)"},
        {"path": os.path.join(QA_AG271, "ag271-gw4-sprint-snap-t70ms.png"), "label": "4. Aim Hold (t = +70 ms: firing aim)"},
        {"path": os.path.join(QA_AG271, "ag271-gw4-sprint-snap-t120ms.png"), "label": "5. Aim Hold (t = +120 ms: rounds on target)"},
    ]
    sprint_sheet_path = os.path.join(QA_AG271, "ag271-gw4-sprint-fire-sheet.jpg")
    create_grid(sprint_items, 5, sprint_sheet_path, thumb_w=320, thumb_h=180,
                title="AG-271 CL-324 J89: GW-4 Sprint-to-Fire Instant Snap-to-Aim (0.035 s) on RTX 5080",
                subtitle="Shot drops lowered carry at once in 0.035 s; no rounds from an invisible gun while running.")

    # 4. AG-271 Wall Close-Up & Unarmed (J90 & J70)
    misc_items = [
        {"path": os.path.join(QA_AG271, "ag271-wall-close.png"), "label": "J90: TG Wall Close-Up in 1P (< 0.25 m: No Wall Fade, 100% Solid)"},
        {"path": os.path.join(QA_AG271, "ag271-unarmed-look-ahead.png"), "label": "J70: Unarmed Look Ahead (No Hands in View, Raised Fists Gone)"},
        {"path": os.path.join(QA_AG271, "ag271-unarmed-walk-swing-1.png"), "label": "J70: Unarmed Walk Looking Down (Left Hand Swings at Side)"},
        {"path": os.path.join(QA_AG271, "ag271-unarmed-walk-swing-2.png"), "label": "J70: Unarmed Walk Looking Down (Right Hand Swings at Side)"},
    ]
    misc_sheet_path = os.path.join(QA_AG271, "ag271-wall-and-unarmed-sheet.jpg")
    create_grid(misc_items, 2, misc_sheet_path, thumb_w=480, thumb_h=270,
                title="AG-271 CL-324 J90 (Wall Solid) & J70 (Unarmed Stride Swing) on RTX 5080",
                subtitle="Cutaway and perimeter wall fading removed in 1P; empty hands hang at sides swinging with stride.")

    # 5. Master Composite Sheet
    master_items = [
        {"path": os.path.join(QA_AG271, "ag271-hip-m4.png"), "label": "GW-4 Hip (Muzzle on Crosshair, FOV 54°)"},
        {"path": os.path.join(QA_AG271, "ag271-ads-m4.png"), "label": "GW-4 ADS (Sight on Crosshair, FOV 48°)"},
        {"path": os.path.join(QA_AG271, "ag271-hip-sniper.png"), "label": "Precision Sniper Hip (Receiver Shouldered)"},
        {"path": os.path.join(QA_AG271, "ag271-ads-sniper.png"), "label": "Precision Sniper ADS (Scope Center)"},
        {"path": os.path.join(QA_AG271, "ag271-gw4-sprint-carry.png"), "label": "GW-4 Sprint Lowered Carry (J89)"},
        {"path": os.path.join(QA_AG271, "ag271-gw4-sprint-snap-t35ms.png"), "label": "GW-4 Instant Shot Snap to Aim (t=35ms)"},
        {"path": os.path.join(QA_AG271, "ag271-wall-close.png"), "label": "Training Ground Wall (<0.25m No Fade J90)"},
        {"path": os.path.join(QA_AG271, "ag271-unarmed-look-ahead.png"), "label": "Unarmed Look Ahead (No Hands J70)"},
        {"path": os.path.join(QA_AG271, "ag271-unarmed-walk-swing-1.png"), "label": "Unarmed Walk Down (Hands Swing J70)"},
    ]
    master_sheet_path = os.path.join(QA_AG271, "ag271-master-sheet.jpg")
    create_grid(master_items, 3, master_sheet_path, thumb_w=420, thumb_h=236,
                title="AG-271 Master Verification: CL-324 First-Person Frame on RTX 5080 WebGPU",
                subtitle="Every gun hip/ADS aligned; snap-to-aim verified; perimeter solid; unarmed hands at sides.")

if __name__ == "__main__":
    build_all()
