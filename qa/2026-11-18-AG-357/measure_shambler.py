# qa/2026-11-18-AG-357/measure_shambler.py
# Accurate Shambler GLB silhouette & landmark measurement + properly labeled comparison overlays.
import json
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(r"C:\Users\Zero\Desktop\Tiny Trek")
sys.path.insert(0, str(ROOT / "qa" / "2026-11-18-AG-356"))
import measure_glb as mg


def main():
    a_path, b_path, out_json, out_img = sys.argv[1:5]
    H = float(sys.argv[5]) if len(sys.argv) > 5 else 1.800
    header = sys.argv[6] if len(sys.argv) > 6 else f"shambler: {Path(a_path).stem} (blue) vs {Path(b_path).stem} (orange), overlap purple. Height {H:.3f} m."

    data = mg.measure_pair(a_path, b_path, target_h=H, overlay_out=out_img, label="shambler")
    Path(out_json).write_text(json.dumps(data, indent=2), encoding="utf-8")

    # Replace top title bar (y=0..30) cleanly with exact model names so zero mislabels exist!
    im = Image.open(out_img).convert("RGB")
    draw = ImageDraw.Draw(im)
    draw.rectangle([0, 0, im.width, 30], fill=(24, 27, 33))
    try:
        font = ImageFont.truetype("C:/Windows/Fonts/consolab.ttf", 18)
    except Exception:
        font = ImageFont.load_default()
    draw.text((8, 6), header, fill=(232, 228, 212), font=font)
    im.save(out_img, quality=92)
    print("Wrote", out_json, "and", out_img)


if __name__ == "__main__":
    main()
