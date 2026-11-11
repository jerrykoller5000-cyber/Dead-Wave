from pathlib import Path
import json
from itertools import product
from math import hypot
from PIL import Image,ImageDraw

base=Path(__file__).parent/"visible-repairs"/"aa12"
cams={s:json.loads((base/s/"cameras.json").read_text(encoding="utf-8")) for s in ("before","after")}
def project(frame,p):
    pts=frame["points"]
    x,y,w=[pts[0][i]+sum(p[j]*(pts[j+1][i]-pts[0][i]) for j in range(3)) for i in range(3)]
    return ((1+x/w)*480,(1-y/w)*270) if w>0 else None

anchors=list(product((-.048,.048),(-.05,.06),(-.19,.19)))
drift={}
for view in cams["before"]:
    a=[project(cams["before"][view],p) for p in anchors]
    b=[project(cams["after"][view],p) for p in anchors]
    visible=lambda q:q and 0<=q[0]<960 and 0<=q[1]<540
    motion=[hypot(x[0]-y[0],x[1]-y[1]) for x,y in zip(a,b) if visible(x) and visible(y)]
    drift[view]=round(max(motion),2) if motion else None
    if view not in ("hip","held-left","held-right","rack"): continue
    pts=[q for q in a+b if q]
    x0=max(0,min(960-240,int(min(q[0] for q in pts))-24))
    x1=min(960,max(x0+240,int(max(q[0] for q in pts))+24))
    y0=max(0,min(540-124,int(min(q[1] for q in pts))-20))
    y1=min(540,max(y0+124,int(max(q[1] for q in pts))+20))
    rect=(x0,y0,x1,y1)
    width=410
    height=round(width*(y1-y0)/(x1-x0))
    sheet=Image.new("RGB",(2*width,36+4*(height+18)),"#202529")
    pen=ImageDraw.Draw(sheet)
    for col,s in enumerate(("before","after")):
        pen.text((col*width+7,8),s.upper()+"   /   "+view,fill="white")
        for row,light in enumerate(("noon","overcast","dusk","night")):
            with Image.open(base/s/(view+"-"+light+".png")) as img:
                y=32+row*(height+18)
                pen.text((col*width+7,y),light,fill="#e9e5dc")
                sheet.paste(img.crop(rect).resize((width,height),Image.Resampling.LANCZOS),(col*width,y+15))
    sheet.save(base/("paired-"+view+".jpg"),quality=94)
(base/"camera-drift-pixels.json").write_text(json.dumps(drift,indent=2)+"\n",encoding="utf8")
print("Maximum panel-anchor drift on each matched view",drift)
