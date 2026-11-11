# CD-1 pass 2: a keep-out box (the gun's local space: x0 x1 y0 y1 z0 z1) added to an export as a closed part, for the fit
# only (the pistol's trigger guard opening: the firing hand's middle finger stays under the guard, on the front strap)
import sys, json, base64, numpy as np
src, out = sys.argv[1:3]; x0, x1, y0, y1, z0, z1 = map(float, sys.argv[3:9])
D = json.load(open(src)); W = np.array(D['info']['gunMw']).reshape(4, 4).T
V = np.array([[x, y, z] for x in (x0, x1) for y in (y0, y1) for z in (z0, z1)])
F = [[0, 1, 3], [0, 3, 2], [4, 6, 7], [4, 7, 5], [0, 4, 5], [0, 5, 1], [2, 3, 7], [2, 7, 6], [0, 2, 6], [0, 6, 4], [1, 5, 7], [1, 7, 3]]
Vw = (np.c_[V, np.ones(8)] @ W.T)[:, :3]
T = Vw[np.array(F)].reshape(-1, 3).astype(np.float32)
D['parts'].append({'name': 'keepout', 'tris': 12, 'b64': base64.b64encode(T.tobytes()).decode()})
json.dump(D, open(out, 'w')); print('keep-out added', np.ptp(Vw, 0).round(4))
