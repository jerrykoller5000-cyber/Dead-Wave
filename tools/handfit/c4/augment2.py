# CD-1 pass 2: augment.py made closed. The other hand's glove, welded, has one edge with four faces (two surfaces touching):
# it is split (the pairing that keeps every body whole), the copies moved 30 um apart so a 10 um weld (clip-check.js,
# sdf_c4.py) keeps them apart; then each body capped at its openings and added to the gun as its own closed part.
import sys, json, base64, numpy as np, trimesh
from collections import defaultdict
src, other, out = sys.argv[1:4]
D = json.load(open(src)); h = D['hands'][other]
W = np.frombuffer(base64.b64decode(h['wor']), dtype=np.float32).reshape(-1, 3).astype(float)
I = np.frombuffer(base64.b64decode(h['idx']), dtype=np.uint32).reshape(-1, 3)
# weld to 50 um (the glove has an edge 15 um long with four faces on it), then drop the faces that collapsed
from scipy.spatial import cKDTree
par = list(range(len(W)))
def fd(x):
    while par[x] != x: par[x] = par[par[x]]; x = par[x]
    return x
for a, b in cKDTree(W).query_pairs(5e-5): par[fd(a)] = fd(b)
roots = np.array([fd(i) for i in range(len(W))]); _, inv = np.unique(roots, return_inverse=True)
Wu = np.zeros((inv.max() + 1, 3)); Wu[inv] = W; I2 = inv[I]
I2 = I2[(I2[:, 0] != I2[:, 1]) & (I2[:, 1] != I2[:, 2]) & (I2[:, 0] != I2[:, 2])]
srt = np.sort(I2, 1); _, ui, cnt = np.unique(srt, axis=0, return_index=True, return_counts=True); I2 = I2[np.sort(ui[cnt == 1])]
m0 = trimesh.Trimesh(Wu, I2, process=False)
def splitfix(m, choice):
    F = m.faces.copy(); V = m.vertices.copy(); ef = defaultdict(list)
    for fi, f in enumerate(F):
        for u, v in ((f[0], f[1]), (f[1], f[2]), (f[2], f[0])): ef[(min(u, v), max(u, v))].append((fi, u, v))
    for (a, b), L in ef.items():
        if len(L) != 4: continue
        fw = [x for x in L if x[1] == a]; bw = [x for x in L if x[1] == b]
        if len(fw) != 2 or len(bw) != 2: print('odd edge', a, b); continue
        f1, f2 = fw[1][0], bw[1 - choice][0]
        n = np.cross(V[F[f1][1]] - V[F[f1][0]], V[F[f1][2]] - V[F[f1][0]]) + np.cross(V[F[f2][1]] - V[F[f2][0]], V[F[f2][2]] - V[F[f2][0]])
        n = n / (np.linalg.norm(n) + 1e-12)
        na, nb = len(V), len(V) + 1; V = np.vstack([V, V[a] - n * 3e-5, V[b] - n * 3e-5])
        for fi in (f1, f2): F[fi] = [na if x == a else nb if x == b else x for x in F[fi]]
    return trimesh.Trimesh(V, F, process=False)
def cap(m):
    E = m.edges[trimesh.grouping.group_rows(m.edges_sorted, require_count=1)]
    nxt = {int(a): int(b) for a, b in E}; faces = [f for f in m.faces]; V = list(m.vertices); seen = set()
    for s in list(nxt):
        if s in seen: continue
        loop = [s]; seen.add(s)
        while nxt.get(loop[-1]) is not None and nxt[loop[-1]] not in seen: loop.append(nxt[loop[-1]]); seen.add(loop[-1])
        c = len(V); V.append(np.mean([m.vertices[i] for i in loop], 0))
        for i in range(len(loop)): faces.append([loop[(i + 1) % len(loop)], loop[i], c])
    return trimesh.Trimesh(np.array(V), np.array(faces), process=False)
best = None
for choice in (0, 1):
    m = splitfix(m0, choice); B = m.split(only_watertight=False)
    if best is None or min(len(b.faces) for b in B) > min(len(b.faces) for b in best): best = B
k = 0
for b in best:
    c = cap(b); print('body', len(b.faces), 'capped watertight', c.is_watertight, 'volume', round(abs(float(c.volume)) * 1e6, 2), 'cm3')
    T = c.vertices[c.faces].reshape(-1, 3).astype(np.float32)
    D['parts'].append({'name': 'hand-' + other + '-' + str(k), 'tris': len(c.faces), 'b64': base64.b64encode(T.tobytes()).decode()}); k += 1
json.dump(D, open(out, 'w'))
