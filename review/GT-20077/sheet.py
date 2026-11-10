from pathlib import Path
import sys
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parent
gun = sys.argv[1]
folder = root / gun
lights = ("noon", "overcast", "dusk", "night")
poses = ("hip", "aimed", "reload")
regions = {"hip": (680, 335, 1020, 675), "aimed": (490, 310, 790, 610),
           "reload": (680, 235, 1040, 595)}

def make_sheet(name, rows, columns, side, height=None):
    height = height or side
    margin, top, row_h = 10, 38, height + 22
    canvas = Image.new("RGB", (margin + (side + margin) * len(columns), top + row_h * len(rows)), "#20242b")
    ink = ImageDraw.Draw(canvas)
    for c, label in enumerate(columns):
        ink.text((margin + c * (side + margin), 11), label, fill="white")
    for r, (label, paths) in enumerate(rows):
        y = top + r * row_h
        ink.text((margin, y - 1), label, fill="#d6dee7")
        for c, (path, crop) in enumerate(paths):
            with Image.open(path) as img:
                if crop:
                    img = img.crop(crop)
                img.thumbnail((side, height), Image.Resampling.LANCZOS)
                canvas.paste(img, (margin + c * (side + margin), y + 12))
    canvas.save(folder / name, quality=93)

rows = []
for pose in poses:
    for phase in ("before", "after"):
        rows.append((pose + " / " + phase, [
            (folder / phase / (pose + "-" + light + ".jpg"), regions.get(pose) if gun=="pistol" else None)
            for light in lights]))
make_sheet("eye-pairs.jpg", rows, lights, 245)

if gun == "pistol":
    reference = root.parent / "GT-20076" / "pistol" / "after"
    details = folder / "details" / "after"
    parts = ["whole-side", "whole-three", "mag-face", "mag-three"]
    rows = [(name, [(reference / (name + ".jpg"), None), (details / (name + ".jpg"), None)]) for name in parts]
    make_sheet("model-pairs.jpg", rows, ["Before", "After"], 520, 293)
