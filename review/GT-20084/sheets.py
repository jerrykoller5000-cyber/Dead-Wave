from pathlib import Path
import json
import sys
from PIL import Image, ImageChops, ImageDraw

root=Path(__file__).resolve().parent
for name in sys.argv[1:]:
    if not name.isalnum(): raise ValueError(name)
    folder=root/"after"/name
    rows={}
    side=220
    sheet=Image.new("RGB",(2*side,4*(side+18)+22),"#202529")
    pen=ImageDraw.Draw(sheet)
    for column,state in enumerate(("rest","pressed")):
        pen.text((column*side+5,3),name+" / "+state,fill="white")
    for row,light in enumerate(("noon","overcast","dusk","night")):
        crops=[]
        for column,state in enumerate(("rest","pressed")):
            with Image.open(folder/f"close-{light}-{state}.png") as frame:
                w,h=frame.size
                crop=frame.crop((w//2-110,h//2-110,w//2+110,h//2+110)).convert("RGB")
            x,y=column*side,21+row*(side+18)
            pen.text((x+5,y),light,fill="white")
            sheet.paste(crop,(x,y+15));crops.append(crop)
        difference=ImageChops.difference(*crops)
        a,b,c=difference.split()
        h=ImageChops.lighter(ImageChops.lighter(a,b),c).histogram()
        rows[light]={"changed":sum(h[1:]),"over4":sum(h[5:]),"peak":max(i for i,count in enumerate(h) if count)}
    sheet.save(folder/"switch-four-lights.jpg",quality=94)
    (folder/"switch-pixels.json").write_text(json.dumps(rows,indent=2)+"\n",encoding="utf-8")
    print(name,rows)
