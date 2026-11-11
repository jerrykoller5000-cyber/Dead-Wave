from pathlib import Path
import sys
from PIL import Image, ImageDraw

root = Path(__file__).parent
j128 = "--j128" in sys.argv
pair = ("fine-chain","unified-chain") if j128 else ("coarse-chain","fine-chain")
for mode, rect in (("hip", (394, 201, 807, 468)), ("held-right",(315,204,866,460))):
    width = 430
    height = round(width*(rect[3]-rect[1])/(rect[2]-rect[0]))
    sheet = Image.new("RGB",(width*2,28+4*(height+20)),"#1d2226")
    pen = ImageDraw.Draw(sheet)
    for col, folder in enumerate(pair):
        pen.text((col*width+8,7),("BEFORE" if col==0 else "AFTER")+"   /   "+mode.upper(),fill="white")
        for row,light in enumerate(("noon","overcast","dusk","night")):
            y=28+row*(height+20)
            pen.text((col*width+8,y),light,fill="#ddddd5")
            with Image.open(root/folder/f"factory-{mode}-{light}.jpg") as image:
                sheet.paste(image.crop(rect).resize((width,height),Image.Resampling.LANCZOS),(col*width,y+17))
    sheet.save(root/(("chain-j128-" if j128 else "chain-")+mode+".jpg"),quality=95)
