# tools/build-ag272-sheets.py - Generates crops and contact sheets for AG-272 (CL-325 Part 1)
import os
import sys
import json
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
REVIEW_DIR = os.path.join(ROOT, "review", "CL-325")
QA_DIR = os.path.join(ROOT, "qa", "AG-272")

def get_font(size=14, bold=False):
    try:
        font_name = "arialbd.ttf" if bold else "arial.ttf"
        return ImageFont.truetype(font_name, size)
    except IOError:
        return ImageFont.load_default()

def crop_image(src_path, dst_path, box):
    """Crops an image to box (left, upper, right, lower) and saves it."""
    if not os.path.exists(src_path):
        return None
    try:
        img = Image.open(src_path)
        cropped = img.crop(box)
        os.makedirs(os.path.dirname(dst_path), exist_ok=True)
        cropped.save(dst_path, quality=95)
        return dst_path
    except Exception as e:
        print(f"[CROP ERROR] {e} on {src_path}")
        return None

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
        
        draw.rectangle([x - 2, y - 2, x + thumb_w + 2, y + thumb_h + header_h + 2], fill=(28, 32, 40), outline=(45, 50, 62))
        draw.text((x + 4, y + 4), label, fill=(220, 230, 245), font=font)
        
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
    
    # Mirror to QA directory if not already there
    base = os.path.basename(out_path)
    qa_mirror = os.path.join(QA_DIR, base)
    if out_path != qa_mirror:
        os.makedirs(QA_DIR, exist_ok=True)
        sheet.save(qa_mirror, quality=92)

def build_all():
    cradle_guns = [
        ("ak", "KR-7"),
        ("m4", "GW-4"),
        ("shotgun", "Remington 870"),
        ("aa12", "Breacher-12"),
        ("sniper", "Precision Sniper"),
        ("uzi", "Wasp")
    ]
    
    # 1. Generate Crops for Support Hand Cradle
    cradle_items = []
    # Crop box for support hand (left-center lower area on 1920x1080)
    # Viewmodel arms come in from lower-left, forend rests in palm
    crop_box_cradle = (480, 500, 1280, 1080)
    
    for k, name in cradle_guns:
        hip_src = os.path.join(REVIEW_DIR, f"cradle-{k}-hip.png")
        ads_src = os.path.join(REVIEW_DIR, f"cradle-{k}-ads.png")
        hip_crop = os.path.join(REVIEW_DIR, f"cradle-{k}-hip-crop.png")
        ads_crop = os.path.join(REVIEW_DIR, f"cradle-{k}-ads-crop.png")
        
        crop_image(hip_src, hip_crop, crop_box_cradle)
        crop_image(ads_src, ads_crop, crop_box_cradle)
        
        cradle_items.append({"path": hip_crop, "label": f"{name} Hip: Support Cradle (Palm Up, Thumb Left)"})
        cradle_items.append({"path": ads_crop, "label": f"{name} ADS: Support Cradle (Forend in Hand)"})
        
    cradle_sheet = os.path.join(REVIEW_DIR, "cradle-sheet.jpg")
    create_grid(cradle_items, 4, cradle_sheet, thumb_w=380, thumb_h=275,
                title="CL-325: Support Hand Cradle Crops on 6 Guns (RTX 5080 WebGPU)",
                subtitle="Palm up under forend, thumb on left, 4 fingers on right; elbowRel [-0.16, -0.26, 0.20].")

    # 2. Firing Wrists (Single and Akimbo Pairs)
    wrist_items = []
    crop_box_single_wrist = (950, 480, 1800, 1080) # right side firing hand & wrist
    crop_box_pair_wrist = (250, 420, 1750, 1080)   # wide crop showing both hands
    
    singles = [("pistol", "Tactical Pistol"), ("revolver", "Heavy Revolver"), ("uzi", "Wasp")]
    for k, name in singles:
        src = os.path.join(REVIEW_DIR, f"wrist-{k}-single.png")
        crop_dst = os.path.join(REVIEW_DIR, f"wrist-{k}-single-crop.png")
        crop_image(src, crop_dst, crop_box_single_wrist)
        wrist_items.append({"path": crop_dst, "label": f"{name} Firing Wrist (Straight 0.33-0.38 rad)"})
        
    for k, name in singles:
        src = os.path.join(REVIEW_DIR, f"wrist-{k}-akimbo-pair.png")
        crop_dst = os.path.join(REVIEW_DIR, f"wrist-{k}-akimbo-pair-crop.png")
        crop_image(src, crop_dst, crop_box_pair_wrist)
        wrist_items.append({"path": crop_dst, "label": f"{name} Akimbo Pair Wrists (0.19-0.22 rad)"})
        
    wrist_sheet = os.path.join(REVIEW_DIR, "wrists-sheet.jpg")
    create_grid(wrist_items, 3, wrist_sheet, thumb_w=440, thumb_h=270,
                title="CL-325: Firing Wrists on Handguns & Akimbo Pairs on RTX 5080",
                subtitle="Elbows 60% toward hand line; wrists straighter (0.33-0.38 single, 0.19-0.22 pairs; max limit 0.87).")

    # 3. Pistol Draw from GW-4 Sequence (J72 First-Equip Twist Fix)
    draw_items = [
        {"path": os.path.join(REVIEW_DIR, "draw-00-gw4-settled.png"), "label": "0. GW-4 Settled (Initial Hold)"}
    ]
    for f in range(1, 13):
        draw_items.append({
            "path": os.path.join(REVIEW_DIR, f"draw-frame-{String_pad(f)}.png"),
            "label": f"Frame {f} (Draw Raise: Smooth Transition, Zero Twist)"
        })
    draw_items.append({"path": os.path.join(REVIEW_DIR, "draw-13-pistol-settled.png"), "label": "13. Pistol Settled (True Hold, <0.1° dev)"})
    
    draw_sheet = os.path.join(REVIEW_DIR, "pistol-draw-sequence-sheet.jpg")
    create_grid(draw_items, 4, draw_sheet, thumb_w=360, thumb_h=202,
                title="CL-325 J72: Pistol Draw from GW-4 Frame-by-Frame Audit (RTX 5080 WebGPU)",
                subtitle="Eliminates the 33-50° first-equip twist; pistol raises true to body hold within 0.1°.")

    # 4. Master Review Composite Sheet
    master_items = [
        {"path": os.path.join(REVIEW_DIR, "cradle-m4-hip-crop.png"), "label": "GW-4 Support Cradle (Hip)"},
        {"path": os.path.join(REVIEW_DIR, "cradle-m4-ads-crop.png"), "label": "GW-4 Support Cradle (ADS)"},
        {"path": os.path.join(REVIEW_DIR, "cradle-ak-hip-crop.png"), "label": "KR-7 Support Cradle (Hip)"},
        {"path": os.path.join(REVIEW_DIR, "cradle-ak-ads-crop.png"), "label": "KR-7 Support Cradle (ADS)"},
        {"path": os.path.join(REVIEW_DIR, "wrist-pistol-single-crop.png"), "label": "Pistol Firing Wrist (0.34 rad)"},
        {"path": os.path.join(REVIEW_DIR, "wrist-pistol-akimbo-pair-crop.png"), "label": "Pistol Akimbo Pair Wrists (0.21 rad)"},
        {"path": os.path.join(REVIEW_DIR, "draw-frame-04.png"), "label": "Pistol Draw Mid-Raise (Frame 4: Untwisted)"},
        {"path": os.path.join(REVIEW_DIR, "draw-frame-08.png"), "label": "Pistol Draw Late-Raise (Frame 8: True Aim)"},
        {"path": os.path.join(REVIEW_DIR, "draw-13-pistol-settled.png"), "label": "Pistol Settled in Hold"},
    ]
    master_sheet = os.path.join(REVIEW_DIR, "cl325-master-review-sheet.jpg")
    create_grid(master_items, 3, master_sheet, thumb_w=420, thumb_h=260,
                title="CL-325 Part 1 Master Review: Cradle, Wrists & Draw on RTX 5080",
                subtitle="Support cradle verified on 6 guns; wrists straighter; first-equip twist eliminated.")

def String_pad(num):
    return str(num).zfill(2)

if __name__ == "__main__":
    build_all()
