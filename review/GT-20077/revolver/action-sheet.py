from pathlib import Path
from PIL import Image, ImageDraw


root = Path(__file__).resolve().parent
states = ("rest", "lift", "break", "return")
lights = ("noon", "overcast", "dusk", "night")
crop = (762, 376, 1002, 578)
sheet = Image.new("RGB", (4 * 248 + 8, 8 * 229 + 28), "#20242b")
draw = ImageDraw.Draw(sheet)
for col, state in enumerate(states):
    draw.text((8 + col * 248, 6), state.title(), fill="white")
for row, light in enumerate(lights):
    for index, phase in enumerate(("before", "after")):
        y = 28 + (row * 2 + index) * 229
        draw.text((8, y), f"{light.title()} / {phase}", fill="#d6dee7")
        for col, state in enumerate(states):
            with Image.open(root / f"action-{phase}" / f"{light}-{state}.jpg") as source:
                sheet.paste(source.crop(crop), (8 + col * 248, y + 17))
sheet.save(root / "action-pairs.jpg", quality=95)
