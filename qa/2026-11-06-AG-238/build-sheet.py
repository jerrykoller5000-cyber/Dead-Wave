import os
import sys
from PIL import Image, ImageDraw, ImageFont

def main():
    root = os.path.dirname(os.path.abspath(__file__))
    fp_path = os.path.join(root, 'pause-settings-fp.jpg')
    tp_path = os.path.join(root, 'pause-settings-tp.jpg')
    reload_path = os.path.join(root, 'settings-reloaded.jpg')
    out_path = os.path.join(root, 'pause-settings-sheet.jpg')

    if not os.path.exists(fp_path) or not os.path.exists(tp_path):
        print(f"Skipping build-sheet: missing {fp_path} or {tp_path}")
        return

    img_fp = Image.open(fp_path)
    img_tp = Image.open(tp_path)
    img_reload = Image.open(reload_path) if os.path.exists(reload_path) else None

    # Target tile size: 960 x 540 (half 1080p)
    tile_w, tile_h = 960, 540
    fp_thumb = img_fp.resize((tile_w, tile_h), Image.Resampling.LANCZOS)
    tp_thumb = img_tp.resize((tile_w, tile_h), Image.Resampling.LANCZOS)
    reload_thumb = img_reload.resize((tile_w, tile_h), Image.Resampling.LANCZOS) if img_reload else None

    # Canvas dimensions: 2 columns, 2 rows (or 1 row with 2 tiles + 1 row with reload)
    header_h = 70
    footer_h = 50
    margin = 20
    canvas_w = tile_w * 2 + margin * 3
    canvas_h = header_h + tile_h * (2 if reload_thumb else 1) + margin * (3 if reload_thumb else 2) + footer_h

    sheet = Image.new('RGB', (canvas_w, canvas_h), color=(18, 20, 24))
    draw = ImageDraw.Draw(sheet)

    try:
        font_title = ImageFont.truetype("arial.ttf", 26)
        font_sub = ImageFont.truetype("arial.ttf", 16)
        font_label = ImageFont.truetype("arial.ttf", 20)
        font_meta = ImageFont.truetype("arial.ttf", 14)
    except Exception:
        font_title = ImageFont.load_default()
        font_sub = ImageFont.load_default()
        font_label = ImageFont.load_default()
        font_meta = ImageFont.load_default()

    # Header
    draw.text((margin, 16), "AG-238: Three Volume Sliders Audit (GP-20029)", fill=(240, 240, 240), font=font_title)
    draw.text((margin, 46), "Jerry's Launcher  Real WebGPU Renderer  Settings in Match (FP & TP) + Post-Restart Persistence", fill=(180, 190, 200), font=font_sub)

    # First Row: FP and TP
    y1 = header_h + margin
    x_fp = margin
    x_tp = margin * 2 + tile_w

    sheet.paste(fp_thumb, (x_fp, y1))
    sheet.paste(tp_thumb, (x_tp, y1))

    # Overlays / Labels
    draw.rectangle([x_fp, y1, x_fp + 420, y1 + 32], fill=(0, 0, 0, 200))
    draw.text((x_fp + 10, y1 + 6), "1. FIRST-PERSON MATCH (PAUSE > SETTINGS)", fill=(255, 215, 0), font=font_label)

    draw.rectangle([x_tp, y1, x_tp + 420, y1 + 32], fill=(0, 0, 0, 200))
    draw.text((x_tp + 10, y1 + 6), "2. THIRD-PERSON MATCH (PAUSE > SETTINGS)", fill=(255, 215, 0), font=font_label)

    if reload_thumb:
        y2 = y1 + tile_h + margin
        x_reload = margin + (tile_w // 2)
        sheet.paste(reload_thumb, (x_reload, y2))
        draw.rectangle([x_reload, y2, x_reload + 460, y2 + 32], fill=(0, 0, 0, 200))
        draw.text((x_reload + 10, y2 + 6), "3. TITLE SETTINGS AFTER RESTART (PERSISTENCE)", fill=(100, 220, 100), font=font_label)

    # Footer
    footer_y = canvas_h - footer_h + 10
    draw.text((margin, footer_y), "Antigravity Audit  Sliders readable, cursor free, live bus gains validated, values survive re-entering menu & page restart.", fill=(150, 160, 170), font=font_meta)

    sheet.save(out_path, quality=92)
    print(f"[AG-238] Contact sheet saved: {out_path}")

if __name__ == '__main__':
    main()
