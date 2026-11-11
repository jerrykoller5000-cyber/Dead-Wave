# posechk.py <export> <aug> '<pose>' : the support glove re-posed in place: deepest into the gun's closed bodies and the firing glove
import sys, json, subprocess, numpy as np, trimesh, base64
import os; SD = os.environ.get('SD', 'l'); D = json.load(open(sys.argv[2])); subprocess.check_call(['node', '/home/claude/work/posed.mjs', sys.argv[1], SD, sys.argv[3], '/tmp/pz.bin'])
L = np.fromfile('/tmp/pz.bin', np.float32).reshape(-1, 3).astype(float); res = {}
for p in D['parts']:
    T = np.frombuffer(base64.b64decode(p['b64']), np.float32).reshape(-1, 3).astype(float); m = trimesh.Trimesh(T, np.arange(len(T)).reshape(-1, 3), process=True)
    for b in m.split(only_watertight=False):
        if not b.is_watertight: continue
        lo, hi = b.bounds; sel = np.all((L >= lo) & (L <= hi), 1)
        if not sel.any(): continue
        ins = b.contains(L[sel])
        if ins.any(): _, dd, _ = trimesh.proximity.closest_point(b, L[sel][ins]); k = 'firing' if p['name'].startswith('hand-r') else 'gun'; res[k] = max(res.get(k, 0), round(dd.max() * 1000, 2))
print(res)
