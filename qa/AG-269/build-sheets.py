import os
import sys
from PIL import Image, ImageDraw, ImageFont

QA_DIR = r"C:\Users\Zero\Desktop\Tiny Trek\qa\AG-269"
REVIEW_DIR = r"C:\Users\Zero\Desktop\Tiny Trek\review\GP-20072\ag-review"

def get_font(size=16):
    try:
        return ImageFont.truetype("arial.ttf", size)
    except IOError:
        return ImageFont.load_default()

def create_grid(image_paths_with_labels, cols, out_path, thumb_w=400, thumb_h=225, title=""):
    rows = (len(image_paths_with_labels) + cols - 1) // cols
    padding = 12
    header_h = 28
    title_h = 44 if title else 0
    cell_w = thumb_w + padding * 2
    cell_h = thumb_h + padding * 2 + header_h
    
    sheet_w = cols * cell_w
    sheet_h = rows * cell_h + title_h
    
    sheet = Image.new("RGB", (sheet_w, sheet_h), (22, 24, 30))
    draw = ImageDraw.Draw(sheet)
    font = get_font(14)
    title_font = get_font(20)
    
    if title:
        draw.text((padding + 10, 12), title, fill=(240, 245, 255), font=title_font)

    for idx, (path, label) in enumerate(image_paths_with_labels):
        r = idx // cols
        c = idx % cols
        x = c * cell_w + padding
        y = title_h + r * cell_h + padding
        
        # Draw label
        draw.text((x, y), label, fill=(210, 225, 245), font=font)
        
        # Paste image
        if os.path.exists(path):
            try:
                img = Image.open(path)
                img = img.resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
                sheet.paste(img, (x, y + header_h))
            except Exception as e:
                draw.rectangle([x, y + header_h, x + thumb_w, y + header_h + thumb_h], fill=(50, 20, 20))
                draw.text((x + 10, y + header_h + 30), f"Err: {e}", fill=(255, 100, 100), font=font)
        else:
            draw.rectangle([x, y + header_h, x + thumb_w, y + header_h + thumb_h], fill=(40, 44, 52))
            draw.text((x + 10, y + header_h + 30), "Missing", fill=(160, 160, 160), font=font)
            
    sheet.save(out_path, quality=92)
    print(f"Saved contact sheet: {out_path}")
    
    # Mirror to review if directory exists
    if os.path.exists(REVIEW_DIR):
        base_name = os.path.basename(out_path)
        mirror_path = os.path.join(REVIEW_DIR, base_name)
        sheet.save(mirror_path, quality=92)
        print(f"Mirrored sheet to: {mirror_path}")

def main():
    if not os.path.exists(QA_DIR):
        print(f"QA dir does not exist: {QA_DIR}")
        return

    os.makedirs(REVIEW_DIR, exist_ok=True)

    # 1. Weapons facing Armory
    weapons = [
        (os.path.join(QA_DIR, "ag269-01-spawn-facing-armory-launcher.png"), "Launcher (J80) Facing Armory"),
        (os.path.join(QA_DIR, "ag269-01-spawn-facing-armory-m4.png"), "M4 Facing Armory"),
        (os.path.join(QA_DIR, "ag269-01-spawn-facing-armory-pistol.png"), "Pistol Facing Armory"),
        (os.path.join(QA_DIR, "ag269-01-spawn-facing-armory-shotgun.png"), "Shotgun Facing Armory"),
        (os.path.join(QA_DIR, "ag269-01-spawn-facing-armory-unarmed.png"), "Unarmed (J70) Facing Armory"),
        (os.path.join(QA_DIR, "ag269-05-armory-terminal-close.png"), "Armory Terminal & Rack Close-Up")
    ]
    create_grid(weapons, 3, os.path.join(QA_DIR, "ag269-weapons-facing-armory.jpg"),
                thumb_w=480, thumb_h=270,
                title="AG-269: Weapons & Terminal In Front of Training Ground Range Facing Armory")

    # 2. Walk Steps Sequence toward Armory
    walk_steps = [
        (os.path.join(QA_DIR, f"ag269-02-walk-step-{i}.png"), f"Walk Step {i}/11 (Frac {i/11:.2f})")
        for i in range(12)
    ]
    create_grid(walk_steps, 4, os.path.join(QA_DIR, "ag269-walk-to-armory-seq.jpg"),
                thumb_w=380, thumb_h=214,
                title="AG-269: Consecutive Motion Sequence Walking From Range Spawn Toward Armory")

    # 3. 360-degree Rotation Sequence
    rot_steps = [
        (os.path.join(QA_DIR, f"ag269-03-rot-{round((i/12)*360)}deg.png"), f"Rotation {round((i/12)*360)}°")
        for i in range(12)
    ]
    create_grid(rot_steps, 4, os.path.join(QA_DIR, "ag269-rotation-360-seq.jpg"),
                thumb_w=380, thumb_h=214,
                title="AG-269: 360° Rotation Sequence Midway Between Range and Armory")

    # 4. Master 12-panel Composite Sheet
    master_panels = [
        (os.path.join(QA_DIR, "ag269-01-spawn-facing-armory-launcher.png"), "1. Launcher Facing Armory"),
        (os.path.join(QA_DIR, "ag269-01-spawn-facing-armory-m4.png"), "2. M4 Facing Armory"),
        (os.path.join(QA_DIR, "ag269-01-spawn-facing-armory-pistol.png"), "3. Pistol Facing Armory"),
        (os.path.join(QA_DIR, "ag269-01-spawn-facing-armory-unarmed.png"), "4. Unarmed (J70) Facing Armory"),
        (os.path.join(QA_DIR, "ag269-02-walk-step-0.png"), "5. Walk Start (x=0.0, z=-640.6)"),
        (os.path.join(QA_DIR, "ag269-02-walk-step-3.png"), "6. Walk Step 3 (x=1.8, z=-641.3)"),
        (os.path.join(QA_DIR, "ag269-02-walk-step-7.png"), "7. Walk Step 7 (x=4.1, z=-642.1)"),
        (os.path.join(QA_DIR, "ag269-02-walk-step-11.png"), "8. Walk End (x=6.5, z=-643.0)"),
        (os.path.join(QA_DIR, "ag269-03-rot-0deg.png"), "9. Yaw 0° (Facing Targets Downrange)"),
        (os.path.join(QA_DIR, "ag269-03-rot-90deg.png"), "10. Yaw 90° (Facing Armory)"),
        (os.path.join(QA_DIR, "ag269-03-rot-180deg.png"), "11. Yaw 180° (Facing Entrance)"),
        (os.path.join(QA_DIR, "ag269-05-armory-terminal-close.png"), "12. Terminal & Gun Rack Detail"),
    ]
    create_grid(master_panels, 4, os.path.join(QA_DIR, "ag269-camo-audit-sheet.jpg"),
                thumb_w=480, thumb_h=270,
                title="AG-269 Master Audit: J71 Camo Texture Pop Investigation on RTX 5080 WebGPU")

if __name__ == "__main__":
    main()
