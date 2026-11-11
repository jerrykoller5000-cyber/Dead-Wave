# CD-1 pass 2: the sight line kept clear: a keep-out box in the aimed eye's space (above the line from the eye through the
# screen's centre, between two depths), carried into the gun's space (the aimed export) and onto the hip export, as a part
# keepout_sight.py <hip export> <aimed export> <out> [below mm] [half width mm] [near m] [far m]
import sys, json, base64, numpy as np
hip, aim, out = sys.argv[1:4]
below = float(sys.argv[4]) / 1000 if len(sys.argv) > 4 else 0.003
hw = float(sys.argv[5]) / 1000 if len(sys.argv) > 5 else 0.04
near = float(sys.argv[6]) if len(sys.argv) > 6 else 0.3
far = float(sys.argv[7]) if len(sys.argv) > 7 else 1.1
A = json.load(open(aim)); H = json.load(open(hip))
C = np.array(A['info']['cam']['mw']).reshape(4, 4).T; Ga = np.array(A['info']['gunMw']).reshape(4, 4).T; Gh = np.array(H['info']['gunMw']).reshape(4, 4).T
V = np.array([[x, y, z, 1] for x in (-hw, hw) for y in (-below, 0.08) for z in (-far, -near)])
W = (Gh @ np.linalg.inv(Ga) @ C @ V.T).T[:, :3]
F = [[0, 1, 3], [0, 3, 2], [4, 6, 7], [4, 7, 5], [0, 4, 5], [0, 5, 1], [2, 3, 7], [2, 7, 6], [0, 2, 6], [0, 6, 4], [1, 5, 7], [1, 7, 3]]
T = W[np.array(F)].reshape(-1, 3).astype(np.float32)
H['parts'].append({'name': 'keepout-sight', 'tris': 12, 'b64': base64.b64encode(T.tobytes()).decode()})
json.dump(H, open(out, 'w')); print('sight keep-out added')
