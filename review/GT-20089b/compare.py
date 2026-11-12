from pathlib import Path
from PIL import Image,ImageDraw
import json

root=Path(__file__).parent
lights=('noon','overcast','dusk','night')
report={}
for view in ('eye','third'):
    for mode in ('trail','walk'):
        key=view+'-'+mode
        before,after=[json.loads((root/phase/key/'run.json').read_text()) for phase in ('before','after')]
        assert before['initial']['shots']==after['initial']['shots']==175
        b,a=[r['initial']['youngest'] for r in (before,after)]
        assert abs(b['strength']-a['strength'])<1e-8
        assert abs(a['life']/b['life']-.66)<1e-8
        assert before['states'][-1]['alive']>0 and after['states'][-1]['alive']==0
        if mode=='walk':
            assert all(r['states'][-1]['walkMin']<.45 and r['states'][-1]['walkTravel']>1 for r in (before,after))
        times=(0,1,2) if mode=='trail' else (0,.15,.32,.6,1,2)
        w,h=(305,172) if mode=='trail' else (230,130)
        sheet=Image.new('RGB',(w*len(times)*2,(h+22)*4),'#20252a')
        draw=ImageDraw.Draw(sheet)
        for row,light in enumerate(lights):
            for column,phase in enumerate(('before','after')):
                for j,t in enumerate(times):
                    x=(column*len(times)+j)*w;y=row*(h+22)
                    draw.text((x+4,y+3),f'{phase} | {view} | {light} | {t:g} s',fill='white')
                    with Image.open(root/phase/key/f'{t:g}-{light}.png') as frame:
                        sheet.paste(frame.resize((w,h),Image.Resampling.LANCZOS),(x,y+21))
        sheet.save(root/(key+'-four-lights.jpg'),quality=94)
        report[key]={'old_life':b['life'],'new_life':a['life'],'old_remaining':[v['alive'] for v in before['states']],
          'new_remaining':[v['alive'] for v in after['states']],'walk_distance':after['states'][-1]['walkTravel'],
          'nearest_player_xz':after['states'][-1]['walkMin'],'nearest_camera':after['states'][-1]['eyeMin']}
(root/'comparison.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
# Enlarge the crossing itself. The full walk filmstrips above retain the complete native views.
sheet=Image.new('RGB',(4*440,4*267),'#20252a')
draw=ImageDraw.Draw(sheet)
for row,light in enumerate(lights):
    for col,(view,phase) in enumerate((('eye','before'),('eye','after'),('third','before'),('third','after'))):
        x,y=col*440,row*267
        draw.text((x+5,y+4),f'{phase} | {view} | {light} | 0.15 s',fill='white')
        with Image.open(root/phase/(view+'-walk')/('0.15-'+light+'.png')) as frame:
            if view=='third': frame=frame.crop((366,208,696,394))
            sheet.paste(frame.resize((440,246),Image.Resampling.LANCZOS),(x,y+21))
sheet.save(root/'crossing-four-lights.jpg',quality=94)
print(report)
