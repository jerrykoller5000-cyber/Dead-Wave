# tpapply.py <export> <side> '<RESULT json>' : the solve's move/turn applied to the hand as exported (gun space) -> {basis, p, pose}
import json, sys, numpy as np
D = json.load(open(sys.argv[1])); sd = sys.argv[2]; RES = json.loads(sys.argv[3]); H = D['hands'][sd]; s = H['side']
a, b, c = (RES['turn'] + [0, 0, 0])[:3]; Dm = np.array(RES['move']) / 1000; C = np.array([0, -0.271, 0.008])
R1 = np.array([[np.cos(a), 0, np.sin(a)], [0, 1, 0], [-np.sin(a), 0, np.cos(a)]]); R2 = np.array([[np.cos(b), np.sin(b), 0], [-np.sin(b), np.cos(b), 0], [0, 0, 1]]); R3 = np.array([[1, 0, 0], [0, np.cos(c), np.sin(c)], [0, -np.sin(c), np.cos(c)]])
Rr = R3 @ R2 @ R1; Ms = np.diag([s, 1, 1]); Lin = Ms @ Rr @ Ms; O = np.array([H['ox'], 0, H['gz']])
tr = -Lin @ O - Ms @ Rr @ (C + Dm) + Ms @ C + O
N = np.eye(4); N[:3, :3] = Lin; N[:3, 3] = tr
A = np.linalg.inv(np.array(D['info']['gunMw']).reshape(4, 4).T) @ np.array(H['mw']).reshape(4, 4).T
At = A @ N; nx = At[:3, 0] / np.linalg.norm(At[:3, 0]); ny = At[:3, 1] / np.linalg.norm(At[:3, 1])
p = (At @ np.array([H['ox'], -0.271, H['gz'] + 0.008, 1.0]))[:3]
r5 = lambda v: [round(float(x), 5) for x in v]
print(json.dumps({'basis': {'x': r5(nx), 'y': r5(ny)}, 'p': r5(p), 'pose': RES['pose']}))
