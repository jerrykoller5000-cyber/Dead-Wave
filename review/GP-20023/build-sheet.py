from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent
FONT = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 20)
HEAD = 34
TILE = (800, 450)


def tile(file: str, label: str, crop=None):
    im = Image.open(ROOT / file).convert("RGB")
    if crop:
        im = im.crop(crop)
    im.thumbnail(TILE, Image.Resampling.LANCZOS)
    out = Image.new("RGB", (TILE[0], TILE[1] + HEAD), "#15191d")
    out.paste(im, ((TILE[0] - im.width) // 2, HEAD + (TILE[1] - im.height) // 2))
    ImageDraw.Draw(out).text((12, 7), label, font=FONT, fill="#f4dfaa")
    return out


for light in ("noon", "dusk"):
    shots = [
        tile(f"uzi-before-side-{light}.png", f"Model before · {light}"),
        tile(f"uzi-after-side-{light}.png", f"Model after · {light}"),
        tile(f"uzi-pair-before-{light}.jpg", f"First-person pair before · {light}", (0, 510, 1920, 1080)),
        tile(f"uzi-pair-after-{light}.jpg", f"First-person pair after · {light}", (0, 510, 1920, 1080)),
    ]
    sheet = Image.new("RGB", (TILE[0] * 2, (TILE[1] + HEAD) * 2), "#101316")
    for i, shot in enumerate(shots):
        sheet.paste(shot, ((i % 2) * TILE[0], (i // 2) * (TILE[1] + HEAD)))
    out = ROOT / f"before-after-{light}.jpg"
    sheet.save(out, quality=93)
    print(out)
