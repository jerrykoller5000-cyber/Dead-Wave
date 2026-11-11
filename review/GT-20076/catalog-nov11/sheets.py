from pathlib import Path
from PIL import Image, ImageDraw
root=Path(__file__).parent
models=("pistol","revolver","uzi","m4","ak","aa12","shotgun","sniper","minigun","launcher","flamer","chainsaw")
for light in ("noon","overcast","dusk","night"):
    sheet=Image.new("RGB",(1080,4*218),"#212428")
    pen=ImageDraw.Draw(sheet)
    for i,key in enumerate(models):
        x,y=i%3*360,i//3*218
        with Image.open(root/"inspector"/f"{key}-{light}.jpg") as img:
            img.thumbnail((360,196),Image.Resampling.LANCZOS)
            sheet.paste(img,(x,y))
        pen.text((x+6,y+198),key+"  /  "+light,fill="#e7e8de")
    sheet.save(root/f"inspector-{light}.jpg",quality=92)
