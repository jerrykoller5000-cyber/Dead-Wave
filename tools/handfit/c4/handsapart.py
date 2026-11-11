# handsapart.py <export> <gun> <margin mm> : the support hand moved straight out of the firing hand (D-140) where the
# firing glove's vertices sit inside it: along the mean of (vertex - nearest support surface), by the deepest + margin
import sys, json, base64, numpy as np, trimesh, subprocess
D = json.load(open(sys.argv[1])); gun = sys.argv[2]; margin = float(sys.argv[3]) / 1000
G = {}
for sd in 'rl':
    H = D['hands'][sd]; G[sd] = (np.frombuffer(base64.b64decode(H['wor']), dtype=np.float32).reshape(-1, 3).astype(float), np.frombuffer(base64.b64decode(H['idx']), dtype=np.uint32).reshape(-1, 3))
Wr, _ = G['r']; Wl, Il = G['l']; m = trimesh.Trimesh(Wl, Il, process=False)
dr = np.array([0.8366, 0.3419, 0.4279]); T = Wl[Il]; a = T[:, 0]; e1 = T[:, 1] - a; e2 = T[:, 2] - a; h = np.cross(dr, e2)
det = np.einsum('ij,ij->i', e1, h); ok = np.abs(det) > 1e-16; f = np.where(ok, 1 / np.where(ok, det, 1), 0)
lo, hi = Wl.min(0), Wl.max(0); ins = []
for i in np.where(np.all((Wr >= lo) & (Wr <= hi), 1))[0]:
    s = Wr[i] - a; u = f * np.einsum('ij,ij->i', s, h); q = np.cross(s, e1); w = f * (q @ dr); t = f * np.einsum('ij,ij->i', q, e2)
    if (ok & (u >= 0) & (u <= 1) & (w >= 0) & (u + w <= 1) & (t > 0)).sum() % 2: ins.append(i)
P = Wr[ins]; cp, d, _ = trimesh.proximity.closest_point(m, P)
v = (P - cp)[d > 0.0002].mean(0); v /= np.linalg.norm(v)   # moving the support hand this way takes its surface past them
Wg = np.array(D['info']['gunMw']).reshape(4, 4).T; loc = np.linalg.inv(Wg[:3, :3]) @ (v * (d.max() + margin))
FIT = json.loads(subprocess.check_output(['node', '-e', "import('/home/claude/gs306/game/viewmodel-fit.js').then(m=>console.log(JSON.stringify(m.VM_FIT)))"]))
l = FIT[gun]['l']; l['p'] = [round(float(x + y), 5) for x, y in zip(l['p'], loc)]
print(f'{len(ins)} inside, deepest {d.max()*1000:.2f} mm; moved {np.linalg.norm(v*(d.max()+margin))*1000:.2f} mm', file=sys.stderr); print(json.dumps(l))
