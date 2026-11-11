from pathlib import Path
import json
import sys
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parent / "shotgun"
revision = "--revision" in sys.argv
stages = ("after", "revised") if revision else ("before", "after")
prefix = "revision-" if revision else ""
types = ("birdshot", "buckshot", "slug")
lights = ("noon", "overcast", "dusk", "night")
proof = {s: json.loads((root / s / "proof.json").read_text(encoding="utf-8")) for s in stages}

# Each pair is the registered reload prop (left) and the ejection-pool mesh (right).
sheet = Image.new("RGB", (2 * 520 + 24, 4 * 240 + 62), "#20242b")
draw = ImageDraw.Draw(sheet)
for col, stage in enumerate(stages):
    x = 8 + col * 524
    draw.text((x, 5), ("Reviewed models" if revision else "Previous models") if col == 0 else "Revised models", fill="white")
    for row, light in enumerate(lights):
        y = 26 + row * 240
        draw.text((x, y), light.capitalize(), fill="white")
        with Image.open(root / stage / (light + ".jpg")) as source:
            tile = source.crop((105, 134, 970, 471))
            tile.thumbnail((520, 203), Image.Resampling.LANCZOS)
        sheet.paste(tile, (x, y + 15))
        for i, name in enumerate(types):
            draw.text((x + i * 174 + 26, y + 219), name.capitalize() + "  live / spent", fill="#d8dfe4")
sizes = proof[stages[1]]["result"]
for i, name in enumerate(types):
    live, spent = sizes[name]["live"][1] * 1000, sizes[name]["spent"][1] * 1000
    draw.text((12 + 347*i, sheet.height-24), f"{name.capitalize()}   live {live:.1f} / spent {spent:.1f} game mm", fill="white")
sheet.save(root / (prefix + "shell-pairs.jpg"), quality=94)

eye_paths = stages if revision else ("eye-baseline", "after")
eye_proof = {s: json.loads((root / p / "proof.json").read_text(encoding="utf-8"))
             for s, p in zip(stages, eye_paths)}
matched = Image.new("RGB", (3 * 322 + 18, 2 * 210 + 28), "#20242b")
draw = ImageDraw.Draw(matched)
for i, name in enumerate(types):
    x = 8 + i * 322
    draw.text((x, 5), name.capitalize(), fill="white")
    for row, stage in enumerate(stages):
        frame = next(f for f in eye_proof[stage]["frames"] if f.get("type") == name)
        # Use the same framing across both stages. The stored NDC is mirrored as seen at the eye.
        base = next(f for f in eye_proof[stages[0]]["frames"] if f.get("type") == name)
        with Image.open(root / eye_paths[row] / ("eye-" + name + ".jpg")) as source:
            cx = round((1 + base["screen"][0]) * source.width / 2)
            cy = round((1 - base["screen"][1]) * source.height / 2)
            left = min(max(0, cx - 155), source.width - 312)
            top = min(max(0, cy - 90), source.height - 180)
            tile = source.crop((left, top, left + 312, top + 180))
        y = 26 + 210 * row
        draw.text((x, y), f"{stage.capitalize()}  /  {frame['u']:.0%} reload", fill="#d8dfe4")
        matched.paste(tile, (x, y + 16))
matched.save(root / (prefix + "reload-pairs.jpg"), quality=94)
