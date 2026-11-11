from pathlib import Path
import json
import sys
from PIL import Image, ImageChops

folder=Path(__file__).parent / ("ce6-"+sys.argv[1])
roi=(260,60,690,450)
ims={}
for mode in ("empty","current","individual"):
    with Image.open(folder/f"open-{mode}-overcast.png") as image:
        ims[mode]=image.convert("RGB").crop(roi)
def different(a,b):
    rgb=ImageChops.difference(ims[a],ims[b])
    mask=ImageChops.lighter(ImageChops.lighter(rgb.getchannel("R"),rgb.getchannel("G")),rgb.getchannel("B"))
    return sum(mask.histogram()[5:])
actual=different("empty","current")
reference=different("empty","individual")
error=different("current","individual")
result=dict(spentVsEmpty=actual,ordinaryVsEmpty=reference,spentVsOrdinary=error)
(folder/"pixel-proof.json").write_text(json.dumps(result,indent=2)+"\n",encoding="utf-8")
print(result)
assert reference>4000 and actual>.98*reference and error<.02*reference
