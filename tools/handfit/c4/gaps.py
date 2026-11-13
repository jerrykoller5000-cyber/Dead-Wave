# gaps.py <export> <r|l> (CD-13, Claude 1): per bone of a glove, its nearest distance to the gun (gun mm; - = inside), the palm's
# and each finger's pads: how loose the hand is on the gun
import sys, json, base64, subprocess, numpy as np, trimesh
from scipy.spatial import cKDTree
f, sd = sys.argv[1], sys.argv[2]; D = json.load(open(f)); H = D['hands'][sd]
Gi = np.linalg.inv(np.array(D['info']['gunMw']).reshape(4, 4).T)
tog = lambda P: (np.c_[P, np.ones(len(P))] @ Gi.T)[:, :3] * 1000
T = np.concatenate([np.frombuffer(base64.b64decode(p['b64']), dtype=np.float32).reshape(-1, 3).astype(np.float64) for p in D['parts']])
G = trimesh.Trimesh(tog(T), np.arange(len(T)).reshape(-1, 3), process=False)
W = np.frombuffer(base64.b64decode(H['wor']), dtype=np.float32).reshape(-1, 3).astype(np.float64)
MW = np.array(H['mw']).reshape(4, 4).T
L = (np.c_[W, np.ones(len(W))] @ np.linalg.inv(MW).T)[:, :3]; C = np.c_[H['side'] * (L[:, 0] - H['ox']), L[:, 1], L[:, 2] - H['gz']]
J = json.loads(subprocess.check_output(['node', '/home/claude/work/posedlabels.mjs', json.dumps(H['pose'])]))
P = np.array(J['p']).reshape(-1, 3); B = np.array(J['b']); _, ii = cKDTree(P).query(C); lab = B[ii]
Wg = tog(W); _, d, _ = trimesh.proximity.closest_point(G, Wg)
nm = {0: 'palm'}; fn = ['index', 'middle', 'ring', 'little', 'thumb']
for k in range(5):
    for j in range(3): nm[1 + k * 3 + j] = fn[k] + str(j + 1)
sc = np.linalg.norm(np.array(D['info']['gunMw']).reshape(4, 4).T[:3, 0])
print('gun scale', round(sc, 4), '(world mm = gun mm x scale)')
for b in range(16):
    m = lab == b
    if m.any(): print(f'{nm[b]:8s} nearest {d[m].min():6.1f} gun mm   5th pct {np.percentile(d[m], 5):6.1f}')
