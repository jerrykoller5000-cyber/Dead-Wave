from pathlib import Path
from PIL import Image, ImageDraw

here = Path(__file__).resolve().parent
folder = here / "after" / "inspector"
files = sorted(folder.glob("*-overcast.jpg"))
for start in range(0, len(files), 9):
    page = Image.new("RGB", (1080, 675), "#171a1d")
    draw = ImageDraw.Draw(page)
    for i, file in enumerate(files[start:start + 9]):
        x, y = (i % 3) * 360, (i // 3) * 225
        with Image.open(file) as item:
            item.thumbnail((360, 202), Image.Resampling.LANCZOS)
            page.paste(item, (x, y))
        draw.text((x + 8, y + 205), file.stem.removesuffix("-overcast"), fill="white")
    page.save(here / "sheets" / f"catalog-{start // 9 + 1}.jpg", quality=92)
