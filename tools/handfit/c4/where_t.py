# where_t.py <export> <r|l> : thumb / finger bone boxes in gun space (mm), and the gun parts' boxes
import sys, json, base64, subprocess, numpy as np
from scipy.spatial import cKDTree
f, sd = sys.argv[1], sys.argv[2]; D = json.load(open(f)); H = D['hands'][sd]
Gi = np.linalg.inv(np.array(D['info']['gunMw']).reshape(4, 4).T)
tog = lambda P: (np.c_[P, np.ones(len(P))] @ Gi.T)[:, :3] * 1000
W = np.frombuffer(base64.b64decode(H['wor']), dtype=np.float32).reshape(-1, 3).astype(np.float64)
MW = np.array(H['mw']).reshape(4, 4).T
L = (np.c_[W, np.ones(len(W))] @ np.linalg.inv(MW).T)[:, :3]; C = np.c_[H['side'] * (L[:, 0] - H['ox']), L[:, 1], L[:, 2] - H['gz']]
J = json.loads(subprocess.check_output(['node', '/home/claude/work/posedlabels.mjs', json.dumps(H['pose'])]))
P = np.array(J['p']).reshape(-1, 3); B = np.array(J['b']); _, ii = cKDTree(P).query(C); lab = B[ii]
Wg = tog(W)
nm = ['palm'] + [f + str(j) for f in ['i', 'm', 'r', 'l', 't'] for j in (1, 2, 3)]
for b in sys.argv[3:] if len(sys.argv) > 3 else range(13, 16):
    b = int(b); m = lab == b; Q = Wg[m]
    print(nm[b], 'min', Q.min(0).round(1), 'max', Q.max(0).round(1), 'mean', Q.mean(0).round(1))
if 'parts' in sys.argv[-1:] or True:
    pass
