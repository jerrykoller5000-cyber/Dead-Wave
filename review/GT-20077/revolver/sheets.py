from pathlib import Path
from PIL import Image, ImageDraw


folder = Path(__file__).resolve().parent
lights = ("noon", "overcast", "dusk", "night")


def sheet(filename, views, size):
    width, height = size
    row_height = height + 22
    out = Image.new("RGB", (4 * (width + 8) + 8, 26 + 2 * len(views) * row_height), "#20242b")
    draw = ImageDraw.Draw(out)
    for column, light in enumerate(lights):
        draw.text((8 + column * (width + 8), 7), light.title(), fill="white")
    y = 26
    for view, crop in views:
        for phase in ("before", "after"):
            draw.text((8, y), view + " / " + phase, fill="#d6dee7")
            for column, light in enumerate(lights):
                with Image.open(folder / phase / f"{view}-{light}.jpg") as source:
                    tile = source.crop(crop) if crop else source.copy()
                tile.thumbnail(size, Image.Resampling.LANCZOS)
                out.paste(tile, (8 + column * (width + 8), y + 15))
            y += row_height
    out.save(folder / filename, quality=94)


sheet("model-pairs.jpg", [("side", None), ("rear3", None)], (350, 197))
sheet("eye-pairs.jpg", [
    ("hip", (745, 371, 1055, 720)),
    ("aimed", (490, 315, 800, 664)),
    ("reload", (704, 310, 1052, 720)),
], (230, 262))
