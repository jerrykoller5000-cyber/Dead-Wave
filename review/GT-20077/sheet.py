from pathlib import Path
import sys
from PIL import Image, ImageChops, ImageDraw, ImageStat

root = Path(__file__).resolve().parent
gun = sys.argv[1]
folder = root / gun
lights = ("noon", "overcast", "dusk", "night")
poses = ("hip", "aimed", "reload")
regions = {"hip": (680, 335, 1020, 675), "aimed": (490, 310, 790, 610),
           "reload": (680, 235, 1040, 595)}

if gun in ("m4", "shotgun"):
    regions = {"hip": (735, 365, 1280, 720), "aimed": (440, 279, 840, 720),
               "reload": (695, 232, 1280, 720)}

def make_sheet(name, rows, columns, side, height=None):
    height = height or side
    margin, top = 10, 30
    prepared = []
    for label, paths in rows:
        tiles = []
        for path, crop in paths:
            with Image.open(path) as source:
                tile = source.crop(crop) if crop else source.copy()
            tile.thumbnail((side, height), Image.Resampling.LANCZOS)
            tiles.append(tile)
        prepared.append((label, tiles, max(tile.height for tile in tiles) + 22))
    canvas = Image.new("RGB", (margin + (side + margin) * len(columns), top + sum(row[2] for row in prepared)), "#20242b")
    ink = ImageDraw.Draw(canvas)
    for c, label in enumerate(columns):
        ink.text((margin + c * (side + margin), 9), label, fill="white")
    y = top
    for label, tiles, row_height in prepared:
        ink.text((margin, y), label, fill="#d6dee7")
        for c, tile in enumerate(tiles):
            canvas.paste(tile, (margin + c * (side + margin), y + 14))
        y += row_height
    canvas.save(folder / name, quality=93)

revision = "--revision" in sys.argv
stages = ("after", "revised") if revision else ("before", "after")
prefix = "revision-" if revision else ""
if gun == "shotgun":
    # The clear upper scene detects a camera reset when switching out of third person.
    for pose in poses:
        with Image.open(folder / stages[0] / (pose + "-noon.jpg")) as before, Image.open(folder / stages[1] / (pose + "-noon.jpg")) as after:
            sky = (0, 0, before.width, 270)
            difference = ImageStat.Stat(ImageChops.difference(before.crop(sky), after.crop(sky))).mean
            print(pose, "background mean channel difference", [round(value, 2) for value in difference])
            if max(difference) > 10:
                raise ValueError(pose + " comparison changed camera or lighting")
rows = []
for pose in poses:
    for phase in stages:
        rows.append((pose + " / " + phase, [
            (folder / phase / (pose + "-" + light + ".jpg"), regions.get(pose) if gun in ("pistol", "m4", "shotgun") else None)
            for light in lights]))
make_sheet(prefix + "eye-pairs.jpg", rows, lights, 320 if gun in ("m4", "shotgun") else 245)

if gun in ("m4", "shotgun"):
    shots = ["whole", "rear", "side", "mag"] if gun == "m4" else ["whole", "rear", "foreend", "front", "side", "underside"]
    rows = [(label, [(folder / "details" / phase / (label + ".jpg"), None)
                     for phase in stages]) for label in shots]
    make_sheet(prefix + "model-pairs.jpg", rows, ["Reviewed" if revision else "Before", "Revised" if revision else "After"], 520, 293)
    if revision and gun == "m4":
        crop = (535, 395, 745, 720)
        rows = [(phase, [(folder / phase / ("aimed-" + light + ".jpg"), crop) for light in lights]) for phase in stages]
        make_sheet("aimed-rear.jpg", rows, lights, 210, 325)

if gun == "shotgun":
    crop = (500, 345, 780, 720)
    rows = [(phase, [(folder / phase / ("aimed-" + light + ".jpg"), crop) for light in lights]) for phase in stages]
    make_sheet(prefix + "aimed-comb.jpg", rows, lights, 215, 288)
    rows = [(phase, [(folder / phase / ("third-person-" + light + ".jpg"), None) for light in lights])
            for phase in (stages if revision else ["after"])]
    make_sheet(prefix + "third-person.jpg", rows, lights, 320, 180)

if gun == "pistol":
    reference = root.parent / "GT-20076" / "pistol" / "after"
    details = folder / "details" / "after"
    parts = ["whole-side", "whole-three", "mag-face", "mag-three"]
    rows = [(name, [(reference / (name + ".jpg"), None), (details / (name + ".jpg"), None)]) for name in parts]
    make_sheet("model-pairs.jpg", rows, ["Before", "After"], 520, 293)
