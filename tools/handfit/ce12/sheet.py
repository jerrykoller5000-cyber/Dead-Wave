# sheet.py out.png "title" cols tilew file1[:label] file2[:label] ...   (CE-12 review sheets)
import sys
from PIL import Image, ImageDraw, ImageFont
out, title, cols, tw = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
items = []
for a in sys.argv[5:]:
    f, _, lab = a.partition('::')
    items.append((f, lab or f.split('/')[-1]))
th = tw * 9 // 16
rows = (len(items) + cols - 1) // cols
try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 18); tf = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 24)
except Exception: font = tf = ImageFont.load_default()
W = Image.new('RGB', (cols * tw, rows * th + 40), (20, 20, 20))
d = ImageDraw.Draw(W); d.text((10, 8), title, fill=(255, 255, 255), font=tf)
for i, (f, lab) in enumerate(items):
    x, y = (i % cols) * tw, 40 + (i // cols) * th
    if f != '-':
        im = Image.open(f).convert('RGB'); im = im.resize((tw, im.height * tw // im.width))
        if im.height > th: t = (im.height - th) // 2; im = im.crop((0, t, tw, t + th))
        W.paste(im, (x, y))
    d.rectangle([x, y, x + tw - 1, y + th - 1], outline=(60, 60, 60))
    d.rectangle([x, y, x + d.textlength(lab, font=font) + 10, y + 24], fill=(0, 0, 0)); d.text((x + 5, y + 2), lab, fill=(255, 230, 120), font=font)
W.save(out); print(out, W.size)
