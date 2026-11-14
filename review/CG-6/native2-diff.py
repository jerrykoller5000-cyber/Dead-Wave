# Claude 7, CG-6 note 5: compare native-probe2's pictures (gun + sleeve area, lower right) with the first, and list each
# step's camo signature. Usage: python3 review/CG-6/native2-diff.py review/CG-6/native2   (needs Pillow)
# Baseline idle sway at one pose gives ~12-18 mean diff; a camo density change on gun+sleeve should stand far above it.
import json, sys, os
from PIL import Image, ImageChops, ImageStat
d = sys.argv[1]; S = json.load(open(os.path.join(d, 'steps.json')))
ref = Image.open(os.path.join(d, S[0]['file'])).convert('L'); W, H = ref.size
box = (int(W*0.45), int(H*0.5), W, H)
r = ref.crop(box)
for s in S:
    im = Image.open(os.path.join(d, s['file'])).convert('L')
    if im.size != ref.size: im = im.resize(ref.size)
    m = ImageStat.Stat(ImageChops.difference(r, im.crop(box))).mean[0]
    sig = sorted(set((x['map'], x['img'], x['gpu'], x['rep'], x['uv']) for x in s['meshes']))
    print(f"{s['n']:2d} {s['tag'][:20]:20s} diff {m:5.1f} canvas {s['canvas']} fov {s['camFov']} meshes {len(s['meshes'])} sig {len(sig)} {sig[0] if sig else ''} extra {str(s.get('extra'))[:60]}")
