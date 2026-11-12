# wasproom.py <export> [r|l] (GT-20093, Claude 1): the firing glove's index (and middle1) against the trigger guard and blade, gun mm
# per bone: gun-space box, PCA thickness (the gloved finger's section), clearance to the guard body (- = inside) and to the blade;
# the pad (Claude 5's point) and the index MCP knuckle in gun mm; the guard's inner opening at the index's x plane, per height
import sys, json, base64, subprocess, numpy as np, trimesh
from scipy.spatial import cKDTree
src = open('/home/claude/gs306/tools/handfit/c4/depth3.py').read(); src = src[:src.index('for sd, H in D')]
sd = sys.argv[2] if len(sys.argv) > 2 else 'r'
sys.argv = ['x', sys.argv[1], sd]; g = {}; exec(src, g)
D = g['D']; H = D['hands'][sd]
Gi = np.linalg.inv(np.array(D['info']['gunMw']).reshape(4, 4).T)
def tog(P): return (np.c_[P, np.ones(len(P))] @ Gi.T)[:, :3] * 1000
# bodies in gun mm
bods = []
for p in D['parts']:
    T = np.frombuffer(base64.b64decode(p['b64']), dtype=np.float32).reshape(-1, 3).astype(np.float64)
    for B in g['bodies'](T):
        if g['closed'](B): bods.append((p['name'], tog(B)))
def find(pred):
    return [b for b in bods if pred(b[0], b[1])]
guard = find(lambda n, B: B[:, 1].min() < -95 and B[:, 2].max() > 100 and abs(B[:, 0]).max() < 17)
blade = find(lambda n, B: 'trigger' in n)
print('guard bodies', [(n, B.min(0).round(1).tolist(), B.max(0).round(1).tolist()) for n, B in guard])
print('blade bodies', [(n, B.min(0).round(1).tolist(), B.max(0).round(1).tolist()) for n, B in blade])
GM = trimesh.Trimesh(guard[0][1], np.arange(len(guard[0][1])).reshape(-1, 3), process=False)
BM = trimesh.util.concatenate([trimesh.Trimesh(B, np.arange(len(B)).reshape(-1, 3), process=False) for n, B in blade])
# the glove in gun mm, labelled by bone
W = np.frombuffer(base64.b64decode(H['wor']), dtype=np.float32).reshape(-1, 3).astype(np.float64)
MW = np.array(H['mw']).reshape(4, 4).T
L = (np.c_[W, np.ones(len(W))] @ np.linalg.inv(MW).T)[:, :3]; C = np.c_[H['side'] * (L[:, 0] - H['ox']), L[:, 1], L[:, 2] - H['gz']]
J = json.loads(subprocess.check_output(['node', '/home/claude/work/posedlabels.mjs', json.dumps(H['pose'])]))
P = np.array(J['p']).reshape(-1, 3); Bn = np.array(J['b']); _, ii = cKDTree(P).query(C); lab = Bn[ii]
Wg = tog(W)
def c2g(c):
    Lc = np.array([H['side'] * c[0] + H['ox'], c[1], c[2] + H['gz'], 1.0]); return (Gi @ (MW @ Lc))[:3] * 1000
sc = np.linalg.norm(np.array(D['info']['gunMw']).reshape(4,4).T[:3,0]); print('gun scale (world per gun unit)', round(sc,4))
names = {1: 'index1', 2: 'index2', 3: 'index3', 4: 'middle1'}
def inside(Mesh, X): return (g['hits'](Mesh.triangles, X) & 1) == 1
for b, nm in names.items():
    X = Wg[lab == b]
    if not len(X): continue
    c = X.mean(0); U, S, Vt = np.linalg.svd(X - c); ax = Vt[0]; Q = (X - c) @ Vt[1:].T
    thick = (Q.max(0) - Q.min(0))
    _, dg, _ = trimesh.proximity.closest_point(GM, X); ing = inside(GM, X); sg = np.where(ing, -dg, dg)
    _, db, _ = trimesh.proximity.closest_point(BM, X); k = np.argmin(sg)
    print('   nearest guard point at', X[k].round(1))
    print(f'{nm:8s} n{len(X):4d} box {X.min(0).round(1)} .. {X.max(0).round(1)}  length {np.ptp((X - c) @ ax):.1f} section {thick[0]:.1f} x {thick[1]:.1f}  guard {sg.min():+.1f}  blade {db.min():.1f}')
pose = H['pose']
pd = json.loads(subprocess.check_output(['node', '/home/claude/gs306/tools/handfit/c4/pad.mjs', json.dumps(pose)]))
print('pad', c2g(pd['pad']).round(1), 'tip', c2g(pd['tip']).round(1))
print('pose f0', pose['f'][0] if 'f' in pose else pose)
# the MCP knuckle (index proximal frame origin) and the PIP/DIP
mod = "import * as M from '/home/claude/handfit-work/hand/mh-tool.mjs'; const L = M.handLayout(1,0,0); const B = M._bf(L, %s); console.log(JSON.stringify([1,2,3].map(k => [B[k][3], B[k][7], B[k][11]])));" % json.dumps(pose)
open('/tmp/_k.mjs', 'w').write(mod); K = json.loads(subprocess.check_output(['node', '/tmp/_k.mjs']))
for k, nm in zip(K, ['MCP', 'PIP', 'DIP']): print(nm, c2g(k).round(1))
# the guard's inner opening at the index plane x: for each height y, the open span in z between the blade side and the guard
for x0 in (0.0, 8.0):
  print('plane x =', x0)
  for y in np.arange(-40, -112, -4.0):
    zs = np.arange(0, 150, 0.5); pts = np.c_[np.full(len(zs), x0), np.full(len(zs), y), zs]
    occ = inside(GM, pts) | inside(BM, pts)
    runs = []; s = None
    for z, o in zip(zs, occ):
        if o and s is None: s = z
        if not o and s is not None: runs.append((s, z)); s = None
    if s is not None: runs.append((s, zs[-1]))
    print(f'   y {y:6.1f}: solid z', [(float(a), float(b)) for a, b in runs])
if len(sys.argv) > 0:
    for b in (1, 2, 3, 4):
        X = Wg[lab == b]; cp, d, _ = trimesh.proximity.closest_point(GM, X); k = np.argmin(d)
        print(names[b], 'vertex', X[k].round(1), '-> guard surface', cp[k].round(1), 'd', round(d[k], 1))
