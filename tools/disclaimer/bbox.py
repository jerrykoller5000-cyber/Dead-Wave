# CL-191: the dancer's bounding box per frame (source pixels), for his reflection's floor line in scene.js.
#   python3 bbox.py RGBA_DIR OUT.json
import glob, json, sys
import numpy as np
from PIL import Image
out = []
for f in sorted(glob.glob(sys.argv[1].rstrip('/') + '/d*.png')):
    a = np.array(Image.open(f).getchannel('A'))
    ys, xs = np.where(a > 40)
    out.append(None if len(xs) == 0 else [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())])
json.dump(out, open(sys.argv[2], 'w'))
print(len(out), 'frames')
