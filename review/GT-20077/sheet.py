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

if gun == "m4":
    regions = {"hip": (735, 365, 1280, 720), "aimed": (440, 279, 840, 720),
               "reload": (695, 232, 1280, 720)}

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

revision = "--revision" in sys.argv
stages = ("after", "revised") if revision else ("before", "after")
prefix = "revision-" if revision else ""
rows = []
for pose in poses:
    for phase in stages:
        rows.append((pose + " / " + phase, [
            (folder / phase / (pose + "-" + light + ".jpg"), regions.get(pose) if gun in ("pistol", "m4") else None)
            for light in lights]))
make_sheet(prefix + "eye-pairs.jpg", rows, lights, 320 if gun == "m4" else 245)

if gun == "m4":
    shots = ["whole", "rear", "side", "mag"]
    rows = [(label, [(folder / "details" / phase / (label + ".jpg"), None)
                     for phase in stages]) for label in shots]
    make_sheet(prefix + "model-pairs.jpg", rows, ["Reviewed" if revision else "Before", "Revised" if revision else "After"], 520, 293)
    if revision:
        crop = (535, 395, 745, 720)
        rows = [(phase, [(folder / phase / ("aimed-" + light + ".jpg"), crop) for light in lights]) for phase in stages]
        make_sheet("aimed-rear.jpg", rows, lights, 210, 325)

if gun == "pistol":
    reference = root.parent / "GT-20076" / "pistol" / "after"
    details = folder / "details" / "after"
    parts = ["whole-side", "whole-three", "mag-face", "mag-three"]
    rows = [(name, [(reference / (name + ".jpg"), None), (details / (name + ".jpg"), None)]) for name in parts]
    make_sheet("model-pairs.jpg", rows, ["Before", "After"], 520, 293)
