# fixroll.py <export> <gun> <side> <angle applied by the carry (rad)> : the fit's roll redone where the twist left its limit
# after a carried apply: the wanted drawn y is the fit's y turned back by the carry; the export's drawn y is the elbow's
# line (the twist free); the fit is put 0.6 rad beyond the wanted y, away from that line, so the twist stops on it.
import sys, json, subprocess, numpy as np
exp, gun, sd, carry = sys.argv[1], sys.argv[2], sys.argv[3], float(sys.argv[4])
F = '/home/claude/gs306/game/viewmodel-fit.js'
FIT = json.loads(subprocess.check_output(['node', '-e', f"import('{F}').then(m=>console.log(JSON.stringify(m.VM_FIT)))"]))
D = json.load(open(exp)); W = np.array(D['info']['gunMw']).reshape(4, 4).T; MW = np.array(D['hands'][sd]['mw']).reshape(4, 4).T
A = np.linalg.inv(W) @ MW; n = lambda v: v / np.linalg.norm(v)
f = FIT[gun][sd]; x = n(np.array(f['basis']['x'], float)); fy = np.array(f['basis']['y'], float); fy = n(fy - x * (fy @ x))
rot = lambda v, a: v * np.cos(a) + np.cross(x, v) * np.sin(a)
yt = rot(fy, -carry); h = n(A[:3, 1] - x * (A[:3, 1] @ x))
de = float(np.arctan2(np.cross(h, yt) @ x, h @ yt)); ny = rot(yt, 0.6 * np.sign(de))
print(f'wanted roll off the elbow line {de:.3f} rad', file=sys.stderr)
f['basis']['y'] = [round(float(v), 5) for v in ny]; print(json.dumps(f))
