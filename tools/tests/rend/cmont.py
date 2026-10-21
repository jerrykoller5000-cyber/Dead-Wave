import sys
from PIL import Image
pre=sys.argv[1]; out=sys.argv[2]
caves=['cave0_root','cave1_shale','cave2_iron','cave3_wet','cave4_hill','cave5_chalk']
views=sys.argv[3].split(',') if len(sys.argv)>3 else ['front','side','close']
W,H=420,302
S=Image.new('RGB',(len(views)*(W+6),len(caves)*(H+6)),'white')
for r,c in enumerate(caves):
  for k,v in enumerate(views):
    try: im=Image.open(f'{pre}_{c}_{v}.png').convert('RGB').resize((W,H))
    except Exception: continue
    S.paste(im,(k*(W+6),r*(H+6)))
S.save(out,quality=82)
