from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).parent
views = {
    "hip": (746, 386, 1280, 720),
    "aimed": (445, 480, 850, 720),
    "held": (232, 241, 1004, 454),
}
for view, crop in views.items():
    height = round(515 * (crop[3] - crop[1]) / (crop[2] - crop[0]))
    sheet = Image.new("RGB", (1030, 28 + 4 * (height + 20)), "#1c2124")
    pen = ImageDraw.Draw(sheet)
    for column, phase in enumerate(("before", "final" if (root / "final" / "frames.json").exists() else "after")):
        pen.text((column * 515 + 8, 7), phase.upper() + "   /   " + view.upper(), fill="white")
        for row, light in enumerate(("noon", "overcast", "dusk", "night")):
            y = 28 + row * (height + 20)
            pen.text((column * 515 + 8, y), light, fill="#e4e3da")
            frame = Image.open(root / phase / ("factory-" + view + "-" + light + ".jpg"))
            sheet.paste(frame.crop(crop).resize((515, height), Image.Resampling.LANCZOS), (column * 515, y + 18))
    sheet.save(root / ("compare-" + view + ".jpg"), quality=94)
