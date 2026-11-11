# CD-1 fixes (11 Nov, cloud): folds.py
# folds.py <export> : per hand, faces flipped against their neighbours (a fold: drawn as a hole with backface culling)
import sys, json, base64, numpy as np
D = json.load(open(sys.argv[1]))
for sd, H in D['hands'].items():
    if not H.get('idx'): print(sd, 'no idx'); continue
    W = np.frombuffer(base64.b64decode(H['loc']), dtype=np.float32).reshape(-1, 3).astype(np.float64)
    I = np.frombuffer(base64.b64decode(H['idx']), dtype=np.uint32).reshape(-1, 3)
    a, b, c = W[I[:, 0]], W[I[:, 1]], W[I[:, 2]]
    N = np.cross(b - a, c - a); area = np.linalg.norm(N, axis=1); Nn = N / np.maximum(area, 1e-20)[:, None]
    # vertex normals (area weighted) and each face against the mean of its vertices' normals
    VN = np.zeros_like(W)
    for k in range(3): np.add.at(VN, I[:, k], N)
    VN /= np.maximum(np.linalg.norm(VN, axis=1), 1e-20)[:, None]
    fv = (VN[I[:, 0]] + VN[I[:, 1]] + VN[I[:, 2]]); fv /= np.maximum(np.linalg.norm(fv, axis=1), 1e-20)[:, None]
    d = np.einsum('ij,ij->i', Nn, fv)
    bad = np.where(d < 0)[0]
    # edges used by one face only (holes)
    from collections import Counter
    E = Counter()
    for t in I:
        for u, v in ((t[0], t[1]), (t[1], t[2]), (t[2], t[0])): E[(min(u, v), max(u, v))] += 1
    bnd = [e for e, n in E.items() if n == 1]
    print(sd, H['which'], 'verts', len(W), 'faces', len(I), 'flipped', len(bad), 'tiny(<1e-10)', int((area < 1e-10).sum()), 'boundary edges', len(bnd))
    if len(bad):
        cen = (a + b + c)[bad] / 3
        print('  flipped centroid range (local)', cen.min(0).round(4), cen.max(0).round(4), 'worst dot', d[bad].min().round(2))
        np.save(f'/home/claude/fpshot/bad-{sd}.npy', bad)
