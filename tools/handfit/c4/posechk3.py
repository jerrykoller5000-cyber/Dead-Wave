# posechk3.py <export> <r|l> '<pose>' : the hand re-posed (fixed place) checked against every closed body (parity, as clip-check): body, depth, bones
import sys, json, base64, numpy as np, subprocess, trimesh
src = open('/home/claude/gs306/tools/handfit/c4/depth3.py').read(); src = src[:src.index('for sd, H in D')]
f, sd, pose = sys.argv[1], sys.argv[2], sys.argv[3]; sys.argv = ['x', f]; g = {}; exec(src, g); D = g['D']; H = D['hands'][sd]
J = json.loads(subprocess.check_output(['node', '/home/claude/work/posedlabels.mjs', pose])); P = np.array(J['p']).reshape(-1, 3); B = np.array(J['b'])
MW = np.array(H['mw']).reshape(4, 4).T; L = np.c_[H['side'] * P[:, 0] + H['ox'], P[:, 1], P[:, 2] + H['gz'], np.ones(len(P))]; W = (L @ MW.T)[:, :3]
nm = {0: 'palm'}; fn = ['index', 'middle', 'ring', 'little', 'thumb']
for k in range(5):
    for j in range(3): nm[1 + k * 3 + j] = fn[k] + str(j + 1)
Gi = np.linalg.inv(np.array(D['info']['gunMw']).reshape(4, 4).T)
for i, (n, T, lo, hi) in enumerate(g['parts']):
    sel = np.where(np.all((W >= lo) & (W <= hi), 1))[0]
    if not len(sel): continue
    ins = (g['hits'](T, W[sel]) & 1) == 1
    if not ins.any(): continue
    m = trimesh.Trimesh(T.reshape(-1, 3), np.arange(len(T) * 3).reshape(-1, 3), process=False); _, d, _ = trimesh.proximity.closest_point(m, W[sel][ins])
    bl = {}
    for b, x in zip(B[sel][ins], d): bl[nm[int(b)]] = max(bl.get(nm[int(b)], 0), round(float(x) * 1000, 1))
    q = (np.c_[W[sel][ins], np.ones(int(ins.sum()))] @ Gi.T)[:, :3] * 1000
    print(f'{n}#{i} deep {d.max()*1000:.2f} bones {bl} at gun {np.round(q[np.argmax(d)],1)}')
