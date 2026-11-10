from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parent
for folder, name, paths in (
    ("rows", "rows", ("face.jpg", "profile.jpg")),
    ("rows", "pistol", tuple(f"pistol-{t}.jpg" for t in ("noon", "overcast", "dusk", "night"))),
    ("rows", "uzi", tuple(f"uzi-{t}.jpg" for t in ("noon", "overcast", "dusk", "night"))),
    *(("surfaces", item, tuple(f"{item}-{t}.jpg" for t in ("noon", "overcast", "dusk", "night"))) for item in ("m4", "ak", "aa12", "shotgun", "sniper")),
    ("pistol", "model", ("whole-side.jpg", "whole-three.jpg", "mag-face.jpg", "mag-three.jpg")),
    ("detail", "fasteners", ("face.jpg", "profile.jpg")),
    ("rail", "held-m4", ("held-m4-close.png",)),
    ("rail", "inspector-m4", tuple(f"inspector-m4-{t}.jpg" for t in ("noon", "overcast", "dusk", "night"))),
    ("sling", "minigun", ("minigun-rear.jpg", "minigun-front.jpg")),
    ("sling", "m4", ("m4-rear.jpg", "m4-front.jpg")),
):
    w, h = (720, 405) if len(paths) == 1 else (440, 248)
    board = Image.new("RGB", (w * len(paths), 2 * (h + 26)), "#191c20")
    draw = ImageDraw.Draw(board)
    for i, phase in enumerate(("before", "after")):
        for j, f in enumerate(paths):
            with Image.open(root / folder / phase / f) as image:
                board.paste(image.resize((w, h), Image.Resampling.LANCZOS), (j*w, i*(h+26)+26))
            draw.text((j*w+8, i*(h+26)+7), f"{phase}  |  {Path(f).stem}", fill="#eeeeea")
    board.save(root / folder / (name + "-pair.jpg"), quality=94)
