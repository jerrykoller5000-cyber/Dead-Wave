# spin.py <fit file> <gun> <r|l> '<wanted elbow dir, gun space>' : one hand turned about its own palm normal (z = x cross y)
# so its y (toward the elbow) points as near the wanted direction as the palm allows; p (the grip point) kept (CD-1, Claude 1)
import json, sys, subprocess, numpy as np
F, gun, sd, want = sys.argv[1], sys.argv[2], sys.argv[3], np.array(json.loads(sys.argv[4]), float)
h = json.loads(subprocess.check_output(['node', '-e', f"import('{F}').then(m=>console.log(JSON.stringify(m.VM_FIT['{gun}']['{sd}'])))"]))
x = np.array(h['basis']['x'], float); x /= np.linalg.norm(x); y = np.array(h['basis']['y'], float); y -= x * (y @ x); y /= np.linalg.norm(y); z = np.cross(x, y)
w = want - z * (want @ z); w /= np.linalg.norm(w)
ang = np.arctan2(np.cross(y, w) @ z, y @ w)
c, s = np.cos(ang), np.sin(ang); R = lambda v: v * c + np.cross(z, v) * s + z * (z @ v) * (1 - c)
r5 = lambda v: [round(float(t), 5) for t in v]
sys.stderr.write(f'turned {np.degrees(ang):.1f} deg about the palm normal\n')
print(json.dumps({'basis': {'x': r5(R(x)), 'y': r5(R(y))}, 'p': h['p'], 'pose': h['pose']}))
