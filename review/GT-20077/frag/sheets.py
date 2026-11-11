from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).parent
for view, crop in {
    "eye-held": (82, 160, 448, 472),
    "eye-lift": (67, 283, 428, 590),
    "held-left": (355, 152, 924, 554),
    "held-right": (370, 130, 873, 563),
    "surface": (355, 60, 915, 646),
}.items():
    final = "unmarked" if (root/"unmarked"/f"{view}-night.jpg").exists() else "after"
    if not (root/final/f"{view}-night.jpg").exists():
        continue
    width = 360
    height = round(width*(crop[3]-crop[1])/(crop[2]-crop[0]))
    sheet = Image.new("RGB",(2*width,26+4*(height+18)),"#1e2324")
    pen = ImageDraw.Draw(sheet)
    for col, phase in enumerate(("before",final)):
        pen.text((col*width+7,6),f"{phase.upper()}   /   {view.upper()}",fill="#f3f1ed")
        for row, light in enumerate(("noon","overcast","dusk","night")):
            y = 26+row*(height+18)
            pen.text((col*width+7,y),light,fill="#dfdfd5")
            with Image.open(root/phase/f"{view}-{light}.jpg") as img:
                sheet.paste(img.crop(crop).resize((width,height),Image.Resampling.LANCZOS),(col*width,y+16))
    sheet.save(root/f"compare-{view}.jpg",quality=93)
