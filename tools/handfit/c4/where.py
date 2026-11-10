# which parts a hand is inside, in the hand's canonical space (x across, y to the elbow, z out of the palm)
import sys, json, base64, numpy as np, trimesh
D = json.load(open(sys.argv[1])); sd = sys.argv[2]
H = D['hands'][sd]; MW = np.array(H['mw']).reshape(4, 4).T; Mi = np.linalg.inv(MW); s, ox, gz = H['side'], H['ox'], H['gz']
can = lambda P: (lambda P4: np.c_[s * (P4[:, 0] - ox), P4[:, 1], P4[:, 2] - gz])(np.c_[P, np.ones(len(P))] @ Mi.T)
W = can(np.frombuffer(base64.b64decode(H['wor']), dtype=np.float32).reshape(-1, 3).astype(float))
print('hand box mm', (W.min(0) * 1000).round(1), (W.max(0) * 1000).round(1))
for i, p in enumerate(D['parts']):
    T = can(np.frombuffer(base64.b64decode(p['b64']), dtype=np.float32).reshape(-1, 3).astype(float))
    m = trimesh.Trimesh(T, np.arange(len(T)).reshape(-1, 3), process=True)
    if not m.is_watertight: continue
    lo, hi = m.bounds; sel = np.all((W >= lo) & (W <= hi), 1)
    if not sel.any(): continue
    ins = m.contains(W[sel])
    if ins.any():
        _, d, _ = trimesh.proximity.closest_point(m, W[sel][ins])
        print(i, p['name'], p['tris'], 'inside', ins.sum(), 'deep', round(d.max() * 1000, 1), 'part box', (lo * 1000).round(1), (hi * 1000).round(1), 'centroid in', (W[sel][ins].mean(0) * 1000).round(1))
