# CD-1 fixes: a firing hand set on a grip body's own centre line (wrap2.js's PCA fails on a wide target grip):
# gripaxis.py <export> <gun> <part index> <body: largest closed> [r] -> a new {basis, p, pose(fist*CURL)} from VM_FIT's hand
# slices of the body across the hand's channel at -25, 0, +25 mm along it: each slice's centre; the axis through them;
# the palm's normal kept (projected); the channel (rn - 13 mm) from the centre toward the palm, as wrap2.js
import sys, json, base64, subprocess, numpy as np, trimesh, os
D = json.load(open(sys.argv[1])); gun = sys.argv[2]; pi = int(sys.argv[3]); sd = sys.argv[4] if len(sys.argv) > 4 else 'r'
CURL = float(os.environ.get('CURL', '0.85')); F = os.environ.get('FIT', '/home/claude/gs306/game/viewmodel-fit.js')
FIT = json.loads(subprocess.check_output(['node', '-e', f"import('{F}').then(m=>console.log(JSON.stringify(m.VM_FIT)))"]))[gun][sd]
Gi = np.linalg.inv(np.array(D['info']['gunMw']).reshape(4, 4).T)
T = np.frombuffer(base64.b64decode(D['parts'][pi]['b64']), dtype=np.float32).reshape(-1, 3).astype(float)
m = trimesh.Trimesh(np.round(T * 1e5) / 1e5, np.arange(len(T)).reshape(-1, 3)); bs = [b for b in m.split(only_watertight=False) if b.is_watertight]
B = max(bs, key=lambda b: len(b.faces)); V = (Gi @ np.c_[B.vertices, np.ones(len(B.vertices))].T).T[:, :3]
# densify with surface samples so a slice is never empty
S = (Gi @ np.c_[trimesh.sample.sample_surface(B, 20000)[0], np.ones(20000)].T).T[:, :3]; V = np.r_[V, S]
bx = np.array(FIT['basis']['x'], float); bx /= np.linalg.norm(bx); by = np.array(FIT['basis']['y'], float); by -= bx * (by @ bx); by /= np.linalg.norm(by); bz = np.cross(bx, by)
p0 = np.array(FIT['p'], float)
def centre(c, ax, nz):
    wv = np.cross(ax, nz); d = V - c; sel = np.abs(d @ ax) < 0.006
    if sel.sum() < 20: return None, None
    a = d[sel] @ nz; b = d[sel] @ wv
    return c + nz * (a.min() + a.max()) / 2 + wv * (b.min() + b.max()) / 2, (a.max() - a.min()) / 2
ax = bx.copy()
for it in range(4):
    nz = bz - ax * (bz @ ax); nz /= np.linalg.norm(nz)
    cs = [centre(p0 + ax * t, ax, nz)[0] for t in (-0.025, 0, 0.025)]
    cs = [c for c in cs if c is not None]
    if len(cs) < 2: break
    A = np.array(cs); u, s_, vt = np.linalg.svd(A - A.mean(0)); na = vt[0] * np.sign(vt[0] @ bx); ax = na
nz = bz - ax * (bz @ ax); nz /= np.linalg.norm(nz); ny = np.cross(nz, ax)
c0, rn = centre(p0, ax, nz)
p = c0 - nz * (rn - 0.013)   # wrap2.js: the channel 13 mm in from the palm's face of a 26 mm bar
fist = {"f": [[1.412, 0.938, 0.84, 0], [1.495, 1.013, 0.943, 0], [1.425, 1.0, 0.899, 0], [1.212, 0.725, 0.693, 0]], "t": [0.038, 0.563, 0.812, 0.863, 0.55, 0.337]}
pose = {"f": [[round(a * CURL, 3) if j < 3 else 0 for j, a in enumerate(r)] for r in fist['f']], "t": fist['t']}
if sd == 'r': pose['f'][0] = FIT['pose']['f'][0]   # the trigger finger as it was
r5 = lambda v: [round(float(x), 5) for x in v]
sys.stderr.write(f'axis turned {np.degrees(np.arccos(np.clip(ax @ bx, -1, 1))):.1f} deg, moved {np.linalg.norm(p - p0) * 1000:.1f} mm, rn {rn * 1000:.1f} mm\n')
print(json.dumps({"basis": {"x": r5(ax), "y": r5(ny)}, "p": r5(p), "pose": pose}))
