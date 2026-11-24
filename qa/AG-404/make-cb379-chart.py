from pathlib import Path
import json
from PIL import Image, ImageDraw, ImageFont

root = Path('qa/AG-404/cb379')
summary = json.loads((root / 'summary.json').read_text(encoding='utf8'))
font = ImageFont.truetype('arial.ttf', 15)
bfont = ImageFont.truetype('arialbd.ttf', 16)
hfont = ImageFont.truetype('arialbd.ttf', 22)

W, H = 1600, 960
img = Image.new('RGB', (W, H), '#14171c')
d = ImageDraw.Draw(img)
d.text((16, 12), f"CB-379 Native Exclusive ABBA (WebGPU 1600x900) · Live {summary['liveMd5'][:8]} vs Copy {summary['copyMd5'][:8]}", font=hfont, fill='#f4efe6')

tags = ['A1-live', 'B1-copy', 'B2-copy', 'A2-live']
colors = {'A1-live': '#e85d5d', 'A2-live': '#ff9966', 'B1-copy': '#58d68d', 'B2-copy': '#48c9b0'}

for idx, tag in enumerate(tags):
    data = json.loads((root / tag / 'opening.json').read_text(encoding='utf8'))
    rows = data.get('rows', [])
    m = data['metrics']
    y0 = 60 + idx * 215
    x0, gw, gh = 70, 1490, 145
    d.rectangle((x0, y0, x0 + gw, y0 + gh), fill='#1c2128', outline='#333c48')
    # Reference lines: 16.7ms, 33ms, 50ms, 100ms
    max_dt = max(120, max((r['dt'] for r in rows), default=60))
    for ms, col in [(16.7, '#2d3748'), (33.3, '#554422'), (50, '#773333'), (100, '#992222')]:
        if ms <= max_dt:
            yy = y0 + gh - int((ms / max_dt) * (gh - 10))
            d.line((x0, yy, x0 + gw, yy), fill=col, width=1)
            d.text((12, yy - 8), f'{ms:.0f}ms', font=font, fill='#8899aa')
    # 2s and 5s vertical guides
    for sec in (2, 5, 10):
        xx = x0 + int((sec * 1000 / 12000) * gw)
        d.line((xx, y0, xx, y0 + gh), fill='#2c3440', width=1)
        d.text((xx + 3, y0 + gh + 2), f'{sec}s', font=font, fill='#778899')
    # Plot frame bars
    col = colors[tag]
    for r in rows:
        xx = x0 + int(min(1.0, r['t'] / 12000.0) * gw)
        bh = int(min(1.0, r['dt'] / max_dt) * (gh - 10))
        c = '#ffdd55' if r.get('compiles', 0) > 0 else col
        d.line((xx, y0 + gh, xx, y0 + gh - bh), fill=c, width=2)
    # Mark first 3 kills
    for kf in m.get('first3KillFrames', []):
        xx = x0 + int(min(1.0, kf['t'] / 12000.0) * gw)
        d.ellipse((xx - 4, y0 + 6, xx + 4, y0 + 14), fill='#66ccff')
    hdr = (f"{tag} · enter={m['enterMs']}ms · worst2s={m['worstFirst2sMs']}ms · >50ms(5s)={m['over50msFirst5s']} · "
           f"median={m['medianMs']}ms · p95={m['p95Ms']}ms · compiles={m['compilesInFight']}({m['compileMsInFight']}ms) · kills={m['totalKills']}")
    d.text((x0 + 8, y0 + 4), hdr, font=bfont, fill='#f4efe6')

g_txt = '  |  '.join(f"{k}: {v.get('pass', 0)}/{len(v.get('fail', []))}" for k, v in summary['gates'].items())
d.text((16, H - 30), f"Original gates on copy f137269d: {g_txt}   (Yellow bars = frames with pipeline compiles; blue dots = first 3 kills)", font=bfont, fill='#ccd6e0')
img.save(root / 'CB-379-native-ABBA.jpg', format='JPEG', quality=94, subsampling=0)
print('CB379_CHART_OK')
