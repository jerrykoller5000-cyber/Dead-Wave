"""Show an audited visual pair before and after from the recorded gameplay camera."""
from pathlib import Path
import json
import sys
from itertools import product
from math import hypot
from PIL import Image, ImageDraw

model, baseline, after, index = sys.argv[1:5]
assert all(value.replace("-", "").isalnum() for value in (model,baseline,after))
index=int(index)
old_phase=sys.argv[5] if len(sys.argv)>5 else "before"
assert old_phase.replace("-","").isalnum()
root=Path(__file__).parent
folder=root/"visible-repairs"/model
rank=json.loads((root/baseline/model/"rank.json").read_text(encoding="utf-8"))
rank_cameras=json.loads((root/baseline/model/"cameras.json").read_text(encoding="utf-8"))
pair=next(p for p in rank["rows"] if p["index"]==index)
folders={s:folder/s for s in (old_phase,after)}
alternate=next((a.split('=',1)[1] for a in sys.argv[6:] if a.startswith('--before-source=')),None)
if alternate:
    source=(root.parent/alternate).resolve()
    assert source.is_relative_to(root.parent.resolve()) and source.is_dir()
    folders[old_phase]=source
cameras={s:json.loads((d/"cameras.json").read_text(encoding="utf-8")) for s,d in folders.items()}
def project(frame,point,width,height):
    basis=frame["points"]
    x,y,w=[basis[0][i]+sum(point[j]*(basis[j+1][i]-basis[0][i]) for j in range(3)) for i in range(3)]
    return ((1+x/w)*width/2,(1-y/w)*height/2) if w>0 else None

requested=next((a[8:].split(',') for a in sys.argv[6:] if a.startswith('--views=')),None)
if requested: assert all(v in cameras[after] and v in cameras[old_phase] for v in requested)
drift={}
for view,match in pair["views"].items():
    if requested and view not in requested: continue
    x0,y0,x1,y1=match["bounds"]
    # Keep enough of the surrounding outline to recognise which visible part is changing.
    w=min(650,max(244,x1-x0+64));h=min(380,max(124,y1-y0+56))
    cx=(x0+x1)//2;cy=(y0+y1)//2
    with Image.open(folders[old_phase]/(view+"-noon.png")) as before:
        width,height=before.size
    errors=[]
    rank_drift=[]
    for point in product((-.08,.08),(-.10,.10),(-.15,.15)):
        a,b=(project(cameras[s][view],point,width,height) for s in (old_phase,after))
        if a and b: errors.append(hypot(a[0]-b[0],a[1]-b[1]))
        r=project(rank_cameras[view],point,width,height)
        if a and r: rank_drift.append(hypot(a[0]-r[0],a[1]-r[1]))
    assert errors, "No projected camera anchors for "+view
    # A changed held pose can put the old box entirely on the marine. A few pixels of sway fit within the crop margin.
    assert rank_drift and max(rank_drift)<3, (view,"ranked camera no longer matches the before image",max(rank_drift,default=0))
    drift[view]=max(errors)
    assert drift[view]<1.0, (view,"camera drift in pixels",drift[view])
    left=min(max(0,cx-w//2),width-w);top=min(max(0,cy-h//2),height-h)
    display=410;dh=round(display*h/w)
    sheet=Image.new("RGB",(display*2,34+(dh+18)*4),"#20252a")
    pen=ImageDraw.Draw(sheet)
    for col,phase in enumerate((old_phase,after)):
        pen.text((display*col+7,8),("BEFORE" if col==0 else "AFTER")+"  /  "+view,fill="white")
        for row,light in enumerate(("noon","overcast","dusk","night")):
            yy=30+row*(dh+18)
            pen.text((display*col+7,yy),light,fill="#dddcd3")
            with Image.open(folders[phase]/(view+"-"+light+".png")) as frame:
                cut=frame.crop((left,top,left+w,top+h)).resize((display,dh),Image.Resampling.LANCZOS)
                sheet.paste(cut,(display*col,yy+16))
    sheet.save(folder/(after+"-pair-"+str(index)+"-"+view+".jpg"),quality=94)
(folder/(after+"-pair-"+str(index)+"-camera-drift.json")).write_text(json.dumps(drift,indent=2)+"\n",encoding="utf-8")
print("Maximum matched-camera drift in pixels",drift)
