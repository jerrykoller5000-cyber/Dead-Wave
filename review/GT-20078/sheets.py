from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parent
for gun in ("minigun", "launcher", "uzi"):
    for name, views, w, h in (
        ("contacts", ("left-contact", "right-contact"), 560, 315),
        ("lights", ("noon", "overcast", "dusk", "night"), 370, 208),
    ):
        board = Image.new("RGB", (len(views) * w, 2 * (h + 28)), "#181a1d")
        draw = ImageDraw.Draw(board)
        for row, phase in enumerate(("before", "after")):
            for col, view in enumerate(views):
                x, y = col * w, row * (h + 28)
                with Image.open(root / phase / f"{gun}-{view}.jpg") as im:
                    board.paste(im.resize((w, h), Image.Resampling.LANCZOS), (x, y + 28))
                draw.text((x + 12, y + 8), f"{gun.capitalize()} | {phase} | {view}", fill="#eeeeea")
        board.save(root / f"{gun}-{name}.jpg", quality=93)
