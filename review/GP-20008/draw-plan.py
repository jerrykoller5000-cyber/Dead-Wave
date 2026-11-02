"""North-up field plan from the game's live ?quarterwalls=1 data."""
import json
import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
D = json.loads((HERE / 'plan-data.json').read_text(encoding='utf-8'))
W, H = 1830, 1510
LEFT, TOP, SIZE = 84, 148, 1260
LO, HI = -220, 220
SCALE = SIZE / (HI - LO)
IM = Image.new('RGB', (W, H), '#e5e7d2')
draw = ImageDraw.Draw(IM)
def font(size, bold=False):
    name = 'C:/Windows/Fonts/arialbd.ttf' if bold else 'C:/Windows/Fonts/arial.ttf'
    return ImageFont.truetype(name, size)
F13, F17, F20, F31 = font(13), font(17), font(20, True), font(31, True)
def xy(x, z):
    return (round(LEFT + (-x - LO) * SCALE), round(TOP + (HI - z) * SCALE))
def circle(x, z, r, **kw):
    px, py = xy(x, z); rr = r * SCALE
    draw.ellipse((px-rr, py-rr, px+rr, py+rr), **kw)
def pt_on_band(pts, at):
    remain = at
    for a, b in zip(pts, pts[1:]):
        length = math.hypot(b['x']-a['x'], b['z']-a['z'])
        if remain <= length:
            t = remain / length if length else 0
            return a['x'] + (b['x']-a['x'])*t, a['z'] + (b['z']-a['z'])*t
        remain -= length
    return pts[-1]['x'], pts[-1]['z']
def intersection(a, b, c, d):
    ux, uz = b['x']-a['x'], b['z']-a['z']
    vx, vz = d['x']-c['x'], d['z']-c['z']
    det = ux*vz - uz*vx
    if abs(det) < 1e-9: return None
    wx, wz = c['x']-a['x'], c['z']-a['z']
    t = (wx*vz-wz*vx)/det
    s = (wx*uz-wz*ux)/det
    if 0 <= t <= 1 and 0 <= s <= 1: return a['x']+t*ux, a['z']+t*uz
    return None

draw.rectangle((LEFT, TOP, LEFT+SIZE, TOP+SIZE), fill='#c8d2b7')
# The live waterDepthAt grid was sampled south-to-north, east-to-west in
# world coordinates; both axes reverse in this north-up, west-left plan.
water = D['water']; rows, cols = len(water), len(water[0])
mask = Image.new('RGBA', (cols, rows), (0, 0, 0, 0))
px = mask.load()
for j, row in enumerate(water):
    for i, wet in enumerate(row):
        if wet: px[cols-1-i, rows-1-j] = (117, 169, 183, 225)
IM.paste(mask.resize((SIZE, SIZE), Image.Resampling.NEAREST), (LEFT, TOP), mask.resize((SIZE, SIZE), Image.Resampling.NEAREST))
draw = ImageDraw.Draw(IM)
for k in range(-200, 201, 50):
    x0, y0 = xy(k, 0); _, yy = xy(0, k)
    draw.line((x0, TOP, x0, TOP+SIZE), fill='#a9b49d', width=1)
    draw.line((LEFT, yy, LEFT+SIZE, yy), fill='#a9b49d', width=1)
    draw.text((x0+3, TOP+SIZE+8), f'{k:+}', font=F13, fill='#3d574d')
    draw.text((LEFT-42, yy-8), f'{k:+}', font=F13, fill='#3d574d')

# Every circle is the survey's clearing radius; its dashed outer ring is the
# rule-10 additional 15 m kept free of quarter-band geometry.
for site in D['sites']:
    x,z,r = site['x'],site['z'],site['r']
    circle(x,z,r, fill='#e8dfad', outline='#9b8f60', width=2)
    p=xy(x,z); rr=(r+15)*SCALE
    box=(p[0]-rr,p[1]-rr,p[0]+rr,p[1]+rr)
    for deg in range(0, 360, 18): draw.arc(box, deg, deg+9, fill='#bb873e', width=2)

for trail in D['trails']:
    if len(trail)>1:
        draw.line([xy(p['x'],p['z']) for p in trail], fill='#8b7150', width=5, joint='curve')

COLORS = {'hq-thicket':'#47534e','quarter-ne':'#364f86',
          'quarter-nw':'#6f4777','quarter-sw':'#a24e38','quarter-se':'#7c653a'}
for kind,color in COLORS.items():
    for s in D['solids']:
        if s['kind']==kind: circle(s['x'],s['z'],s['r'],fill=color)

for deadfall in D['deadfalls']:
    x,z=deadfall['x'],deadfall['z']; px0,py0=xy(x,z)
    draw.polygon([(px0,py0-8),(px0+8,py0),(px0,py0+8),(px0-8,py0)],
                 fill='#c8322b',outline='#4c2623')

for b in D['bands']:
    if not b['kind'].startswith('quarter-'): continue
    pts=b['pts']; kind=b['kind']; color=COLORS[kind]
    end=xy(pts[-1]['x'],pts[-1]['z'])
    label=kind.split('-')[-1].upper()
    draw.text((end[0]+8,end[1]-24),label,font=F20,fill=color,stroke_width=3,stroke_fill='#edf0df')
    for g in b['gaps']:
        if g['kind']=='walk':
            x,z=pt_on_band(pts,g['at']); px0,py0=xy(x,z)
            draw.ellipse((px0-11,py0-11,px0+11,py0+11),fill='#fff8de',outline='#bf681f',width=4)
            draw.text((px0+12,py0-17),'4 m',font=F17,fill='#75400d',stroke_width=2,stroke_fill='#fff8de')
        elif g['kind']=='river':
            x,z=pt_on_band(pts,g['at']); px0,py0=xy(x,z)
            draw.line((px0-10,py0-10,px0+10,py0+10),fill='#126f9b',width=4)
            draw.line((px0+10,py0-10,px0-10,py0+10),fill='#126f9b',width=4)
        elif g['kind']=='trail':
            try: trail=D['trails'][int(g['id'].split('-')[1])]
            except (IndexError,ValueError): continue
            hit=next((q for a,c in zip(pts,pts[1:]) for u,v in zip(trail,trail[1:])
                      if (q:=intersection(a,c,u,v)) is not None),None)
            if hit:
                px0,py0=xy(*hit)
                draw.rectangle((px0-7,py0-7,px0+7,py0+7),fill='#f8d18b',outline='#664928',width=3)

for site in D['sites']:
    if site['id']=='HQ' or site['id'] in ('mast','graveyard','tower','dock','landing') or site['id'].startswith(('cabin','camp')):
        px0,py0=xy(site['x'],site['z'])
        draw.text((px0+7,py0+5),site['id'],font=F13,fill='#344536',stroke_width=2,stroke_fill='#e9e7cf')

draw.rectangle((LEFT,TOP,LEFT+SIZE,TOP+SIZE),outline='#35483e',width=3)
draw.text((84,36),'GP-20008  /  QUARTER WALL BANDS',font=F31,fill='#243d39')
draw.text((84,82),'Live ?quarterwalls=1 survey  •  1 Nov 2026  •  metres',font=F17,fill='#52635b')
draw.text((1433,154),'N',font=F31,fill='#243d39')
draw.line((1446,224,1446,189),fill='#243d39',width=5)
draw.polygon([(1446,181),(1438,197),(1454,197)],fill='#243d39')
draw.text((1394,254),'WEST  ←        →  EAST',font=F17,fill='#243d39')

y=325
draw.text((1380,y),'LEGEND',font=F20,fill='#243d39'); y+=48
for label,color in [('HQ ring',COLORS['hq-thicket']),('NE band',COLORS['quarter-ne']),
                    ('NW band',COLORS['quarter-nw']),('SW band',COLORS['quarter-sw']),
                    ('SE shore stub',COLORS['quarter-se'])]:
    draw.line((1382,y+9,1430,y+9),fill=color,width=13)
    draw.text((1444,y),label,font=F17,fill='#243d39'); y+=38
y+=19
draw.line((1382,y+8,1430,y+8),fill='#8b7150',width=5)
draw.text((1444,y),'trail',font=F17,fill='#243d39'); y+=37
draw.ellipse((1384,y-2,1420,y+34),fill='#e8dfad',outline='#9b8f60',width=2)
draw.text((1444,y+3),'clearing',font=F17,fill='#243d39'); y+=48
draw.arc((1384,y-4,1420,y+32),0,290,fill='#bb873e',width=3)
draw.text((1444,y+1),'15 m margin',font=F17,fill='#243d39'); y+=49
draw.polygon([(1402,y-2),(1411,y+7),(1402,y+16),(1393,y+7)],fill='#c8322b')
draw.text((1444,y-3),'deadfall',font=F17,fill='#243d39'); y+=46
draw.rectangle((1394,y-3,1410,y+13),fill='#f8d18b',outline='#664928',width=2)
draw.text((1444,y-3),'trail cut',font=F17,fill='#243d39'); y+=43
draw.ellipse((1392,y-5,1414,y+17),fill='#fff8de',outline='#bf681f',width=3)
draw.text((1444,y-3),'walk gap',font=F17,fill='#243d39'); y+=45
draw.line((1393,y-4,1413,y+16),fill='#126f9b',width=3)
draw.line((1413,y-4,1393,y+16),fill='#126f9b',width=3)
draw.text((1444,y-3),'river cut',font=F17,fill='#243d39'); y+=62
draw.text((1380,y),'SE: shore gap replaces a',font=F17,fill='#3e554c'); y+=26
draw.text((1380,y),'separate 4 m walk cut.',font=F17,fill='#3e554c'); y+=45
draw.text((1380,y),'Solids shown at their',font=F17,fill='#3e554c'); y+=26
draw.text((1380,y),'actual 2.5 m radius.',font=F17,fill='#3e554c')
draw.line((1384,1335,1384+50*SCALE,1335),fill='#243d39',width=4)
draw.line((1384,1328,1384,1342),fill='#243d39',width=3)
draw.line((1384+50*SCALE,1328,1384+50*SCALE,1342),fill='#243d39',width=3)
draw.text((1384,1352),'50 m',font=F17,fill='#243d39')
IM.save(HERE/'plan.png')
print(f"Saved {HERE/'plan.png'} ({W} x {H})")
