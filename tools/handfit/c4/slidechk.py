# slidechk.py <export> <augmented export> '<gun-space move dx,dy,dz (gun units)>' : the support glove moved rigidly by t*move, t in 0..1: depth into the gun parts and the firing glove (as depth3: closed bodies)
import sys, json, base64, numpy as np, trimesh
D = json.load(open(sys.argv[1])); A = json.load(open(sys.argv[2])); mv = np.array(json.loads(sys.argv[3]), float)
G = np.array(D['info']['gunMw']).reshape(4, 4).T; dW = G[:3, :3] @ mv
L = np.frombuffer(base64.b64decode(D['hands']['l']['wor']), np.float32).reshape(-1, 3).astype(float)
bodies = []
for p in A['parts']:
    T = np.frombuffer(base64.b64decode(p['b64']), np.float32).reshape(-1, 3).astype(float)
    m = trimesh.Trimesh(T, np.arange(len(T)).reshape(-1, 3), process=True)
    for b in m.split(only_watertight=False):
        if b.is_watertight: bodies.append((p['name'], b))
for t in [0, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 1.0]:
    P = L + t * dW; worst = 0; who = ''
    for nm, b in bodies:
        lo, hi = b.bounds; sel = np.all((P >= lo - 1e-4) & (P <= hi + 1e-4), 1)
        if not sel.any(): continue
        ins = b.contains(P[sel])
        if ins.any():
            _, d, _ = trimesh.proximity.closest_point(b, P[sel][ins]); 
            if d.max() > worst: worst, who = d.max(), nm
    print(f't {t:.1f} deepest {worst*1000:.2f} mm (world) in {who}')
