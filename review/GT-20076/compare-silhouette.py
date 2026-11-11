"""Check the source visibility around an audited seam in matched gameplay frames."""
import gzip
import json
import sys
from array import array
from pathlib import Path
from PIL import Image, ImageChops, ImageFilter

model, old_name, new_name, index = sys.argv[1:5]
assert all(name.replace("-", "").isalnum() for name in (model,old_name,new_name))
root = Path(__file__).parent
before, after = (root/name/model for name in (old_name,new_name))
ranks = json.loads((before/"rank.json").read_text(encoding="utf-8"))
pair = next(p for p in ranks["rows"] if p["index"]==int(index))
report={}
for view, match in pair["views"].items():
    with Image.open(before/(view+".png")) as frame:
        size=frame.size
    def mask(folder):
        data=(folder/(view+"-mask.bin")).read_bytes()
        return Image.frombytes("L",size,data).point(lambda x:255 if x else 0)
    old,new = mask(before),mask(after)
    def depth_coverage(folder):
        depths=array('f')
        depths.frombytes(gzip.decompress((folder/(view+'-depth.gz')).read_bytes()))
        assert len(depths)==size[0]*size[1]
        return Image.frombytes('L',size,bytes(255 if d>0 else 0 for d in depths))
    old_depth,new_depth=depth_coverage(before),depth_coverage(after)
    x0,y0,x1,y1=match["bounds"]
    area=(max(0,x0-2),max(0,y0-2),min(size[0],x1+3),min(size[1],y1+3))
    interior=old.filter(ImageFilter.MinFilter(3))
    def count(image):
        return image.crop(area).histogram()[255]
    old_depth_interior=old_depth.filter(ImageFilter.MinFilter(3))
    report[view]=dict(area=area,old=count(old),current=count(new),oldInterior=count(interior),
        missingMeshDepth=count(ImageChops.subtract(old_depth_interior,new_depth)),
        missingMeshDepthWithOnePixelTolerance=count(ImageChops.subtract(old_depth_interior,new_depth.filter(ImageFilter.MaxFilter(3)))),
        absentInterior=count(ImageChops.subtract(interior,new)),
        absentWithOnePixelTolerance=count(ImageChops.subtract(interior,new.filter(ImageFilter.MaxFilter(3)))))
out=root/"visible-repairs"/model/(new_name+"-pair-"+index+"-silhouette.json")
out.write_text(json.dumps(report,indent=2)+"\n",encoding="utf-8")
print(json.dumps(report))
