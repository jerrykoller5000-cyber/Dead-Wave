import os
import sys
from PIL import Image, ImageDraw, ImageFont

QA_DIR = r"C:\Users\Zero\Desktop\Tiny Trek\qa\2026-11-07-AG-250"

def get_font(size=18):
    try:
        return ImageFont.truetype("arial.ttf", size)
    except IOError:
        return ImageFont.load_default()

def create_grid(image_paths_with_labels, cols, out_path, thumb_w=380, thumb_h=214):
    rows = (len(image_paths_with_labels) + cols - 1) // cols
    padding = 10
    header_h = 24
    cell_w = thumb_w + padding * 2
    cell_h = thumb_h + padding * 2 + header_h
    
    sheet_w = cols * cell_w
    sheet_h = rows * cell_h
    
    sheet = Image.new("RGB", (sheet_w, sheet_h), (25, 27, 34))
    draw = ImageDraw.Draw(sheet)
    font = get_font(14)
    
    for idx, (path, label) in enumerate(image_paths_with_labels):
        r = idx // cols
        c = idx % cols
        x = c * cell_w + padding
        y = r * cell_h + padding
        
        # Draw label
        draw.text((x, y), label, fill=(220, 230, 242), font=font)
        
        # Paste image
        if os.path.exists(path):
            try:
                img = Image.open(path)
                img = img.resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
                sheet.paste(img, (x, y + header_h))
            except Exception as e:
                draw.text((x + 10, y + header_h + 30), f"Err: {e}", fill=(255, 100, 100), font=font)
        else:
            draw.rectangle([x, y + header_h, x + thumb_w, y + header_h + thumb_h], fill=(45, 48, 58))
            draw.text((x + 10, y + header_h + 30), "Missing", fill=(180, 180, 180), font=font)
            
    sheet.save(out_path, quality=90)
    print(f"Saved contact sheet: {out_path}")

def main():
    if not os.path.exists(QA_DIR):
        print(f"QA dir does not exist: {QA_DIR}")
        return

    # Sheet 1: 3 Weapons across Walk, Run, ADS Still, ADS Moving
    core_items = [
        (os.path.join(QA_DIR, "launcher-01-walk.jpg"), "Launcher: Walk"),
        (os.path.join(QA_DIR, "launcher-02-run.jpg"), "Launcher: Sprint Run"),
        (os.path.join(QA_DIR, "launcher-04-aim-still.jpg"), "Launcher: ADS Still"),
        (os.path.join(QA_DIR, "launcher-05-aim-moving.jpg"), "Launcher: ADS Moving"),
        (os.path.join(QA_DIR, "m4-01-walk.jpg"), "M4: Walk"),
        (os.path.join(QA_DIR, "m4-02-run.jpg"), "M4: Sprint Run"),
        (os.path.join(QA_DIR, "m4-04-aim-still.jpg"), "M4: ADS Still"),
        (os.path.join(QA_DIR, "m4-05-aim-moving.jpg"), "M4: ADS Moving"),
        (os.path.join(QA_DIR, "pistol-01-walk.jpg"), "Pistol: Walk"),
        (os.path.join(QA_DIR, "pistol-02-run.jpg"), "Pistol: Sprint Run"),
        (os.path.join(QA_DIR, "pistol-04-aim-still.jpg"), "Pistol: ADS Still"),
        (os.path.join(QA_DIR, "pistol-05-aim-moving.jpg"), "Pistol: ADS Moving"),
    ]
    create_grid(core_items, 4, os.path.join(QA_DIR, "contact-sheet-actions.jpg"))

    # Sheet 2: Consecutive 6-frame motion sequence
    seq_items = []
    for w in ["launcher", "m4", "pistol"]:
        for f in range(6):
            seq_items.append((
                os.path.join(QA_DIR, f"{w}-seq-frame-{f}.jpg"),
                f"{w.capitalize()} Motion Frame {f}"
            ))
    create_grid(seq_items, 6, os.path.join(QA_DIR, "contact-sheet-motion-seq.jpg"), thumb_w=280, thumb_h=158)

    # Sheet 3: Rotation (0, 90, 180, 270 degrees) for all 3 weapons
    rot_items = []
    for w in ["launcher", "m4", "pistol"]:
        for deg in [0, 90, 180, 270]:
            rot_items.append((
                os.path.join(QA_DIR, f"{w}-03-turn-{deg}deg.jpg"),
                f"{w.capitalize()} Turn {deg}°"
            ))
    create_grid(rot_items, 4, os.path.join(QA_DIR, "contact-sheet-rotation.jpg"))

if __name__ == "__main__":
    main()
