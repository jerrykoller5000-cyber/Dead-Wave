"""Measure the patch of tank color exposed by the discarded flat trim."""
import json
from pathlib import Path
from PIL import Image

root = Path(__file__).parent / 'visible-repairs' / 'flamer'
# current-art-crops.py projects the mount bounds into this rectangle for the matched hip view.
bounds = (613, 413, 779, 523)
folders = ('clear-case-stamp-after', 'clear-stock-mount-after', 'clear-stock-mount-tail-after')

def tank_color(pixel):
    red, green, blue = pixel
    return red > max(24, 1.55 * green, 1.45 * blue) and red - green > 18

values = {}
for light in ('noon', 'overcast', 'dusk', 'night'):
    images = []
    for folder in folders:
        with Image.open(root / folder / ('hip-' + light + '.png')) as image:
            images.append(image.convert('RGB').crop(bounds).get_flattened_data())
    exposed = [i for i, (old, flat) in enumerate(zip(*images[:2])) if tank_color(flat) and not tank_color(old)]
    retained = sum(tank_color(images[2][i]) for i in exposed)
    values[light] = {'exposed_by_flat_trim': len(exposed), 'still_exposed_in_final': retained}
    assert len(exposed) > 0 and retained == 0, (light, values[light])
(root / 'stock-mount-tail-detail' / 'tank-pixels.json').write_text(
    json.dumps({'crop': bounds, 'lights': values}, indent=2) + '\n', encoding='utf-8')
print(values)
