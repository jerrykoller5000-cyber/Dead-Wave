# tools/build-ce1-sheets.py
# Generates horizontal strips and composite contact sheets for CE-1 action cycles:
# 1. Individual 12-frame action strips per weapon per light
# 2. Master contact sheets per light condition (matching review/CE-1/CE-1-actions-cloud.jpg layout)
# 3. ADS 25ms comparison sheet for M4 & KR-7 across 4 lights

import os
import sys
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
GPU_DIR = os.path.join(ROOT, 'review', 'CE-1', 'gpu')
QA_DIR = os.path.join(ROOT, 'qa', '2026-11-10-CE-1')
STRIP_DIR = os.path.join(GPU_DIR, 'strips')
os.makedirs(STRIP_DIR, exist_ok=True)
os.makedirs(QA_DIR, exist_ok=True)

GUNS = [
  ('pistol', 'Issue Pistol'),
  ('m4', 'GW-4 Carbine'),
  ('ak', 'KR-7 Rifle'),
  ('uzi', 'Wasp SMG'),
  ('revolver', '.44 Revolver'),
  ('aa12', 'AA-12 Breacher')
]

LIGHTS = ['noon', 'overcast', 'dusk', 'night']

FRAMES = [
  ('f000', '0ms Rest'),
  ('f008', '8ms Fire'),
  ('f017', '17ms'),
  ('f025', '25ms Peak'),
  ('f033', '33ms'),
  ('f042', '42ms'),
  ('f050', '50ms'),
  ('f067', '67ms'),
  ('f083', '83ms'),
  ('f100', '100ms'),
  ('f130', '130ms'),
  ('f170', '170ms Reset')
]

def get_font(size):
  try:
    return ImageFont.truetype('arial.ttf', size)
  except:
    try:
      return ImageFont.truetype('DejaVuSans.ttf', size)
    except:
      return ImageFont.load_default()

def build_strips():
  cell_w = 180
  cell_h = 101 # 16:9 of 180
  header_h = 32
  pad = 4

  for light in LIGHTS:
    for gun_key, gun_name in GUNS:
      strip_w = len(FRAMES) * (cell_w + pad) + pad
      strip_h = header_h + cell_h + pad + 18 # extra for step labels
      canvas = Image.new('RGB', (strip_w, strip_h), color=(20, 22, 28))
      draw = ImageDraw.Draw(canvas)

      f_title = get_font(13)
      f_label = get_font(11)

      title = f"CE-1 Action Cycle: {gun_name} · {light.upper()} · RTX 5080 WebGPU"
      draw.text((10, 8), title, fill=(255, 215, 110), font=f_title)

      for idx, (f_id, f_label_text) in enumerate(FRAMES):
        cx = pad + idx * (cell_w + pad)
        cy = header_h
        img_path = os.path.join(GPU_DIR, f"{gun_key}-hip-{light}-{f_id}.png")

        if os.path.exists(img_path):
          try:
            im = Image.open(img_path).convert('RGB')
            # Center crop / fit
            im_res = im.resize((cell_w, cell_h), Image.Resampling.LANCZOS)
            canvas.paste(im_res, (cx, cy))
          except Exception as e:
            print(f"Error pasting {img_path}: {e}")
        else:
          draw.rectangle([cx, cy, cx + cell_w, cy + cell_h], fill=(35, 38, 48))

        draw.text((cx + 4, cy + cell_h + 3), f_label_text, fill=(180, 190, 205), font=f_label)

      out_name = f"{gun_key}-{light}-strip.jpg"
      canvas.save(os.path.join(STRIP_DIR, out_name), quality=92)
      canvas.save(os.path.join(QA_DIR, out_name), quality=92)
  print(f"Built all 24 individual action strips in {STRIP_DIR}")

def build_sheet_for_light(light):
  # Matching Claude's 2160 x 1335 layout
  cell_w = 180
  cell_h = 190
  header_h = 50
  left_col_w = 130
  pad = 4

  num_cols = len(FRAMES)
  num_rows = len(GUNS)

  sheet_w = left_col_w + num_cols * (cell_w + pad) + pad
  sheet_h = header_h + num_rows * (cell_h + pad) + pad

  canvas = Image.new('RGB', (sheet_w, sheet_h), color=(18, 20, 26))
  draw = ImageDraw.Draw(canvas)

  f_title = get_font(18)
  f_label = get_font(12)
  f_row = get_font(13)

  draw.text((12, 14), f"CE-1 First-Person Action Cycle: 6 Weapons in {light.upper()} · RTX 5080 WebGPU", fill=(255, 215, 110), font=f_title)

  # Col headers
  for col_idx, (f_id, f_label_text) in enumerate(FRAMES):
    cx = left_col_w + col_idx * (cell_w + pad)
    draw.text((cx + 6, header_h - 22), f_label_text, fill=(200, 210, 225), font=f_label)

  # Crop region focusing on weapon action and hand in 1280x720: (260, 160, 1220, 700)
  crop_box = (240, 160, 1220, 710)

  for row_idx, (gun_key, gun_name) in enumerate(GUNS):
    ry = header_h + row_idx * (cell_h + pad)
    draw.text((12, ry + cell_h // 2 - 8), gun_name, fill=(235, 235, 240), font=f_row)

    for col_idx, (f_id, f_label_text) in enumerate(FRAMES):
      cx = left_col_w + col_idx * (cell_w + pad)
      img_path = os.path.join(GPU_DIR, f"{gun_key}-hip-{light}-{f_id}.png")

      if os.path.exists(img_path):
        try:
          im = Image.open(img_path).convert('RGB')
          im_crop = im.crop(crop_box)
          im_res = im_crop.resize((cell_w, cell_h), Image.Resampling.LANCZOS)
          canvas.paste(im_res, (cx, ry))
        except Exception as e:
          print(f"Error {img_path}: {e}")
      else:
        draw.rectangle([cx, ry, cx + cell_w, ry + cell_h], fill=(30, 32, 42))

  out_path = os.path.join(GPU_DIR, f"sheet-{light}.jpg")
  canvas.save(out_path, quality=90)
  canvas.save(os.path.join(QA_DIR, f"sheet-{light}.jpg"), quality=90)
  if light == 'noon':
    canvas.save(os.path.join(GPU_DIR, "sheet.jpg"), quality=90)
    canvas.save(os.path.join(ROOT, "review", "CE-1", "CE-1-actions-gpu.jpg"), quality=90)
  print(f"Saved sheet: {out_path} ({sheet_w}x{sheet_h})")

def build_ads_comparison():
  # M4 & KR-7 ADS 25ms across 4 lights
  cell_w = 260
  cell_h = 160
  header_h = 44
  left_col_w = 140
  pad = 6

  guns = [('m4', 'GW-4 Carbine'), ('ak', 'KR-7 Rifle')]
  cols = [
    ('noon-f000', 'Noon ADS Rest'),
    ('noon-f025', 'Noon 25ms Fired'),
    ('overcast-f025', 'Overcast 25ms'),
    ('dusk-f025', 'Dusk 25ms'),
    ('night-f025', 'Night 25ms')
  ]

  sheet_w = left_col_w + len(cols) * (cell_w + pad) + pad
  sheet_h = header_h + len(guns) * (cell_h + pad) + pad

  canvas = Image.new('RGB', (sheet_w, sheet_h), color=(18, 20, 26))
  draw = ImageDraw.Draw(canvas)

  f_title = get_font(15)
  f_label = get_font(12)
  f_row = get_font(13)

  draw.text((12, 12), "CE-1: GW-4 & KR-7 Down-the-Sights Action at 25ms Across 4 Lights · WebGPU", fill=(255, 215, 110), font=f_title)

  for col_idx, (col_id, col_text) in enumerate(cols):
    cx = left_col_w + col_idx * (cell_w + pad)
    draw.text((cx + 6, header_h - 20), col_text, fill=(195, 205, 220), font=f_label)

  crop_box = (340, 180, 940, 560) # Center crop around sight picture

  for row_idx, (gun_key, gun_name) in enumerate(guns):
    ry = header_h + row_idx * (cell_h + pad)
    draw.text((12, ry + cell_h // 2 - 8), gun_name, fill=(235, 235, 240), font=f_row)

    for col_idx, (col_id, col_text) in enumerate(cols):
      cx = left_col_w + col_idx * (cell_w + pad)
      parts = col_id.split('-')
      light, frame = parts[0], parts[1]
      img_path = os.path.join(GPU_DIR, f"{gun_key}-ads-{light}-{frame}.png")

      if os.path.exists(img_path):
        try:
          im = Image.open(img_path).convert('RGB')
          im_crop = im.crop(crop_box)
          im_res = im_crop.resize((cell_w, cell_h), Image.Resampling.LANCZOS)
          canvas.paste(im_res, (cx, ry))
        except Exception as e:
          print(f"Error {img_path}: {e}")
      else:
        draw.rectangle([cx, ry, cx + cell_w, ry + cell_h], fill=(30, 32, 42))

  out_path = os.path.join(GPU_DIR, "ads-25ms.jpg")
  canvas.save(out_path, quality=90)
  canvas.save(os.path.join(QA_DIR, "ads-25ms.jpg"), quality=90)
  print(f"Saved ADS sheet: {out_path} ({sheet_w}x{sheet_h})")

if __name__ == '__main__':
  build_strips()
  for light in LIGHTS:
    build_sheet_for_light(light)
  build_ads_comparison()
