from pathlib import Path
import json
import sys
from tempfile import NamedTemporaryFile
from PIL import Image, ImageDraw

folder = Path(__file__).resolve().parent / sys.argv[1]
lights = ('noon', 'overcast', 'dusk', 'night')
revised = sys.argv[2:] == ['revised']
phases = ('after', 'revised') if revised else ('before', 'after')
prefix = 'revision-' if revised else ''
proof = json.loads((folder / phases[1] / 'proof.json').read_text(encoding='utf-8'))

def write(name, rows, columns, crop, limits):
    width, height = limits
    pad, header = 9, 25
    panel = Image.new('RGB', (pad + len(columns)*(width+pad), header+len(rows)*(height+24)), '#20242b')
    ink = ImageDraw.Draw(panel)
    for i, label in enumerate(columns):
        ink.text((pad+i*(width+pad), 6), label, fill='white')
    for j, (label, files) in enumerate(rows):
        y = header+j*(height+24)
        ink.text((pad,y), label, fill='#dae1e7')
        for i,file in enumerate(files):
            with Image.open(file) as source:
                tile=source.crop(crop) if crop else source.copy()
            tile.thumbnail((width,height), Image.Resampling.LANCZOS)
            panel.paste(tile,(pad+i*(width+pad),y+15))
    with NamedTemporaryFile(dir=folder,suffix='.jpg',delete=False) as temp:
        panel.save(temp,format='JPEG',quality=94)
    Path(temp.name).replace(folder/(prefix+name))

if revised:
    write('eye-lights.jpg', [('74% reload', [folder/phases[1]/('eye-reload'+('' if light=='noon' else '-'+light)+'.jpg') for light in lights])],
          lights, (490,289,849,540), (350,240))

extent=proof['info']
wasp = folder.name == 'uzi'
lengths=f"Issued round {extent['live'][1]*1000:.1f} / spent case {extent['spent'][1]*1000:.1f} game mm"
write('round-case.jpg', [(label,[folder/phase/(light+'.jpg') for light in lights])
                         for phase,label in [(phases[0],'Previous live and spent artwork' if revised else 'Previous case'),(phases[1],lengths)]],
      lights,(315,202,647,456) if wasp else (272,77,694,452),(240,216))
write('magazine-pairs.jpg',[(phase.capitalize(),[folder/phase/(part+'.jpg') for part in ('mag-empty','mag-loaded')])
                             for phase in phases],['Empty','Loaded'],(244,138,705,429),(430,270))
write('eye-pairs.jpg',[('74% reload',[folder/phase/'eye-reload.jpg' for phase in phases])],
      [phase.capitalize() for phase in phases],(490,289,849,540) if wasp else (488,302,838,500),(350,240) if wasp else (350,199))
