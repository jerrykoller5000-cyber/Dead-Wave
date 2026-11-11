# slice.py <export> <bodies> x: an ascii map (gun space, y down the rows, z across) of which bodies are at plane x (mm), plus the hand's index/middle
import sys, json, base64, numpy as np
src = open('/home/claude/gs306/tools/handfit/c4/depth3.py').read(); src = src[:src.index('for sd, H in D')]
sys.argv = ['x', sys.argv[1], sys.argv[2], sys.argv[3]] + sys.argv[4:]; g = {}; exec(src, g)
D, parts, hits = g['D'], g['parts'], g['hits']; want = [int(x) for x in sys.argv[2].split(',')]; X = float(sys.argv[3])
Gm = np.array(D['info']['gunMw']).reshape(4, 4).T
y0, y1, z0, z1 = [float(v) for v in (sys.argv[4:8] if len(sys.argv) > 7 else (-140, -40, -140, 20))]
ys = np.arange(y1, y0 - 0.1, -4.0); zs = np.arange(z0, z1 + 0.1, 3.0)
Pg = np.array([[X, y, z] for y in ys for z in zs]) / 1000; Pw = (np.c_[Pg, np.ones(len(Pg))] @ Gm.T)[:, :3]
grid = np.full(len(Pg), '.', dtype='<U1')
for k, b in enumerate(want):
    nm, T, lo, hi = parts[b]; ins = (hits(T, Pw) & 1) == 1; grid[ins] = 'ABCDEFGH'[k]
print('z ->', zs[0], '..', zs[-1], 'step 3; rows y from', ys[0], 'down step 4; bodies', want)
for i, y in enumerate(ys): print(f'{y:6.0f} ' + ''.join(grid[i * len(zs):(i + 1) * len(zs)]))
# overlay: the hand's index (i), middle (m), ring (r), palm (p), thumb (t) projected on (y, z), for |x| < XR
import subprocess, os
from scipy.spatial import cKDTree
XR = float(os.environ.get('XR', '30')); sd = os.environ.get('SD', 'r'); H = D['hands'][sd]
W = np.frombuffer(base64.b64decode(H['wor']), dtype=np.float32).reshape(-1, 3).astype(np.float64)
MW = np.array(H['mw']).reshape(4, 4).T
L = (np.c_[W, np.ones(len(W))] @ np.linalg.inv(MW).T)[:, :3]; C = np.c_[H['side'] * (L[:, 0] - H['ox']), L[:, 1], L[:, 2] - H['gz']]
J = json.loads(subprocess.check_output(['node', '/home/claude/work/posedlabels.mjs', json.dumps(H['pose'])]))
P = np.array(J['p']).reshape(-1, 3); B = np.array(J['b']); lab = B[cKDTree(P).query(C)[1]]
Q = (np.c_[W, np.ones(len(W))] @ np.linalg.inv(Gm).T)[:, :3] * 1000
ch = {0: 'p', 1: 'i', 2: 'i', 3: 'I', 4: 'm', 5: 'm', 6: 'm', 7: 'r', 8: 'r', 9: 'r', 13: 't', 14: 't', 15: 't'}
G2 = grid.reshape(len(ys), len(zs)).copy()
for q, b in zip(Q, lab):
    if abs(q[0]) > XR or int(b) not in ch: continue
    i = int(round((ys[0] - q[1]) / 4)); j = int(round((q[2] - zs[0]) / 3))
    if 0 <= i < len(ys) and 0 <= j < len(zs):
        c = ch[int(b)]
        if G2[i, j] in '.' or (c in 'iI' and G2[i, j] in 'mrpt'): G2[i, j] = c
        elif G2[i, j] in 'ABC': G2[i, j] = '*' if c in 'iI' else '#'
print('overlay |x|<', XR)
for i, y in enumerate(ys): print(f'{y:6.0f} ' + ''.join(G2[i]))
