# depth3.py: depth2.py with each part split into its connected bodies (the revolver's walnut grip shares its mesh with
# 780 open checkering quads, so the whole part read open and was never checked; CD-1 fixes, 11 Nov)
# rule-2 check exactly as tools/tests/clip-check.js: per closed part (every edge shared by two faces, 10 um rounding), a hand
# vertex is inside when the slanted ray crosses an odd number of the part's faces; how deep: distance to the nearest face
import sys, json, base64, numpy as np, trimesh
import os; SPLIT = os.environ.get('SPLIT', '1') == '1'   # CD-1 fixes: split parts into bodies (SPLIT=0: the old test)
D = json.load(open(sys.argv[1])); only = sys.argv[2] if len(sys.argv) > 2 else None
def closed(P):
    k = np.round(P * 1e5).astype(np.int64); from collections import Counter
    E = Counter()
    for t in range(0, len(k), 3):
        a, b, c = map(tuple, k[t:t + 3])
        for u, v in ((a, b), (b, c), (c, a)): E[(u, v) if u < v else (v, u)] += 1
    return all(c == 2 for c in E.values())
dr = np.array([0.8366, 0.3419, 0.4279])
def hits(T, X):   # T (m,3,3) triangles, X (n,3) points -> crossings per point
    a = T[:, 0]; e1 = T[:, 1] - a; e2 = T[:, 2] - a
    h = np.cross(dr, e2); det = np.einsum('ij,ij->i', e1, h); ok = np.abs(det) > 1e-16; f = np.where(ok, 1 / np.where(ok, det, 1), 0)
    n = np.zeros(len(X), int)
    for c in range(0, len(X), 400):
        x = X[c:c + 400][:, None, :]; s = x - a[None]; u = f * np.einsum('pij,ij->pi', s, h)
        q = np.cross(s, e1[None]); w = f * (q @ dr); t = f * np.einsum('pij,ij->pi', q, e2)
        n[c:c + 400] = (ok & (u >= 0) & (u <= 1) & (w >= 0) & (u + w <= 1) & (t > 0)).sum(1)
    return n
parts = []
def bodies(T):   # CD-1 fixes: a part's connected bodies (faces sharing an edge, 10 um), as clip-check.js now splits them
    k = np.round(T * 1e5).astype(np.int64); n = len(k) // 3; par = list(range(n)); first = {}
    def fd(x):
        while par[x] != x: par[x] = par[par[x]]; x = par[x]
        return x
    for t in range(n):
        a, b, c = map(tuple, k[t * 3:t * 3 + 3])
        for u, v in ((a, b), (b, c), (c, a)):
            e = (u, v) if u < v else (v, u)
            if e in first: par[fd(t)] = fd(first[e])
            else: first[e] = t
    g = {}
    for t in range(n): g.setdefault(fd(t), []).append(t)
    return [T.reshape(-1, 3, 3)[ix].reshape(-1, 3) for ix in g.values()]
for p in D['parts']:
    T = np.frombuffer(base64.b64decode(p['b64']), dtype=np.float32).reshape(-1, 3).astype(np.float64)
    for B in (bodies(T) if SPLIT else [T]):
        if closed(B): parts.append((p['name'], B.reshape(-1, 3, 3), B.min(0), B.max(0)))
for sd, H in D['hands'].items():
    if only and sd != only: continue
    W = np.frombuffer(base64.b64decode(H['wor']), dtype=np.float32).reshape(-1, 3).astype(np.float64)
    worst, where, cnt = 0, '', 0
    for i, (nm, T, lo, hi) in enumerate(parts):
        sel = np.all((W >= lo) & (W <= hi), 1)
        if not sel.any(): continue
        X = W[sel]; ins = (hits(T, X) & 1) == 1
        if not ins.any(): continue
        m = trimesh.Trimesh(T.reshape(-1, 3), np.arange(len(T) * 3).reshape(-1, 3), process=False)
        _, d, _ = trimesh.proximity.closest_point(m, X[ins]); cnt += int((d > 0.0005).sum())
        if d.max() > worst: worst, where = d.max(), f'{nm}#{i}'
    print(sd, round(worst * 1000, 2), 'mm', where, 'verts>0.5mm', cnt)
# the hands into each other, as clip-check.js: each glove's vertices against the other glove as drawn (open at the wrist)
if 'idx' in D['hands'].get('r', {}) and 'idx' in D['hands'].get('l', {}) and D['hands']['r'].get('idx') and D['hands']['l'].get('idx'):
    G = {}
    for sd in 'rl':
        H = D['hands'][sd]; W = np.frombuffer(base64.b64decode(H['wor']), dtype=np.float32).reshape(-1, 3).astype(np.float64)
        I = np.frombuffer(base64.b64decode(H['idx']), dtype=np.uint32).reshape(-1, 3); G[sd] = (W, W[I])
    hh = 0; per = {}
    for a, b in (('r', 'l'), ('l', 'r')):
        W, _ = G[a]; Wb, Tb = G[b]; lo, hi = Wb.min(0), Wb.max(0); sel = np.all((W >= lo) & (W <= hi), 1)
        if not sel.any(): continue
        X = W[sel]; ins = (hits(Tb, X) & 1) == 1
        if not ins.any(): per[a] = 0; continue
        m = trimesh.Trimesh(Tb.reshape(-1, 3), np.arange(len(Tb) * 3).reshape(-1, 3), process=False)
        _, d, _ = trimesh.proximity.closest_point(m, X[ins]); per[a] = round(d.max() * 1000, 1); hh = max(hh, d.max())
    print('hands into each other', round(hh * 1000, 1), 'mm', per)
