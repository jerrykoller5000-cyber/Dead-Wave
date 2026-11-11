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

import sys as _s
sd = only or 'r'; H = D['hands'][sd]
W0 = np.frombuffer(base64.b64decode(H['wor']), dtype=np.float32).reshape(-1, 3).astype(np.float64)
Gm = np.array(D['info']['gunMw']).reshape(4, 4).T; Gi = np.linalg.inv(Gm)
meshes = [trimesh.Trimesh(T.reshape(-1, 3), np.arange(len(T) * 3).reshape(-1, 3), process=False) for (_, T, _, _) in parts]
def deep(W):
    worst, vec, cnt = 0, np.zeros(3), 0
    for i, (nm, T, lo, hi) in enumerate(parts):
        sel = np.all((W >= lo - 0.001) & (W <= hi + 0.001), 1)
        if not sel.any(): continue
        X = W[sel]; ins = (hits(T, X) & 1) == 1
        if not ins.any(): continue
        cp, d, _ = trimesh.proximity.closest_point(meshes[i], X[ins]); cnt += int((d > 0.0005).sum())
        k = d.argmax()
        if d[k] > worst: worst = d[k]; vec = cp[k] - X[ins][k]
        # accumulate the mean push of the deep ones
    return worst, vec, cnt
t = np.zeros(3)
for it in range(8):
    w, v, c = deep(W0 + t)
    print('iter', it, 'worst', round(w * 1000, 2), 'cnt', c, 'shift world mm', np.round(t * 1000, 2), 'gun mm', np.round((Gi[:3, :3] @ t) * 1000, 2))
    if w <= 0.0004: break
    t = t + v * 1.15 + (v / (np.linalg.norm(v) + 1e-9)) * 0.0002
print('RESULT_GUN_DP', json.dumps(list(np.round(Gi[:3, :3] @ t, 6))))
