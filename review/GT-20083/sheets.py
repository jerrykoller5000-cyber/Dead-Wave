from pathlib import Path
from PIL import Image,ImageDraw
import sys,json
root=Path(__file__).parent
phase=sys.argv[1] if len(sys.argv)>1 else 'refined'
assert phase in ('after','refined','refined-webgl','fitted','fitted-webgl','ends','boss')
reference=sys.argv[2] if len(sys.argv)>2 else ('before-webgl' if phase.endswith('-webgl') else 'before')
assert reference in ('before','before-webgl','fitted','ends')
label=phase if reference.startswith('before') else phase+'-from-'+reference
ins=root.parent/'GT-20076'
for view in ('hip','held-left-open','held-right-open','close','inspector'):
    w=480
    if view=='close':
        crop=(280,80,850,540)
    elif view=='hip':
        crop=(300,232,842,540)
    elif view.startswith('held'):
        crop=(140,95,795,535)
    else: crop=(0,0,960,540)
    h=round(w*(crop[3]-crop[1])/(crop[2]-crop[0]))
    sheet=Image.new('RGB',(w*2,35+4*(h+21)),'#20252a')
    dr=ImageDraw.Draw(sheet)
    for col,name in enumerate((reference,phase)):
        dr.text((col*w+6,8),('BEFORE' if col==0 else 'AFTER')+' / '+view,fill='white')
        for row,light in enumerate(('noon','overcast','dusk','night')):
            if view=='inspector':
                folder='catalog-fix-saw-panels' if col==0 else ('catalog-fix-front-rail-fit' if phase.startswith('fitted') else 'catalog-fix-front-rail-final')
                path=root/name/('inspector-'+light+'.jpg') if name in ('fitted','ends','boss','fitted-webgl') else ins/folder/'inspector'/('chainsaw-'+light+'.jpg')
            else:path=root/name/(view+'-'+light+'.png')
            with Image.open(path) as im:
                y=32+row*(h+21);dr.text((col*w+6,y),light,fill='#dedbd3')
                sheet.paste(im.crop(crop).resize((w,h),Image.Resampling.LANCZOS),(col*w,y+17))
    sheet.save(root/(label+'-'+view+'.jpg'),quality=94)
