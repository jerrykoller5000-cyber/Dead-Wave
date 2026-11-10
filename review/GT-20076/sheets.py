from pathlib import Path

from PIL import Image, ImageDraw

root = Path(__file__).resolve().parent
output = root / "sheets"
output.mkdir(exist_ok=True)
lights = ("noon", "overcast", "dusk", "night")


def paired_sheet(name, columns, folder, path_for):
    width, height = 480, 270
    canvas = Image.new("RGB", (width * len(columns), 62 + 2 * (height + 26)), "#15191e")
    draw = ImageDraw.Draw(canvas)
    draw.text((12, 9), name, fill="white")
    for col, label in enumerate(columns):
        draw.text((col * width + 12, 39), label, fill="#e9d48e")
    for row, phase in enumerate(("before", "after")):
        top = 62 + row * (height + 26)
        for col, label in enumerate(columns):
            with Image.open(root / phase / folder / path_for(label)) as image:
                image.thumbnail((width, height), Image.Resampling.LANCZOS)
                canvas.paste(image, (col * width, top))
            draw.text((col * width + 12, top + height + 5), phase.capitalize(), fill="white")
    canvas.save(output / (name + ".jpg"), quality=90)


for source in sorted((root / "before" / "inspector").glob("*-noon.jpg")):
    model = source.name.removesuffix("-noon.jpg")
    paired_sheet(model, lights, "inspector", lambda light: f"{model}-{light}.jpg")

for source in sorted((root / "before" / "armory").glob("*-front.jpg")):
    fitting = source.name.removesuffix("-front.jpg")
    paired_sheet(fitting, ("front", "side"), "armory", lambda view: f"{fitting}-{view}.jpg")

closeup = Image.new("RGB", (610, 196), "#181c1e")
draw = ImageDraw.Draw(closeup)
for i, phase in enumerate(("before", "after")):
    with Image.open(root / phase / "inspector" / "katana-noon.jpg") as frame:
        crop = frame.crop((665, 248, 862, 292)).resize((591, 74), Image.Resampling.LANCZOS)
        closeup.paste(crop, (8, 20 + 97 * i))
    draw.text((8, 3 + 97 * i), phase, fill="white")
closeup.save(root / "katana-grip-review.jpg", quality=93)
