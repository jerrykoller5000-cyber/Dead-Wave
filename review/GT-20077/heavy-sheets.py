from pathlib import Path
import sys
from PIL import Image, ImageDraw

root = Path(__file__).parent / sys.argv[1]
phase = sys.argv[2]
finish = "m81" if phase == "after" else "factory"
views = ("hip", "held", "held-right") if finish == "m81" else ("hip", "aimed", "held", "held-right")
for view in views:
    crop = (430, 320, 1280, 720) if view in ("hip","aimed") else (135, 210, 1180, 515)
    width = 500
    height = round(width * (crop[3] - crop[1]) / (crop[2] - crop[0]))
    sheet = Image.new("RGB", (width*2, 26 + 4*(height+20)), "#1d2325")
    pen = ImageDraw.Draw(sheet)
    origin = "baseline-look" if root.name == "chainsaw" and (root / "baseline-look" / "frames.json").exists() else "before"
    comparison = ((origin, finish), (phase, finish))
    if root.name == "flamer" and finish == "m81" and view == "held-right":
        comparison = ((phase, "factory"), (phase, "m81"))
    for col, (stage, paint) in enumerate(comparison):
        pen.text((col*width+8,6),f"{stage.upper()}   {paint} / {view}",fill="white")
        for row, light in enumerate(("noon", "overcast", "dusk", "night")):
            top = 26 + row*(height+20)
            pen.text((col*width+8, top), light, fill="#e3e6df")
            with Image.open(root/stage/f"{paint}-{view}-{light}.jpg") as frame:
                sheet.paste(frame.crop(crop).resize((width,height), Image.Resampling.LANCZOS),(col*width,top+18))
    sheet.save(root/f"compare-{finish}-{view}.jpg",quality=94)
