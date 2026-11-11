from pathlib import Path
from PIL import Image, ImageDraw
import sys

root=Path(__file__).resolve().parent
phase=sys.argv[1]
lights=['noon','overcast','dusk','night']
poses=[10,18,28,38,48,58,68,74,78,88,96]


def sheet(filename, rows, columns, width, height):
    out=Image.new('RGB',(8+columns*(width+8),8+((len(rows)+columns-1)//columns)*(height+23)),'#20262c')
    ink=ImageDraw.Draw(out)
    for i,(label,file,crop) in enumerate(rows):
        x=8+i%columns*(width+8)
        y=8+i//columns*(height+23)
        ink.text((x,y),label,fill='#e4ecf3')
        with Image.open(file) as im:
            tile=im.crop(crop)
        tile.thumbnail((width,height),Image.Resampling.LANCZOS)
        out.paste(tile,(x,y+15))
    out.save(root/filename,quality=94)


sheet(phase+'-reload.jpg', [(str(p)+'%',root/phase/('eye-reload.jpg' if p==74 else f'reload-{p}.jpg'),
                             (390,155,960,540)) for p in poses],4,280,189)
if phase=='after':
    sheet('round-case-pairs.jpg',[(state+' / '+light,root/state/(light+'.jpg'),(345,46,622,405))
                                    for state in ['before','after'] for light in lights],4,191,248)
    sheet('magazine-pairs.jpg',[(state+' / '+label,root/state/(file+'.jpg'),(290,130,693,480))
                                 for state in ['before','after'] for label,file in [('Empty','mag-empty'),('Loaded','mag-loaded')]],2,345,255)
    sheet('magazine-return.jpg', [(state+' / 48%',root/state/'reload-48.jpg',(478,355,809,540)) for state in ['before','after']],2,331,185)
    sheet('return-in-four-lights.jpg', [(light.title(),root/phase/f'return-48-{light}.jpg',(478,355,809,540)) for light in lights],4,280,160)
    sheet('eye-pairs.jpg',[(state+' / '+light,root/state/('eye-reload.jpg' if light=='noon' else 'eye-reload-'+light+'.jpg'),
                            (400,194,960,540)) for state in ['before','after'] for light in lights],4,273,169)
