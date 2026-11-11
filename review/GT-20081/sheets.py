from pathlib import Path
from tempfile import NamedTemporaryFile
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parent
lights = ('noon', 'overcast', 'dusk', 'night')

def sheet(name, rows):
    cols, label, width, height = 4, 19, 292, 165
    out = Image.new('RGB', (cols * (width + 8) + 8, 26 + len(rows) * (height + label + 8)), '#20242b')
    draw = ImageDraw.Draw(out)
    for col, light in enumerate(lights):
        draw.text((8 + col * (width + 8), 5), light.title(), fill='white')
    for n, (title, folder, stem, crop) in enumerate(rows):
        y = 22 + n * (height + label + 8)
        draw.text((8, y), title, fill='white')
        for col, light in enumerate(lights):
            with Image.open(folder / f'{stem}-{light}.jpg') as frame:
                tile = frame.crop(crop) if crop else frame.copy()
                tile.thumbnail((width,height),Image.Resampling.LANCZOS)
                out.paste(tile,(8 + col * (width + 8), y + label))
    with NamedTemporaryFile(dir=root, suffix='.jpg', delete=False) as file:
        out.save(file, 'JPEG', quality=95)
    Path(file.name).replace(root / name)

if (root / 'decals-after/chainsaw-night.jpg').exists():
    sheet('decals-four-lights.jpg', [(phase, root / folder, 'chainsaw', (318,135,865,448)) for phase, folder in [
        ('Original fourteen decal meshes','decals-before'),('One mesh with the original marks','decals-after')]])
sheet('sniper-static.jpg', [(phase, root / folder, 'sniper', (400,190,957,530)) for phase,folder in [
    ('Original fixed artwork','before'),('Merged fixed artwork','static')]])
sheet('rack-four-lights.jpg', [(gun.title()+' on the Training rack',root / 'rack', gun,None) for gun in ('revolver','launcher')])
for gun,views,crop in [('launcher',[('open','Three remaining'),('palm','One incoming')],(400,255,1152,648)),
                       ('revolver',[('empty','Three spent'),('palm','Two retained'),('loader','Five incoming')],(565,235,1110,600))]:
    rows=[]
    for stem,title in views:
        rows.extend([(title+' / individually drawn',root.parent / 'GT-20080' / gun / 'after',stem,crop),
                     (title+' / instanced',root / (gun+'-reload'),stem,crop)])
    sheet(gun+'-instance-pairs.jpg',rows)
if (root / 'revolver-reload/individual-palm-night.jpg').exists():
    rows=[]
    for stem, title in [('empty','Three spent'),('palm','Two retained'),('loader','Five incoming')]:
        rows.extend([(title+' / regular reference meshes',root / 'revolver-reload','individual-'+stem,(565,235,1110,600)),
                     (title+' / GPU instances',root / 'revolver-reload',stem,(565,235,1110,600))])
    sheet('revolver-same-pose.jpg',rows)
if (root/'optional/launcher-night.jpg').exists():
    sheet('optional-fitted-eyes.jpg',[(title+' / first fit, M81',root/'optional',gun,(410,220,950,540)) for gun,title in [
        ('m4','GW-4'),('ak','KR-7'),('uzi','Wasp'),('revolver','Revolver'),('minigun','Minigun'),('launcher','Launcher')]])
