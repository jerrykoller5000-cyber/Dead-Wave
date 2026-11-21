# CF-20 (D-218 pass 1, Claude 6): Training Ground real-world scale sheet. Review only.
# python3 -E tools/placement-audit/scale.py <run-dir> <out-dir>   (reuses audit.py's loader; needs numpy trimesh matplotlib)
import sys, os, json, re, math
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
RUN = sys.argv[1] if len(sys.argv) > 1 else 'review/CF-19/run'
OUTD = sys.argv[2] if len(sys.argv) > 2 else 'review/CF-20'
src = open(os.path.join(HERE, 'audit.py'), encoding='utf8').read().split('\n')
cut = next(i for i, l in enumerate(src) if l.startswith('# ---') and 'meshes as trimesh' in l)
G = {'__file__': os.path.join(HERE, 'audit.py'), '__name__': 'cf20'}
_argv = sys.argv; sys.argv = ['audit.py', RUN, os.path.join(OUTD, '_tmp')]
exec(compile('\n'.join(src[:cut]), 'audit_head', 'exec'), G); sys.argv = _argv
MS, OV, tris = G['MS'], G['OV'], G['tris']
import matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.collections import PolyCollection
from matplotlib.patches import Rectangle, Circle, Polygon
CROPS = os.path.join(OUTD, 'crops'); os.makedirs(CROPS, exist_ok=True)

# CG-1: the line ranges below are the CF-20 base files' lines. When a Training file has moved since, pass a line map
# (tools/placement-audit/linemap.py <base-root> <new-root> > map.json) as SCALE_LINEMAP=map.json: each range is moved
# to the new file's lines (the lines it kept; added lines inside a range are taken in too).
LINEMAP = json.load(open(os.environ['SCALE_LINEMAP'])) if os.environ.get('SCALE_LINEMAP') else {}
def _remap(f, a, b):
    m = LINEMAP.get(f)
    if not m: return a, b
    kept = [m[str(k)] for k in range(a, min(b, a + 5000) + 1) if str(k) in m]
    return (min(kept), max(kept)) if kept else (a, b)
def sel(f, a, b, extra=None):
    a, b = _remap(f, a, b)
    out = []
    for m in MS:
        if m['huge'] or m['line']: continue
        for s in m['src'][:5]:
            loc = s.partition('@')[2]; ff, _, ln = loc.rpartition(':')
            if ff == f and ln.isdigit() and a <= int(ln) <= b and (extra is None or extra(m)): out.append(m['i']); break
    return out
def by_key(k): return [m['i'] for m in MS if m['site']['key'] == k and not m['line']]
def box_of(idx):
    return np.min([MS[i]['bmin'] for i in idx], 0) - OV, np.max([MS[i]['bmax'] for i in idx], 0) - OV

def hexrgb(h):
    try: return np.array([int(h[k:k + 2], 16) for k in (0, 2, 4)]) / 255.0
    except Exception: return np.array([.6, .6, .6])
def man(ax, x0, h=1.80, col='#7a8a99'):
    s = h / 1.80
    pts = [(-.18, 0), (-.16, .92), (-.19, .95), (-.23, 1.42), (-.30, 1.0), (-.33, 1.02), (-.26, 1.50), (-.12, 1.56), (-.05, 1.57), (-.05, 1.60),
           (.05, 1.60), (.05, 1.57), (.12, 1.56), (.26, 1.50), (.33, 1.02), (.30, 1.0), (.23, 1.42), (.19, .95), (.16, .92), (.18, 0), (.04, 0), (0, .82), (-.04, 0)]
    ax.add_patch(Polygon([(x0 + x * s, y * s) for x, y in pts], closed=True, fc=col, ec='none', alpha=.55, zorder=1))
    ax.add_patch(Circle((x0, 1.69 * s), .11 * s, fc=col, ec='none', alpha=.55, zorder=1))
    ax.text(x0, -0.06 * max(1, h / 1.8), '1.80 m man', ha='center', va='top', fontsize=7, color='#55606a')

def draw(ax, idx, axis, flip=False, dx=0.0, clip=None, dy=0.0):
    """Side view: axis = the horizontal axis on the picture (0 = x, 2 = z). Returns (hmin, hmax) drawn."""
    depth_ax = 2 if axis == 0 else 0
    polys, cols, keys = [], [], []
    L = np.array([.4, .8, -.45]); L /= np.linalg.norm(L)
    lo, hi = box_of(idx); h0 = lo[axis] if not flip else hi[axis]
    for i in idx:
        t = tris(i) - OV
        if clip is not None:
            c = t.mean(axis=1); k = np.all((c >= clip[0]) & (c <= clip[1]), axis=1); t = t[k]
        if len(t) == 0: continue
        n = np.cross(t[:, 1] - t[:, 0], t[:, 2] - t[:, 0]); nn = np.linalg.norm(n, axis=1); nn[nn == 0] = 1; n = n / nn[:, None]
        sh = .45 + .55 * np.abs(n @ L)
        base = hexrgb((MS[i].get('mat') or {}).get('color') or '999999')
        hx = (t[:, :, axis] - h0) * (-1 if flip else 1) + dx
        for k in range(len(t)):
            polys.append(np.c_[hx[k], t[k, :, 1] + dy]); cols.append(np.clip(base * sh[k], 0, 1)); keys.append(t[k, :, depth_ax].mean() * (1 if axis == 0 else -1))
    order = np.argsort(keys)
    ax.add_collection(PolyCollection([polys[k] for k in order], facecolors=[cols[k] for k in order], edgecolors=[np.clip(cols[k] * .7, 0, 1) for k in order], linewidths=.15, zorder=2))
    return dx, dx + (hi[axis] - lo[axis])

def ref_box(ax, x0, x1, y0, y1, label, col='#d62728'):
    ax.add_patch(Rectangle((x0, y0), x1 - x0, y1 - y0, fill=False, ec=col, ls='--', lw=1.3, zorder=4))
    ax.text(x1 + .03, y1, label, color=col, fontsize=7.5, va='top', zorder=5)
def ref_line(ax, x0, x1, y, label, col='#d62728'):
    ax.plot([x0, x1], [y, y], ls='--', color=col, lw=1.3, zorder=4); ax.text(x1 + .03, y, label, color=col, fontsize=7.5, va='center', zorder=5)
def dim(ax, x, y0, y1, label, col='#1f5fa8'):
    ax.annotate('', (x, y0), (x, y1), arrowprops=dict(arrowstyle='<->', color=col, lw=1), zorder=5)
    ax.text(x + .03, (y0 + y1) / 2, label, color=col, fontsize=7.5, va='center', zorder=5)
def hdim(ax, x0, x1, y, label, col='#1f5fa8'):
    ax.annotate('', (x0, y), (x1, y), arrowprops=dict(arrowstyle='<->', color=col, lw=1), zorder=5)
    ax.text((x0 + x1) / 2, y + .05, label, color=col, fontsize=7.5, ha='center', va='bottom', zorder=5)
def finish(ax, title, xl, yl):
    ax.set_xlim(*xl); ax.set_ylim(*yl); ax.set_aspect('equal'); ax.axhline(0, color='#333', lw=1, zorder=3)
    ax.grid(True, color='#e3e3e3', lw=.5, zorder=0); ax.set_axisbelow(True)
    ax.set_title(title, fontsize=9.5, loc='left'); ax.tick_params(labelsize=7); ax.set_ylabel('metres up', fontsize=7)

FINDINGS = []
def sheet(fn, title, panels, size=(11, 5.2), note='', rows=False):
    fig, axs = (plt.subplots(len(panels), 1, figsize=size, gridspec_kw={'height_ratios': [p.get('w', 1) for p in panels]}) if rows else
                plt.subplots(1, len(panels), figsize=size, gridspec_kw={'width_ratios': [p.get('w', 1) for p in panels]}))
    axs = np.atleast_1d(axs)
    for ax, p in zip(axs, panels): p['fn'](ax)
    fig.suptitle(title, fontsize=11, x=.01, ha='left', fontweight='bold')
    if note: fig.text(.01, .01, note, fontsize=8, color='#333', ha='left', va='bottom', wrap=True)
    fig.tight_layout(rect=(0, .05 if note else 0, 1, .95))
    path = os.path.join(CROPS, fn); fig.savefig(path, dpi=110); plt.close(fig); return 'crops/' + fn

# ---------------------------------------------------------------- the sheets
TP = 'world/training-props.js'; TW = 'world/training-wear.js'; TJ = 'world/training.js'; TF = 'world/training-firing-line.js'
cab = sel(TP, 201, 213); mon = sel(TP, 214, 224)
def p_cab(ax):
    lo, hi = box_of(cab + mon)
    a, b = draw(ax, cab + mon, 2, flip=False, dx=0.0)
    man(ax, -0.55)
    ref_line(ax, -0.2, 1.05, 0.90, 'real worktop top 0.85-0.95 m')
    ref_box(ax, 0.0, 0.60, 0.0, 0.90, 'real base cabinet\n0.60 deep', col='#2ca02c')
    dim(ax, 1.25, 0, 1.17, 'game top 1.17 m')
    hdim(ax, 0.0, 0.94, 1.55, 'game depth 0.94 m')
    finish(ax, 'side view (looking along the wall)', (-0.9, 2.2), (-0.15, 2.0))
FINDINGS.append(dict(rank=1, key='medical-worktop', thing='Infirmary medical cabinet + worktop', where='build room, infirmary bay (back wall)',
    source='world/training-props.js:201-213', owner='world/* (Claude 7 by loan, D-218)',
    game='worktop top 1.17 m; body 1.65 W x 0.98 H x 0.83 D on 9 cm legs; worktop 0.94 m deep', real='worktop/counter top 0.85-0.95 m (lab bench 0.90); base unit 0.60 m deep',
    off='30% too high (+27 cm): it sits at a 1.80 m man\'s lower ribs, not at his hips; 50% too deep',
    fix='drop the worktop to 0.90-0.92 m (body ~0.75 m tall on the legs) and the depth to ~0.65 m; the monitor and kit on it come down with it (monitor centre ~1.15-1.2 m).',
    pic=sheet('01-medical-worktop.png', '1  Medical worktop: 1.17 m high (real 0.90 m) - 30% too high, 50% too deep', [dict(fn=p_cab)], size=(8, 4.6))))

# 2 high-bay lamps
lampc = sel(TJ, 656, 662, lambda m: abs((m['bmin'][0] + m['bmax'][0]) / 2 - OV[0] - (-26)) < 1 and abs((m['bmin'][2] + m['bmax'][2]) / 2 - OV[2] - 6) < 1)
def p_lamp_hi(ax):
    lo, hi = box_of(lampc); draw(ax, lampc, 0, dx=-0.62 - (lo[0] - (-26 - 0.62)) * 0)
    a = -0.62
    ref_box(ax, -0.25, 0.25, 20.60, 20.95, 'real high-bay hood\n0.40-0.56 m across')
    hdim(ax, -0.62, 0.62, 20.45, 'game hood 1.24 m across')
    finish(ax, 'where it hangs (20.6-21.9 m up, under the truss)', (-1.2, 2.0), (20.2, 22.1))
def p_lamp_floor(ax):
    lo, hi = box_of(lampc); draw(ax, lampc, 0, dx=0.0, dy=-lo[1])
    man(ax, -0.6); ref_box(ax, 0.37, 0.87, 0.0, 0.35, 'real hood', col='#2ca02c')
    finish(ax, 'brought down to the floor next to a man', (-1.0, 2.2), (-0.15, 2.0))
FINDINGS.append(dict(rank=2, key='high-bay-lamps', thing='High-bay lamps (18) under the hangar trusses', where='build room roof, 20.6 m up, 3 per truss',
    source='world/training.js:656-662', owner='world/* (Claude 7 by loan, D-218)',
    game='hood 1.24 m across (cylinder r .22-.62), 0.42 m tall; lens 1.16 m', real='industrial high-bay hood 0.40-0.56 m across (UFO LED 0.3-0.45 m), 0.3-0.45 m tall',
    off='2.2-3x too wide: from the floor they read as big dishes, which makes the 24 m hangar look smaller',
    fix='hood bottom radius .62 -> ~.25 (top .22 -> ~.10), lens r .58 -> ~.23; if the room then looks too dark, add lamps, not size.',
    pic=sheet('02-high-bay-lamps.png', '2  High-bay lamps: hood 1.24 m across (real 0.4-0.56 m) - 2-3x too big', [dict(fn=p_lamp_hi), dict(fn=p_lamp_floor)], size=(11, 4.6))))

# 3 target plate vs its backing
tgt = sel(TJ, 513, 532, lambda m: abs((m['bmin'][0] + m['bmax'][0]) / 2 - OV[0]) < 1.0 and abs((m['bmin'][2] + m['bmax'][2]) / 2 - OV[2] - 16) < 1)
tgt_solid = [i for i in tgt if 'target-plate' not in MS[i]['path']]
tgt_plate = [i for i in tgt if 'target-plate' in MS[i]['path']]
def p_target(ax):
    lo, hi = box_of(tgt)
    pl = box_of(tgt_plate)
    ax.add_patch(Rectangle((pl[0][0], pl[0][1]), pl[1][0] - pl[0][0], pl[1][1] - pl[0][1], fc='#e9e2c8', ec='#8a7d4a', lw=1, alpha=.9, zorder=1.5))
    ax.text((pl[0][0] + pl[1][0]) / 2, 2.6, 'plate (1.28 x 2.24 m,\nJerry: twice size, CL-144)', ha='center', fontsize=7.5, color='#6b5f2e', zorder=6)
    draw(ax, tgt_solid, 0, dx=box_of(tgt_solid)[0][0])
    man(ax, -1.25)
    dim(ax, 0.75, 0.60, 1.73, 'steel backing\n0.60-1.73 m')
    dim(ax, 1.35, 1.73, 2.90, 'top 1.17 m of\nthe plate has\nnothing behind it')
    ref_box(ax, -0.23, 0.23, 1.0, 1.76, 'a real IPSC paper\n0.46 x 0.76 m', col='#2ca02c')
    finish(ax, 'front view, lane 3 (16 m)', (-1.8, 2.6), (-0.15, 3.1))
FINDINGS.append(dict(rank=3, key='target-backing', thing='Range target plates (5 lanes)', where='range, lanes 1-5 at 8-25 m',
    source='world/training.js:513-532 (TARGET_SCALE 2, CL-144)', owner='world/* (Claude 7 by loan, D-218)',
    game='plate 1.28 x 2.24 m (0.66-2.90 m up); steel backing 0.78 x 1.13 m (0.60-1.73 m up) on a 3.5 cm stem', real='full-size silhouette 0.5-0.6 x 1.8 m; IPSC 0.46 x 0.76 m; the backing board always covers the whole target',
    off='the plate SIZE is Jerry\'s choice (CL-144: twice size) - keep it. What is off: the backing was not doubled with it, so the top half of the plate (1.73-2.90 m) is a flat sheet with nothing behind it',
    fix='scale the backing frame with TARGET_SCALE (centre post ~2.25 m, side posts at +-0.62 m, crossbars 1.26 m wide), or add a top crossbar at ~2.7 m. Plate size unchanged.',
    pic=sheet('03-target-backing.png', '3  Target: plate is 2.24 m tall (Jerry\'s size) but its steel backing stops at 1.73 m', [dict(fn=p_target)], size=(8, 5.2))))

# 4 stretcher
stretch = sel(TP, 155, 199)
def p_str(ax):
    lo, hi = box_of(stretch); draw(ax, stretch, 0, dx=0.0)
    man(ax, -0.6)
    ref_box(ax, (hi[0] - lo[0]) / 2 - 1.025, (hi[0] - lo[0]) / 2 + 1.025, 0.0, 0.75, 'real stretcher\n2.05 m long', col='#2ca02c')
    hdim(ax, 0, hi[0] - lo[0], 1.05, 'game 2.48 m long (pad 2.36 m)')
    finish(ax, 'side view', (-1.0, 3.6), (-0.15, 2.0))
def p_str_top(ax):
    lo, hi = box_of(stretch)
    t = [i for i in stretch]
    # top view: x across, z up the page
    polys, cols = [], []
    for i in t:
        tr = tris(i) - OV
        for k in range(len(tr)): polys.append(np.c_[tr[k, :, 0] - lo[0], tr[k, :, 2] - lo[2]]); cols.append(hexrgb((MS[i].get('mat') or {}).get('color') or '999999'))
    order = np.argsort([np.mean(p[:, 0]) * 0 for p in polys])
    ax.add_collection(PolyCollection(polys, facecolors=cols, edgecolors='none', alpha=.8, zorder=2))
    W = hi[2] - lo[2]; L = hi[0] - lo[0]
    ref_box(ax, L / 2 - 1.025, L / 2 + 1.025, W / 2 - 0.36, W / 2 + 0.36, 'real 0.72 m wide', col='#2ca02c')
    ax.set_xlim(-0.3, 3.6); ax.set_ylim(-0.3, 1.5); ax.set_aspect('equal'); ax.grid(True, color='#e3e3e3', lw=.5); ax.tick_params(labelsize=7)
    hdim(ax, 0, L, 1.2, f'{L:.2f} m'); ax.set_title(f'top view: {W:.2f} m wide with its rails', fontsize=9.5, loc='left')
FINDINGS.append(dict(rank=4, key='stretcher', thing='Wake-up stretcher (the bed he wakes on)', where='build room, infirmary bay',
    source='world/training-props.js:155-199', owner='world/* (Claude 7 by loan, D-218)',
    game='chassis 2.48 x 1.00 m (rails 1.07 m apart), pad 2.36 x 0.94 m, pad top 0.68 m', real='hospital stretcher 2.0-2.1 x 0.7-0.8 m; pad 1.9-2.0 x 0.6-0.7 m; top 0.55-0.9 m',
    off='about 20% too long and 35-45% too wide; height is right. Next to the old cot (1.9 x 0.72 m, right size) it looks like a double bed',
    fix='scale the stretcher in x to ~0.84 and in z to ~0.75 about its centre (keep pad top 0.68 m). The wake pose uses tg.bed (training.js:834: bedAt.x + 0.98): move that with the foot end, and re-check the lying player fits (1.80 m on a ~2.0 m pad).',
    pic=sheet('04-stretcher.png', '4  Stretcher: 2.48 x 1.00 m (real about 2.05 x 0.72 m) - 20% long, 40% wide', [dict(fn=p_str, w=1.2), dict(fn=p_str_top)], size=(12, 4.4))))

# 5 oxygen bottle
oxy = sel(TP, 255, 270)
def p_oxy(ax):
    lo, hi = box_of(oxy); draw(ax, oxy, 0, dx=0.0)
    man(ax, -0.6)
    ref_box(ax, 0.55, 0.66, 0.0, 0.74, 'medical E bottle\n0.11 x 0.74 m', col='#2ca02c')
    ref_box(ax, 1.05, 1.28, 0.0, 1.40, 'big H bottle\n0.23 x 1.40 m', col='#2ca02c')
    hdim(ax, 0.07, 0.35, 1.0, 'game 0.28 m')
    finish(ax, 'side view', (-1.0, 2.0), (-0.15, 2.0))
FINDINGS.append(dict(rank=5, key='oxygen-bottle', thing='Oxygen bottle', where='build room, infirmary bay, by the stretcher',
    source='world/training-props.js:255-270', owner='world/* (Claude 7 by loan, D-218)',
    game='body 0.28 m across, 0.79 m tall (0.94 m with valve)', real='medical E cylinder 0.11 m x 0.74 m; the big H cylinder is 0.23 m x 1.40 m',
    off='2.5x too fat for its height: reads as a fire extinguisher or a keg, not a gas bottle',
    fix='lathe radius .14 -> ~.06 (E bottle, keep 0.79 m) or keep .115-.14 and make it ~1.4 m tall (H bottle, then it needs a wall chain or a cart). Bands and gauge follow.',
    pic=sheet('05-oxygen-bottle.png', '5  Oxygen bottle: 0.28 m across, 0.79 m tall - 2.5x too fat', [dict(fn=p_oxy)], size=(7, 4.6))))

# 6 lockers
lock = sel(TW, 474, 500)
def p_lock(ax):
    lo, hi = box_of(lock); draw(ax, lock, 0, dx=0.0, clip=(lo + np.array([0, 0, 0]), np.array([hi[0], hi[1], lo[2] + 0.6])))
    man(ax, -0.6)
    for k in range(3): ref_box(ax, 2.05 + k * 0.38, 2.05 + (k + 1) * 0.38, 0.0, 1.83, '', col='#2ca02c')
    ax.text(2.62, 1.95, 'three real lockers\n0.38 m each', ha='center', fontsize=7.5, color='#2ca02c')
    hdim(ax, 0, 0.6, 2.0, 'game 0.60 m each')
    finish(ax, 'front view (back wall of the range)', (-1.0, 3.5), (-0.15, 2.3))
FINDINGS.append(dict(rank=6, key='lockers', thing='Three lockers', where='range, back wall, left of the board',
    source='world/training-wear.js:474-500', owner='world/* (Claude 7 by loan, D-218)',
    game='each 0.60 W x 1.85 H x 0.48 D; doors 0.54 x 1.62', real='single locker 0.30-0.45 W (most 0.38) x 1.80-1.83 H x 0.45-0.50 D',
    off='height and depth right; 35-60% too wide, so they read squat and chunky',
    fix='pitch .62 -> ~.40, body .60 -> ~.38, door .54 -> ~.33 (and the swing door\'s dw/hx, the blockers and the keepOut box with it). Optional: 4-5 lockers in the same 1.84 m.',
    pic=sheet('06-lockers.png', '6  Lockers: 0.60 m wide each (real ~0.38 m) - right height, too wide', [dict(fn=p_lock)], size=(8, 4.8))))

# 7 firing bench height
bench = sel(TF, 1, 80)
def p_bench(ax):
    lo, hi = box_of(bench)
    clip = (np.array([-99, -1, -1]), np.array([99, 3.2, 2]))
    draw(ax, bench, 2, dx=0.0, clip=clip)
    man(ax, -0.45)
    ref_box(ax, 0.18 - lo[2], 0.82 - lo[2], 0.0, 1.0, 'standing shooting\nshelf ~1.0 m\n(0.91-1.07)', col='#2ca02c')
    dim(ax, 1.05, 0, 0.86, 'game 0.86 m')
    finish(ax, 'side view across the firing line (he stands on the left)', (-1.0, 2.2), (-0.15, 3.1))
FINDINGS.append(dict(rank=8, key='firing-bench', thing='Firing-line bench (worktop)', where='range, firing line, full width',
    source='world/training-firing-line.js:4 (FIRING_LINE.top .86)', owner='world/* (Claude 7 by loan, D-218)',
    game='worktop top 0.86 m, 0.64 m deep; wire screen from 2.15 m to the ceiling', real='standing range shelf/booth counter 0.91-1.07 m (most ~1.0 m), 0.3-0.6 m deep',
    off='10-15 cm low for standing shooters (a 1.80 m man\'s hip is ~0.95-1.0 m); the depth is fine for a bench',
    fix='only if the Director wants it: FIRING_LINE.top .86 -> ~.98 (solids, legs and the mesh bottom follow from F.top; check t-range shots and the dummy\'s approach). Low risk to leave.',
    pic=sheet('08-firing-bench.png', '8  Firing bench: top 0.86 m (standing shelf ~1.0 m) - a little low', [dict(fn=p_bench)], size=(7.5, 5.2))))

# 8 fence mesh pitch (perimeter, infirmary fence, firing-line screen)
perim = [m['i'] for m in MS if 'training-perimeter-west' in m['path'] and not m['line']]
def p_mesh(ax):
    # a 2.6 m stretch of the west run (x = -42, along z), seen from inside
    zc = 10.0
    clip = (np.array([-43.5, -1, zc - 1.3]), np.array([-40.5, 3.2, zc + 1.3]))
    idx = [i for i in perim if MS[i]['bmax'][2] - OV[2] > zc - 1.3 and MS[i]['bmin'][2] - OV[2] < zc + 1.3 and MS[i]['bmax'][0] - OV[0] > -43.5]
    lo, hi = box_of(idx)
    draw(ax, idx, 2, dx=lo[2] - (zc - 1.3), clip=clip)
    man(ax, -0.5)
    # real chain-link: 5 cm diamonds, drawn as a 0.6 x 0.6 m patch
    x0, y0, s = 3.0, 0.6, 0.6
    for c in np.arange(-s, s, 0.05):
        for sl in (-1, 1):
            xs = np.linspace(0, s, 30); ys = sl * xs + c
            k = (ys >= 0) & (ys <= s)
            if k.any(): ax.plot(x0 + xs[k], y0 + ys[k], color='#2ca02c', lw=.4)
    ax.add_patch(Rectangle((x0, y0), s, s, fill=False, ec='#2ca02c', lw=1, ls='--'))
    ax.text(x0 + s / 2, y0 + s + .05, 'real chain-link\n5 cm diamonds', ha='center', fontsize=7.5, color='#2ca02c')
    hdim(ax, 2.75, 3.07, 2.42, '32 cm')
    finish(ax, 'west perimeter fence, 2.6 m of it, from inside', (-1.0, 3.9), (-0.15, 3.1))
FINDINGS.append(dict(rank=9, key='fence-mesh', thing='Wire mesh on the perimeter fence, the infirmary fence and the firing-line screen', where='build room fences; range above the bench',
    source='game/training-perimeter.js:90-92 (c += .32); game/training-infirmary-fence.js:37 (.28); world/training-firing-line.js:57 (.32)', owner='ChatGPT (game/*) / world/* (Claude 7 by loan)',
    game='diamonds 28-32 cm across, strips 1.1 cm wide', real='chain-link 5 cm diamonds (security mesh 2.5-7.5 cm); weld mesh 5 x 5-20 cm',
    off='5-6x too coarse: reads as a big trellis or cattle panel, and makes the 2.35 m fence look small. Heights are right (perimeter 2.35 m + coil to ~2.8 m; posts every 2.5 m)',
    fix='Director\'s call (cost): a finer pitch as geometry multiplies strips by ~6; a tiling alpha texture was avoided on purpose (infirmary-fence note). Middle way: ~10-12 cm pitch with 6-8 mm strips.',
    pic=sheet('09-fence-mesh.png', '9  Fence mesh: 32 cm diamonds (real chain-link 5 cm) - 6x too coarse', [dict(fn=p_mesh)], size=(9, 5.0))))

# 9 HQ copies: kiosk and Armory
kio = by_key('copy:training-kiosk'); arm = by_key('copy:training-armory'); cif = by_key('copy:training-cif')
def p_kiosk(ax):
    lo, hi = box_of(kio); draw(ax, kio, 2, dx=0.0, flip=True)
    man(ax, -0.6)
    ref_line(ax, -0.2, 1.75, 1.0, 'real counter 0.9-1.1 m')
    ref_line(ax, -0.2, 1.75, 1.4, 'real screen centre 1.3-1.5 m')
    dim(ax, 1.95, 0, 1.20, 'shelf 1.20')
    dim(ax, 2.35, 0, 1.78, 'screen\ncentre 1.78')
    finish(ax, 'supply kiosk (copy), front view', (-1.0, 3.1), (-0.15, 3.3))
def p_arm(ax):
    lo, hi = box_of(arm); draw(ax, arm, 2, dx=0.0, flip=True)
    man(ax, -0.6)
    ref_line(ax, -0.2, 4.6, 2.2, 'a man reaches ~2.2 m')
    ref_line(ax, -0.2, 4.6, 2.0, '', col='#2ca02c')
    ax.text(4.65, 1.9, 'real rack top\n1.8-2.0 m', color='#2ca02c', fontsize=7.5, va='top')
    dim(ax, 4.9, 0.77, 3.79, 'rack 0.77-3.79 m')
    finish(ax, 'Armory rack wall (copy), front view', (-1.0, 6.0), (-0.15, 4.8))
FINDINGS.append(dict(rank=7, key='hq-copies', thing='HQ copies on the range\'s left wall: supply kiosk, Armory rack wall (CIF terminal, alarm panel, skull window checked too)', where='range +x wall; build room west wall',
    source='index.html trainingCopies() (clones of the HQ models)', owner='HQ models: index.html (Claude 2 shell; HQ build meshes Antigravity). NOT Claude 7: a copy must match the HQ one',
    game='kiosk 0.65-3.17 m on the wall, shelf 1.20 m, screen centre 1.78 m; Armory racks 0.77-3.79 m (surround to 4.55 m); CIF counter 1.10 m (ok), panel top 3.19 m; alarm panel 0.67-2.63 m (ok); skull window sill 0.79-0.89 m (ok)',
    real='self-service kiosk: counter 0.9-1.1 m, screen centre 1.3-1.5 m, whole unit 1.5-1.9 m; gun rack wall 1.8-2.0 m tall (top within reach, ~2.2 m)',
    off='kiosk screen is above a 1.80 m man\'s eyes (1.68 m) and its shelf is chest-high; the Armory rack runs 1.6 m above anyone\'s reach. Both are the HQ\'s own sizes, so the HQ shows the same',
    fix='report to the HQ owners (Director routes): kiosk screen down ~0.35 m and shelf to ~1.0 m; Armory racks top ~2.2 m (or a ladder/rolling stair if the tall wall is wanted). The training copies then follow by themselves.',
    pic=sheet('07-hq-copies.png', '7  HQ copies: kiosk screen 1.78 m up (real ~1.4), Armory racks to 3.8 m (reach 2.2)', [dict(fn=p_kiosk), dict(fn=p_arm, w=1.5)], size=(13, 5.0))))

# 10 small things: keypad + light switch, safety signs, gate beacons, firing-line paint
keyp = sel(TJ, 400, 415); swi = sel(TJ, 780, 800); signs = sel(TW, 444, 449); board = sel(TW, 450, 470)
beac = sel(TP, 105, 113, lambda m: (m['bmin'][0] - OV[0]) < -27)
def p_door(ax):
    idx = [i for i in keyp + swi if MS[i]['bmax'][0] - OV[0] > -8.0]   # range side
    lo, hi = box_of(idx); draw(ax, idx, 2, dx=lo[2] - (-10.0))
    man(ax, -0.5)
    ref_line(ax, -0.2, 4.4, 1.2, 'real keypad / switch: 0.9-1.2 m (max 1.22)')
    finish(ax, 'doorway keypad + light switch (range side)', (-1.0, 5.6), (-0.15, 2.0))
def p_wall(ax):
    idx = board
    lo, hi = box_of(idx); draw(ax, idx, 0, dx=0.0)
    ref_line(ax, -0.1, 8.2, 1.5, 'eye-level centre ~1.5 m')
    man(ax, -0.6)
    finish(ax, 'range back wall: monitor (left), weapon rack, board (right)', (-1.1, 10.0), (-0.15, 2.6))
FINDINGS.append(dict(rank=10, key='small-wall-things', thing='Small wall things: keypads, light switch, whiteboard, monitor, safety signs', where='range walls',
    source='world/training.js:400-415 (keypads), 780-800 (switch); world/training-wear.js:444-470 (signs, board, rack, monitor)', owner='world/* (Claude 7 by loan, D-218)',
    game='keypads 1.20-1.46 m; switch box 0.30 x 0.42 m at 1.19-1.61 m; board 1.18 x 0.86 m centre 1.85 m; monitor centre 1.75 m; safety signs 1.0 x 0.7 m centre 2.2 m',
    real='keypad/switch 0.9-1.2 m (top 1.22 m); board bottom ~0.9-1.0 m (centre ~1.4-1.5 m); safety signs 0.3-0.6 m wide at 1.5-2.0 m',
    off='all a bit high (15-35 cm) and the signs ~2x big; each is small alone, together the wall reads "made for a taller man"',
    fix='keypads -0.2 m; board and monitor centre to ~1.5 m; signs 0.6 x 0.42 m at ~1.8 m. Low priority.',
    pic=sheet('10-small-wall-things.png', '10  Small wall things sit 15-35 cm high (keypads, board, monitor, signs)', [dict(fn=p_door), dict(fn=p_wall)], size=(10, 7.5), rows=True)))

# 00 the line-up: every measured thing at true scale next to the man (green = right size, amber = a bit off, red = off)
dummy = [m['i'] for m in MS if 'training-melee-dummy' in m['path'] and not m['line']] or sel('world/training-dummy.js', 1, 99999)
cot = sel(TW, 532, 562); iv = sel(TP, 231, 254); cons = [m['i'] for m in MS if 'training-range-console' in m['path']]
cifc = cif; panel = by_key('copy:training-hqPanel'); skull = by_key('copy:training-skullWindow')
LINEUP = [('dummy 1.79', dummy, 0, 'g'), ('IV stand 1.94', iv, 0, 'g'), ('old cot 1.9 x 0.72', cot, 0, 'g'), ('range console', cons, 2, 'g'),
          ('lockers 0.60 w', lock, 0, 'a'), ('oxygen 0.28 w', oxy, 0, 'r'), ('worktop 1.17', cab + mon, 0, 'r'), ('stretcher 2.48', stretch, 0, 'a'),
          ('kiosk (HQ)', kio, 2, 'a'), ('CIF (HQ)', cifc, 2, 'g'), ('alarm panel (HQ)', panel, 2, 'g'), ('target (Jerry 2x)', tgt, 0, 'a')]
def p_line(ax):
    x = 0.0
    man(ax, -0.5)
    C = {'g': '#2ca02c', 'a': '#e08a00', 'r': '#d62728'}
    for name, idx, axis, st in LINEUP:
        if not idx: continue
        lo, hi = box_of(idx); w = hi[axis] - lo[axis]
        draw(ax, idx, axis, dx=x, dy=-max(0.0, 0.0))
        ax.add_patch(Rectangle((x - .04, -.05), w + .08, .03, fc=C[st], ec='none', zorder=6))
        ax.text(x + w / 2, -.12, name, ha='center', va='top', fontsize=7, color=C[st], rotation=0)
        x += w + 0.45
    ax.set_xlim(-1.0, x); ax.set_ylim(-0.4, 3.4); ax.set_aspect('equal'); ax.axhline(0, color='#333', lw=1, zorder=3)
    ax.grid(True, color='#eee', lw=.5); ax.tick_params(labelsize=7); ax.set_ylabel('metres up', fontsize=7)
    ax.set_title('green = real size, amber = a bit off, red = off (every thing at true scale, 1.80 m man on the left)', fontsize=9, loc='left')
LINEUP_PIC = sheet('00-lineup.png', 'Training Ground props at true scale', [dict(fn=p_line)], size=(20, 4.6))

# ---------------------------------------------------------------- the table of every checked thing (right ones too)
TABLE = [
 # thing, game, real, verdict
 ('Doorway range <-> build room (lift shutter)', 'opening 3.0 m wide x 3.0 m high', 'industrial roll-up 2.4-3.6 m; a person door is 0.9-1.0 x 2.0-2.1 m', 'OK as a roll-up shutter (there is no person-size door anywhere)'),
 ('Zombie gate', 'opening 6.6 x 6.3 m, leaves 3.74 m tall', 'vehicle/hangar gate 3-8 m', 'OK'),
 ('Locker doors', '0.54 x 1.62 m', 'locker door 0.3-0.4 x 1.6-1.7 m', 'too wide with the lockers (item 6)'),
 ('Range walls / hangar', 'range 16 x 42 m, 6 m walls; hangar 36 x 40 m, 24 m', 'indoor range 3-6 m; hangar 15-30 m', 'OK'),
 ('Wall band', '16 cm band at 1.05 m', 'dado/chair rail 0.8-1.1 m', 'OK'),
 ('Railings / handrails', 'none in the room (stretcher side rail top 0.81 m, 15 cm over the pad)', 'handrail 0.9-1.1 m; bed rail 25-35 cm over the mattress', 'no railings to check; bed rail a little low (minor)'),
 ('Perimeter fence', 'posts 2.35 m every <=2.5 m, 7.5 cm; coil to ~2.8 m', 'security fence 2.1-2.4 m + 0.45 m coil; posts 2.5-3 m apart, 6-10 cm', 'OK (mesh pitch: item 8)'),
 ('Infirmary fence', '3.0 m posts and panels', 'cage/partition 2.1-2.4 m (3 m exists)', 'tall but OK'),
 ('Infirmary bay panels', 'panels 2.44 m (0.21-2.65), posts 2.76 m', 'clinic partition / curtain 2.1-2.4 m', 'OK'),
 ('Firing-line bench', 'top 0.86 m, 0.64 m deep', 'standing shelf 0.91-1.07 m', 'a little low (item 7)'),
 ('Benches / tables / chairs', 'none (only the worktop, the bench and the stretcher shelf)', 'seat 0.43-0.46 m, table 0.72-0.76 m', 'nothing to check'),
 ('Crates / shelves', 'none (under-stretcher shelf 0.31-0.42 m)', 'pallet crate ~1.2 x 0.8 m', 'nothing to check'),
 ('Steps / stairs', 'none; raised edges: target stand 24 cm, gate threshold 6 cm, column feet 6 cm, fence feet 4 cm', 'step riser 15-20 cm', 'no steps; target stand is a step-and-a-half high but on the far side of the line (OK)'),
 ('Wall lamp strips', '10 cm strips 25 cm under the wall top', 'linear fixture 5-10 cm', 'OK'),
 ('High-bay lamps', 'hood 1.24 m across', '0.40-0.56 m', 'too big (item 2)'),
 ('Gate beacons', '0.28 x 0.41 m caged', 'rotating beacon 0.15-0.25 m', 'about 1.5x big (minor)'),
 ('Roof truss / columns', 'truss 1.67 m deep over 36 m; columns 0.48 x 0.42 m (+0.7 m flange)', 'truss ~1/12-1/15 of span (2.4-3 m); columns 0.4-0.8 m', 'a bit slim for the span (minor, high up)'),
 ('Crane rails', '0.30 x 0.42 m at 8.5 m', 'crane runway beam 0.3 x 0.5-0.9 m', 'OK'),
 ('Containment guns', '0.94 x 0.70 x 0.76 m at 5.3-6.0 m', 'ceiling sentry/turret 0.5-1.0 m', 'OK'),
 ('Training dummy', '1.79 m', 'a man 1.5-2.0 m', 'OK'),
 ('Old cot', '1.90 x 0.72 m, 0.42 m high', 'army cot 1.9-2.0 x 0.65-0.75 m, 0.3-0.45 m', 'OK'),
 ('IV stand', '1.94 m, base 0.52 m', '1.6-2.2 m, base 0.5-0.6 m', 'OK'),
 ('Wall supply case', '1.55 x 0.70 m at 1.74-2.42 m', 'wall cabinet bottom 1.4-1.6 m', 'OK'),
 ('Range console', '1.35 x 1.15 m wall cabinet, 0.83-1.97 m', 'wall panel, screen centre 1.4-1.6 m', 'OK'),
 ('Range drill monitor', '3.55 x 1.66 m screen at 2.5-4.2 m', 'range screens 1-1.5 m (a 160-inch screen is a jumbotron)', 'big; reads well from the line (leave)'),
 ('Firing-line paint', 'line 26 cm wide; "FIRING LINE" 4.2 x 0.8 m', 'painted line 5-15 cm', 'about 2x wide (minor, helps reading)'),
 ('Cobwebs', '0.6-1.2 m', '0.2-0.6 m', 'big (minor, art call)'),
 ('Targets', 'plate 1.28 x 2.24 m (Jerry asked 2x, CL-144)', 'silhouette 0.5-0.6 x 1.8 m', 'size is Jerry\'s; backing is off (item 3)'),
]

# ---------------------------------------------------------------- REPORT.md + scale-audit.json
FINDINGS.sort(key=lambda f: f['rank'])
when = S_time = G['S'].get('time', '?')
L = ['# CF-20 Training Ground real-world scale audit', '',
     'Made by Claude 6 for Claude 7 (CG-1) and the Director, D-218 pass 1. Review only: nothing in the game was changed.', '',
     f'Scene: the game\'s own Training build (test page, CPU), dumped {when} (the CF-19 run; the Training files in world/, game/ and ui/ have not changed since: file times checked). '
     'Every size below is measured on that build, not read off the code by eye. The man in the pictures is 1.80 m.', '',
     'Picture of everything at true scale: crops/00-lineup.png. Each finding has its own picture with the real size drawn in green or red dashes.', '',
     '## Off, ranked (most visible first)', '']
for f in FINDINGS:
    L += [f"{f['rank']}. **{f['thing']}** - {f['off']}.",
          f"   - Game: {f['game']}.", f"   - Real: {f['real']}.", f"   - Fix idea: {f['fix']}",
          f"   - Where: {f['where']}. Code: {f['source']}. Owner: {f['owner']}.", f"   - Picture: {f['pic']}", '']
L += ['## Everything checked (right ones too)', '', '| Thing | Game | Real | Verdict |', '|---|---|---|---|']
for t in TABLE: L.append('| ' + ' | '.join(x.replace('|', '/') for x in t) + ' |')
L += ['', '## Limits', '',
      '- CPU build with the test three.js: shapes and places are the game\'s own; the pictures are simple side views, not game renders.',
      '- "Real" sizes are common standards (counters, lockers, stretchers, lamps, fences, signs). Ranges, not one number.',
      '- Item 3 (target size) and item 9 (HQ copies) are not Claude 7\'s to resize: Jerry chose the target size; the HQ owners own the copies.',
      '', '## Re-run', '',
      '`python3 -E tools/placement-audit/scale.py review/CF-19/run review/CF-20` (after a fresh `run.mjs` dump; needs numpy trimesh matplotlib).']
open(os.path.join(OUTD, 'REPORT.md'), 'w', encoding='utf8').write('\n'.join(L) + '\n')
json.dump({'scene_time': when, 'findings': [{k: v for k, v in f.items()} for f in FINDINGS], 'table': [dict(zip(('thing', 'game', 'real', 'verdict'), t)) for t in TABLE],
           'lineup': LINEUP_PIC}, open(os.path.join(OUTD, 'scale-audit.json'), 'w'), indent=1)
import shutil; shutil.rmtree(os.path.join(OUTD, '_tmp'), ignore_errors=True)
print('CF-20 scale audit:', len(FINDINGS), 'findings,', len(TABLE), 'rows ->', OUTD)
