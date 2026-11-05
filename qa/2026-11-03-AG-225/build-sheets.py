import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "qa/2026-11-03-AG-225"
STILLS_DIR = OUT_DIR / "stills"
TELEM_PATH = OUT_DIR / "telemetry.json"

GUNS_12 = [
    ("pistol", "Pistol"),
    ("revolver", "Revolver"),
    ("uzi", "Wasp (Uzi)"),
    ("m4", "GW-4 (M4)"),
    ("ak", "KR-7 (AK)"),
    ("shotgun", "Shotgun"),
    ("aa12", "Breacher-12"),
    ("sniper", "Sniper"),
    ("launcher", "Launcher"),
    ("minigun", "Minigun"),
    ("flamer", "Flamer"),
    ("chainsaw", "Chainsaw"),
]

LIGHTS = [
    ("noon", "Noon (t=0.50)"),
    ("overcast", "Overcast (t=0.42)"),
    ("dusk", "Dusk (t=0.77)"),
    ("night", "Night (t=0.02)"),
]


def load_font(size: int, bold: bool = False):
    candidates = (
        ["C:/Windows/Fonts/consolab.ttf", "C:/Windows/Fonts/arialbd.ttf"]
        if bold
        else ["C:/Windows/Fonts/consola.ttf", "C:/Windows/Fonts/arial.ttf"]
    )
    for c in candidates:
        if Path(c).exists():
            return ImageFont.truetype(c, size)
    return ImageFont.load_default()


def main():
    telem = json.loads(TELEM_PATH.read_text(encoding="utf-8"))
    font_title = load_font(20, bold=True)
    font_sub = load_font(14, bold=False)

    cols = 4
    rows = 3
    tile_w = 640
    tile_h = 360
    pad = 10
    header_h = 54

    sheet_w = cols * tile_w + (cols + 1) * pad
    sheet_h = header_h + rows * tile_h + (rows + 1) * pad

    for mode in ("hip", "ads"):
        for light_key, light_label in LIGHTS:
            sheet = Image.new("RGB", (sheet_w, sheet_h), (14, 16, 20))
            draw = ImageDraw.Draw(sheet)
            title = f"AG-225 · GP-20020 Final 12-Gun First-Person {mode.upper()} Gate · {light_label} · RTX 5080 WebGPU 1080p"
            draw.text((pad, 15), title, fill=(235, 240, 248), font=font_title)

            for idx, (gkey, glabel) in enumerate(GUNS_12):
                r = idx // cols
                c = idx % cols
                x0 = pad + c * (tile_w + pad)
                y0 = header_h + pad + r * (tile_h + pad)

                still_path = STILLS_DIR / f"{gkey}-{mode}-{light_key}.jpg"
                img = Image.open(still_path).convert("RGB").resize((tile_w, tile_h), Image.Resampling.LANCZOS)

                # Label banner at top-left of tile
                t_draw = ImageDraw.Draw(img, "RGBA")
                t_draw.rectangle([0, 0, tile_w, 46], fill=(8, 10, 14, 196))

                s = telem["guns"][gkey][mode][light_key]
                mz = s.get("muzzleNdc") or {}
                wl = s.get("wristLNdc") or {}
                wr = s.get("wristRNdc") or {}
                ang = s.get("boreAngleDeg")

                mz_str = f"({mz['x']:+.2f},{mz['y']:+.2f})" if mz.get('x') is not None and mz.get('y') is not None else "n/a"
                wl_str = f"({wl['x']:+.2f},{wl['y']:+.2f})" if wl.get('x') is not None and wl.get('y') is not None else "n/a"
                wr_str = f"({wr['x']:+.2f},{wr['y']:+.2f})" if wr.get('x') is not None and wr.get('y') is not None else "n/a"
                ang_str = f"{ang:.1f}°" if ang is not None else "n/a"

                line1 = f"#{idx+1:02d} {glabel} ({gkey}) · {mode.upper()} · {light_key}"
                line2 = f"mz={mz_str} wL={wl_str} wR={wr_str} ang={ang_str}"
                t_draw.text((10, 5), line1, fill=(255, 230, 120, 255), font=font_sub)
                t_draw.text((10, 24), line2, fill=(210, 225, 245, 255), font=font_sub)

                sheet.paste(img, (x0, y0))

            out_path = OUT_DIR / f"sheet-{mode}-{light_key}.jpg"
            sheet.save(out_path, quality=92)
            print(f"[AG-225] Saved {out_path}")


if __name__ == "__main__":
    main()
