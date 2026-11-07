# qa/2026-11-07-AG-250/analyze.py
import os
from PIL import Image

folder = r'C:\Users\Zero\Desktop\Tiny Trek\qa\2026-11-07-AG-250'
files = [f for f in os.listdir(folder) if f.endswith('.jpg')]

for f in sorted(files):
    p = os.path.join(folder, f)
    im = Image.open(p)
    w, h = im.size
    arm_crop = im.crop((int(w * 0.4), int(h * 0.5), w, h))
    rgb_im = arm_crop.convert('RGB')
    stat = list(rgb_im.getdata())
    mean_r = sum(c[0] for c in stat) / len(stat)
    mean_g = sum(c[1] for c in stat) / len(stat)
    mean_b = sum(c[2] for c in stat) / len(stat)
    print(f"{f:30s} mean RGB: [{mean_r:5.1f}, {mean_g:5.1f}, {mean_b:5.1f}]")
