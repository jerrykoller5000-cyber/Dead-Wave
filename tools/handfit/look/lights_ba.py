# lights_ba.py <out.jpg> <before dir> <after dir> <gun> [crop x0,y0,x1,y1] (CD-1 fixes 5): lights4.mjs's shots, before over after,
# hip noon/overcast/dusk/night and aimed noon; with a crop, the hands' region at full size instead of the whole frame at half
import sys
from PIL import Image, ImageDraw
out, bd, ad, g = sys.argv[1:5]; crop = [int(v) for v in sys.argv[5].split(',')] if len(sys.argv) > 5 else None
names = ['hip-noon', 'hip-overcast', 'hip-dusk', 'hip-night', 'aimed-noon']
def tile(d, n):
    im = Image.open(f'{d}/{g}-{n}.png').convert('RGB')
    return im.crop(crop) if crop else im.resize((im.width // 2, im.height // 2))
T = [[tile(d, n) for n in names] for d in (bd, ad)]; w, h = T[0][0].size
S = Image.new('RGB', (w * 5, h * 2 + 52), (20, 20, 20)); D = ImageDraw.Draw(S)
for r in range(2):
    D.text((6, 4 + r * (h + 26)), ('BEFORE' if r == 0 else 'AFTER') + f'  {g}: ' + ' | '.join(names), fill=(240, 240, 140 if r else 240))
    for c in range(5): S.paste(T[r][c], (c * w, 22 + r * (h + 26)))
S.save(out, quality=86); print(out, S.size)
