# parmap.py (CD-1, 12 Nov) <export> y: ray-parity map (as clip-check) at gun y mm: which closed body is at each (x,z)
import sys, json, base64, numpy as np
src = open('/home/claude/gs306/tools/handfit/c4/depth3.py').read(); src = src[:src.index('for p in D')]
sys.argv = ['x', sys.argv[1], sys.argv[2]]; g = {}; exec(src, g); D = g['D']
Gm = np.array(D['info']['gunMw']).reshape(4, 4).T; Gi = np.linalg.inv(Gm)
B_ = []
for j, p in enumerate(D['parts']):
    T = np.frombuffer(base64.b64decode(p['b64']), dtype=np.float32).reshape(-1, 3).astype(np.float64)
    for B in g['bodies'](T):
        if g['closed'](B): B_.append((len(B_), p['name'], B.reshape(-1, 3, 3)))
y = float(sys.argv[2]) / 1000
xs = np.arange(-20, 42, 2) / 1000; zs = np.arange(10, -91, -3) / 1000
P = np.array([[x, y, z] for z in zs for x in xs]); W = (np.c_[P, np.ones(len(P))] @ Gm.T)[:, :3]
lab = np.full(len(P), '.', dtype='<U1'); names = {}
sym = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnop'
for i, nm, T in B_:
    lo, hi = T.reshape(-1, 3).min(0), T.reshape(-1, 3).max(0); sel = np.all((W >= lo - 1e-6) & (W <= hi + 1e-6), 1)
    if not sel.any(): continue
    ins = (g['hits'](T, W[sel]) & 1) == 1
    if ins.any():
        s = sym[len(names) % len(sym)]; names[s] = f'{i} {nm}'; idx = np.where(sel)[0][ins]; lab[idx] = s
L = lab.reshape(len(zs), len(xs))
for k, z in enumerate(zs): print(str(int(round(z * 1000))).rjust(4), ''.join(L[k]))
print(names)
