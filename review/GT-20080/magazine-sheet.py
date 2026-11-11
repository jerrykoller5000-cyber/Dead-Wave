from pathlib import Path
import json
import sys
from tempfile import NamedTemporaryFile
from PIL import Image, ImageDraw

folder = Path(__file__).resolve().parent / sys.argv[1]
lights = ('noon', 'overcast', 'dusk', 'night')
proof = json.loads((folder / 'after' / 'proof.json').read_text(encoding='utf-8'))

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
    Path(temp.name).replace(folder/name)

extent=proof['info']
lengths=f"Issued round {extent['live'][1]*1000:.1f} / spent case {extent['spent'][1]*1000:.1f} game mm"
write('round-case.jpg', [(label,[folder/phase/(light+'.jpg') for light in lights])
                         for phase,label in [('before','Previous case'),('after',lengths)]],
      lights,(272,77,694,452),(240,216))
write('magazine-pairs.jpg',[(phase.capitalize(),[folder/phase/(part+'.jpg') for part in ('mag-empty','mag-loaded')])
                             for phase in ('before','after')],['Empty','Loaded'],(244,138,705,429),(430,270))
write('eye-pairs.jpg',[('74% reload',[folder/phase/'eye-reload.jpg' for phase in ('before','after')])],
      ['Before','After'],(488,302,838,500),(350,199))
