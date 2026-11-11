from pathlib import Path
import sys
from PIL import Image, ImageDraw

root=Path(__file__).parent
phase=sys.argv[1]
assert phase in ("binding","integrated")
for name,rect in (("open",(165,50,795,490)),("hip",(382,185,960,540))):
    w=450; h=round(w*(rect[3]-rect[1])/(rect[2]-rect[0]))
    sheet=Image.new("RGB",(w*2,39+4*(h+18)),"#1b2023")
    pen=ImageDraw.Draw(sheet)
    for col,label in enumerate(("Previous display","Spent artwork")):
        pen.text((col*w+9,8),label,fill="white")
        for row,light in enumerate(("noon","overcast","dusk","night")):
            if name=="open":
                p=root/("ce6-"+phase)/("open-"+("previous" if col==0 else "current")+"-"+light+".png")
            else:
                p=root/("ce6-"+("before" if col==0 else phase))/(name+"-"+light+".png")
            with Image.open(p) as img:
                y=34+row*(h+18)
                pen.text((col*w+9,y),light,fill="#dddcd5")
                sheet.paste(img.crop(rect).resize((w,h),Image.Resampling.LANCZOS),(col*w,y+16))
    sheet.save(root/("ce6-"+phase+"-"+name+".jpg"),quality=94)
