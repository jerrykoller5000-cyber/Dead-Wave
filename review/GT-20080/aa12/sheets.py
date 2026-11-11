from pathlib import Path
from PIL import Image, ImageDraw
import sys

root = Path(__file__).resolve().parent
phase = sys.argv[1]
source = root / phase
lights = ['noon','overcast','dusk','night']


def sheet(filename, images, cols, crop, size):
    w,h = size
    rows = (len(images)+cols-1)//cols
    out = Image.new('RGB', (8+(w+8)*cols,8+(h+25)*rows), '#20262c')
    draw = ImageDraw.Draw(out)
    for i,(name,file) in enumerate(images):
        x,y = 8+(i%cols)*(w+8), 8+(i//cols)*(h+25)
        draw.text((x,y),name,fill='#dae2e8')
        with Image.open(file) as img:
            tile = img.crop(crop) if crop else img.copy()
        tile.thumbnail((w,h),Image.Resampling.LANCZOS)
        out.paste(tile,(x,y+16))
    out.save(root/filename,quality=94)


phases=[10,18,28,38,48,58,68,74,78,88,96]
sheet(phase+'-reload.jpg',[(str(p)+'%',source/('eye-reload.jpg' if p==74 else f'reload-{p}.jpg')) for p in phases],
      4,(396,140,960,540),(280,198))
sheet(phase+'-eye-lights.jpg',[(s.title(),source/('eye-reload.jpg' if s=='noon' else f'eye-reload-{s}.jpg')) for s in lights],
      4,(407,163,960,540),(318,217))
sheet(phase+'-issued-and-spent.jpg',[(s.title(),source/(s+'.jpg')) for s in lights],
      4,None,(300,169))
if phase=='after':
    sheet('return-at-eye.jpg', [(p+' / 78%', root/p/'reload-78.jpg') for p in ['before','after']],
          2,(480,300,905,540),(425,240))
    sheet('return-in-four-lights.jpg', [(light.title(),source/f'visible-78-{light}.jpg') for light in lights],
          4,(482,291,957,540),(318,167))
    sheet('drum-pairs.jpg',[(p+' / '+label,root/p/(file+'.jpg'))
          for p in ['before','after'] for label,file in [('Empty','mag-empty'),('Loaded','mag-loaded')]],
          2,(166,65,795,480),(425,280))
