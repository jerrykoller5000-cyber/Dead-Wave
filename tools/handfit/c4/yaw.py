# yaw.py <gun> <r|l> <deg> <cx> <cz> : one hand of VM_FIT turned about the gun's vertical (y) through (cx, cz) (cloud; CD-1, Claude 1)
import json, sys, subprocess, numpy as np
F = '/home/claude/gs306/game/viewmodel-fit.js'
FIT = json.loads(subprocess.check_output(['node', '-e', f"import('{F}').then(m=>console.log(JSON.stringify(m.VM_FIT)))"]))
gun, sd, deg, cx, cz = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4]), float(sys.argv[5])
h = FIT[gun][sd]; a = np.radians(deg); R = np.array([[np.cos(a), 0, np.sin(a)], [0, 1, 0], [-np.sin(a), 0, np.cos(a)]])
c = np.array([cx, 0.0, cz]); r5 = lambda v: [round(float(x), 5) for x in v]
print(json.dumps({'basis': {'x': r5(R @ np.array(h['basis']['x'])), 'y': r5(R @ np.array(h['basis']['y']))}, 'p': r5(R @ (np.array(h['p']) - c) + c), 'pose': h['pose']}))
