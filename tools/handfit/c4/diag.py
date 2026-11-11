# diag.py <export> <r|l>: every closed body (depth3's split) the hand is in: part, body#, depth, and the bones inside
import sys, json, base64, numpy as np, trimesh, subprocess, os
from scipy.spatial import cKDTree
src = open('/home/claude/gs306/tools/handfit/c4/depth3.py').read(); src = src[:src.index('for sd, H in D')]
sys.argv = ['x', sys.argv[1], sys.argv[2]]; g = {}; exec(src, g)
D, parts, hits = g['D'], g['parts'], g['hits']
pix = []
for j, p in enumerate(D['parts']):
    T0 = np.frombuffer(base64.b64decode(p['b64']), dtype=np.float32).reshape(-1, 3).astype(np.float64)
    for Bd in g['bodies'](T0):
        if g['closed'](Bd): pix.append(j); sd = sys.argv[2]; H = D['hands'][sd]
W = np.frombuffer(base64.b64decode(H['wor']), dtype=np.float32).reshape(-1, 3).astype(np.float64)
MW = np.array(H['mw']).reshape(4, 4).T
L = (np.c_[W, np.ones(len(W))] @ np.linalg.inv(MW).T)[:, :3]; C = np.c_[H['side'] * (L[:, 0] - H['ox']), L[:, 1], L[:, 2] - H['gz']]
J = json.loads(subprocess.check_output(['node', '/home/claude/work/posedlabels.mjs', json.dumps(H['pose'])]))
P = np.array(J['p']).reshape(-1, 3); B = np.array(J['b']); dd, ii = cKDTree(P).query(C); lab = B[ii]
print('label match mm', round(np.median(dd) * 1000, 2), round(dd.max() * 1000, 2))
names = {0: 'palm'}; fn = ['index', 'middle', 'ring', 'little', 'thumb']
for f in range(5):
    for k in range(3): names[1 + f * 3 + k] = fn[f] + str(k + 1)
gm = np.array(D['info']['gunMw']).reshape(4, 4).T if 'gunMw' in D['info'] else None
for i, (nm, T, lo, hi) in enumerate(parts):
    sel = np.where(np.all((W >= lo) & (W <= hi), 1))[0]
    if not len(sel): continue
    ins = (hits(T, W[sel]) & 1) == 1
    if not ins.any(): continue
    m = trimesh.Trimesh(T.reshape(-1, 3), np.arange(len(T) * 3).reshape(-1, 3), process=False)
    _, d, _ = trimesh.proximity.closest_point(m, W[sel][ins])
    bl = {}
    for b, x in zip(lab[sel][ins], d): bl[names.get(int(b), str(b))] = max(bl.get(names.get(int(b), str(b)), 0), round(x * 1000, 1))
    gb = ''
    if gm is not None:
        Gi = np.linalg.inv(gm); q = (np.c_[T.reshape(-1, 3), np.ones(T.size // 3)] @ Gi.T)[:, :3]; gb = f' gun-box {np.round(q.min(0)*1000,1)} {np.round(q.max(0)*1000,1)}'
    print(f'{nm}#{i} part {pix[i]} deep {d.max()*1000:.2f} n {int(ins.sum())} bones {bl}{gb}')
