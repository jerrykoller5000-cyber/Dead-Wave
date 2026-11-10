import sys
from PIL import Image, ImageDraw
out, files = sys.argv[1], sys.argv[2:]
S = 450; cols = 3; rows = (len(files) + cols - 1) // cols
sh = Image.new('RGB', (S * cols, S * rows), 'white')
for i, f in enumerate(files):
    im = Image.open(f).convert('RGB').resize((S, S)); ImageDraw.Draw(im).text((8, 8), f.rsplit('-', 1)[1][:-4], fill='black'); sh.paste(im, ((i % cols) * S, (i // cols) * S))
sh.save(out, quality=85)
