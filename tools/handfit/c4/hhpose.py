# hhpose.py <export> <r|l> '<pose>' [...more poses] (CD-1 fixes 5): a hand re-posed in place against the other glove as drawn: the
# deepest point of this hand inside the other (mm) and the bones, per pose (the gun's bodies: posechk3.py)
import sys, json, base64, numpy as np, subprocess, trimesh
src = open('/home/claude/gs306/tools/handfit/c4/depth3.py').read(); src = src[:src.index('parts = []')]
f, sd = sys.argv[1], sys.argv[2]; poses = sys.argv[3:]; sys.argv = ['x', f]; g = {}; exec(src, g); D = g['D']; hits = g['hits']
o = 'l' if sd == 'r' else 'r'; Ho = D['hands'][o]
Wo = np.frombuffer(base64.b64decode(Ho['wor']), dtype=np.float32).reshape(-1, 3).astype(float); Io = np.frombuffer(base64.b64decode(Ho['idx']), dtype=np.uint32).reshape(-1, 3); To = Wo[Io]
m = trimesh.Trimesh(To.reshape(-1, 3), np.arange(len(To) * 3).reshape(-1, 3), process=False)
H = D['hands'][sd]; MW = np.array(H['mw']).reshape(4, 4).T
nm = {0: 'palm'}; fn = ['index', 'middle', 'ring', 'little', 'thumb']
for k in range(5):
    for j in range(3): nm[1 + k * 3 + j] = fn[k] + str(j + 1)
for pose in poses:
    J = json.loads(subprocess.check_output(['node', '/home/claude/work/posedlabels.mjs', pose])); P = np.array(J['p']).reshape(-1, 3); B = np.array(J['b'])
    L = np.c_[H['side'] * P[:, 0] + H['ox'], P[:, 1], P[:, 2] + H['gz'], np.ones(len(P))]; W = (L @ MW.T)[:, :3]
    ins = (hits(To, W) & 1) == 1
    if not ins.any(): print('clear', pose[:80]); continue
    _, d, _ = trimesh.proximity.closest_point(m, W[ins]); bl = {}
    for b, x in zip(B[ins], d): bl[nm[int(b)]] = max(bl.get(nm[int(b)], 0), round(float(x) * 1000, 2))
    print(round(float(d.max()) * 1000, 2), bl, pose[:120])
