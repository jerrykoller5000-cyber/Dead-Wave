"""Show an audited visual pair before and after from the recorded gameplay camera."""
from pathlib import Path
import json
import sys
from PIL import Image, ImageDraw

model, baseline, after, index = sys.argv[1:5]
assert all(value.replace("-", "").isalnum() for value in (model,baseline,after))
index=int(index)
root=Path(__file__).parent
folder=root/"visible-repairs"/model
rank=json.loads((root/baseline/model/"rank.json").read_text(encoding="utf-8"))
pair=next(p for p in rank["rows"] if p["index"]==index)
for view,match in pair["views"].items():
    x0,y0,x1,y1=match["bounds"]
    # Keep enough of the surrounding outline to recognise which visible part is changing.
    w=min(650,max(244,x1-x0+64));h=min(380,max(124,y1-y0+56))
    cx=(x0+x1)//2;cy=(y0+y1)//2
    with Image.open(folder/"before"/(view+"-noon.png")) as before:
        width,height=before.size
    left=min(max(0,cx-w//2),width-w);top=min(max(0,cy-h//2),height-h)
    display=410;dh=round(display*h/w)
    sheet=Image.new("RGB",(display*2,34+(dh+18)*4),"#20252a")
    pen=ImageDraw.Draw(sheet)
    for col,phase in enumerate(("before",after)):
        pen.text((display*col+7,8),("BEFORE" if col==0 else "AFTER")+"  /  "+view,fill="white")
        for row,light in enumerate(("noon","overcast","dusk","night")):
            yy=30+row*(dh+18)
            pen.text((display*col+7,yy),light,fill="#dddcd3")
            with Image.open(folder/phase/(view+"-"+light+".png")) as frame:
                cut=frame.crop((left,top,left+w,top+h)).resize((display,dh),Image.Resampling.LANCZOS)
                sheet.paste(cut,(display*col,yy+16))
    sheet.save(folder/(after+"-pair-"+str(index)+"-"+view+".jpg"),quality=94)
