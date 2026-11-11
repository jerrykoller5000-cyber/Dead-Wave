from pathlib import Path
import json
import sys
from PIL import Image, ImageDraw

folder = next((a.split("=",1)[1] for a in sys.argv if a.startswith("--folder=")), "visibility-final" if "--precise" in sys.argv else "visibility")
assert folder.startswith("visibility") and all(c.isalnum() or c=="-" for c in folder)
root = Path(__file__).parent / folder
for model in (arg for arg in sys.argv[1:] if not arg.startswith("--")):
    path = root / model
    result = json.loads((path / "rank.json").read_text(encoding="utf-8"))
    for view in result["coverage"]:
        with Image.open(path / f"{view}.png") as source:
            raw = source.convert("RGB")
        rows = sorted((r for r in result["rows"] if view in r["views"]), key=lambda r: -r["views"][view]["pixels"])[:4]
        sheet = Image.new("RGB", (720, 56 + 405 + 150 * len(rows)), "#1c2125")
        pen = ImageDraw.Draw(sheet)
        pen.text((12, 10), f"{model}  /  {view}    Visible surface-crossing candidates", fill="white")
        pen.text((12, 30), "Normal frame above. Below, unchanged crop at left and measured crossing at right.", fill="#d4d9da")
        scaled = raw.resize((720,405),Image.Resampling.LANCZOS)
        sheet.paste(scaled,(0,56))
        for i, row in enumerate(rows):
            item = row["views"][view]
            x, y = item["at"]
            px, py = x*3/4, 56 + y*3/4
            pen.ellipse((px-4,py-4,px+4,py+4), outline="#ffe558", width=1)
            label = f'{i+1}  pair {row["index"]}  /  {item["pixels"]} px'
            start = 468 + i*150
            pen.text((10,start),label,fill="#ffe578")
            left = max(0,min(raw.width-176,x-88)); top=max(0,min(raw.height-63,y-32))
            crop = raw.crop((left,top,left+176,top+63)).resize((352,126), Image.Resampling.NEAREST)
            sheet.paste(crop,(8,start+15)); sheet.paste(crop,(362,start+15))
            mx,my=362+2*(x-left)+1,start+16+2*(y-top)
            pen.ellipse((mx-5,my-5,mx+5,my+5),outline="#ffe558",width=1)
        sheet.save(path / f"candidates-{view}.jpg",quality=94)
