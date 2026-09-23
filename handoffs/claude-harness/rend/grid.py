import sys
from PIL import Image
pre, cave, out = sys.argv[1], sys.argv[2], sys.argv[3]
views = sys.argv[4].split(',')
W,H=640,460; cols=2
rows=(len(views)+cols-1)//cols
S=Image.new('RGB',(cols*W,rows*H),'white')
for k,v in enumerate(views):
    try: im=Image.open(f'{pre}_{cave}_{v}.png').convert('RGB').resize((W,H))
    except Exception: continue
    S.paste(im,((k%cols)*W,(k//cols)*H))
S.save(out,quality=85)
