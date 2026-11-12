from pathlib import Path
import json
from PIL import Image, ImageChops, ImageDraw
import numpy as np

root = Path(__file__).parent
old = json.loads((root / 'photo-gpu-before.json').read_text(encoding='utf-8'))
new = json.loads((root / 'photo-gpu-after.json').read_text(encoding='utf-8'))
for key in ('eye','target','patch','normal','fov'):
    assert old['pose'][key] == new['pose'][key], key
assert old['texture'] == new['texture']
with Image.open(root / 'photo-gpu-before.png') as a, Image.open(root / 'photo-gpu-after.png') as b:
    a, b = a.convert('RGB'), b.convert('RGB')
    assert a.size == b.size
    delta = np.abs(np.asarray(a, dtype=np.int16) - np.asarray(b, dtype=np.int16))
    mask = Image.new('1',a.size)
    ImageDraw.Draw(mask).polygon([tuple(p) for p in new['pose']['corners']],fill=1)
    patch = delta[np.asarray(mask, dtype=bool)]
    stats = {'width':a.width,'height':a.height,'texture':new['texture'],'fullChanged':int(np.any(delta,axis=2).sum()),
             'patchPixels':len(patch),'patchChanged':int(np.any(patch,axis=1).sum()),'patchMaxChannelDelta':int(patch.max())}
    sheet=Image.new('RGB',(a.width*2,a.height+30),'#22292d')
    pen=ImageDraw.Draw(sheet)
    for i,(pic,label) in enumerate(((a,'Before'),(b,'After'))):
        sheet.paste(pic,(i*a.width,30));pen.text((i*a.width+9,8),label,fill='white')
    sheet.save(root / 'shoulder-patch-comparison.jpg',quality=95)
(root / 'comparison.json').write_text(json.dumps(stats,indent=2)+'\n',encoding='utf-8')
print(stats)
