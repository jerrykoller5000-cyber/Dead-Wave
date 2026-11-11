# drawn.py <export with info.gunMw> <gun>: each hand as drawn, in the gun's space, against VM_FIT (FIT env for another file)
import json, sys, os, numpy as np, subprocess
D = json.load(open(sys.argv[1])); gun = sys.argv[2]
W = np.array(D['info']['gunMw']).reshape(4, 4).T
F = os.environ.get('FIT', '/home/claude/gs306/game/viewmodel-fit.js')
FIT = json.loads(subprocess.check_output(['node', '-e', f"import('{F}').then(m=>console.log(JSON.stringify(m.VM_FIT)))"]))
s = abs(np.linalg.det(W[:3, :3])) ** (1 / 3); print('gun scale', round(s, 4), 'det sign', np.sign(np.linalg.det(W[:3, :3])))
for sd in 'rl':
    H = D['hands'][sd]; MW = np.array(H['mw']).reshape(4, 4).T
    A = np.linalg.inv(W) @ MW; g = np.array([H['ox'], -0.271, H['gz'] + 0.008, 1])
    n = lambda v: v / np.linalg.norm(v)
    bx, by = n(A[:3, 0]), n(A[:3, 1]); f = FIT[gun][sd]
    fx, fy = n(np.array(f['basis']['x'])), n(np.array(f['basis']['y']))
    p = (A @ g)[:3]
    print(sd, 'x off', round(float(np.degrees(np.arccos(np.clip(bx @ fx, -1, 1)))), 2), 'deg, y off', round(float(np.degrees(np.arccos(np.clip(by @ fy, -1, 1)))), 2), 'deg, grip point off', round(float(np.linalg.norm(p - np.array(f['p'])) * s * 1000), 2), 'mm; drawn p', p.round(5).tolist(), 'z = x cross y:', round(float(n(A[:3, 2]) @ np.cross(bx, by)), 2))
