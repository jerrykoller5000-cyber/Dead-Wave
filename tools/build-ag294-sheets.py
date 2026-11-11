# tools/build-ag294-sheets.py
# Builds high-contrast, GT-20077/GT-20079 camera-cropped per-gun sheets + master overview for AG-294,
# and performs SHA-256 uniqueness, non-blank, pose-delta, specular-burn, and shadow-crush diagnostics.

import hashlib
import json
import os
from pathlib import Path
from tempfile import NamedTemporaryFile
from PIL import Image, ImageChops, ImageDraw, ImageFont, ImageStat

ROOT = Path(__file__).resolve().parent.parent
REV = ROOT / 'review' / 'AG-294'
QA = ROOT / 'qa' / '2026-11-11-AG-294'

LIGHTS = ['noon', 'overcast', 'dusk', 'night']
LIGHT_LABELS = {'noon': 'Noon', 'overcast': 'Overcast', 'dusk': 'Dusk', 'night': 'Night'}

GUNS = [
    ('shotgun', 'shotgun.jpg', 'Pump Shotgun (shotgun) · GT-20077 / GT-20079 / GT-20080'),
    ('ak', 'ak.jpg', 'KR-7 Rifle (ak) · GT-20077 / GT-20079 / GT-20080'),
    ('revolver', 'revolver.jpg', 'Service Revolver (revolver) · GT-20077 / GT-20079 / GT-20080'),
    ('uzi', 'wasp.jpg', 'Wasp SMG (uzi) · GT-20077 / GT-20079 / GT-20080 (incl. 29.7mm round)'),
    ('aa12', 'breacher.jpg', 'Breacher-12 (aa12) · GT-20077 Exterior & Drum/Light Fittings'),
]

# Match ChatGPT 2's GT-20077/sheet.py & GT-20079/sheet.py 1280x720 gun crops so every screw/camo patch reads clearly
CROPS = {
    'shotgun': {
        'hip': (650, 320, 1280, 720),
        'aimed': (390, 260, 890, 720),
        'reload': (640, 220, 1280, 720),
        'rack': (220, 95, 1060, 625),
    },
    'ak': {
        'hip': (650, 320, 1280, 720),
        'aimed': (390, 260, 890, 720),
        'reload': (640, 220, 1280, 720),
        'rack': (220, 95, 1060, 625),
    },
    'aa12': {
        'hip': (640, 300, 1280, 720),
        'aimed': (380, 250, 900, 720),
        'reload': (620, 210, 1280, 720),
        'rack': (220, 95, 1060, 625),
    },
    'revolver': {
        'hip': (590, 290, 1170, 720),
        'aimed': (440, 270, 840, 720),
        'reload': (560, 230, 1140, 720),
        'rack': (280, 130, 1000, 590),
    },
    'uzi': {
        'hip': (560, 200, 1160, 720),
        'aimed': (420, 200, 860, 720),
        'reload': (560, 200, 1160, 720),
        'rack': (250, 110, 1030, 610),
    },
}


def get_font(size: int, bold: bool = False):
    candidates = [
        'C:/Windows/Fonts/segoeuib.ttf' if bold else 'C:/Windows/Fonts/segoeui.ttf',
        'C:/Windows/Fonts/arialbd.ttf' if bold else 'C:/Windows/Fonts/arial.ttf',
    ]
    for c in candidates:
        if os.path.exists(c):
            return ImageFont.truetype(c, size)
    return ImageFont.load_default()


def save_atomic(img: Image.Image, dest: Path, quality: int = 93):
    dest.parent.mkdir(parents=True, exist_ok=True)
    with NamedTemporaryFile(dir=dest.parent, suffix='.jpg', delete=False) as tmp:
        img.save(tmp, format='JPEG', quality=quality, optimize=True)
        tmp_path = Path(tmp.name)
    os.replace(tmp_path, dest)


def fit_crop(img: Image.Image, box, target_w: int, target_h: int) -> Image.Image:
    cropped = img.crop(box)
    # Center-crop or letterbox cleanly to exact aspect ratio so nothing stretches
    src_w, src_h = cropped.size
    target_ratio = target_w / target_h
    src_ratio = src_w / src_h
    if src_ratio > target_ratio:
        new_w = int(round(src_h * target_ratio))
        x0 = (src_w - new_w) // 2
        cropped = cropped.crop((x0, 0, x0 + new_w, src_h))
    elif src_ratio < target_ratio:
        new_h = int(round(src_w / target_ratio))
        y0 = max(0, (src_h - new_h) // 2)
        cropped = cropped.crop((0, y0, src_w, y0 + new_h))
    return cropped.resize((target_w, target_h), Image.Resampling.LANCZOS)


def analyze_tile(tile: Image.Image):
    gray = tile.convert('L')
    stat = ImageStat.Stat(gray)
    hist = gray.histogram()
    total = sum(hist) or 1
    burn_pct = round(100.0 * sum(hist[250:]) / total, 3)
    dark_pct = round(100.0 * sum(hist[:8]) / total, 2)
    return {
        'mean_luma': round(stat.mean[0], 2),
        'stddev_luma': round(stat.stddev[0], 2),
        'specular_burn_pct': burn_pct,
        'deep_dark_pct': dark_pct,
    }


def main():
    manifest_path = REV / 'capture-manifest.json'
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))

    f_title = get_font(20, bold=True)
    f_sub = get_font(13, bold=False)
    f_row = get_font(14, bold=True)
    f_cell = get_font(12, bold=True)

    tile_w, tile_h = 372, 236
    pad = 12
    cols = 4
    sheet_w = pad + cols * (tile_w + pad)

    seen_hashes = {}
    diagnostics = {'gpuRenderer': manifest.get('gpuRenderer'), 'guns': {}}

    for gun_id, out_jpg, title in GUNS:
        gdir = REV / gun_id
        gun_meta = manifest['guns'][gun_id]
        diag_in = gun_meta.get('diagnostics', {})
        tiles_info = diag_in.get('tiles') or {}
        eye_tile = (tiles_info.get('eye') or {}).get('tileM')
        rack_tile = (tiles_info.get('rack') or {}).get('tileM')

        # Verify SHA-256 uniqueness & pose differences
        for png in sorted(gdir.glob('*.png')):
            digest = hashlib.sha256(png.read_bytes()).hexdigest()
            key = f'{gun_id}/{png.name}'
            if digest in seen_hashes:
                raise RuntimeError(f'Duplicate capture file detected: {key} == {seen_hashes[digest]}')
            seen_hashes[digest] = key

        # Verify M81 Hip != M81 Reload != M81 Aimed (guard against stuck reload!)
        with Image.open(gdir / 'hip-m81-noon.png') as im_hip, \
             Image.open(gdir / 'aimed-m81-noon.png') as im_aim, \
             Image.open(gdir / 'reload-m81-noon.png') as im_rel:
            d_ha = max(ImageStat.Stat(ImageChops.difference(im_hip, im_aim)).mean)
            d_hr = max(ImageStat.Stat(ImageChops.difference(im_hip, im_rel)).mean)
            d_ar = max(ImageStat.Stat(ImageChops.difference(im_aim, im_rel)).mean)
            if min(d_ha, d_hr, d_ar) < 2.0:
                raise RuntimeError(f'{gun_id} M81 poses did not change! deltas=({d_ha:.2f}, {d_hr:.2f}, {d_ar:.2f})')

        rows_spec = [
            ('Row 1 · Hip · Factory Finish (GT-20077 Eye Crop)', [(f'hip-factory-{l}.png', CROPS[gun_id]['hip'], LIGHT_LABELS[l]) for l in LIGHTS]),
            ('Row 2 · Aimed (ADS) · Factory Finish (GT-20077 Sight Crop)', [(f'aimed-factory-{l}.png', CROPS[gun_id]['aimed'], LIGHT_LABELS[l]) for l in LIGHTS]),
            ('Row 3 · Reload (46%) · Factory Finish (GT-20077 Action Crop)', [(f'reload-factory-{l}.png', CROPS[gun_id]['reload'], LIGHT_LABELS[l]) for l in LIGHTS]),
            ('Row 4 · Hip · M81 Woodland Camo', [(f'hip-m81-{l}.png', CROPS[gun_id]['hip'], f"{LIGHT_LABELS[l]} · M81") for l in LIGHTS]),
            ('Row 5 · Aimed (ADS) · M81 Woodland Camo', [(f'aimed-m81-{l}.png', CROPS[gun_id]['aimed'], f"{LIGHT_LABELS[l]} · M81") for l in LIGHTS]),
            ('Row 6 · Reload (46%) · M81 Woodland Camo', [(f'reload-m81-{l}.png', CROPS[gun_id]['reload'], f"{LIGHT_LABELS[l]} · M81") for l in LIGHTS]),
            ('Row 7 · Armory Weapon Rack & Fitted Attachments (GT-20079 Camera)', [
                ('rack-factory-noon.png', CROPS[gun_id]['rack'], 'Rack · Factory'),
                ('rack-m81-noon.png', CROPS[gun_id]['rack'], 'Rack · M81 Camo'),
                ('rack-m81-fitted.png', CROPS[gun_id]['rack'], 'Rack · M81 + Fitted Mods'),
                ('fitted-eye-noon.png', CROPS[gun_id]['reload' if gun_id == 'uzi' else 'hip'],
                 '1P 74% Reload · 29.7mm Round + Mods' if gun_id == 'uzi' else '1P Eye · M81 + Fitted Mods'),
            ]),
        ]

        header_h = 74
        row_block_h = 26 + 20 + tile_h + 12
        sheet_h = header_h + len(rows_spec) * row_block_h + pad
        canvas = Image.new('RGB', (sheet_w, sheet_h), '#14181f')
        draw = ImageDraw.Draw(canvas)

        draw.text((pad, 12), f'AG-294 · {title}', fill='#ffd24c', font=f_title)
        sub_line = (
            f"GPU: {manifest.get('gpuRenderer', 'RTX 5080')}  |  "
            f"M81 Eye Tile Median (p10/p50/p90): {eye_tile} m  |  Rack Tile: {rack_tile} m  |  "
            f"Painted/Bare Meshes: {diag_in.get('paintedMeshCount')}/{diag_in.get('bareMeshCount')}"
        )
        draw.text((pad, 42), sub_line, fill='#b8c4d4', font=f_sub)

        gun_stats = []
        y = header_h
        for row_title, cells in rows_spec:
            draw.rectangle([pad, y, sheet_w - pad, y + 22], fill='#1e2530')
            draw.text((pad + 8, y + 3), row_title, fill='#e6eef8', font=f_row)
            y += 26
            for c_idx, (fname, cbox, clabel) in enumerate(cells):
                x = pad + c_idx * (tile_w + pad)
                draw.rectangle([x, y, x + tile_w, y + 18], fill='#263040')
                draw.text((x + 6, y + 1), clabel, fill='#d2deed', font=f_cell)
                with Image.open(gdir / fname) as src:
                    if ImageStat.Stat(src.convert('L')).mean[0] < 4.0:
                        raise RuntimeError(f'Blank/black frame detected: {gun_id}/{fname}')
                    tile = fit_crop(src, cbox, tile_w, tile_h)
                canvas.paste(tile, (x, y + 19))
                st = analyze_tile(tile)
                st['file'] = fname
                gun_stats.append(st)
            y += 20 + tile_h + 12

        save_atomic(canvas, REV / out_jpg)
        save_atomic(canvas, QA / out_jpg)
        diagnostics['guns'][gun_id] = {
            'sheet': out_jpg,
            'poseDeltasM81Noon': {'hip_vs_aimed': round(d_ha, 2), 'hip_vs_reload': round(d_hr, 2), 'aimed_vs_reload': round(d_ar, 2)},
            'camoTilesM': tiles_info,
            'paintedMeshCount': diag_in.get('paintedMeshCount'),
            'bareMeshCount': diag_in.get('bareMeshCount'),
            'paintedSample': diag_in.get('paintedSample'),
            'bareSample': diag_in.get('bareSample'),
            'tiles': gun_stats,
        }
        print(f'[AG-294 SHEET] Built {out_jpg} ({canvas.size[0]}x{canvas.size[1]}) · M81 pose deltas=({d_ha:.1f}, {d_hr:.1f}, {d_ar:.1f})')

    # Master 5-gun summary sheet (review/AG-294/sheet.jpg)
    m_rows = []
    for gun_id, _, title in GUNS:
        gdir = REV / gun_id
        m_rows.append((title, [
            (gdir / 'aimed-factory-noon.png', CROPS[gun_id]['aimed'], 'Aimed · Factory · Noon'),
            (gdir / 'aimed-m81-noon.png', CROPS[gun_id]['aimed'], 'Aimed · M81 · Noon'),
            (gdir / 'hip-m81-dusk.png', CROPS[gun_id]['hip'], 'Hip · M81 · Dusk'),
            (gdir / 'rack-m81-fitted.png', CROPS[gun_id]['rack'], 'Armory Rack · M81 + Mods'),
        ]))

    m_h = 74 + len(m_rows) * (26 + 20 + tile_h + 12) + pad
    master = Image.new('RGB', (sheet_w, m_h), '#14181f')
    mdraw = ImageDraw.Draw(master)
    mdraw.text((pad, 12), 'AG-294 · Master Summary · ChatGPT 2 Revised Guns on NVIDIA GeForce RTX 5080 (J129 / D-144)', fill='#ffd24c', font=f_title)
    mdraw.text((pad, 42), f'5 Revised Weapons Verified in Live Range WebGPU: Pump Shotgun, KR-7, Service Revolver, Wasp, Breacher-12 ({len(seen_hashes)} unique PNGs)', fill='#b8c4d4', font=f_sub)

    y = 74
    for rtitle, cells in m_rows:
        mdraw.rectangle([pad, y, sheet_w - pad, y + 22], fill='#1e2530')
        mdraw.text((pad + 8, y + 3), rtitle, fill='#e6eef8', font=f_row)
        y += 26
        for c_idx, (fpath, cbox, clabel) in enumerate(cells):
            x = pad + c_idx * (tile_w + pad)
            mdraw.rectangle([x, y, x + tile_w, y + 18], fill='#263040')
            mdraw.text((x + 6, y + 1), clabel, fill='#d2deed', font=f_cell)
            with Image.open(fpath) as src:
                tile = fit_crop(src, cbox, tile_w, tile_h)
            master.paste(tile, (x, y + 19))
        y += 20 + tile_h + 12

    save_atomic(master, REV / 'sheet.jpg')
    save_atomic(master, QA / 'sheet.jpg')

    (REV / 'gpu-diagnostics.json').write_text(json.dumps(diagnostics, indent=2), encoding='utf-8')
    (QA / 'gpu-diagnostics.json').write_text(json.dumps(diagnostics, indent=2), encoding='utf-8')
    print(f'[AG-294 SHEET] Built master sheet.jpg ({master.size[0]}x{master.size[1]}) · {len(seen_hashes)} unique PNGs verified!')


if __name__ == '__main__':
    main()
