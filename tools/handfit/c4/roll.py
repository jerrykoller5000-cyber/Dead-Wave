# roll.py <gun> <r|l> <deg> [cy] [cx] : one hand of VM_FIT rolled rigidly about the bore (gun z) through (cx, cy) (cloud; CD-1, Claude 1)
# (the GW-4's support hand sat on the handguard's lower right, so its thumb could only lie beside the index: rolled under)
import json, sys, subprocess, numpy as np
F = '/home/claude/gs306/game/viewmodel-fit.js'
FIT = json.loads(subprocess.check_output(['node', '-e', f"import('{F}').then(m=>console.log(JSON.stringify(m.VM_FIT)))"]))
gun, sd, deg = sys.argv[1], sys.argv[2], float(sys.argv[3]); cy = float(sys.argv[4]) if len(sys.argv) > 4 else 0.03; cx = float(sys.argv[5]) if len(sys.argv) > 5 else 0.0
h = FIT[gun][sd]; a = np.radians(deg); R = np.array([[np.cos(a), -np.sin(a), 0], [np.sin(a), np.cos(a), 0], [0, 0, 1]])
c = np.array([cx, cy, 0.0]); r5 = lambda v: [round(float(x), 5) for x in v]
out = {'basis': {'x': r5(R @ np.array(h['basis']['x'])), 'y': r5(R @ np.array(h['basis']['y']))}, 'p': r5(R @ (np.array(h['p']) - c) + c), 'pose': h['pose']}
print(json.dumps(out))
