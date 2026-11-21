#!/usr/bin/env python3
"""tools/placement-audit/audit.py - CF-19 (D-218, Claude 6): the Training Ground placement audit. Review-only.

  python3 -I tools/placement-audit/audit.py [run-dir] [out-dir]      (defaults: review/CF-19/run review/CF-19)

Reads run.mjs's dump (scene.json + tris.f32: the room as the game builds it, each mesh with the source line that
added it) and lists:
  1 intersections   two different things cutting into each other (deepest point >= 5 mm, or >= 2 mm over >= 5 cm)
  2 floating/sunk   a thing touching nothing (gap > 1 cm); a base under the floor's top (> 1 cm)
  3 barrier gaps    stretches of a fence or wall run (the game's own collision runs) with no geometry in them
  4 lights inside   a light inside a closed mesh, or within 1 cm of a surface
  5 scale           recognisable things (doors, beds, cabinets, dummy ...) against real sizes and the player (1.80 m)
Same defect repeated (one builder line, many places) is one finding with a count and every place.
Writes <out>/placement-audit.json, <out>/REPORT.md, <out>/crops/*.png and <out>/crops/00-map.png.
Needs numpy scipy trimesh rtree matplotlib.
"""
import json, os, sys, math, collections, re
import numpy as np
import trimesh

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
RUN = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'review/CF-19/run'))
OUT = os.path.abspath(sys.argv[2] if len(sys.argv) > 2 else os.path.join(ROOT, 'review/CF-19'))
CROPS = os.path.join(OUT, 'crops')
os.makedirs(CROPS, exist_ok=True)
for f in os.listdir(CROPS):
    if f.endswith('.png'): os.remove(os.path.join(CROPS, f))

DEPTH_MIN, DEPTH_SOFT, EXTENT_SOFT = 0.005, 0.002, 0.05
GAP_MIN = 0.01
BARRIER_GAP_MIN = 0.06
PLAYER_H = 1.80
MAX_CROPS = int(os.environ.get('CF19_CROPS', '40'))

S = json.load(open(os.path.join(RUN, 'scene.json')))
TR = np.fromfile(os.path.join(RUN, 'tris.f32'), dtype=np.float32).astype(np.float64).reshape(-1, 3, 3)
MS = S['meshes']
O = S['plan']['origin']; OV = np.array([O['x'], O['y'], O['z']])
off = np.cumsum([0] + [m['tris'] for m in MS])
def tris(i): return TR[off[i]:off[i + 1]]
def local(p): return [round(float(v), 2) for v in (np.asarray(p, dtype=float) - OV)]
rng = np.random.default_rng(19)

# ---------------------------------------------------------------- where each mesh came from
OWNERS = [(r'^world/', 'world/* (Director\'s files; Claude 7 by loan, D-218)'), (r'^game/', 'ChatGPT (game/*)'), (r'^ui/', 'ChatGPT (ui/*)'),
          (r'^studio/', 'studio/* (AGENTS.md table)'), (r'^index\.html', 'index.html (Claude 2 shell; HQ build meshes Antigravity)')]
def owner(f): return next((who for rx, who in OWNERS if re.search(rx, f)), '?')
HELPERS = {'add', 'box', 'mesh', 'cylinder', 'plane', 'addPart', 'fixture', 'decal', 'cylOrBox', 'printed', 'web', 'strip', 'keep', 'std',
           'cyl', 'sph', 'part', 'addBox', 'rounded', 'wall', 'sign'}
def parse(fr):
    fn, _, loc = fr.partition('@'); f, _, ln = loc.rpartition(':')
    return fn, f, int(ln) if ln.isdigit() else 0
callers = collections.defaultdict(set)
for m in MS:
    for a, b in zip(m['src'], m['src'][1:]): callers[a].add(b)
COPIES = ('training-cif', 'training-kiosk', 'training-armory', 'training-hqPanel', 'training-skullWindow')
_src = {}
def lines_of(f):
    if f not in _src:
        try: _src[f] = open(os.path.join(ROOT, f), encoding='utf8', errors='replace').read().split('\n')
        except Exception: _src[f] = []
    return _src[f]
def srcline(f, ln):
    L = lines_of(f)
    if not (0 < ln <= len(L)): return '', '', ''
    text = L[ln - 1].strip()
    m = re.search(r'//\s*(.+)$', text)
    note = m.group(1) if m else ''
    section = ''
    for k in range(ln - 1, max(ln - 60, -1), -1):
        t = L[k].strip()
        if t.startswith('//'):
            j = k   # the start of that comment block
            while j > 0 and L[j - 1].strip().startswith('//'): j -= 1
            section = ' '.join(L[q].strip()[2:].strip() for q in range(j, k + 1))
            if not note and k >= ln - 8: note = t[2:].strip()
            break
    return text[:220], note[:200], section[:260]
def site_of(src, names):
    if src and src[0].startswith(('cloneLean@', 'mirrorTrainingRack@')):
        c = next((n for n in reversed(names) if n in COPIES), names[0] if names else 'copy')
        return {'key': 'copy:' + c, 'asm': 'copy:' + c, 'file': 'index.html', 'line': parse(src[0])[2], 'fn': 'trainingCopies'}
    pick = src[-1] if src else '?@?:0'
    for f in src:
        if parse(f)[0] in HELPERS or len(callers[f]) >= 3: continue
        pick = f; break
    fn, f, ln = parse(pick)
    return {'key': f'{f}:{ln}', 'asm': f'{f}#{fn or "?"}', 'file': f, 'line': ln, 'fn': fn}
for i, m in enumerate(MS):
    m['i'] = i
    m['site'] = site_of(m['src'], m['names'])
    m['bmin'] = np.array(m['min']); m['bmax'] = np.array(m['max'])
    ext = m['bmax'] - m['bmin']
    m['huge'] = ext.max() > 90
    m['tiny'] = ext.max() < 0.002
    mat = m.get('mat') or {}
    m['glow'] = mat.get('emissive') not in (None, '000000')   # a lamp, lens, beacon, LED (unlit MeshBasic screens and voids are not lights)
    m['big'] = bool(max(ext[0], ext[2]) >= 6 or ext[1] >= 5.5 or m['huge'] or re.search(r'floor|ceiling|void', m['path']))
SITES = {}
for m in MS:
    s = m['site']
    if s['key'] not in SITES:
        text, note, section = srcline(s['file'], s['line']) if not s['key'].startswith('copy:') else ('', '', '')
        SITES[s['key']] = dict(s, text=text, note=note, section=section, owner=owner(s['file']))
def label_of(m):
    n = next((x for x in m['names'] if x != 'training-ground' and not x.startswith('training-cutaway')), None)
    return n or ''
mn = np.array([m['bmin'] for m in MS]); mx = np.array([m['bmax'] for m in MS])
active = np.array([not m['huge'] and not m['line'] and not m['tiny'] for m in MS])

def components(idx, tol):
    """Groups of meshes whose boxes come within tol of each other."""
    idx = list(idx); par = {i: i for i in idx}
    def find(a):
        while par[a] != a: par[a] = par[par[a]]; a = par[a]
        return a
    if len(idx) > 1:
        A = np.array(idx); lo = mn[A] - tol; hi = mx[A] + tol
        for k in range(len(A)):
            ov = np.all((lo[k] <= hi) & (hi[k] >= lo), axis=1); ov[:k + 1] = False
            for j in np.nonzero(ov)[0]: par[find(A[k])] = find(A[j])
    g = collections.defaultdict(list)
    for i in idx: g[find(i)].append(i)
    return sorted(g.values(), key=lambda v: tuple(np.round(mn[v].min(axis=0), 2)))

# ---------------------------------------------------------------- props: what counts as one thing
# A builder function that makes the room itself (it holds walls, floors, ceilings: buildTrainingGround,
# dressTrainingProps ...) puts many separate things in one function, so there each source line is its own thing.
# Any other builder function (the dummy, the console, the containment guns, the perimeter fence ...) is one model,
# split into its separate copies by where they stand.
asm_meshes = collections.defaultdict(list)
for m in MS: asm_meshes[m['site']['asm']].append(m['i'])
room_asm = {a for a, idx in asm_meshes.items() if any(MS[i]['big'] for i in idx)}
PROPS = []
for a, idx in asm_meshes.items():
    groups = collections.defaultdict(list)
    for i in idx: groups[MS[i]['site']['key'] if a in room_asm else a].append(i)
    for key, gi in groups.items():
        comps = components(gi, 0.01)
        for k, comp in enumerate(comps):
            pmn = mn[comp].min(axis=0); pmx = mx[comp].max(axis=0); ext = pmx - pmn
            name = collections.Counter(label_of(MS[i]) for i in comp).most_common(1)[0][0]
            sk = MS[comp[0]]['site']['key'] if a in room_asm else collections.Counter(MS[i]['site']['key'] for i in comp).most_common(1)[0][0]
            p = {'pid': len(PROPS), 'key': key, 'asm': a, 'site': sk, 'n': k + 1, 'of': len(comps), 'meshes': comp, 'min': pmn, 'max': pmx, 'name': name,
                 'shell': any(MS[i]['big'] for i in comp), 'glow': any(MS[i]['glow'] for i in comp), 'line': all(MS[i]['line'] for i in comp)}
            PROPS.append(p)
            for i in comp: MS[i]['pid'] = p['pid']
def describe(p):
    s = SITES[p['site']]
    if p['site'].startswith('copy:'): return s['key'][5:].replace('training-', 'HQ ') + ' terminal (copy of the HQ one)'
    bits = [b for b in (p['name'], s['note'] or (s['section'][:90] if s['section'] else ''), ) if b]
    return ' - '.join(bits) if bits else s['text'][:90]
def psrc(p):
    s = SITES[p['site']]
    if p['site'].startswith('copy:'): return 'index.html trainingCopies() (the HQ ' + p['site'][5:].replace('training-', '') + ', built by the HQ code)'
    return f"{s['file']}:{s['line']}" + (f" ({s['fn']})" if s['fn'] else '')
def prop_info(pid):
    p = PROPS[pid]; s = SITES[p['site']]
    return {'thing': describe(p), 'source': psrc(p), 'owner': s['owner'], 'code': s.get('text', ''), 'section': s.get('section', '')[:200],
            'centre': local((p['min'] + p['max']) / 2), 'size': [round(float(v), 3) for v in (p['max'] - p['min'])], 'room_part': p['shell']}

PRIM = {'add', 'box', 'mesh', 'keep', 'std', 'addBox', 'cylinder', 'plane', 'part', 'cyl', 'sph', 'addPart'}
def mesh_info(i):
    m = MS[i]; fr = next((f for f in m['src'] if parse(f)[0] not in PRIM), m['src'][0] if m['src'] else '?@?:0')
    fn, f, ln = parse(fr); text, note, section = srcline(f, ln) if not f.startswith('index.html') or not m['site']['key'].startswith('copy:') else ('', '', '')
    mat = m.get('mat') or {}
    what = ('GLOWING ' if m['glow'] else '') + ('flat ' if (m['bmax'] - m['bmin']).min() < 0.002 else '') + 'part'
    return {'made_at': f'{f}:{ln}' + (f' (in {fn}())' if fn else ''), 'code': text[:160], 'comment': note[:160], 'what': what, 'name': label_of(m),
            'size': [round(float(v), 3) for v in (m['bmax'] - m['bmin'])], 'colour': '#' + (mat.get('color') or '??????')}
def mesh_title(i):
    d = mesh_info(i)
    return (d['name'] or d['comment'] or d['code'])[:50] + (' [glows]' if MS[i]['glow'] else '')
# ---------------------------------------------------------------- meshes as trimesh
_tm = {}
def tm(i):
    if i not in _tm:
        t = tris(i)
        mesh = trimesh.Trimesh(vertices=t.reshape(-1, 3), faces=np.arange(len(t) * 3).reshape(-1, 3), process=True, validate=False)
        mesh.merge_vertices(digits_vertex=5)
        closed = bool(mesh.is_watertight) and len(mesh.faces) >= 4
        if closed:
            try:
                if mesh.volume < 0: mesh.invert()
                closed = mesh.volume > 1e-9
            except Exception: closed = False
        mesh.metadata['closed'] = closed
        _tm[i] = mesh
    return _tm[i]
def samples(i, lo=None, hi=None, cap=2500):
    mesh = tm(i); tri = mesh.triangles
    pts = [mesh.vertices, tri.mean(axis=1), (tri[:, 0] + tri[:, 1]) / 2, (tri[:, 1] + tri[:, 2]) / 2, (tri[:, 2] + tri[:, 0]) / 2]
    area = float(mesh.area)
    if area > 0:
        if lo is not None:   # sample only the part of the mesh near the overlap
            k = np.all(tri.max(axis=1) >= lo, axis=1) & np.all(tri.min(axis=1) <= hi, axis=1)
            sub = trimesh.Trimesh(vertices=tri[k].reshape(-1, 3), faces=np.arange(k.sum() * 3).reshape(-1, 3), process=False) if k.any() else None
        else: sub = mesh
        if sub is not None and sub.area > 0:
            n = int(min(cap, max(60, sub.area / 0.0002)))
            sp, _ = trimesh.sample.sample_surface(sub, n, seed=int(rng.integers(1 << 30))); pts.append(sp)
    P = np.vstack(pts)
    if lo is not None: P = P[np.all((P >= lo) & (P <= hi), axis=1)]
    return P
def depth_into(a, b, lo, hi):
    """How far mesh a goes inside closed mesh b: (deepest m, size of the inside part m, where) or None if b is open."""
    B = tm(b)
    if not B.metadata['closed']: return None
    P = samples(a, lo - 1e-4, hi + 1e-4)
    if len(P) == 0: return (0.0, 0.0, None)
    inside = B.contains(P)
    if not inside.any(): return (0.0, 0.0, None)
    Q = P[inside]
    ext = float(np.max(Q.max(axis=0) - Q.min(axis=0)))
    if len(Q) > 1500: Q = Q[rng.choice(len(Q), 1500, replace=False)]
    _, d, _ = trimesh.proximity.closest_point(B, Q)
    k = int(np.argmax(d))
    return (float(d[k]), ext, Q[k])

# ---------------------------------------------------------------- 1 intersections
cand = []
for a in range(len(MS)):
    if not active[a]: continue
    lo = np.maximum(mn[a], mn); hi = np.minimum(mx[a], mx); span = hi - lo
    ov = np.all(span >= -1e-4, axis=1) & ((span > 0.002).sum(axis=1) >= 2) & active
    ov[:a + 1] = False
    for b in np.nonzero(ov)[0]:
        pa, pb = PROPS[MS[a]['pid']], PROPS[MS[b]['pid']]
        if pa['pid'] == pb['pid'] or (pa['shell'] and pb['shell']): continue
        cand.append((a, int(b), lo[b], hi[b]))
print(f'1 intersections: {len(cand)} mesh pairs to test', flush=True)
pairs = {}
for n, (a, b, lo, hi) in enumerate(cand):
    best = None
    for x, y in ((a, b), (b, a)):
        r = depth_into(x, y, lo, hi)
        if r and r[2] is not None and (best is None or r[0] > best[0]): best = r + (x, y)
    if best is None: continue
    d, ext, p, inner, outer = best
    if d >= DEPTH_MIN or (d >= DEPTH_SOFT and ext >= EXTENT_SOFT):
        key = tuple(sorted((MS[a]['pid'], MS[b]['pid'])))
        cur = pairs.get(key)
        if cur is None or d > cur['depth']: pairs[key] = {'depth': d, 'extent': ext, 'at': p, 'meshes': (a, b), 'inner': inner, 'outer': outer}
    if n and n % 1000 == 0: print(f'   {n}/{len(cand)}', flush=True)

# ---------------------------------------------------------------- objects: touching meshes from one file (for floating and scale)
by_file = collections.defaultdict(list)
for m in MS:
    if active[m['i']] and not m['big']: by_file[m['site']['file'] if not m['site']['key'].startswith('copy:') else m['site']['key']].append(m['i'])
OBJS = []
for f, idx in by_file.items():
    for comp in components(idx, 0.01):
        OBJS.append({'oid': len(OBJS), 'file': f, 'meshes': comp, 'min': mn[comp].min(axis=0), 'max': mx[comp].max(axis=0)})
for o in OBJS:
    for i in o['meshes']: MS[i]['oid'] = o['oid']
def obj_props(o): return sorted({MS[i]['pid'] for i in o['meshes']}, key=lambda p: -len(PROPS[p]['meshes']))
def obj_info(o):
    pids = obj_props(o); main = PROPS[pids[0]]
    secs = collections.Counter(SITES[PROPS[p]['site']]['section'][:120] for p in pids if SITES[PROPS[p]['site']]['section'])
    d = prop_info(main['pid'])
    d.update({'thing': describe(main) + (f' (+{len(pids) - 1} more parts)' if len(pids) > 1 else ''), 'centre': local((o['min'] + o['max']) / 2),
              'size': [round(float(v), 3) for v in (o['max'] - o['min'])], 'section': secs.most_common(1)[0][0] if secs else d['section']})
    return d

# ---------------------------------------------------------------- 2 floating / sunk
floor_ms = [m['i'] for m in MS if re.search(r'range-floor|build-floor', m['path'])]
FLOOR_Y = max(mx[i][1] for i in floor_ms) if floor_ms else S['plan']['floorY']
floor_rects = [(mn[i], mx[i]) for i in floor_ms]
def over_floor(x, z): return any(r[0][0] - 1e-3 <= x <= r[1][0] + 1e-3 and r[0][2] - 1e-3 <= z <= r[1][2] + 1e-3 for r in floor_rects)
_pts = {}
def obj_points(o):
    if o['oid'] not in _pts:
        P = np.vstack([samples(i, cap=600) for i in o['meshes']])
        if len(P) > 5000: P = P[rng.choice(len(P), 5000, replace=False)]
        _pts[o['oid']] = P
    return _pts[o['oid']]
floating, sunk = [], []
for o in OBJS:
    bottom = o['min'][1]; c = (o['min'] + o['max']) / 2
    if bottom < FLOOR_Y - GAP_MIN and over_floor(c[0], c[2]) and o['max'][1] > FLOOR_Y:
        sunk.append({'oid': o['oid'], 'depth': FLOOR_Y - bottom, 'at': [c[0], bottom, c[2]]})
    if o['max'][1] <= FLOOR_Y + 1e-3: continue
    lo, hi = o['min'] - 1.0, o['max'] + 1.0
    mine = set(o['meshes'])
    near = [i for i in np.nonzero(np.all(mn <= hi, axis=1) & np.all(mx >= lo, axis=1) & active)[0] if i not in mine]
    near.sort(key=lambda i: np.max(np.maximum(0, np.maximum(mn[i] - o['max'], o['min'] - mx[i]))))
    P = obj_points(o)
    best = (9.0, None, None)
    for i in near:
        bd = np.max(np.maximum(0, np.maximum(mn[i] - o['max'], o['min'] - mx[i])))
        if bd > best[0]: break
        _, d, _ = trimesh.proximity.closest_point(tm(i), P)
        k = int(np.argmin(d))
        if d[k] < best[0]: best = (float(d[k]), P[k], int(i))
        if best[0] <= GAP_MIN: break
    if best[0] > GAP_MIN:
        floating.append({'oid': o['oid'], 'gap': best[0], 'nearest': MS[best[2]]['pid'] if best[2] is not None else None,
                         'at': list(best[1]) if best[1] is not None else list(c), 'above_floor': float(bottom - FLOOR_Y) if over_floor(c[0], c[2]) else None})
print(f'2 floating {len(floating)}, sunk {len(sunk)}', flush=True)

# ---------------------------------------------------------------- 3 barrier gaps
def clip_poly(poly, axis, val, keep_ge):
    out = []
    for k in range(len(poly)):
        A, B = poly[k], poly[(k + 1) % len(poly)]
        ia = (A[axis] >= val) if keep_ge else (A[axis] <= val); ib = (B[axis] >= val) if keep_ge else (B[axis] <= val)
        if ia: out.append(A)
        if ia != ib: t = (val - A[axis]) / (B[axis] - A[axis]); out.append(A + (B - A) * t)
    return out
plan = S['plan']; TRN = plan.get('TRAINING', {})
gate = plan.get('gate'); DOOR = TRN.get('DOOR')
def meant_opening(along, mid, h0, h1):
    """A gap where the room means an opening: the zombie gate, the doorway."""
    if gate and along == 0 and abs(mid - (gate['z'])) < 1.5 and h0 < gate['x'] + 3.4 and h1 > gate['x'] - 3.4: return 'the zombie gate'
    if DOOR and along == 2 and abs(mid - (O['x'] + DOOR['x'])) < 0.5 and h0 < O['z'] + DOOR['maxZ'] and h1 > O['z'] + DOOR['minZ']: return 'the doorway'
    return None
gaps = []
solids = plan.get('solidList', [])
barriers = [s for s in solids if s.get('perimeterFence') or s.get('infirmaryFence') or s.get('wall') or s.get('firingFence')]
geo_ms = [m['i'] for m in MS if not m['huge'] and not m['line'] and not re.search(r'floor', m['path'])]
for s in barriers:
    dx, dz = s['maxX'] - s['minX'], s['maxZ'] - s['minZ']
    along = 0 if dx >= dz else 2; across = 2 - along
    a0, a1 = (s['minX'], s['maxX']) if along == 0 else (s['minZ'], s['maxZ'])
    c0, c1 = (s['minZ'], s['maxZ']) if along == 0 else (s['minX'], s['maxX'])
    if a1 - a0 < 0.2: continue
    c0 -= 0.04; c1 += 0.04
    kind = 'fence' if (s.get('perimeterFence') or s.get('infirmaryFence') or s.get('firingFence')) else 'wall'
    y0 = max(FLOOR_Y + 0.5, s.get('minY', FLOOR_Y)); y1 = min(s.get('maxY', FLOOR_Y + 2.0), FLOOR_Y + 2.0)
    if y1 <= y0 + 0.05: y0, y1 = s.get('minY', FLOOR_Y), s.get('maxY', FLOOR_Y + 2)
    lo = np.array([s['minX'] - .05, y0, s['minZ'] - .05]); hi = np.array([s['maxX'] + .05, y1, s['maxZ'] + .05])
    cover = []
    for i in geo_ms:
        if not (np.all(mn[i] <= hi) and np.all(mx[i] >= lo)): continue
        T = tris(i); k = np.all(T.min(axis=1) <= hi, axis=1) & np.all(T.max(axis=1) >= lo, axis=1)
        for t in T[k]:
            poly = [t[0], t[1], t[2]]
            for ax, v, ge in ((1, y0, True), (1, y1, False), (across, c0, True), (across, c1, False)):
                poly = clip_poly(poly, ax, v, ge)
                if not poly: break
            if poly:
                vals = [q[along] for q in poly]; cover.append((max(a0, min(vals)), min(a1, max(vals))))
    # a closed mesh (a column, a post) covers the run where the run's centre line is inside it
    for i in geo_ms:
        if not (np.all(mn[i] <= hi) and np.all(mx[i] >= lo)) or not tm(i).metadata['closed']: continue
        u = np.arange(max(a0, mn[i][along]), min(a1, mx[i][along]) + 0.005, 0.01)
        if not len(u): continue
        midc = (c0 + c1) / 2
        for yy in (y0 + 0.1, (y0 + y1) / 2):
            P = np.zeros((len(u), 3)); P[:, along] = u; P[:, across] = midc; P[:, 1] = yy
            ins = tm(i).contains(P)
            if ins.any():
                k = np.nonzero(ins)[0]; br = np.nonzero(np.diff(k) > 1)[0]
                for s0, s1 in zip(np.r_[k[0], k[br + 1]], np.r_[k[br], k[-1]]): cover.append((u[s0] - 0.005, u[s1] + 0.005))
    cover = sorted(c for c in cover if c[1] >= c[0]); at = a0; holes = []
    for c in cover:
        if c[0] > at + 1e-4: holes.append((at, c[0]))
        at = max(at, c[1])
    if a1 > at + 1e-4: holes.append((at, a1))
    # holes closer than 2 cm apart are one hole (a lattice's strands)
    merged = []
    for h in holes:
        if merged and h[0] - merged[-1][1] < 0.02: merged[-1] = (merged[-1][0], h[1])
        else: merged.append(h)
    mid = (c0 + c1) / 2
    for h0, h1 in merged:
        if h1 - h0 < BARRIER_GAP_MIN: continue
        u = (h0 + h1) / 2
        P = [u, FLOOR_Y + 1.0, mid] if along == 0 else [mid, FLOOR_Y + 1.0, u]
        gaps.append({'kind': kind, 'side': s.get('perimeterSide') or ('medical bay' if s.get('infirmaryFence') else ('firing line' if s.get('firingFence') else 'room wall')),
                     'width': h1 - h0, 'from': [float(v) for v in ([h0, mid] if along == 0 else [mid, h0])], 'to': [float(v) for v in ([h1, mid] if along == 0 else [mid, h1])], 'at': [float(v) for v in P],
                     'run': [s['minX'], s['minZ'], s['maxX'], s['maxZ']], 'run_len': a1 - a0, 'end': bool(abs(h0 - a0) < 1e-3 or abs(h1 - a1) < 1e-3),
                     'meant': meant_opening(along, mid, h0, h1), 'band': [round(y0 - FLOOR_Y, 2), round(y1 - FLOOR_Y, 2)]})
print(f'3 barrier gaps {len(gaps)} on {len(barriers)} runs', flush=True)

# ---------------------------------------------------------------- 4 lights inside geometry
lights_out = []
for L in S['lights']:
    p = np.array(L['pos']); hits = []
    lsite = site_of(L['src'], L['names'])['key'] if L['src'] else None
    for i in np.nonzero(np.all(mn - 0.01 <= p, axis=1) & np.all(mx + 0.01 >= p, axis=1) & active)[0]:
        M = tm(i)
        inside = bool(M.metadata['closed'] and M.contains([p])[0])
        _, d, _ = trimesh.proximity.closest_point(M, [p])
        if inside or d[0] < 0.01:
            hits.append({'mesh': int(i), 'pid': MS[i]['pid'], 'inside': inside, 'dist': float(d[0]), 'glow': MS[i]['glow'], 'same_site': MS[i]['site']['key'] == lsite})
    lights_out.append({'light': L, 'hits': hits})
print('4 lights checked', len(lights_out), flush=True)

# ---------------------------------------------------------------- 5 scale: named things against real sizes and the player
# Each check names the thing by its builder's comment block (section) or mesh names, so it measures the whole thing.
CHECKS = [
    ('training dummy', lambda m: 'training-melee-dummy' in m['path'], (1.5, 2.0), 'about a man: 1.5-2.0 m tall'),
    ('wheeled stretcher (the bed he wakes on)', lambda m: re.search(r'stretcher', SITES[m['site']['key']]['section'], re.I), (0.55, 1.0), 'a hospital stretcher: 0.55-1.0 m tall, 1.9-2.1 m long'),
    ('lockers', lambda m: re.search(r'Three lockers', SITES[m['site']['key']]['section']), (1.7, 2.0), 'a locker: 1.7-2.0 m tall'),
    ('medical cabinet and worktop', lambda m: re.search(r'medical cabinet', SITES[m['site']['key']]['section'], re.I), (0.85, 2.0), 'a worktop 0.85-0.95 m, a cabinet up to 2.0 m'),
    ('IV stand', lambda m: re.search(r'IV stand', SITES[m['site']['key']]['section']), (1.6, 2.2), 'an IV stand: 1.6-2.2 m'),
    ('oxygen bottle', lambda m: re.search(r'oxygen', SITES[m['site']['key']]['section'], re.I), (0.6, 1.6), 'an oxygen cylinder: 0.6-1.6 m'),
    ('security shutter (range doorway)', lambda m: 'training-security-shutter' in m['path'], (2.0, 3.2), 'a doorway shutter: covers a 2.0-3.0 m opening'),
    ('range console', lambda m: 'training-range-console' in m['path'], (1.0, 1.9), 'a standing console: 1.0-1.9 m'),
    ('range drill monitor', lambda m: 'range-drill-monitor' in m['path'], None, 'a hung screen (size only)'),
    ('HQ CIF terminal (copy)', lambda m: m['site']['key'] == 'copy:training-cif', (1.4, 2.4), 'a counter/terminal: 1.4-2.4 m'),
    ('HQ supply kiosk (copy)', lambda m: m['site']['key'] == 'copy:training-kiosk', (1.4, 2.4), 'a kiosk: 1.4-2.4 m'),
    ('HQ Armory (copy)', lambda m: m['site']['key'] == 'copy:training-armory', (1.8, 3.2), 'a rack wall: 1.8-3.2 m'),
    ('HQ alarm panel (copy)', lambda m: m['site']['key'] == 'copy:training-hqPanel', (1.2, 2.4), 'a wall panel: 1.2-2.4 m'),
    ('HQ skull window (copy)', lambda m: m['site']['key'] == 'copy:training-skullWindow', (1.5, 2.8), 'a hatch: 1.5-2.8 m'),
    ('zombie gate (opening)', lambda m: re.search(r'training-gate-(frame|leaf)', m['path']), (3.0, 8.0), 'a vehicle-size gate: 3-8 m'),
]
scale = []
for name, pick, rng_, what in CHECKS:
    idx = [m['i'] for m in MS if active[m['i']] and not m['big'] and pick(m)]
    if not idx: continue
    comps = components(idx, 0.05); comp = max(comps, key=len)
    cmin, cmax = mn[comp].min(axis=0), mx[comp].max(axis=0); size = cmax - cmin
    h = float(cmax[1] - max(cmin[1], FLOOR_Y))
    ok = True if rng_ is None else (rng_[0] * 0.8 <= h <= rng_[1] * 1.25)
    scale.append({'name': name, 'meshes': comp, 'min': cmin, 'max': cmax, 'what': what, 'lo': rng_[0] if rng_ else None, 'hi': rng_[1] if rng_ else None,
                  'height': h, 'size': list(size), 'ratio': h / PLAYER_H, 'ok': ok, 'copies': len(comps), 'off_floor': float(cmin[1] - FLOOR_Y),
                  'source': psrc(PROPS[MS[comp[0]]['pid']])})

# ---------------------------------------------------------------- findings, grouped
LAMP = re.compile(r'lamp|light|bulb|fixture|lens|beacon|glow|strip', re.I)
raw = []
for (pa, pb), v in pairs.items():
    A, B = PROPS[pa], PROPS[pb]
    lampy = bool(A['glow'] or B['glow'] or LAMP.search(' '.join([A['name'], B['name'], SITES[A['site']]['note'], SITES[B['site']]['note']])))
    score = 100 * min(v['depth'], 0.3) + 40 * min(v['extent'], 0.5) + (25 if lampy else 0) + (10 if A['asm'] != B['asm'] else 0)
    I, Ou = MS[v['inner']], MS[v['outer']]
    flat_in = (I['bmax'] - I['bmin']).min() < 0.002 and not tm(v['inner']).metadata['closed']
    if flat_in and not I['glow']:
        kind = 'a room wall/floor plane runs inside a solid piece (hidden, likely harmless)' if PROPS[I['pid']]['shell'] else 'a flat decal/sign/panel runs into a solid piece'
        score *= 0.3 if PROPS[I['pid']]['shell'] else 0.5
    elif flat_in: kind = 'a flat LIGHT (lamp strip/lens) runs into a solid piece'
    elif not tm(v['inner']).metadata['closed'] and not I['glow']:
        kind = 'an open/wire part runs through a solid piece'; score *= 0.5
    else: kind = 'one solid piece cuts into another'
    sec_i = srcline(*parse(next((f for f in I['src'] if parse(f)[0] not in PRIM), I['src'][0]))[1:])[2] if I['src'] else ''
    sec_o = srcline(*parse(next((f for f in Ou['src'] if parse(f)[0] not in PRIM), Ou['src'][0]))[1:])[2] if Ou['src'] else ''
    if sec_i and sec_i == sec_o and I['site']['file'] == Ou['site']['file'] and not lampy:
        kind += ' (both are parts of one model by its own comment: likely its inner panels)'; score *= 0.3
    k = tuple(sorted((A['site'], B['site'])))
    raw.append(('intersection', k, score, {'depth_m': round(v['depth'], 4), 'inside_size_m': round(v['extent'], 3), 'lamp': lampy, 'same_builder': A['asm'] == B['asm'],
                                         'kind': kind, 'inside_part': prop_info(I['pid'])['thing'][:120], 'into': prop_info(Ou['pid'])['thing'][:120],
                                         'inside_mesh': mesh_info(v['inner']), 'into_mesh': mesh_info(v['outer']), '_meshes': (v['inner'], v['outer']),
                                         'at': local(v['at']), '_pids': (pa, pb), '_at': list(v['at'])}))
for f in floating:
    o = OBJS[f['oid']]; pid = obj_props(o)[0]
    k = (PROPS[pid]['site'],)
    raw.append(('floating', k, 60 * min(f['gap'], 0.5) + 8, {'gap_m': round(f['gap'], 4), 'above_floor_m': None if f['above_floor'] is None else round(f['above_floor'], 3),
                'nearest': prop_info(f['nearest']) if f['nearest'] is not None else None, 'at': local(f['at']), '_oid': f['oid'], '_pids': (pid,) + ((f['nearest'],) if f['nearest'] is not None else ()), '_at': list(f['at'])}))
for f in sunk:
    o = OBJS[f['oid']]; pid = obj_props(o)[0]
    raw.append(('sunk', (PROPS[pid]['site'],), 80 * min(f['depth'], 0.5) + 6, {'depth_m': round(f['depth'], 4), 'at': local(f['at']), '_oid': f['oid'], '_pids': (pid,), '_at': list(f['at'])}))
for g in gaps:
    sc = 1 if g['meant'] else 60 * min(g['width'], 1.0) + (15 if g['kind'] == 'fence' else 8)
    k = (g['kind'], g['side'], round(g['width'], 2), g['meant'])
    raw.append(('barrier-gap', k, sc, {'kind': g['kind'], 'side': g['side'], 'width_m': round(g['width'], 3), 'meant_opening': g['meant'],
                'from_xz': [round(g['from'][0] - O['x'], 2), round(g['from'][1] - O['z'], 2)], 'to_xz': [round(g['to'][0] - O['x'], 2), round(g['to'][1] - O['z'], 2)],
                'at_run_end': g['end'], 'checked_height_m': g['band'], 'run_xz': [round(g['run'][0] - O['x'], 2), round(g['run'][1] - O['z'], 2), round(g['run'][2] - O['x'], 2), round(g['run'][3] - O['z'], 2)],
                'at': local(g['at']), '_pids': (), '_at': g['at'], '_gap': g}))
parked = [lo_['light'] for lo_ in lights_out if lo_['light']['intensity'] == 0 and np.allclose(lo_['light']['pos'], OV)]
for lo_ in lights_out:
    L = lo_['light']
    if L in parked: continue
    for h in lo_['hits']:
        blocked = h['inside'] and not h['glow'] and not h['same_site']
        sc = (45 if blocked else (14 if h['inside'] else 7)) + (0 if L['intensity'] else -5)
        raw.append(('light-in-geometry', (L['path'], PROPS[h['pid']]['site']), sc, {'light': {'path': L['path'], 'kind': L['type'], 'intensity': L['intensity'], 'distance': L['distance'], 'at': local(L['pos'])},
                    'inside_closed_mesh': h['inside'], 'dist_to_surface_m': round(h['dist'], 4), 'mesh_glows': h['glow'], 'own_fixture': h['same_site'], 'at': local(L['pos']), '_pids': (h['pid'],), '_at': L['pos'], '_star': L['pos']}))
if parked:
    raw.append(('light-parked', ('parked',), 2, {'lights': [L['path'] for L in parked], 'note': f'{len(parked)} danger-lighting lights sit at the room origin on the floor with intensity 0 (unused until an alarm?). Not visible now; check they move to their fixtures when lit.',
                'at': local(OV), '_pids': (), '_at': list(OV)}))
for s in scale:
    if s['ok']: continue
    off_ = math.log(s['lo'] / s['height']) if s['height'] < s['lo'] else math.log(s['height'] / s['hi'])
    pid = MS[s['meshes'][0]]['pid']
    raw.append(('scale', (s['name'],), 10 + 40 * off_, {'thing_name': s['name'], 'expect': s['what'], 'height_m': round(s['height'], 3), 'vs_player': round(s['ratio'], 2),
                'size_m': [round(float(v), 3) for v in s['size']], 'at': local((s['min'] + s['max']) / 2), '_scale': s, '_pids': (pid,), '_at': list((s['min'] + s['max']) / 2)}))
groups = collections.OrderedDict()
for typ, k, sc, d in raw:
    groups.setdefault((typ,) + tuple(k), []).append((sc, d))
findings = []
for key, items in groups.items():
    items.sort(key=lambda x: -x[0])
    sc, d = items[0]
    f = {'type': key[0], 'score': round(sc + 3 * math.log(len(items)), 1), 'count': len(items)}
    f.update(d)
    if 'a' not in f:
        if '_oid' in d: f['a'] = obj_info(OBJS[d['_oid']])
        elif d['_pids']: f['a'] = prop_info(d['_pids'][0])
    if key[0] == 'intersection': f['b'] = prop_info(d['_pids'][1])
    f['places'] = [x['at'] for _, x in items][:24]
    findings.append(f)
findings.sort(key=lambda f: -f['score'])

# ---------------------------------------------------------------- pictures
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d.art3d import Poly3DCollection
LIGHT = np.array([0.35, 0.85, 0.4]); LIGHT /= np.linalg.norm(LIGHT)
def crop(name, center, half, red=(), blue=(), star=None, title='', views=((24, -58), (10, 32)), red_m=(), blue_m=()):
    c = np.array(center, dtype=float); h = float(min(max(half, 0.3), 3.0)); lo, hi = c - h, c + h
    groups_ = {'r': [], 'b': [], 'g': []}
    for i in np.nonzero(np.all(mn <= hi, axis=1) & np.all(mx >= lo, axis=1))[0]:
        if MS[i]['huge'] or MS[i]['line']: continue
        T = tris(i); k = np.all(T.max(axis=1) >= lo, axis=1) & np.all(T.min(axis=1) <= hi, axis=1); T = T[k]
        if not len(T): continue
        T = np.clip(T, lo, hi)
        if red_m or blue_m: g = 'r' if i in red_m else ('b' if i in blue_m else 'g')
        else: g = 'r' if MS[i]['pid'] in red else ('b' if MS[i]['pid'] in blue else 'g')
        groups_[g].append(T)
    fig = plt.figure(figsize=(10, 5), dpi=120)
    base = {'g': np.array([0.74, 0.74, 0.72]), 'r': np.array([0.93, 0.2, 0.15]), 'b': np.array([0.18, 0.42, 0.95])}
    for k, (el, az) in enumerate(views):
        ax = fig.add_subplot(1, 2, k + 1, projection='3d')
        for g in ('g', 'b', 'r'):
            if not groups_[g]: continue
            T = np.vstack(groups_[g]) - c
            if len(T) > 30000: T = T[rng.choice(len(T), 30000, replace=False)]
            n = np.cross(T[:, 1] - T[:, 0], T[:, 2] - T[:, 0]); nn = np.linalg.norm(n, axis=1, keepdims=True); nn[nn == 0] = 1; n /= nn
            sh = 0.42 + 0.58 * np.abs(n @ LIGHT)
            col = np.clip(base[g][None, :] * sh[:, None], 0, 1)
            pc = Poly3DCollection(T[:, :, [0, 2, 1]], facecolors=np.c_[col, np.full(len(col), 0.28 if g == 'g' else 0.92)], edgecolors=(0, 0, 0, 0.06 if g == 'g' else 0.3), linewidths=0.25)
            ax.add_collection3d(pc)
        if star is not None:
            s_ = np.array(star) - c; ax.scatter([s_[0]], [s_[2]], [s_[1]], s=220, c='gold', marker='*', edgecolors='k', depthshade=False, zorder=10)
        ax.set_xlim(-h, h); ax.set_ylim(-h, h); ax.set_zlim(-h, h); ax.set_box_aspect((1, 1, 1)); ax.view_init(elev=el, azim=az)
        ax.set_xlabel('x (m)', fontsize=7); ax.set_ylabel('z (m)', fontsize=7); ax.set_zlabel('up (m)', fontsize=7); ax.tick_params(labelsize=6)
    fig.suptitle(title, fontsize=10)
    fig.text(0.01, 0.012, 'RED and BLUE = the two things. Grey = what is around them (see-through). Gold star = the light. Two views of the same spot.', fontsize=7.5)
    fig.tight_layout(rect=(0, 0.03, 1, 0.95))
    path = os.path.join(CROPS, name + '.png'); fig.savefig(path); plt.close(fig)
    return os.path.relpath(path, OUT).replace(os.sep, '/')
def gap_picture(name, g, title):
    """Barrier gap: a plan (top) and a face-on view of the run around the hole."""
    s0 = np.array([g['run'][0], g['run'][1]]); s1 = np.array([g['run'][2], g['run'][3]])
    c = np.array(g['at']); w = max(g['width'], 0.3); half = min(max(1.2, w * 1.6), 4)
    lo = c - np.array([half, 1.2, half]); hi = c + np.array([half, 1.6, half]); lo[1] = FLOOR_Y - 0.05; hi[1] = FLOOR_Y + 3.0
    fig, axs = plt.subplots(1, 2, figsize=(10, 4.6), dpi=120)
    along = 0 if abs(s1[0] - s0[0]) >= abs(s1[1] - s0[1]) else 2
    for i in np.nonzero(np.all(mn <= hi, axis=1) & np.all(mx >= lo, axis=1))[0]:
        if MS[i]['huge'] or MS[i]['line'] or re.search('floor', MS[i]['path']): continue
        T = tris(i); k = np.all(T.max(axis=1) >= lo, axis=1) & np.all(T.min(axis=1) <= hi, axis=1)
        acr = 2 - along
        for t in T[k][:4000]:
            near_run = t[:, acr].max() >= c[acr] - 0.15 and t[:, acr].min() <= c[acr] + 0.15
            if not near_run:
                axs[0].fill(t[:, 0] - c[0], t[:, 2] - c[2], color=(0.3, 0.3, 0.3, 0.25), lw=0.3, ec=(0, 0, 0, 0.3)); continue
            axs[0].fill(t[:, 0] - c[0], t[:, 2] - c[2], color=(0.3, 0.3, 0.3, 0.25), lw=0.3, ec=(0, 0, 0, 0.3))
            axs[1].fill(t[:, along] - c[along], t[:, 1] - FLOOR_Y, color=(0.3, 0.3, 0.3, 0.18), lw=0.2, ec=(0, 0, 0, 0.2))
    a = g['from']; b = g['to']
    axs[0].plot([s0[0] - c[0], s1[0] - c[0]], [s0[1] - c[2], s1[1] - c[2]], color='tab:blue', lw=1, ls='--', label='the run (collision line)')
    axs[0].plot([a[0] - c[0], b[0] - c[0]], [a[1] - c[2], b[1] - c[2]], color='red', lw=5, alpha=0.8, label=f'gap {g["width"]:.2f} m')
    u0 = (a[0] if along == 0 else a[1]) - c[along]; u1 = (b[0] if along == 0 else b[1]) - c[along]
    axs[1].axvspan(min(u0, u1), max(u0, u1), color='red', alpha=0.25, label='gap')
    axs[0].set_xlim(-half, half); axs[0].set_ylim(-half, half); axs[0].set_aspect('equal'); axs[0].set_title('from above (x across, z down the page)', fontsize=8)
    axs[1].set_xlim(-half, half); axs[1].set_ylim(-0.05, 3.0); axs[1].set_aspect('equal'); axs[1].set_title('face on (along the run, up; only what is within 15 cm of the run line)', fontsize=8)
    axs[0].legend(fontsize=7, loc='upper right'); axs[1].legend(fontsize=7, loc='upper right')
    for ax in axs: ax.tick_params(labelsize=7); ax.grid(alpha=0.2)
    fig.suptitle(title, fontsize=10); fig.tight_layout(rect=(0, 0, 1, 0.93))
    path = os.path.join(CROPS, name + '.png'); fig.savefig(path); plt.close(fig)
    return os.path.relpath(path, OUT).replace(os.sep, '/')
def short(f):
    if f['type'] == 'intersection': return f"{mesh_title(f['_meshes'][0])} (red) into {mesh_title(f['_meshes'][1])} (blue)"
    if f['type'] == 'barrier-gap': return f"{f['kind']} gap {f['width_m']:.2f} m ({f['side']})"
    if f['type'] == 'light-parked': return 'parked lights'
    if f['type'] == 'scale': return f['thing_name']
    return f.get('a', {}).get('thing', '')[:90]
nc = 0
for n, f in enumerate(findings):
    f['rank'] = n + 1
    if nc >= MAX_CROPS or f['type'] == 'light-parked' or (f['type'] == 'barrier-gap' and f['meant_opening']): continue
    title = f"#{n + 1} {f['type']}" + (f" x{f['count']}" if f['count'] > 1 else '') + ': ' + short(f)
    if f['type'] == 'barrier-gap': f['picture'] = gap_picture(f'{n + 1:02d}-{f["type"]}', f['_gap'], title[:150])
    else:
        pids = f['_pids']
        if f['type'] == 'scale':
            sc_ = f['_scale']; red = tuple({MS[i]['pid'] for i in sc_['meshes']}); half = float(max(sc_['max'] - sc_['min'])) * 0.65 + 0.1
            f['picture'] = crop(f'{n + 1:02d}-{f["type"]}', (sc_['min'] + sc_['max']) / 2, half, red=red, title=title[:150]); nc += 1; continue
        if f['type'] == 'floating':
            o = OBJS[f['_oid']]; red = tuple(obj_props(o)); half = min(float(max(o['max'] - o['min'])) * 0.65 + 0.1, 1.2)
            centre = f['_at']
            f['picture'] = crop(f'{n + 1:02d}-{f["type"]}', centre, half, red=red, blue=pids[1:2], title=title[:150])
        else:
            half = 0.35 + min(f.get('inside_size_m', 0) or 0, 1.5) * 0.5
            mm = f.get('_meshes', ())
            f['picture'] = crop(f'{n + 1:02d}-{f["type"]}', f['_at'], half, red=pids[:1], blue=pids[1:2], star=f.get('_star'), title=title[:150],
                                red_m=mm[:1], blue_m=mm[1:2])
    nc += 1
# the map: every finding's number on the room's plan
fig, ax = plt.subplots(figsize=(13, 9), dpi=110)
for s in solids:
    if s.get('wall') or s.get('column') or s.get('perimeterFence') or s.get('firingFence') or s.get('infirmaryFence'):
        col = 'k' if s.get('wall') else ('tab:green' if s.get('perimeterFence') or s.get('infirmaryFence') else 'tab:gray')
        ax.add_patch(plt.Rectangle((s['minX'] - O['x'], s['minZ'] - O['z']), s['maxX'] - s['minX'], s['maxZ'] - s['minZ'], fc=col, alpha=0.45, ec=col))
for p in PROPS:
    if p['shell'] or p['line']: continue
    ax.add_patch(plt.Rectangle((p['min'][0] - O['x'], p['min'][2] - O['z']), p['max'][0] - p['min'][0], p['max'][2] - p['min'][2], fc=(0.5, 0.5, 0.6, 0.12), ec=(0.3, 0.3, 0.4, 0.3), lw=0.4))
TC = {'intersection': 'red', 'floating': 'darkorange', 'sunk': 'brown', 'barrier-gap': 'magenta', 'light-in-geometry': 'gold', 'scale': 'tab:blue'}
for f in findings[:60]:
    if f['type'] not in TC or f.get('meant_opening'): continue
    for k, pl in enumerate(f['places'][:12]):
        ax.plot(pl[0], pl[2], 'o', ms=9 if k == 0 else 5, color=TC[f['type']], mec='k', mew=0.5, alpha=0.9)
        if k == 0: ax.annotate(str(f['rank']), (pl[0], pl[2]), fontsize=7, xytext=(3, 3), textcoords='offset points', weight='bold')
for t, c_ in TC.items(): ax.plot([], [], 'o', color=c_, label=t)
ax.legend(fontsize=8, loc='upper right'); ax.set_aspect('equal'); ax.grid(alpha=0.2)
ax.set_xlabel('x (m) from the room origin: range on the right (x -8..8), build room on the left (x -44..-8)'); ax.set_ylabel('z (m): downrange / north is up')
ax.set_title('CF-19 Training Ground placement audit: where each finding is (number = rank in REPORT.md; small dots = the same defect repeated)', fontsize=10)
fig.tight_layout(); fig.savefig(os.path.join(CROPS, '00-map.png')); plt.close(fig)

clean = [{k: v for k, v in f.items() if not k.startswith('_')} for f in findings]
counts = collections.Counter(f['type'] for f in findings)
out = {'card': 'CF-19', 'dumped': S.get('time'), 'tool': 'tools/placement-audit (run.mjs + dump.js + no-bake.js + audit.py)', 'baked': S.get('baked'),
       'scene': {'meshes': len(MS), 'props': len(PROPS), 'objects': len(OBJS), 'lights': len(S['lights']), 'triangles': int(len(TR)), 'floor_y_world': FLOOR_Y, 'origin_world': O},
       'coords': 'metres from the Training Ground origin (world = origin + these). x: range -8..8, build room -44..-8; y: up from the floor; z: downrange (north)',
       'thresholds': {'intersection_depth_m': DEPTH_MIN, 'intersection_soft': [DEPTH_SOFT, EXTENT_SOFT], 'float_sink_m': GAP_MIN, 'barrier_gap_m': BARRIER_GAP_MIN, 'player_h_m': PLAYER_H},
       'counts': dict(counts), 'findings': clean,
       'scale_table': [{'thing': s['name'], 'source': s['source'], 'expect': s['what'], 'height_m': round(s['height'], 3), 'size_m': [round(float(v), 2) for v in s['size']],
                        'vs_player': round(s['ratio'], 2), 'off_floor_m': round(s['off_floor'], 3), 'copies': s['copies'], 'ok': s['ok']} for s in scale]}
json.dump(out, open(os.path.join(OUT, 'placement-audit.json'), 'w'), indent=1, default=lambda o: o.tolist() if hasattr(o, 'tolist') else str(o))
print('counts', dict(counts), 'pictures', nc)

# ---------------------------------------------------------------- REPORT.md (short, plain)
def where(f):
    a = f.get('at') or [0, 0, 0]
    return f"x {a[0]:+.2f}, up {a[1]:.2f}, z {a[2]:+.2f}"
def one_line(f):
    t = f['type']
    if t == 'intersection':
        im, om = f['inside_mesh'], f['into_mesh']
        lead = 'A LIGHT goes into a solid part' if 'LIGHT' in f['kind'] else ('Wall plane hidden inside a part (low)' if 'hidden' in f['kind'] else ('Flat decal/panel into a part' if 'decal' in f['kind'] else ('Wire/open part through a solid part' if 'wire' in f['kind'] else 'Two solid parts cut into each other')))
        return (f"{lead}: {f['depth_m'] * 100:.1f} cm deep, {f['inside_size_m'] * 100:.0f} cm long inside. "
                f"RED {im['name'] or im['comment'] or im['code'][:50]} ({im['made_at']}) into BLUE {om['name'] or om['comment'] or om['code'][:50]} ({om['made_at']}).")
    if t == 'barrier-gap':
        return (f"{f['kind'].capitalize()} run ({f['side']}) has a {f['width_m']:.2f} m gap with no fence/wall in it (checked {f['checked_height_m'][0]}-{f['checked_height_m'][1]} m up)"
                + (' at the end of the run (stops short of the wall/column)' if f['at_run_end'] else '') + f". From x,z {f['from_xz']} to {f['to_xz']}.")
    if t == 'floating':
        a = f['a']
        return f"Floats: {a['thing'][:80]} touches nothing; nearest surface {f['gap_m'] * 100:.1f} cm away ({a['source']})."
    if t == 'sunk':
        return f"Sunk: base {f['depth_m'] * 100:.1f} cm under the floor: {f['a']['thing'][:80]} ({f['a']['source']})."
    if t == 'scale':
        return f"Size: {f['thing_name']} is {f['height_m']:.2f} m tall ({f['vs_player']:.2f} x the 1.80 m player); expected {f['expect']}."
    if t == 'light-in-geometry':
        return f"Light {f['light']['path'][-40:]} is {'INSIDE' if f['inside_closed_mesh'] else 'touching'} {f['a']['thing'][:60]} ({f['a']['source']})."
    if t == 'light-parked':
        return f['note']
    return t
L = []
L.append('# CF-19 Training Ground placement audit\n')
L.append(f"Made by Claude 6 for Claude 7 (CG-1) and the Director, D-218 pass 1. Review only: nothing in the game was changed.\n")
L.append(f"Scene: the game's own Training Ground build (test page, CPU, bakers off so every part keeps its source line), dumped {S.get('time', '?')}. "
         f"{len(MS)} meshes, {len(PROPS)} things, {len(S['lights'])} lights.\n")
L.append("Places are metres from the room's origin: x (range -8..8, build room -44..-8), up from the floor, z (downrange/north +). "
         "World = origin (0, -200, -640) + these.\n")
L.append("Map of every finding: crops/00-map.png. Full list with code lines: placement-audit.json.\n")
L.append('## Ranked list (most visible first)\n')
shown = 0
for f in findings:
    if f['type'] == 'barrier-gap' and f['meant_opening']: continue
    shown += 1
    if shown > 30: break
    cnt = f" (x{f['count']}: same defect in {f['count']} places)" if f['count'] > 1 else ''
    pic = f" Picture: {f['picture']}" if f.get('picture') else ''
    own = f.get('a', {}).get('owner') or (f.get('inside_mesh') and owner(f['inside_mesh']['made_at'].split(':')[0])) or ''
    if f['type'] == 'intersection':
        own = ' / '.join(sorted({owner(f['inside_mesh']['made_at'].split(':')[0]), owner(f['into_mesh']['made_at'].split(':')[0])}))
    if f['type'] == 'barrier-gap': own = 'game/training-perimeter.js (ChatGPT)' if f['side'] in ('west', 'east', 'south') else own
    L.append(f"{shown}. **{f['type']}**{cnt} at {where(f)}. {one_line(f)} Owner: {own or '?'}.{pic}\n")
L.append('\n## Checked and clean\n')
L.append(f"- Sunk bases under the floor: {counts.get('sunk', 0)} found.\n")
L.append(f"- Lights inside closed geometry: {counts.get('light-in-geometry', 0)} found. (The lamp problem is the lamp STRIPS and lenses running into posts, listed above as intersections.)\n")
ok_rows = [r for r in out['scale_table'] if r['ok']]
L.append(f"- Sizes that look right against the 1.80 m player: " + ', '.join(f"{r['thing']} {r['height_m']:.2f} m" for r in ok_rows) + '.\n')
meant = [f for f in findings if f['type'] == 'barrier-gap' and f['meant_opening']]
if meant: L.append(f"- Openings that are meant (not counted): " + ', '.join(f"{f['meant_opening']} {f['width_m']:.1f} m" for f in meant) + '.\n')
L.append('\n## Limits\n')
L.append("- CPU build with the test three.js: shapes and places are the game's own, but the pictures are simple 3D plots, not game renders. Ask ChatGPT/Antigravity for native shots at the listed places.\n")
L.append("- Moving parts are checked where they stand when the room opens (gate shut, shutter as built, targets up, lights on).\n")
L.append("- 'Intersection' needs a closed mesh to measure depth; two open planes crossing each other are not measured.\n")
L.append("- A part inside its own model is not a finding unless it is a separate builder line in the room builders (training.js, training-props.js, training-wear.js ...).\n")
L.append('\n## Re-run (after fixes)\n')
L.append("`node crew/crew.mjs slot run <you> <task> --checks placement-audit -- node tools/placement-audit/run.mjs review/CF-19/run` then "
         "`python3 -E tools/placement-audit/audit.py review/CF-19/run review/CF-19` (needs numpy scipy trimesh rtree matplotlib). See tools/placement-audit/README.md.\n")
open(os.path.join(OUT, 'REPORT.md'), 'w').write('\n'.join(L))
print('REPORT.md written,', shown, 'lines')
