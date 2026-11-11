# hh.py <export>: the two gloves into each other, by bone (as depth3)
import sys, json, base64, numpy as np, subprocess, trimesh
from scipy.spatial import cKDTree
src = open('/home/claude/gs306/tools/handfit/c4/depth3.py').read(); src = src[:src.index('parts = []')]
sys.argv = ['x', sys.argv[1]]; g = {}; exec(src, g); D = g['D']; hits = g['hits']
nm = {0: 'palm'}; fn = ['index', 'middle', 'ring', 'little', 'thumb']
for k in range(5):
    for j in range(3): nm[1 + k * 3 + j] = fn[k] + str(j + 1)
G = {}
for sd in 'rl':
    H = D['hands'][sd]; W = np.frombuffer(base64.b64decode(H['wor']), dtype=np.float32).reshape(-1, 3).astype(float)
    I = np.frombuffer(base64.b64decode(H['idx']), dtype=np.uint32).reshape(-1, 3)
    MW = np.array(H['mw']).reshape(4, 4).T; L = (np.c_[W, np.ones(len(W))] @ np.linalg.inv(MW).T)[:, :3]; C = np.c_[H['side'] * (L[:, 0] - H['ox']), L[:, 1], L[:, 2] - H['gz']]
    J = json.loads(subprocess.check_output(['node', '/home/claude/work/posedlabels.mjs', json.dumps(H['pose'])])); P = np.array(J['p']).reshape(-1, 3); B = np.array(J['b'])
    G[sd] = (W, W[I], B[cKDTree(P).query(C)[1]])
for a, b in (('r', 'l'), ('l', 'r')):
    W, _, la = G[a]; Wb, Tb, lb = G[b]; ins = (hits(Tb, W) & 1) == 1
    if not ins.any(): print(a, 'clear'); continue
    m = trimesh.Trimesh(Tb.reshape(-1, 3), np.arange(len(Tb) * 3).reshape(-1, 3), process=False); q, d, tri = trimesh.proximity.closest_point(m, W[ins])
    # which bone of b is nearest the deepest points
    nb = lb[cKDTree(Wb).query(q)[1]]; bl = {}
    for x, y, dd in zip(la[ins], nb, d): k = nm[int(x)] + '->' + nm[int(y)]; bl[k] = max(bl.get(k, 0), round(float(dd) * 1000, 1))
    print(a, 'into', b, dict(sorted(bl.items(), key=lambda kv: -kv[1])[:8]))
