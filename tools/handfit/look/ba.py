# ba.py <out.jpg> <before.jpg> <after.jpg> [title]: before over after, labelled (CD-1 fixes 5)
import sys
from PIL import Image, ImageDraw
out, a, b = sys.argv[1:4]; t = sys.argv[4] if len(sys.argv) > 4 else ''
A, B = Image.open(a).convert('RGB'), Image.open(b).convert('RGB'); w = max(A.width, B.width)
S = Image.new('RGB', (w, A.height + B.height + 60), (24, 24, 24)); d = ImageDraw.Draw(S)
d.text((10, 8), t + '  BEFORE (top) / AFTER (bottom)', fill=(240, 240, 240)); S.paste(A, (0, 30)); S.paste(B, (0, A.height + 60)); d.text((10, A.height + 38), 'AFTER', fill=(240, 240, 120))
S.save(out, quality=88); print(out, S.size)
