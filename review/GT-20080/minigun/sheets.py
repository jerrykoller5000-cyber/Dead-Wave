from pathlib import Path
from PIL import Image, ImageDraw

root=Path(__file__).resolve().parent
lights=('noon','overcast','dusk','night')

def panel(name, rows, width, height):
    cols=len(rows[0][1])
    sheet=Image.new('RGB',(8+cols*(width+8),8+len(rows)*(height+23)),'#20262c')
    draw=ImageDraw.Draw(sheet)
    for row,(title,files,area) in enumerate(rows):
        for col,(label,path) in enumerate(files):
            x=8+col*(width+8);y=8+row*(height+23)
            draw.text((x,y),title+' / '+label,fill='#e5ebef')
            with Image.open(path) as im:
                tile=im.crop(area)
            tile.thumbnail((width,height),Image.Resampling.LANCZOS)
            sheet.paste(tile,(x,y+15))
    sheet.save(root/name,quality=94)

panel('round-case-pairs.jpg',[(label,[(light,root/phase/(light+'.jpg')) for light in lights],(336,111,630,421))
      for phase,label in [('before','Original spent case'),('after','Issued and spent')]],192,205)
panel('case-mouth.jpg',[('Close view',[(light,root/'after'/('mouth-'+light+'.jpg')) for light in lights],(175,77,786,477))],275,185)
panel('sealed-drum.jpg',[(phase,[(s.title(),root/phase/('mag-'+s+'.jpg')) for s in ['empty','loaded']],(219,0,762,540))
      for phase in ['before','after']],290,285)
panel('eye-pairs.jpg',[(phase,[(s,root/phase/('eye-reload.jpg' if s=='noon' else 'eye-reload-'+s+'.jpg')) for s in lights],
                         (430,169,960,540)) for phase in ['before','after']],279,195)
