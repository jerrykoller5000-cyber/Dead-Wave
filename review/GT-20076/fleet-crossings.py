from pathlib import Path
import json
import sys
from PIL import Image, ImageDraw

folder=sys.argv[1] if len(sys.argv)>1 else "visibility-final"
assert folder=="visibility-final" or (folder.startswith("visibility-fix-") and folder.replace("-","").isalnum())
root=Path(__file__).parent/folder
rank=json.loads((root/"ranked.json").read_text(encoding="utf-8"))
names={"aa12":"Breacher","ak":"KR-7","m4":"GW-4","uzi":"Wasp","shotgun":"Pump shotgun","sniper":"Sniper","minigun":"Minigun","launcher":"Launcher","revolver":"Revolver","pistol":"Pistol","flamer":"Flamer","chainsaw":"Chainsaw"}
sheet=Image.new("RGB",(960,57+4*187),"#202429")
draw=ImageDraw.Draw(sheet)
draw.text((12,8),"J128  |  Largest screen crossing on each base model",fill="white")
caption="Initial posed-depth catalog, before Breacher repairs." if folder=="visibility-final" else "Updated ranking from the matched gameplay cameras."
draw.text((12,31),caption+" Yellow marks lie on the measured surface crossing.",fill="#d1d4d5")
for i,r in enumerate(rank["summary"]):
    id=r["model"]
    top=next(p for p in rank["candidates"] if p["model"]==id)
    source=rank.get("sources",{}).get(id,folder)
    with Image.open(root.parent/source/id/(top["view"]+".png")) as image:
        image=image.convert("RGB")
        x,y=top["at"];w,h=308,144
        x0=max(0,min(image.width-w,x-w//2));y0=max(0,min(image.height-h,y-h//2))
        crop=image.crop((x0,y0,x0+w,y0+h))
    xx=10+i%3*318; yy=56+i//3*187
    draw.text((xx,yy),names[id]+"  /  "+top["view"]+"  /  "+str(top["pixels"])+" px",fill="#eee9e2")
    sheet.paste(crop,(xx,yy+20))
    xx+=x-x0;yy+=20+y-y0
    draw.ellipse((xx-5,yy-5,xx+5,yy+5),outline="#ffe56b",width=1)
sheet.save(root/("fleet-first-crossings.jpg" if folder=="visibility-final" else "fleet-current-crossings.jpg"),quality=94)
