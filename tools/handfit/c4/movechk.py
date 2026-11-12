# movechk.py <export> <r|l> '<placement {a1,b2,c3,move mm}>' (CD-1, fresh Claude 1, 12 Nov): diag.py for the hand as exported but
# moved rigidly by an idxmove3/4 placement (canonical frame: R about C = (0,-0.271,0.008), then d): every closed body it is in, by bone
import sys, json, base64, numpy as np, trimesh, subprocess
from scipy.spatial import cKDTree
src = open('/home/claude/gs306/tools/handfit/c4/depth3.py').read(); src = src[:src.index('for sd, H in D')]
ex, sd, PL = sys.argv[1], sys.argv[2], json.loads(sys.argv[3])
sys.argv = ['x', ex, sd]; g = {}; exec(src, g)
D, parts, hits = g['D'], g['parts'], g['hits']
H = D['hands'][sd]
W = np.frombuffer(base64.b64decode(H['wor']), dtype=np.float32).reshape(-1, 3).astype(np.float64)
MW = np.array(H['mw']).reshape(4, 4).T
L = (np.c_[W, np.ones(len(W))] @ np.linalg.inv(MW).T)[:, :3]; C = np.c_[H['side'] * (L[:, 0] - H['ox']), L[:, 1], L[:, 2] - H['gz']]
J = json.loads(subprocess.check_output(['node', '/home/claude/work/posedlabels.mjs', json.dumps(H['pose'])]))
P = np.array(J['p']).reshape(-1, 3); B = np.array(J['b']); dd, ii = cKDTree(P).query(C); lab = B[ii]
a, b, c = PL.get('a1', 0), PL.get('b2', 0), PL.get('c3', 0); d = np.array(PL['move'], float) / 1000
R1 = np.array([[np.cos(a), 0, np.sin(a)], [0, 1, 0], [-np.sin(a), 0, np.cos(a)]]); R2 = np.array([[np.cos(b), np.sin(b), 0], [-np.sin(b), np.cos(b), 0], [0, 0, 1]]); R3 = np.array([[1, 0, 0], [0, np.cos(c), np.sin(c)], [0, -np.sin(c), np.cos(c)]])
R = R3 @ R2 @ R1; C0 = np.array([0, -0.271, 0.008]); C2 = (C - C0) @ R.T + C0 + d
L2 = np.c_[H['side'] * C2[:, 0] + H['ox'], C2[:, 1], C2[:, 2] + H['gz']]; W = (np.c_[L2, np.ones(len(L2))] @ MW.T)[:, :3]
names = {0: 'palm'}; fn = ['index', 'middle', 'ring', 'little', 'thumb']
for f in range(5):
    for k in range(3): names[1 + f * 3 + k] = fn[f] + str(k + 1)
gm = np.array(D['info']['gunMw']).reshape(4, 4).T
SKIP = set(json.loads(__import__('os').environ.get('SKIPB', '[]')))
for i, (nm, T, lo, hi) in enumerate(parts):
    sel = np.where(np.all((W >= lo - 0.02) & (W <= hi + 0.02), 1))[0]
    sel = np.array([s for s in sel if int(lab[s]) not in SKIP], int)
    if not len(sel): continue
    ins = (hits(T, W[sel]) & 1) == 1
    if not ins.any(): continue
    m = trimesh.Trimesh(T.reshape(-1, 3), np.arange(len(T) * 3).reshape(-1, 3), process=False)
    _, dist, _ = trimesh.proximity.closest_point(m, W[sel][ins])
    bl = {}
    for bb, x in zip(lab[sel][ins], dist): k = names.get(int(bb), str(bb)); bl[k] = max(bl.get(k, 0), round(x * 1000, 1))
    q = (np.c_[T.reshape(-1, 3), np.ones(T.size // 3)] @ np.linalg.inv(gm).T)[:, :3]
    print(f'{nm}#{i} deep {dist.max()*1000:.2f} n {int(ins.sum())} bones {bl} gun-box {np.round(q.min(0)*1000,1)} {np.round(q.max(0)*1000,1)}')
