"""Pair original and revised in-game burst captures for each view and light."""
from pathlib import Path
from PIL import Image, ImageDraw
import json
import math

root=Path(__file__).parent
lights=('noon','overcast','dusk','night')
configs=('pistol','pistol-suppressed','uzi','uzi-suppressed','revolver')
summary={}
for config in configs:
    rows={}
    sheet=Image.new('RGB',(4*420,4*261),'#20252a')
    pen=ImageDraw.Draw(sheet)
    for view_index,view in enumerate(('eye','held')):
        runs=[json.loads((root/phase/config/(view+'.json')).read_text(encoding='utf-8')) for phase in ('before','after')]
        old,new=runs
        assert old['shots']==new['shots'] and old['seen'][1]==0 and min(new['seen'])>0
        kind='suppressor' if 'suppressed' in config else 'barrel'
        assert all(part[kind]['hot']>0 for part in new['parts'])
        assert all(part['barrel']['hot']==0 for part in new['parts']) if kind=='suppressor' else True
        rows[view]={
            'shots':new['shots'],'before_wisps':old['seen'],'after_wisps':new['seen'],
            'after_max_gap_frames':new['maxGap'],'after_peak_material_intensity':[round(v[kind]['peak'],4) for v in new['parts']],
            'muzzle_world_drift':[round(math.dist(x,y),6) for x,y in zip(old['muzzles'],new['muzzles'])]
        }
        for phase_index,phase in enumerate(('before','after')):
            x=(view_index*2+phase_index)*420
            for row,light in enumerate(lights):
                y=row*261
                pen.text((x+6,y+4),f"{config} | {view} | {phase} | {light}",fill='white')
                with Image.open(root/phase/config/(view+'-'+light+'.png')) as frame:
                    sheet.paste(frame.resize((420,236),Image.Resampling.LANCZOS),(x,y+23))
    sheet.save(root/(config+'-four-lights.jpg'),quality=94)
    summary[config]=rows
(root/'comparison.json').write_text(json.dumps(summary,indent=2)+'\n',encoding='utf-8')
print('Matched 40 before/after image pairs across five configurations.')
