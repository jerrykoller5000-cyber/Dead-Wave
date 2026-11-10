import os
from PIL import Image

QA_DIR = r"C:\Users\Zero\Desktop\Tiny Trek\qa\AG-269"

f1 = os.path.join(QA_DIR, "ag269-02-walk-step-1.png")
f2 = os.path.join(QA_DIR, "ag269-02-walk-step-2.png")

im1 = Image.open(f1).convert('RGB')
im2 = Image.open(f2).convert('RGB')

w, h = im1.size
max_diff = 0
max_xy = (0, 0)
diff_pixels = []

for y in range(h):
    for x in range(w):
        p1 = im1.getpixel((x, y))
        p2 = im2.getpixel((x, y))
        d = (abs(p1[0] - p2[0]) + abs(p1[1] - p2[1]) + abs(p1[2] - p2[2])) / 3.0
        if d > max_diff:
            max_diff = d
            max_xy = (x, y)
        if d > 150:
            diff_pixels.append((x, y, d, p1, p2))

print(f"Max diff: {max_diff} at ({max_xy[0]}, {max_xy[1]})")
print(f"Number of pixels with diff > 150: {len(diff_pixels)}")
if diff_pixels:
    print("Sample pixels with diff > 150:")
    for px in diff_pixels[:10]:
        print(f"  ({px[0]}, {px[1]}): {px[3]} -> {px[4]} (delta: {px[2]:.1f})")
