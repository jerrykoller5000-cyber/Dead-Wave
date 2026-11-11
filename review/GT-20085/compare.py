from pathlib import Path
import json
import math
from PIL import Image, ImageDraw

base = Path(__file__).resolve().parent
phases = ('before', 'after')
lights = ('noon', 'overcast', 'dusk', 'night')
def read(phase, file):
    return json.loads((base / phase / file).read_text(encoding='utf-8'))

def subtract(a, b):
    return [x - y for x, y in zip(a, b)]

def cross(a, b):
    return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]

def normal(a):
    length = math.hypot(*a)
    return [x / length for x in a]

def dot(a, b):
    return sum(x*y for x,y in zip(a, b))

def project(camera, point, fov):
    matrix = camera['gunWorld']
    world = [sum(matrix[4*i+j]*x for i,x in enumerate([*point,1])) for j in range(3)]
    delta = subtract(world, camera['eye'])
    forward = normal(subtract(camera['target'], camera['eye']))
    right = normal(cross(forward, [0,1,0]))
    up = cross(right, forward)
    scale = 270 / math.tan(math.radians(fov/2)) / dot(delta, forward)
    return [480+dot(delta,right)*scale, 270-dot(delta,up)*scale]

before, after = (read(phase, 'bounds.json') for phase in phases)
old_cam, new_cam = (read(phase, 'cameras.json') for phase in phases)
changed = {}
for kind in ('placed','folded'):
    old, new = before[kind]['rows'], after[kind]['rows']
    assert len(old) == len(new)
    changed[kind] = [i for i,(a,b) in enumerate(zip(old,new)) if (a['min'], a['max']) != (b['min'], b['max'])]
assert changed['placed'] == [] and changed['folded'] == list(range(15))+list(range(22,27))
assert before['held']['size'][1] >= .45 > after['held']['size'][1]
assert all(abs(before['held']['size'][n] - after['held']['size'][n]) < 1e-10 for n in (0,2))
fixed = [p[k] for i,p in enumerate(before['folded']['rows']) if i not in changed['folded'] for k in ('min','max')]
drift = {}
for view in ('player','side','rear'):
    fov = 43 if view=='player' else 40
    drift[view] = max(math.dist(project(old_cam[view], p, fov),project(new_cam[view], p, fov)) for p in fixed)
summary = {'heldBefore':before['held']['size'],'heldAfter':after['held']['size'],'localRows':{k:len(after[k]['rows']) for k in changed},'changedRows':changed,'shoulderDistances':[before['seatDistance'],after['seatDistance']],'maxFixedArtworkScreenDriftPixels':drift}
old_seat, new_seat = (read(phase, 'inspector/seating.json') for phase in phases)
def pair_ids(seating):
    return {tuple(sorted((row['a'],row['b']))) for row in seating['rawOverlaps']}
old_pairs, new_pairs = pair_ids(old_seat), pair_ids(new_seat)
assert old_pairs == new_pairs
summary['seating'] = {'originalPairs':len(old_pairs),'revisedPairs':len(new_pairs),'newPairs':len(new_pairs-old_pairs),'removedPairs':len(old_pairs-new_pairs)}
for key in ('openSurfaces','loose','detailBreaches','unseated'):
    assert old_seat[key] == new_seat[key]
    summary['seating'][key] = new_seat[key] if isinstance(new_seat[key],int) else len(new_seat[key])
old_models, new_models = (read(phase, 'inspector/models.json') for phase in phases)
assert all(old_models[k]['info'] == new_models[k]['info'] for k in old_models)
summary['inspector'] = {k:v['info'] for k,v in new_models.items()}
(base/'comparison.json').write_text(json.dumps(summary,indent=2)+'\n',encoding='utf8')
print(summary)

for view in ('side','player','rear'):
    sheet = Image.new('RGB', (960,4*238), '#20252a')
    ink = ImageDraw.Draw(sheet)
    for row, light in enumerate(lights):
        for column, phase in enumerate(phases):
            im = Image.open(base/phase/(view+'-'+light+'.jpg'))
            # Identical framing in each phase, only use the centre for the displayed crop.
            cut = im.crop((50,70,830,420)).resize((480,215),Image.Resampling.LANCZOS)
            sheet.paste(cut,(480*column,238*row+23))
            ink.text((480*column+8,238*row+4),f'{view}   {light}   {phase}',fill='white')
    sheet.save(base/(view+'-paired.jpg'),quality=94)
