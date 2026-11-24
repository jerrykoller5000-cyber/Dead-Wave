# tools/build-ag286-sheets.py
# Builds composite review sheets for AG-286 (CD-1):
# 1. review/CD-1/sheet.jpg: Master matrix (9 weapons x 6 columns: Noon, Overcast, Dusk, Night, Aimed Noon, Aimed Night)
# 2. review/CD-1/hands-detail.jpg: Close crop strips focusing specifically on the support hand wrap & grip geometry

import os
import sys
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
REV_DIR = os.path.join(ROOT, 'review', 'CD-1')
QA_DIR = os.path.join(ROOT, 'qa', '2026-11-10-CD-1')

GUNS = [
  ('uzi', 'Uzi SMG'),
  ('m4', 'GW-4 Carbine'),
  ('ak', 'KR-7 Rifle'),
  ('shotgun', 'Shotgun'),
  ('sniper', 'Sniper Rifle'),
  ('aa12', 'AA-12 Shotgun'),
  ('minigun', 'Minigun'),
  ('pistol', 'Pistol'),
  ('revolver', 'Revolver')
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
  draw.text((12, 14), 'CD-1 / AG-286: Hands on 9 Guns in 4 Lights · RTX 5080 WebGPU', fill=(255, 215, 110), font=f_title)

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
  # Crops bottom-right / center quadrant where hands & forend live in 1280x720: (380, 280, 1180, 700)
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

  draw.text((12, 12), 'CD-1 / AG-286: Handguard Wrap & Finger Detail Crops · WebGPU', fill=(255, 205, 90), font=f_title)

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

if __name__ == '__main__':
  build_master_sheet()
  build_detail_sheet()
