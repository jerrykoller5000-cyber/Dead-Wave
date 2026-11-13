# openchk.py <export> <r|l>: per bone, the nearest distance (gun mm) to the gun's OPEN bodies (the shells clip-check can't test)
import sys, json, base64, subprocess, numpy as np, trimesh
from scipy.spatial import cKDTree
f, sd = sys.argv[1], sys.argv[2]; D = json.load(open(f)); H = D['hands'][sd]
Gi = np.linalg.inv(np.array(D['info']['gunMw']).reshape(4, 4).T)
tog = lambda P: (np.c_[P, np.ones(len(P))] @ Gi.T)[:, :3] * 1000
ope = []
for p in D['parts']:
    T = np.round(tog(np.frombuffer(base64.b64decode(p['b64']), dtype=np.float32).reshape(-1, 3).astype(np.float64)) * 100) / 100
    m = trimesh.Trimesh(T, np.arange(len(T)).reshape(-1, 3), process=True)
    for b in m.split(only_watertight=False):
        if not b.is_watertight: ope.append((p.get('name'), b))
print('open bodies', [(n, len(b.faces)) for n, b in ope][:20])
W = np.frombuffer(base64.b64decode(H['wor']), dtype=np.float32).reshape(-1, 3).astype(np.float64)
MW = np.array(H['mw']).reshape(4, 4).T
L = (np.c_[W, np.ones(len(W))] @ np.linalg.inv(MW).T)[:, :3]; C = np.c_[H['side'] * (L[:, 0] - H['ox']), L[:, 1], L[:, 2] - H['gz']]
J = json.loads(subprocess.check_output(['node', '/home/claude/work/posedlabels.mjs', json.dumps(H['pose'])]))
P = np.array(J['p']).reshape(-1, 3); B = np.array(J['b']); _, ii = cKDTree(P).query(C); lab = B[ii]
Wg = tog(W); nm = ['palm'] + [f + str(j) for f in ['i', 'm', 'r', 'l', 't'] for j in (1, 2, 3)]
for n, b in ope:
    cp, d, ti = trimesh.proximity.closest_point(b, Wg)
    sg = np.sign(np.einsum('ij,ij->i', Wg - cp, b.face_normals[ti]))
    near = d < 3
    if near.any(): print(n, len(b.faces), {nm[k]: (round(float(d[(lab == k)].min()), 1), int((sg[(lab == k) & near] < 0).sum())) for k in range(16) if ((lab == k) & near).any()})
