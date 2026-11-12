# CB-310 (claude2): the stairs filmstrips from stairs310.mjs's frames: for each run, before (STAIR_SPEED_SCALE 1) over after
# (0.5), one picture per 0.1 s of game time, over the window where either is on or by the flight. Labels: time, pace, height.
import json, sys, os
from PIL import Image, ImageDraw, ImageFont
here = os.path.dirname(os.path.abspath(__file__))
R = json.load(open(os.path.join(here, 'stairs310.json')))
half = R['after']['setup']['half']
try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 15); big = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 20)
except Exception: font = big = ImageFont.load_default()
CROP = {'side': (330, 40, 990, 700), 'fp': (160, 0, 1120, 720)}
for run in R['after']['runs']:
    fp = run.startswith('fp')
    rows = {ph: R[ph]['runs'][run]['rows'] for ph in ('before', 'after') if run in R[ph]['runs']}
    near = lambda r: abs(r['z']) < half + (0.6 if fp else 1.0)
    ts = sorted({r['t'] for ph in rows for r in rows[ph] if near(r)})
    if not ts: continue
    t0, t1 = max(0.1, ts[0] - 0.1), ts[-1] + 0.1
    ts = [t for t in sorted({r['t'] for r in rows['after']}) if t0 - 1e-6 <= t <= t1 + 1e-6]
    cw, ch = (230, 230) if not fp else (288, 216)
    W, H = 150 + cw * len(ts), 40 + (ch + 34) * 2
    sheet = Image.new('RGB', (W, H), (24, 26, 28)); d = ImageDraw.Draw(sheet)
    d.text((10, 8), f'CB-310 stairs: {run}  (one picture per 0.1 s of game time; top: before, full pace; bottom: after, STAIR_SPEED_SCALE 0.5)', fill=(235, 235, 235), font=big)
    for j, ph in enumerate(('before', 'after')):
        y0 = 40 + j * (ch + 34)
        d.text((10, y0 + ch // 2 - 10), ph, fill=(240, 200, 80), font=big)
        byT = {r['t']: r for r in rows[ph]}
        for i, t in enumerate(ts):
            r = byT.get(t)
            if not r: continue
            im = Image.open(os.path.join(here, 'frames2', r['name'])).crop(CROP['fp' if fp else 'side']).resize((cw, ch))
            x0 = 150 + i * cw; sheet.paste(im, (x0, y0))
            on = abs(r['z']) <= half
            d.text((x0 + 4, y0 + ch + 2), f"{t:.1f}s {r['v']:.1f} m/s", fill=(255, 230, 120) if on else (200, 200, 200), font=font)
            d.text((x0 + 4, y0 + ch + 17), f"up {r['y']:.2f} m" + (' on flight' if on else ''), fill=(255, 230, 120) if on else (160, 160, 160), font=font)
    sheet.save(os.path.join(here, f'strip-{run}.jpg'), quality=88)
    print('wrote', run, len(ts), 'columns')
