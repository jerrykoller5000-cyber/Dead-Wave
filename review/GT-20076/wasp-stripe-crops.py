"""Compare the current Wasp fore-end using its saved model-local camera projection."""
from itertools import product
from pathlib import Path
from math import hypot, ceil
import json
from PIL import Image, ImageDraw

folder = Path(__file__).parent / "visible-repairs" / "uzi"
phases = ("clear-furniture-stripes-before", "clear-furniture-seated-after")
cameras = [json.loads((folder / phase / "cameras.json").read_text(encoding="utf8")) for phase in phases]
corners = list(product((-.041, .041), (-.014, .069), (.219, .335)))
def project(basis, p):
    x, y, w = [basis[0][j] + sum(p[k] * (basis[k+1][j]-basis[0][j]) for k in range(3)) for j in range(3)]
    assert w > 0
    return ((1+x/w)*480, (1-y/w)*270)

for view in ("held-left-open","held-left","held-right-open"):
    a, b = [[project(camera[view]["points"], p) for p in corners] for camera in cameras]
    drift = max(hypot(x-u,y-v) for (x,y),(u,v) in zip(a,b))
    assert drift < 1, (view, drift)
    xs, ys = zip(*(a+b))
    width, height = max(230,ceil(max(xs)-min(xs))+54), max(145,ceil(max(ys)-min(ys))+46)
    left = max(0, min(960-width, round((min(xs)+max(xs)-width)/2)))
    top = max(0, min(540-height, round((min(ys)+max(ys)-height)/2)))
    assert all(left<=x<=left+width and top<=y<=top+height for x,y in a+b)
    h = round(440*height/width)
    sheet=Image.new("RGB",(880,(22+h)*4),"#24282c")
    draw=ImageDraw.Draw(sheet)
    for col,phase in enumerate(phases):
        for row,light in enumerate(("noon","overcast","dusk","night")):
            x,y=col*440,row*(22+h)
            draw.text((x+6,y+5),f"{'Before' if col==0 else 'After'} | {view} | {light}",fill="white")
            with Image.open(folder/phase/(view+"-"+light+".png")) as frame:
                shot=frame.crop((left,top,left+width,top+height)).resize((440,h),Image.Resampling.LANCZOS)
                sheet.paste(shot,(x,y+22))
    sheet.save(folder/("furniture-current-"+view+".jpg"),quality=94)
    print(view, "current fore-end bounds", (left,top,width,height), "max drift",drift)
