# tools/build-ag295-sheets.py
# Builds composite review sheets for AG-295 (CD-1 Pass 2):
# 1. review/CD-1/pass2/sheet.jpg: Master matrix (8 weapons x 6 columns: Noon, Overcast, Dusk, Night, Aimed Noon, Aimed Night)
# 2. review/CD-1/pass2/hands-detail.jpg: Close crop strips focusing specifically on the support hand wrap & grip geometry
# 3. review/CD-1/pass2/focus-checks.jpg: Dedicated verification plate answering Claude 1's key queries

import os
import sys
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
REV_DIR = os.path.join(ROOT, 'review', 'CD-1', 'pass2')
QA_DIR = os.path.join(ROOT, 'qa', '2026-11-11-CD-1-pass2')

GUNS = [
  ('pistol', 'Pistol'),
  ('revolver', 'Revolver'),
  ('launcher', 'Launcher'),
  ('shotgun', 'Shotgun'),
  ('chainsaw', 'Chainsaw'),
  ('m4', 'GW-4 Carbine'),
  ('ak', 'KR-7 Rifle'),
  ('sniper', 'Sniper Rifle'),
]

COLS = [
  ('hip-noon', 'Noon (Hip)'),
  ('hip-overcast', 'Overcast (Hip)'),
  ('hip-dusk', 'Dusk (Hip)'),
  ('hip-night', 'Night (Hip)'),
  ('aimed-noon', 'Aimed (Noon)'),
  ('aimed-night', 'Aimed (Night)')
]

def get_font(size):
  try:
    return ImageFont.truetype('arial.ttf', size)
  except:
    try:
      return ImageFont.truetype('DejaVuSans.ttf', size)
    except:
      return ImageFont.load_default()

def build_master_sheet():
  cell_w = 320
  cell_h = 180
  header_h = 50
  left_col_w = 140
  pad = 6

  num_cols = len(COLS)
  num_rows = len(GUNS)

  sheet_w = left_col_w + num_cols * (cell_w + pad) + pad
  sheet_h = header_h + num_rows * (cell_h + pad) + pad

  canvas = Image.new('RGB', (sheet_w, sheet_h), color=(20, 22, 28))
  draw = ImageDraw.Draw(canvas)

  f_title = get_font(18)
  f_label = get_font(13)
  f_row = get_font(14)

  # Title in top-left
  draw.text((12, 14), 'CD-1 Pass 2 / AG-295: Hands on 8 Guns in 4 Lights · RTX 5080 WebGPU', fill=(255, 215, 110), font=f_title)

  # Column headers
  for col_idx, (col_key, col_title) in enumerate(COLS):
    cx = left_col_w + col_idx * (cell_w + pad)
    draw.text((cx + 10, header_h - 22), col_title, fill=(200, 210, 225), font=f_label)

  for row_idx, (gun_key, gun_name) in enumerate(GUNS):
    ry = header_h + row_idx * (cell_h + pad)
    # Row label
    draw.text((12, ry + cell_h // 2 - 8), gun_name, fill=(240, 240, 245), font=f_row)

    for col_idx, (col_key, col_title) in enumerate(COLS):
      cx = left_col_w + col_idx * (cell_w + pad)
      img_path = os.path.join(REV_DIR, f"{gun_key}-{col_key}.png")

      if os.path.exists(img_path):
        try:
          im = Image.open(img_path).convert('RGB')
          im_res = im.resize((cell_w, cell_h), Image.Resampling.LANCZOS)
          canvas.paste(im_res, (cx, ry))
        except Exception as e:
          print(f"Error pasting {img_path}: {e}")
      else:
        draw.rectangle([cx, ry, cx + cell_w, ry + cell_h], fill=(35, 38, 48), outline=(60, 65, 80))
        draw.text((cx + 20, ry + cell_h // 2 - 8), 'Missing', fill=(120, 120, 130), font=f_label)

  out_path = os.path.join(REV_DIR, 'sheet.jpg')
  canvas.save(out_path, quality=90)
  canvas.save(os.path.join(QA_DIR, 'sheet.jpg'), quality=90)
  print(f"Saved master sheet: {out_path} ({sheet_w}x{sheet_h})")

def build_detail_sheet():
  # Crops bottom-right / center quadrant where hands & forend live in 1280x720: (380, 260, 1180, 700)
  crop_box = (380, 260, 1180, 700)
  crop_w = crop_box[2] - crop_box[0]
  crop_h = crop_box[3] - crop_box[1]

  cell_w = 266
  cell_h = int(cell_w * (crop_h / crop_w))
  header_h = 44
  left_col_w = 140
  pad = 6

  # Show 4 critical views per gun: Hip Noon, Hip Dusk, Hip Night, Aimed Noon
  detail_cols = [
    ('hip-noon', 'Noon Hands Wrap'),
    ('hip-dusk', 'Dusk Silhouette'),
    ('hip-night', 'Night Illuminated'),
    ('aimed-noon', 'Aimed Down Sights')
  ]

  sheet_w = left_col_w + len(detail_cols) * (cell_w + pad) + pad
  sheet_h = header_h + len(GUNS) * (cell_h + pad) + pad

  canvas = Image.new('RGB', (sheet_w, sheet_h), color=(18, 20, 26))
  draw = ImageDraw.Draw(canvas)

  f_title = get_font(16)
  f_label = get_font(12)
  f_row = get_font(13)

  draw.text((12, 12), 'CD-1 Pass 2 / AG-295: Hand Placement & Grip Detail Crops · WebGPU', fill=(255, 205, 90), font=f_title)

  for col_idx, (col_key, col_title) in enumerate(detail_cols):
    cx = left_col_w + col_idx * (cell_w + pad)
    draw.text((cx + 8, header_h - 20), col_title, fill=(190, 205, 220), font=f_label)

  for row_idx, (gun_key, gun_name) in enumerate(GUNS):
    ry = header_h + row_idx * (cell_h + pad)
    draw.text((12, ry + cell_h // 2 - 8), gun_name, fill=(235, 235, 240), font=f_row)

    for col_idx, (col_key, col_title) in enumerate(detail_cols):
      cx = left_col_w + col_idx * (cell_w + pad)
      img_path = os.path.join(REV_DIR, f"{gun_key}-{col_key}.png")

      if os.path.exists(img_path):
        try:
          im = Image.open(img_path).convert('RGB')
          im_crop = im.crop(crop_box)
          im_res = im_crop.resize((cell_w, cell_h), Image.Resampling.LANCZOS)
          canvas.paste(im_res, (cx, ry))
        except Exception as e:
          print(f"Error cropping {img_path}: {e}")
      else:
        draw.rectangle([cx, ry, cx + cell_w, ry + cell_h], fill=(30, 32, 42), outline=(50, 55, 70))

  out_path = os.path.join(REV_DIR, 'hands-detail.jpg')
  canvas.save(out_path, quality=90)
  canvas.save(os.path.join(QA_DIR, 'hands-detail.jpg'), quality=90)
  print(f"Saved detail sheet: {out_path} ({sheet_w}x{sheet_h})")

def build_focus_checks():
  # Dedicated plate for Claude 1's 4 queries:
  # 1. Launcher firing hand round grip (hip noon & aimed noon)
  # 2. Pistol & Revolver two-hand hold & trigger reach (hip noon & aimed noon)
  # 3. Chainsaw rear grip dent & motorcycle grip (hip noon)
  # 4. Shotgun aimed: bead clearance over support glove (aimed noon)
  panel_w = 400
  panel_h = 320
  pad = 12
  header_h = 60

  cols = 3
  rows = 2
  sheet_w = pad + cols * (panel_w + pad)
  sheet_h = header_h + rows * (panel_h + pad) + pad

  canvas = Image.new('RGB', (sheet_w, sheet_h), color=(15, 17, 22))
  draw = ImageDraw.Draw(canvas)

  f_title = get_font(18)
  f_sub = get_font(13)
  f_label = get_font(12)
  f_annot = get_font(11)

  draw.text((pad, 14), 'CD-1 Pass 2 Focus Queries · GPU Verification (RTX 5080 WebGPU)', fill=(255, 215, 110), font=f_title)
  draw.text((pad, 38), '1. Launcher Firing Grip | 2. Pistol Two-Hand | 3. Revolver Two-Hand | 4. Chainsaw Rear Grip Dent | 5. Shotgun Bead vs Glove | 6. KR-7 / GW-4 Reach', fill=(180, 190, 205), font=f_sub)

  panels = [
    # (col, row, gun, view, crop_box, title, subtitle)
    (0, 0, 'launcher', 'hip-noon', (460, 280, 1160, 720), 'Launcher: Firing Hand on Grip', 'Grip wrapped, palm out of receiver (was 17.7mm deep)'),
    (1, 0, 'pistol', 'hip-noon', (500, 260, 1140, 720), 'Pistol: Two-Hand Hold & Trigger', 'Support hand cradle (0.1mm overlap, was 23.8mm); trigger index clear'),
    (2, 0, 'revolver', 'hip-noon', (480, 240, 1140, 720), 'Revolver: Two-Hand Hold & Trigger', 'Under spur & forward (1.1mm overlap, was 9.1mm); index reach 10mm'),
    (0, 1, 'chainsaw', 'hip-noon', (320, 220, 1200, 720), 'Chainsaw: Rear Grip & Glove Give', 'Rear hand out of rubber block; ring finger give inspect'),
    (1, 1, 'shotgun', 'aimed-noon', (480, 220, 800, 520), 'Pump Shotgun Aimed: Bead vs Glove', 'Bead sightline clear over support glove top edge'),
    (2, 1, 'm4', 'aimed-noon', (480, 220, 800, 520), 'GW-4 Carbine Aimed: Sights & Reach', 'Support below sightline; index pad 0.5mm from trigger'),
  ]

  for (c, r, gun, view, crop, title, subtitle) in panels:
    x = pad + c * (panel_w + pad)
    y = header_h + r * (panel_h + pad)

    draw.rectangle([x, y, x + panel_w, y + panel_h], fill=(22, 25, 33), outline=(65, 75, 95))
    draw.text((x + 8, y + 6), title, fill=(255, 230, 140), font=f_label)
    draw.text((x + 8, y + 22), subtitle, fill=(160, 175, 195), font=f_annot)

    img_path = os.path.join(REV_DIR, f"{gun}-{view}.png")
    if os.path.exists(img_path):
      try:
        im = Image.open(img_path).convert('RGB')
        im_crop = im.crop(crop)
        inner_w = panel_w - 16
        inner_h = panel_h - 44
        im_res = im_crop.resize((inner_w, inner_h), Image.Resampling.LANCZOS)
        canvas.paste(im_res, (x + 8, y + 38))
      except Exception as e:
        print(f"Error processing focus panel {title}: {e}")

  out_path = os.path.join(REV_DIR, 'focus-checks.jpg')
  canvas.save(out_path, quality=92)
  canvas.save(os.path.join(QA_DIR, 'focus-checks.jpg'), quality=92)
  print(f"Saved focus checks sheet: {out_path} ({sheet_w}x{sheet_h})")

if __name__ == '__main__':
  build_master_sheet()
  build_detail_sheet()
  build_focus_checks()
