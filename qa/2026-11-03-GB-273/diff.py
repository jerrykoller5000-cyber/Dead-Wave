from PIL import Image, ImageChops
d='qa/2026-11-03-GB-273/seats/'
a=Image.open(d+'shadow-dusk_ne_wall-off.jpg').convert('RGB'); b=Image.open(d+'shadow-dusk_ne_wall-on.jpg').convert('RGB')
diff=ImageChops.difference(a,b).convert('L').point(lambda v: min(255,v*12))
w=a.width; h=a.height
sheet=Image.new('RGB',(w*3//2, h//2))
sheet.paste(a.resize((w//2,h//2)),(0,0)); sheet.paste(b.resize((w//2,h//2)),(w//2,0)); sheet.paste(diff.convert('RGB').resize((w//2,h//2)),(w,0))
sheet.save(d+'dusk-diff-sheet.jpg')