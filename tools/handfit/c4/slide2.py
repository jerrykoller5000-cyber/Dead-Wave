# slide2.py <export> <r|l> '<gun-space dir>' <bodies> [bones to leave out, e.g. 13,14,15] : slide.py measured without some bones
# (each glove vertex labelled by the nearest vertex of the posed hand, mh-tool's handPosed) -- e.g. a thumb over the top that
# the solve will move anyway. CD-1 (Claude 1).
import sys, json, numpy as np, subprocess
from scipy.spatial import cKDTree
f, sd, dv, only = sys.argv[1], sys.argv[2], np.array(json.loads(sys.argv[3]), float), [int(x) for x in sys.argv[4].split(',')]
skip = [int(x) for x in sys.argv[5].split(',')] if len(sys.argv) > 5 else [13, 14, 15]
src = open('/home/claude/gs306/tools/handfit/c4/shift3.py').read(); src = src[:src.index('t = np.zeros(3)')]
sys.argv = ['x', f, sd]; g = {}; exec(src, g)
D, W0, Gm = g['D'], g['W0'], g['Gm']; H = D['hands'][sd]; MW = np.array(H['mw']).reshape(4, 4).T
L = (np.c_[W0, np.ones(len(W0))] @ np.linalg.inv(MW).T)[:, :3]; C = np.c_[H['side'] * (L[:, 0] - H['ox']), L[:, 1], L[:, 2] - H['gz']]
J = json.loads(subprocess.check_output(['node', '/home/claude/work/posedlabels.mjs', json.dumps(H['pose'])]))
P = np.array(J['p']).reshape(-1, 3); B = np.array(J['b']); lab = B[cKDTree(P).query(C)[1]]
keep = ~np.isin(lab, skip); print('vertices kept', int(keep.sum()), 'of', len(W0))
g['parts'][:] = [g['parts'][i] for i in only]; g['meshes'][:] = [g['meshes'][i] for i in only]
deep = g['deep']; Wk = W0[keep]
dw = Gm[:3, :3] @ (dv / np.linalg.norm(dv)); dw /= np.linalg.norm(dw)
lo, hi = 0.0, 0.12
if deep(Wk)[0] <= 0.0004: hi = 0
else:
    while hi - lo > 0.0005:
        mid = (lo + hi) / 2
        if deep(Wk + dw * mid)[0] <= 0.0004: hi = mid
        else: lo = mid
print('slide world mm', round(hi * 1000, 1)); Gi = np.linalg.inv(Gm)
print('RESULT_GUN_DP', json.dumps(list(np.round(Gi[:3, :3] @ (dw * hi), 6))))
